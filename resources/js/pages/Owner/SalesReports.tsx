import { Head, usePage } from '@inertiajs/react';
import { DollarSign, MoreHorizontal, Package, ReceiptText, Target } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import {
    Area,
    AreaChart,
    Bar,
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
            data: Array<{
                id: number;
                ref: string;
                branch_key: 'lagonglong' | 'balingasag';
                items: number;
                delivery_fee?: number;
                total: number;
                subtotal: number;
                created_at: string | null;
            }>;
            meta: { current_page: number; per_page: number; last_page: number; total: number };
        };
    };

    const [data, setData] = useState<SalesReportResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    type SaleDetails = {
        id: number;
        ref: string;
        branch_key: 'lagonglong' | 'balingasag';
        created_at: string | null;
        subtotal: number;
        delivery_fee: number;
        total: number;
        items: Array<{ name: string; price: number; qty: number; line_total: number }>;
    };

    const [detailsSale, setDetailsSale] = useState<SaleDetails | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');

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

    const peso = useCallback((n: unknown) => {
        const num = Number(n) || 0;
        return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, []);

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

    const openTransactionDetails = useCallback(async (id: number) => {
        if (!id) return;

        setIsDetailsOpen(true);
        setIsDetailsLoading(true);
        setDetailsError('');

        try {
            const res = await fetch(`/owner/sales-reports/transactions/${id}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
            });
            const json = (await res.json().catch(() => null)) as { sale?: SaleDetails; message?: string } | null;
            if (!res.ok) throw new Error(json?.message || 'Failed to load transaction details');
            if (!json?.sale) throw new Error('Missing transaction details');
            setDetailsSale(json.sale);
        } catch (e: any) {
            setDetailsSale(null);
            setDetailsError(e?.message ? String(e.message) : 'Failed to load transaction details');
        } finally {
            setIsDetailsLoading(false);
        }
    }, []);

    const printReport = useCallback(async () => {
        try {
            const stamp = new Date().toLocaleString();

            const allRows: SalesReportResponse['transactions']['data'] = [];
            let nextPage = 1;
            let lastPage = 1;
            const exportPerPage = 200;

            while (nextPage <= lastPage) {
                const params = new URLSearchParams();
                params.set('branch_key', effectiveBranch);
                params.set('range', range);
                params.set('page', String(nextPage));
                params.set('per_page', String(exportPerPage));

                const res = await fetch(`/owner/sales-reports/data?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store',
                });

                const json = (await res.json().catch(() => null)) as SalesReportResponse | null;
                if (!res.ok || !json) throw new Error((json as any)?.message || 'Failed to export sales report');

                allRows.push(...(json.transactions?.data ?? []));
                lastPage = json.transactions?.meta?.last_page ?? 1;
                nextPage += 1;

                if (lastPage > 50) {
                    throw new Error('Too many pages to export at once. Please narrow the time range.');
                }
            }

            const rows = allRows;
            const totals = rows.reduce(
                (acc, t) => {
                    acc.items += Number(t.items) || 0;
                    acc.subtotal += Number(t.subtotal) || 0;
                    acc.deliveryFee += Number(t.delivery_fee) || 0;
                    acc.total += Number(t.total) || 0;
                    return acc;
                },
                { items: 0, subtotal: 0, deliveryFee: 0, total: 0 },
            );

            const tableRows = rows
                .map((t) => {
                    const safe = (v: unknown) => String(v ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const deliveryFee = Number(t.delivery_fee) || 0;
                    return `
                        <tr>
                            <td>${safe(t.ref)}</td>
                            <td>${safe(branchLabel(t.branch_key))}</td>
                            <td>${safe(formatDateTime(t.created_at))}</td>
                            <td style="text-align:right">${Number(t.items) || 0}</td>
                            <td style="text-align:right">${peso(t.subtotal)}</td>
                            <td style="text-align:right">${deliveryFee > 0 ? peso(deliveryFee) : '—'}</td>
                            <td style="text-align:right">${peso(t.total)}</td>
                        </tr>
                    `;
                })
                .join('');

            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sales Report</title>
  <style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;}
    body{margin:0;padding:16px;color:#111;background:#fff;}
    .wrap{max-width:1100px;margin:0 auto;}
    .title{font-size:16px;font-weight:800;margin:0;}
    .meta{margin:6px 0 14px;font-size:12px;color:#555;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th,td{padding:8px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top;}
    th{text-align:left;background:#f3f4f6;font-weight:700;}
    .totals-row{font-weight:700;background:#f9fafb;border-top:2px solid #e5e7eb;}
    @media print{body{padding:0}.wrap{max-width:none}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1 class="title">Sales Report</h1>
    <div class="meta">
      <div>Generated: ${String(stamp).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div>Branch: ${effectiveBranch === 'all' ? 'All' : branchLabel(effectiveBranch)}</div>
      <div>Range: ${String(range).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Ref</th>
          <th>Branch</th>
          <th>Date</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Subtotal</th>
          <th style="text-align:right">Delivery Fee</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tbody>
        <tr class="totals-row">
          <td colspan="3" style="font-weight:700;text-align:left;">TOTALS (${rows.length} transactions)</td>
          <td style="text-align:right">${totals.items}</td>
          <td style="text-align:right">${peso(totals.subtotal)}</td>
          <td style="text-align:right">${totals.deliveryFee > 0 ? peso(totals.deliveryFee) : '—'}</td>
          <td style="text-align:right">${peso(totals.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <script>window.onload=function(){window.print();};</script>
</body>
</html>`;

            const pw = window.open('', '_blank', 'width=1200,height=800');
            if (!pw) return;
            pw.document.open();
            pw.document.write(html);
            pw.document.close();
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Export failed.');
        }
    }, [branchLabel, effectiveBranch, formatDateTime, peso, range]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Reports" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Sales Reports</h1>
                        <p className="text-muted-foreground">Sales totals and recent transactions</p>
                    </div>

                    <div className="flex items-center gap-2">
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
                        <Button type="button" variant="outline" onClick={printReport} disabled={isLoading}>
                            Export PDF
                        </Button>
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
                    </CardHeader>
                    <CardContent>
                        <div className="h-72 w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart data={trend} margin={{ top: 10, right: 18, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 12 }}
                                        interval="preserveStartEnd"
                                        tickFormatter={formatTrendTick}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${Number(v || 0).toLocaleString()}`} width={62} />
                                    <Tooltip
                                        formatter={(value: any) => [`₱${Number(value || 0).toLocaleString()}`, 'Revenue']}
                                        labelFormatter={formatTrendTooltipLabel}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#f97316"
                                        fill="#fb923c"
                                        fillOpacity={0.25}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
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
                                        <TableHead className="text-right">Delivery Fee</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="pl-10 min-w-[180px]">Date</TableHead>
                                        <TableHead className="text-right w-12">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow
                                            key={t.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openTransactionDetails(t.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    openTransactionDetails(t.id);
                                                }
                                            }}
                                        >
                                            <TableCell className="font-medium">{t.ref}</TableCell>
                                            <TableCell>{branchLabel(t.branch_key)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{t.items}</TableCell>
                                            <TableCell className="text-right tabular-nums">{peso(t.subtotal || 0)}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {Number(t.delivery_fee || 0) > 0 ? peso(t.delivery_fee || 0) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{peso(t.total || 0)}</TableCell>
                                            <TableCell className="pl-10 min-w-[180px] text-muted-foreground">{formatDateTime(t.created_at)}</TableCell>
                                            <TableCell className="text-right">
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
                                                                openTransactionDetails(t.id);
                                                            }}
                                                        >
                                                            View Details
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {!isLoading && !transactions.length && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                                                No transactions found.
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
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

            <Dialog
                open={isDetailsOpen}
                onOpenChange={(open) => {
                    setIsDetailsOpen(open);
                    if (!open) {
                        setDetailsSale(null);
                        setDetailsError('');
                        setIsDetailsLoading(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Transaction Details</DialogTitle>
                        <DialogDescription>View the full breakdown of this sale.</DialogDescription>
                    </DialogHeader>

                    {isDetailsLoading ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : detailsError ? (
                        <div className="text-sm text-destructive">{detailsError}</div>
                    ) : !detailsSale ? (
                        <div className="text-sm text-muted-foreground">No transaction selected.</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Reference</div>
                                    <div className="mt-1 font-semibold">{detailsSale.ref}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Date</div>
                                    <div className="mt-1 font-medium">{formatDateTime(detailsSale.created_at)}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Branch</div>
                                    <div className="mt-1 font-medium">{branchLabel(detailsSale.branch_key)}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Items</div>
                                    <div className="mt-1 font-medium tabular-nums">{detailsSale.items.length}</div>
                                </div>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Line Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailsSale.items.map((it, idx) => (
                                            <TableRow key={`${detailsSale.id}-${idx}`}> 
                                                <TableCell className="font-medium">{it.name}</TableCell>
                                                <TableCell className="text-right tabular-nums">{it.qty}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(it.price)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(it.line_total)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {!detailsSale.items.length && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                                    No items found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Subtotal</div>
                                    <div className="mt-1 font-semibold tabular-nums">{peso(detailsSale.subtotal)}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Delivery Fee</div>
                                    <div className="mt-1 font-semibold tabular-nums">{detailsSale.delivery_fee > 0 ? peso(detailsSale.delivery_fee) : '—'}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Total</div>
                                    <div className="mt-1 font-semibold text-primary tabular-nums">{peso(detailsSale.total)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
