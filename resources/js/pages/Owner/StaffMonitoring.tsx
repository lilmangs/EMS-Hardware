import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function isoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
}

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
                                        <TableRow key={r.id} className="hover:bg-muted/40">
                                            <TableCell className="font-medium whitespace-nowrap">{r.staffName}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant="outline">
                                                    {r.branch.charAt(0).toUpperCase() + r.branch.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">{formatReadableDate(r.shiftDateISO)}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant={r.onShift ? 'default' : 'secondary'}>
                                                    {r.onShift ? 'Yes' : 'No'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-right tabular-nums pr-8">{peso(r.totalSales)}</TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums pl-8">{formatReadableTime(r.startTime)}</TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums">{formatReadableTime(r.endTime)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => {
                                                        setSelectedRow(r);
                                                        setIsViewOpen(true);
                                                    }}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </Button>
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
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Shift Details</DialogTitle>
                        <DialogDescription>View staff shift information for the selected date.</DialogDescription>
                    </DialogHeader>

                    {!selectedRow ? (
                        <div className="text-sm text-muted-foreground">No details available.</div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-4">
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Staff</div>
                                    <div className="mt-1 text-base font-semibold">{selectedRow.staffName}</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">
                                            {selectedRow.branch === 'lagonglong' ? 'Lagonglong' : 'Balingasag'}
                                        </Badge>
                                        <Badge variant={selectedRow.onShift ? 'default' : 'secondary'}>
                                            {selectedRow.onShift ? 'On shift' : 'Off shift'}
                                        </Badge>
                                    </div>
                                    <div className="mt-3 text-sm text-muted-foreground">Date</div>
                                    <div className="mt-1 text-sm font-medium">{formatReadableDate(selectedRow.shiftDateISO)}</div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Total Sales</div>
                                    <div className="mt-1 text-2xl font-bold tabular-nums">{peso(selectedRow.totalSales)}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-lg border p-3">
                                    <div className="text-sm font-medium">Shift Time</div>
                                    <div className="mt-2 grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Start</div>
                                            <div className="mt-1 font-medium tabular-nums">{formatReadableTime(selectedRow.startTime)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">End</div>
                                            <div className="mt-1 font-medium tabular-nums">{formatReadableTime(selectedRow.endTime)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <div className="text-sm font-medium">Branch</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {selectedRow.branch === 'lagonglong' ? 'Lagonglong' : 'Balingasag'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
       </AppLayout>
    );
}
