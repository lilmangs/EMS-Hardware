import { Head, usePage } from '@inertiajs/react';
import { DollarSign, Package, ReceiptText, Target } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sales Reports',
        href: '/SalesReports',
    },
];

export default function SalesReports() {
    const { auth } = usePage<{ auth?: { user?: { role: string; branch_key: 'lagonglong' | 'balingasag' | null } } }>().props;
    const user = auth?.user ?? null;
    const userBranchKey = user?.branch_key ?? null;
    const isBranchRestrictedUser = !!user && ['staff', 'cashier', 'delivery'].includes(user.role) && !!userBranchKey;

    const { branch: globalBranch } = useBranchFilter();
    const effectiveBranch: 'all' | 'lagonglong' | 'balingasag' = isBranchRestrictedUser
        ? (userBranchKey as 'lagonglong' | 'balingasag')
        : globalBranch;

    const [range, setRange] = useState<'today' | 'week' | 'month'>('week');
    const [page, setPage] = useState(1);
    const perPage = 10;

    type SalesReportResponse = {
        filters: { branch_key: 'all' | 'lagonglong' | 'balingasag'; range: 'today' | 'week' | 'month'; from: string; to: string };
        trend: Array<{ label: string; revenue: number }>;
        summary: { revenue: number; subtotal: number; orders: number; items: number; avg_order_value: number };
        transactions: {
            data: Array<{ id: number; ref: string; branch_key: 'lagonglong' | 'balingasag'; items: number; total: number; subtotal: number; created_at: string | null }>;
            meta: { current_page: number; per_page: number; last_page: number; total: number };
        };
    };

    const [data, setData] = useState<SalesReportResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const activeFetchRef = useRef<AbortController | null>(null);
    const fetchSeqRef = useRef(0);

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
            params.set('range', range);
            params.set('page', String(page));
            params.set('per_page', String(perPage));

            const res = await fetch(`/owner/sales-reports/data?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
            });

            const json = (await res.json().catch(() => null)) as SalesReportResponse | null;
            if (!res.ok) throw new Error((json as any)?.message || 'Failed to load sales report');

            if (seq === fetchSeqRef.current && !controller.signal.aborted) {
                setData(json);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError(e?.message ? String(e.message) : 'Failed to load sales report');
        } finally {
            if (seq === fetchSeqRef.current && !controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [effectiveBranch, page, perPage, range]);

    useEffect(() => {
        setPage(1);
    }, [effectiveBranch, range]);

    useEffect(() => {
        setData(null);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        return () => {
            if (activeFetchRef.current) {
                activeFetchRef.current.abort();
            }
        };
    }, []);

    const summary = data?.summary;
    const transactions = data?.transactions?.data ?? [];
    const transactionsMeta = data?.transactions?.meta ?? null;
    const trend = data?.trend ?? [];

    const formatDateTime = useCallback((iso: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }, []);

    const formatTrendTick = useCallback((label: unknown) => {
        if (label === null || label === undefined) return '';
        const raw = String(label);
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return raw;
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
        });
    }, []);

    const formatTrendTooltipLabel = useCallback((label: unknown) => {
        return formatTrendTick(label);
    }, [formatTrendTick]);

    const branchLabel = useCallback((k: 'lagonglong' | 'balingasag') => {
        return k === 'lagonglong' ? 'Lagonglong' : 'Balingasag';
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Reports" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Sales Reports</h1>
                        <p className="text-muted-foreground">Sales totals and recent transactions</p>
                    </div>
                </div>

                {!!error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">₱{(summary?.revenue ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">{isLoading ? 'Loading…' : 'Total sales'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Orders</CardTitle>
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{(summary?.orders ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total transactions</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{(summary?.items ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Products sold</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Order</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">₱{Number(summary?.avg_order_value ?? 0).toFixed(0)}</div>
                            <p className="text-xs text-muted-foreground">Per transaction</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                            <CardTitle>Sales Trend</CardTitle>
                            <CardDescription>Revenue over the selected range.</CardDescription>
                        </div>
                        <Select value={range} onValueChange={(value: any) => setRange(value)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Time Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <div className="h-72 w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={trend} margin={{ top: 10, right: 18, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 12 }}
                                        interval="preserveStartEnd"
                                        tickFormatter={formatTrendTick}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} width={60} />
                                    <Tooltip
                                        labelFormatter={formatTrendTooltipLabel}
                                        formatter={(value: any) => {
                                            const n = Number(value) || 0;
                                            return [`₱${n.toLocaleString()}`, 'Revenue'];
                                        }}
                                    />
                                    <Bar dataKey="revenue" fill="#ea580c" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {!isLoading && trend.length === 0 && (
                            <div className="mt-3 text-sm text-muted-foreground">No trend data available.</div>
                        )}
                        {isLoading && (
                            <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest sales for the selected range and branch.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ref</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead className="text-right">Items</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="pl-10 min-w-[180px]">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-medium">{t.ref}</TableCell>
                                            <TableCell>{branchLabel(t.branch_key)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{t.items}</TableCell>
                                            <TableCell className="text-right tabular-nums">₱{Number(t.subtotal || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">₱{Number(t.total || 0).toLocaleString()}</TableCell>
                                            <TableCell className="pl-10 min-w-[180px] text-muted-foreground">{formatDateTime(t.created_at)}</TableCell>
                                        </TableRow>
                                    ))}

                                    {!isLoading && !transactions.length && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                                No transactions found.
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                                Loading…
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                {transactionsMeta
                                    ? `Page ${transactionsMeta.current_page} of ${transactionsMeta.last_page} • ${transactionsMeta.total} total`
                                    : ''}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={isLoading || !transactionsMeta || transactionsMeta.current_page <= 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={
                                        isLoading ||
                                        !transactionsMeta ||
                                        transactionsMeta.current_page >= transactionsMeta.last_page
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
