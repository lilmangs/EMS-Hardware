import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    TicketX,
    PhilippinePeso,
    CheckCircle2,
    XCircle,
    Search,
    Eye,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Refunds',
        href: '/owner/refunds',
    },
];

type RefundRow = {
    id: number;
    ref: string;
    branch_key: 'lagonglong' | 'balingasag';
    amount: number;
    reason: string | null;
    created_at: string;
    processed_at: string | null;
    sale: null | { id: number; ref: string };
    processed_by: null | { id: number; name: string };
    items: Array<{ id: number; name: string; qty: number; amount: number }>;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type RefundsData = {
    filters: {
        branch_key: 'all' | 'lagonglong' | 'balingasag';
        search: string;
        date_from: string | null;
        date_to: string | null;
        sort: 'created_at' | 'amount' | 'branch_key';
        dir: 'asc' | 'desc';
        per_page: number;
        page: number;
    };
    summary: {
        total_refunds_today: number;
        total_refund_amount_today: number;
        approved: number;
        rejected: number;
    };
    refunds: Paginated<RefundRow>;
};

const peso = (n: number | null | undefined) => `₱${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDateTime(s: string | null | undefined) {
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function productSummary(items: RefundRow['items']) {
    if (!items?.length) return '';
    return items
        .map((i) => `${i.name} x${i.qty}`)
        .slice(0, 2)
        .join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '');
}

export default function Refunds() {
    const { auth } = usePage<{ auth?: { user?: { role: string; branch_key: 'lagonglong' | 'balingasag' | null } } }>().props;
    const user = auth?.user ?? null;
    const userBranchKey = user?.branch_key ?? null;
    const isBranchRestrictedUser = !!user && ['staff', 'cashier', 'delivery'].includes(user.role) && !!userBranchKey;

    const { branch: globalBranch } = useBranchFilter();
    const effectiveBranch: 'all' | 'lagonglong' | 'balingasag' = isBranchRestrictedUser
        ? (userBranchKey as 'lagonglong' | 'balingasag')
        : globalBranch;

    const [data, setData] = useState<RefundsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('week');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [search, setSearch] = useState('');

    const [sort, setSort] = useState<'created_at' | 'amount' | 'branch_key'>('created_at');
    const [dir, setDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState<RefundRow | null>(null);

    const activeFetchRef = useRef<AbortController | null>(null);
    const fetchSeqRef = useRef(0);

    const computedDates = useMemo(() => {
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

        if (dateRange === 'all') {
            return { from: null, to: null };
        }

        if (dateRange === 'custom') {
            return {
                from: dateFrom ? new Date(dateFrom + 'T00:00:00') : null,
                to: dateTo ? new Date(dateTo + 'T23:59:59') : null,
            };
        }

        if (dateRange === 'yesterday') {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            return { from: startOfDay(y), to: endOfDay(y) };
        }

        if (dateRange === 'week') {
            const start = startOfDay(now);
            start.setDate(start.getDate() - 6);
            return { from: start, to: endOfDay(now) };
        }

        return { from: startOfDay(now), to: endOfDay(now) };
    }, [dateRange, dateFrom, dateTo]);

    const fetchData = useCallback(async () => {
        const seq = ++fetchSeqRef.current;
        if (activeFetchRef.current) {
            activeFetchRef.current.abort();
        }
        const controller = new AbortController();
        activeFetchRef.current = controller;

        setIsLoading(true);
        try {
            setError('');
            const params = new URLSearchParams();
            params.set('branch_key', effectiveBranch);
            params.set('search', search);
            params.set('sort', sort);
            params.set('dir', dir);
            params.set('page', String(page));
            params.set('per_page', String(perPage));

            if (computedDates.from) {
                params.set('date_from', computedDates.from.toISOString().slice(0, 10));
            }
            if (computedDates.to) {
                params.set('date_to', computedDates.to.toISOString().slice(0, 10));
            }

            const res = await fetch(`/owner/refunds/data?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
            });
            if (!res.ok) throw new Error('Failed to load refunds');
            const json = (await res.json()) as RefundsData;
            if (seq === fetchSeqRef.current && !controller.signal.aborted) {
                setData(json);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError(e?.message ? String(e.message) : 'Failed to load refunds');
        } finally {
            if (seq === fetchSeqRef.current && !controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [computedDates.from, computedDates.to, dir, effectiveBranch, page, perPage, search, sort]);

    useEffect(() => {
        return () => {
            if (activeFetchRef.current) {
                activeFetchRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        setPage(1);
    }, [effectiveBranch, dateRange, dateFrom, dateTo, search, sort, dir, perPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleSort = useCallback((nextSort: typeof sort) => {
        if (sort === nextSort) {
            setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSort(nextSort);
            setDir('desc');
        }
    }, [sort]);

    const openView = useCallback((r: RefundRow) => {
        setSelectedRefund(r);
        setIsViewOpen(true);
    }, []);

    const refundsRaw = data?.refunds?.data ?? [];
    const refunds = useMemo(() => {
        if (effectiveBranch === 'all') return refundsRaw;
        return refundsRaw.filter((r) => r.branch_key === effectiveBranch);
    }, [effectiveBranch, refundsRaw]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Refunds" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Refunds</h1>
                        <p className="text-muted-foreground">Monitor refund requests and processed refunds across branches</p>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Refunds Today</CardTitle>
                            <TicketX className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.total_refunds_today ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">
                                {effectiveBranch === 'all' ? 'All branches' : `Branch: ${effectiveBranch}`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Refund Amount Today</CardTitle>
                            <PhilippinePeso className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{peso(data?.summary.total_refund_amount_today ?? (isLoading ? 0 : 0))}</div>
                            <p className="text-xs text-muted-foreground">Total refunded amount today</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Processed</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.approved ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">Refunds completed</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Declined</CardTitle>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.rejected ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">Refunds denied</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="space-y-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle>Refund List</CardTitle>
                                <div className="text-sm text-muted-foreground">Search, filter, and manage refunds</div>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                    placeholder="Search refund ID, sale ID, product…"
                                />
                            </div>

                            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Date" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="yesterday">Yesterday</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={String(perPage)} onValueChange={(v: any) => setPerPage(Number(v) || 10)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Rows" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 rows</SelectItem>
                                    <SelectItem value="20">20 rows</SelectItem>
                                    <SelectItem value="50">50 rows</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dateRange === 'custom' && (
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <div className="mb-1 text-xs font-medium text-muted-foreground">From</div>
                                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                </div>
                                <div>
                                    <div className="mb-1 text-xs font-medium text-muted-foreground">To</div>
                                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent>
                        <div className="w-full overflow-x-auto">
                            <Table className="min-w-[1100px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                                            Date & Time
                                        </TableHead>
                                        <TableHead>Refund ID</TableHead>
                                        <TableHead>Sale ID</TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => toggleSort('branch_key')}>
                                            Branch
                                        </TableHead>
                                        <TableHead>Product(s)</TableHead>
                                        <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('amount')}>
                                            Amount
                                        </TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Processed By</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {refunds.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="whitespace-nowrap">{formatDateTime(r.created_at)}</TableCell>
                                            <TableCell className="font-medium">{r.ref}</TableCell>
                                            <TableCell className="text-muted-foreground">{r.sale?.ref ?? '—'}</TableCell>
                                            <TableCell>{r.branch_key === 'lagonglong' ? 'Lagonglong' : 'Balingasag'}</TableCell>
                                            <TableCell className="max-w-[260px] truncate" title={productSummary(r.items)}>
                                                {productSummary(r.items) || '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{peso(r.amount)}</TableCell>
                                            <TableCell className="max-w-[280px] truncate" title={r.reason ?? ''}>
                                                {r.reason ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{r.processed_by?.name ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => openView(r)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {!refunds.length && !isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                                                No refunds found.
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                                                Loading…
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-muted-foreground">
                                {data?.refunds?.from ? (
                                    <>
                                        Showing {data.refunds.from}–{data.refunds.to} of {data.refunds.total}
                                    </>
                                ) : (
                                    <>Showing 0 results</>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={isLoading || (data?.refunds?.current_page ?? 1) <= 1}
                                >
                                    Prev
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                    Page {data?.refunds?.current_page ?? 1} of {data?.refunds?.last_page ?? 1}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={
                                        isLoading ||
                                        (data?.refunds?.current_page ?? 1) >= (data?.refunds?.last_page ?? 1)
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Dialog
                    open={isViewOpen}
                    onOpenChange={(open) => {
                        setIsViewOpen(open);
                        if (!open) setSelectedRefund(null);
                    }}
                >
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Refund Details</DialogTitle>
                            <DialogDescription>Review refund information and refunded items.</DialogDescription>
                        </DialogHeader>

                        {!selectedRefund ? (
                            <div className="text-sm text-muted-foreground">No refund selected.</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
                                    <div>
                                        <div className="text-muted-foreground">Refund Ref</div>
                                        <div className="font-medium">{selectedRefund.ref}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Sale Ref</div>
                                        <div className="font-medium">{selectedRefund.sale?.ref ?? '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Branch</div>
                                        <div className="font-medium">{selectedRefund.branch_key === 'lagonglong' ? 'Lagonglong' : 'Balingasag'}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Created</div>
                                        <div className="font-medium">{formatDateTime(selectedRefund.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Processed</div>
                                        <div className="font-medium">{formatDateTime(selectedRefund.processed_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Processed By</div>
                                        <div className="font-medium">{selectedRefund.processed_by?.name ?? '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Amount</div>
                                        <div className="font-semibold tabular-nums">{peso(selectedRefund.amount)}</div>
                                    </div>
                                </div>

                                <div className="rounded-md border p-4 text-sm">
                                    <div className="text-muted-foreground">Reason</div>
                                    <div className="mt-1 font-medium">{selectedRefund.reason ?? '—'}</div>
                                </div>

                                <div className="rounded-md border">
                                    <div className="border-b px-4 py-3 text-sm font-medium">Refunded Items</div>
                                    <div className="max-h-[40vh] overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(selectedRefund.items ?? []).map((it) => (
                                                    <TableRow key={it.id}>
                                                        <TableCell className="font-medium">{it.name}</TableCell>
                                                        <TableCell className="text-right tabular-nums">{it.qty}</TableCell>
                                                        <TableCell className="text-right tabular-nums">{peso(it.amount)}</TableCell>
                                                    </TableRow>
                                                ))}

                                                {(!selectedRefund.items || selectedRefund.items.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                                                            No items.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
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
