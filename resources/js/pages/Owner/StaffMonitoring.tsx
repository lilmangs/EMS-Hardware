import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { useEffect, useMemo, useState } from 'react';
import { Eye, MoreHorizontal, Clock, User, DollarSign, Calendar, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Staff Monitoring',
        href: '/owner/staff-monitoring',
    },
];

type DateFilterKey = 'today' | 'yesterday' | 'this_week' | 'last_7_days';
type RoleFilterValue = 'all' | 'cashier' | 'staff' | 'delivery';

type StaffShiftRow = {
    id: number;
    staffName: string;
    branch: 'lagonglong' | 'balingasag';
    shiftDateISO: string; // yyyy-mm-dd
    onShift: boolean;
    totalSales: number;
    startTime: string;
    endTime: string;
    role?: string;
};

function rangeLabel(key: DateFilterKey): string {
    switch (key) {
        case 'today':
            return 'Today';
        case 'yesterday':
            return 'Yesterday';
        case 'this_week':
            return 'This Week';
        default:
            return 'Last 7 Days';
    }
}

function formatReadableDate(iso: string): string {
    const raw = String(iso || '').trim();
    if (!raw) return '—';
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
}

function formatReadableTime(hhmm: string): string {
    const raw = String(hhmm || '').trim();
    if (!raw || raw === '—') return '—';

    const m = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return raw;

    const hours = Number(m[1]);
    const minutes = Number(m[2]);
    const d = new Date(2000, 0, 1, hours, minutes, 0, 0);
    if (Number.isNaN(d.getTime())) return raw;

    return d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function StaffMonitoring() {
    const { branch: effectiveBranch } = useBranchFilter();
    const [dateFilter, setDateFilter] = useState<DateFilterKey>('today');
    const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('cashier');
    const [selectedRow, setSelectedRow] = useState<StaffShiftRow | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<StaffShiftRow[]>([]);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const qs = new URLSearchParams({
                    branch_key: effectiveBranch ?? 'all',
                    range: dateFilter,
                    role: roleFilter,
                });

                const res = await fetch(`/owner/staff-monitoring/data?${qs.toString()}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`Request failed (${res.status})`);
                }

                const json = (await res.json()) as {
                    summary?: { staff_total: number; on_duty: number; total_sales: number };
                    rows?: StaffShiftRow[];
                };

                setRows(Array.isArray(json.rows) ? json.rows : []);
            } catch (e) {
                if ((e as any)?.name === 'AbortError') return;
                setError('Failed to load staff monitoring data.');
                setRows([]);
            } finally {
                setIsLoading(false);
            }
        };

        load();

        return () => controller.abort();
    }, [effectiveBranch, dateFilter, roleFilter]);

    const summary = useMemo(() => {
        const staffTotal = rows.length;
        const staffOnDuty = rows.filter((r) => r.onShift).length;
        const totalSales = rows.reduce((sum, r) => sum + r.totalSales, 0);
        return { staffTotal, staffOnDuty, totalSales };
    }, [rows]);

    const peso = (n: number) => {
        return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Monitoring" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Staff Monitoring</h1>
                        <p className="text-muted-foreground">Track who was on duty by date</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">On duty</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : summary.staffOnDuty}</div>
                            <p className="text-xs text-muted-foreground">{rangeLabel(dateFilter)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Staff total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : summary.staffTotal}</div>
                            <p className="text-xs text-muted-foreground">{rangeLabel(dateFilter)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : peso(summary.totalSales)}</div>
                            <p className="text-xs text-muted-foreground">{rangeLabel(dateFilter)}</p>
                        </CardContent>
                    </Card>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle>On-duty List</CardTitle>
                            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                                <div className="w-full md:w-48">
                                    <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilterValue)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cashier">Cashier</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="delivery">Delivery Staff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-full md:w-56">
                                    <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterKey)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Date range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="yesterday">Yesterday</SelectItem>
                                            <SelectItem value="this_week">This Week</SelectItem>
                                            <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="w-full overflow-x-auto">
                            <Table className="min-w-[960px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Staff Name</TableHead>
                                        <TableHead className="whitespace-nowrap">Branch</TableHead>
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                        <TableHead className="whitespace-nowrap">On Shift?</TableHead>
                                        <TableHead className="whitespace-nowrap text-right pr-8">Total Sales</TableHead>
                                        <TableHead className="whitespace-nowrap pl-8">Start Time</TableHead>
                                        <TableHead className="whitespace-nowrap">End Time</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                                Loading…
                                            </TableCell>
                                        </TableRow>
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                                No staff found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rows.map((r) => (
                                            <TableRow
                                                key={r.id}
                                                className="hover:bg-muted/40 cursor-pointer"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                    setSelectedRow(r);
                                                    setIsViewOpen(true);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedRow(r);
                                                        setIsViewOpen(true);
                                                    }
                                                }}
                                            >
                                                <TableCell className="font-medium whitespace-nowrap">{r.staffName}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge variant="outline">
                                                        {r.branch.charAt(0).toUpperCase() + r.branch.slice(1)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                                    {formatReadableDate(r.shiftDateISO)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge variant={r.onShift ? 'default' : 'secondary'}>
                                                        {r.onShift ? 'Yes' : 'No'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right tabular-nums pr-8">
                                                    {peso(r.totalSales)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap tabular-nums pl-8">
                                                    {formatReadableTime(r.startTime)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap tabular-nums">
                                                    {formatReadableTime(r.endTime)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type="button"
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedRow(r);
                                                                    setIsViewOpen(true);
                                                                }}
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Dialog
                    open={isViewOpen}
                    onOpenChange={(open) => {
                        setIsViewOpen(open);
                        if (!open) setSelectedRow(null);
                    }}
                >
                    <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="bg-orange-600/30 dark:bg-orange-900/20 p-6 border-b border-orange-100/50 dark:border-orange-900/30">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-orange-950 dark:text-orange-100">
                                        <Clock className="h-6 w-6 text-orange-600" /> Shift Details
                                    </DialogTitle>
                                    <DialogDescription className="text-orange-800/70 dark:text-orange-200/60">
                                        Activity log for personnel on duty.
                                    </DialogDescription>
                                </div>
                                {selectedRow && (
                                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200">
                                        {selectedRow.branch.charAt(0).toUpperCase() + selectedRow.branch.slice(1)} Branch
                                    </Badge>
                                )}
                            </div>
                        </DialogHeader>

                        {!selectedRow ? (
                            <div className="flex h-64 items-center justify-center text-muted-foreground italic">
                                No details available.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 h-[400px]">
                                {/* Staff Profile & Info */}
                                <div className="bg-orange-50/20 dark:bg-orange-950/5 p-8 border-r border-orange-100/30 flex flex-col justify-center space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600">
                                            <User className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-orange-950 dark:text-orange-100">
                                                {selectedRow.staffName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 capitalize">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                                    {selectedRow.role || 'Personnel'}
                                                </Badge>
                                                <span className="text-orange-300">•</span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {selectedRow.branch}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-orange-100/50">
                                            <div className="h-8 w-8 rounded-lg bg-orange-100/50 flex items-center justify-center text-orange-600">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">
                                                    Shift Date
                                                </p>
                                                <p className="text-sm font-semibold mt-1">
                                                    {formatReadableDate(selectedRow.shiftDateISO)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-orange-100/50">
                                            <div className="h-8 w-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                                <DollarSign className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">
                                                    Total Contributions
                                                </p>
                                                <p className="text-lg font-black text-green-600 tabular-nums leading-none mt-1">
                                                    {peso(selectedRow.totalSales)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Shift Performance/Timing */}
                                <div className="p-8 space-y-8 overflow-y-auto">
                                    <section className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-3 w-3" /> Timing Analysis
                                        </h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-4 rounded-2xl bg-muted/30 border space-y-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                                    Clock In
                                                </p>
                                                <p className="text-xl font-bold tabular-nums">
                                                    {formatReadableTime(selectedRow.startTime)}
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-muted/30 border space-y-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                                    Clock Out
                                                </p>
                                                <p className="text-xl font-bold tabular-nums">
                                                    {formatReadableTime(selectedRow.endTime)}
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Eye className="h-3 w-3" /> Status Monitoring
                                        </h4>
                                        <div className="rounded-2xl border p-4 flex items-center justify-between">
                                            <span className="text-sm font-medium">Currently on Shift?</span>
                                            <Badge
                                                variant={selectedRow.onShift ? 'default' : 'secondary'}
                                                className={selectedRow.onShift ? 'bg-green-600' : ''}
                                            >
                                                {selectedRow.onShift ? 'Active' : 'Completed'}
                                            </Badge>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
