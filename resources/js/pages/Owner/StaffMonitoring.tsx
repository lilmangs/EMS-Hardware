import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { useMemo, useState } from 'react';
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

type StaffShiftRow = {
    id: number;
    staffName: string;
    branch: 'lagonglong' | 'balingasag';
    shiftDateISO: string; // yyyy-mm-dd
    onShift: boolean;
    totalSales: number;
    startTime: string;
    endTime: string;
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

export default function StaffMonitoring() {
    const { branch: effectiveBranch } = useBranchFilter();
    const [dateFilter, setDateFilter] = useState<DateFilterKey>('today');
    const [selectedRow, setSelectedRow] = useState<StaffShiftRow | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const rows = useMemo(() => {
        const today = startOfDay(new Date());
        const yesterday = addDays(today, -1);
        const todayISO = isoDate(today);
        const yesterdayISO = isoDate(yesterday);

        const sampleRows: StaffShiftRow[] = [
            { id: 1, staffName: 'Maria Garcia', branch: 'lagonglong', shiftDateISO: todayISO, onShift: true, totalSales: 12300, startTime: '08:00', endTime: '17:00' },
            { id: 2, staffName: 'Robert Chen', branch: 'lagonglong', shiftDateISO: todayISO, onShift: true, totalSales: 8450, startTime: '09:00', endTime: '18:00' },
            { id: 3, staffName: 'Sarah Johnson', branch: 'balingasag', shiftDateISO: todayISO, onShift: false, totalSales: 0, startTime: '—', endTime: '—' },
            { id: 4, staffName: 'Michael Brown', branch: 'balingasag', shiftDateISO: todayISO, onShift: true, totalSales: 3920, startTime: '10:00', endTime: '19:00' },
            { id: 5, staffName: 'Maria Garcia', branch: 'lagonglong', shiftDateISO: yesterdayISO, onShift: true, totalSales: 10120, startTime: '08:00', endTime: '17:00' },
            { id: 6, staffName: 'Robert Chen', branch: 'lagonglong', shiftDateISO: yesterdayISO, onShift: false, totalSales: 0, startTime: '—', endTime: '—' },
            { id: 7, staffName: 'Sarah Johnson', branch: 'balingasag', shiftDateISO: yesterdayISO, onShift: true, totalSales: 6420, startTime: '09:00', endTime: '18:00' },
            { id: 8, staffName: 'Michael Brown', branch: 'balingasag', shiftDateISO: yesterdayISO, onShift: true, totalSales: 7150, startTime: '09:00', endTime: '18:00' },
        ];

        const branchFiltered = effectiveBranch === 'all'
            ? sampleRows
            : sampleRows.filter((r) => r.branch === effectiveBranch);

        const now = startOfDay(new Date());
        const currentDay = isoDate(now);
        const yesterdayDay = isoDate(addDays(now, -1));

        const inThisWeek = (iso: string) => {
            const d = new Date(`${iso}T00:00:00`);
            const day = d.getDay(); // 0=Sun
            const mondayBased = day === 0 ? 6 : day - 1;
            const weekStart = startOfDay(addDays(d, -mondayBased));
            const weekEnd = startOfDay(addDays(weekStart, 7));
            const target = startOfDay(d);
            return target >= weekStart && target < weekEnd;
        };

        const inLast7Days = (iso: string) => {
            const d = startOfDay(new Date(`${iso}T00:00:00`));
            const end = startOfDay(addDays(now, 1));
            const start = startOfDay(addDays(now, -6));
            return d >= start && d < end;
        };

        return branchFiltered.filter((r) => {
            if (dateFilter === 'today') return r.shiftDateISO === currentDay;
            if (dateFilter === 'yesterday') return r.shiftDateISO === yesterdayDay;
            if (dateFilter === 'this_week') return inThisWeek(r.shiftDateISO);
            return inLast7Days(r.shiftDateISO);
        });
    }, [effectiveBranch, dateFilter]);

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
                        <div className="text-2xl font-bold">{summary.staffOnDuty}</div>
                        <p className="text-xs text-muted-foreground">{rangeLabel(dateFilter)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Staff total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.staffTotal}</div>
                        <p className="text-xs text-muted-foreground">{rangeLabel(dateFilter)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{peso(summary.totalSales)}</div>
                        <p className="text-xs text-muted-foreground">{rangeLabel(dateFilter)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
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

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <CardTitle>On-duty List</CardTitle>
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
                                {rows.length === 0 ? (
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
                                            <TableCell className="whitespace-nowrap">{r.shiftDateISO}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant={r.onShift ? 'default' : 'secondary'}>
                                                    {r.onShift ? 'Yes' : 'No'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-right tabular-nums pr-8">{peso(r.totalSales)}</TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums pl-8">{r.startTime}</TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums">{r.endTime}</TableCell>
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
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Shift Details</DialogTitle>
                        <DialogDescription>View staff shift information for the selected date.</DialogDescription>
                    </DialogHeader>

                    {!selectedRow ? (
                        <div className="text-sm text-muted-foreground">No details available.</div>
                    ) : (
                        <div className="grid gap-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-muted-foreground">Staff</div>
                                    <div className="font-medium">{selectedRow.staffName}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Branch</div>
                                    <div className="font-medium">{selectedRow.branch === 'lagonglong' ? 'Lagonglong' : 'Balingasag'}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Date</div>
                                    <div className="font-medium">{selectedRow.shiftDateISO}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">On Shift</div>
                                    <div className="font-medium">{selectedRow.onShift ? 'Yes' : 'No'}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Start</div>
                                    <div className="font-medium">{selectedRow.startTime}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">End</div>
                                    <div className="font-medium">{selectedRow.endTime}</div>
                                </div>
                            </div>

                            <div>
                                <div className="text-muted-foreground">Total Sales</div>
                                <div className="text-lg font-semibold tabular-nums">{peso(selectedRow.totalSales)}</div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
       </AppLayout>
    );
}
