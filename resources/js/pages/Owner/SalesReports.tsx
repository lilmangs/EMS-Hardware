import { Head, usePage } from '@inertiajs/react';
import { DollarSign, FileDown, MoreHorizontal, Package, ReceiptText, Target, Info, XCircle, Truck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
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
        title: 'Owner Dashboard',
        href: '/dashboard',
    },
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
        summary: { revenue: number; cost: number; profit: number; orders: number; items: number; avg_order_value: number };
        daily_summary: Array<{ date: string; revenue: number; cost: number; profit: number }>;
        monthly_summary: Array<{ month: string; revenue: number; cost: number; profit: number }>;
        product_monthly_breakdown: Array<{
            month: string;
            product_name: string;
            quantity: number;
            revenue: number;
            cost: number;
            profit: number;
        }>;
        transactions: {
            data: Array<{
                id: number;
                ref: string;
                branch_key: 'lagonglong' | 'balingasag';
                items: number;
                delivery_fee?: number;
                total: number;
                revenue: number;
                cost: number;
                profit: number;
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
        items: Array<{ name: string; price: number; purchase_cost: number; qty: number; line_total: number; line_cost: number; line_profit: number }>;
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

    const formatDailyBucketLabel = useCallback((bucket: string) => {
        if (!bucket) return '—';
        const d = new Date(bucket);
        if (Number.isNaN(d.getTime())) return bucket;
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    }, []);

    const formatMonthlyBucketLabel = useCallback((bucket: string) => {
        if (!bucket) return '—';
        // Controller returns `YYYY-MM`; normalize into a real date for formatting.
        const d = new Date(`${bucket}-01`);
        if (Number.isNaN(d.getTime())) return bucket;
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    }, []);

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
        const esc = (v: unknown) =>
            String(v ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

        const rangeTitle = (r: string) =>
            r === 'today' ? 'Today' : r === 'month' ? 'This Month' : 'This Week';

        const formatPeriodLine = (from: string, to: string) => {
            const a = new Date(from);
            const b = new Date(to);
            if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${from} – ${to}`;
            const opts: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            };
            return `${a.toLocaleString(undefined, opts)} – ${b.toLocaleString(undefined, opts)}`;
        };

        try {
            const stamp = new Date().toLocaleString();

            const paramsBase = new URLSearchParams();
            paramsBase.set('branch_key', effectiveBranch);
            paramsBase.set('range', range);

            const firstParams = new URLSearchParams(paramsBase);
            firstParams.set('page', '1');
            firstParams.set('per_page', '1');

            const firstRes = await fetch(`/owner/sales-reports/data?${firstParams.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
            });
            const firstJson = (await firstRes.json().catch(() => null)) as SalesReportResponse | null;
            if (!firstRes.ok || !firstJson) {
                throw new Error((firstJson as any)?.message || 'Failed to load sales report for print');
            }

            const filters = firstJson.filters;
            const summary = firstJson.summary;
            const dailySummary = firstJson.daily_summary ?? [];
            const monthlySummary = firstJson.monthly_summary ?? [];
            const productBreakdown = firstJson.product_monthly_breakdown ?? [];

            const allRows: SalesReportResponse['transactions']['data'] = [];
            let nextPage = 1;
            let lastPage = 1;
            const exportPerPage = 200;

            while (nextPage <= lastPage) {
                const params = new URLSearchParams(paramsBase);
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
                    acc.revenue += Number(t.revenue) || 0;
                    acc.cost += Number(t.cost) || 0;
                    acc.profit += Number(t.profit) || 0;
                    acc.deliveryFee += Number(t.delivery_fee) || 0;
                    acc.total += Number(t.total) || 0;
                    return acc;
                },
                { items: 0, revenue: 0, cost: 0, profit: 0, deliveryFee: 0, total: 0 },
            );

            const summaryRowsHtml = `
        <tr><td>Revenue</td><td style="text-align:right;font-weight:600">${peso(summary?.revenue ?? 0)}</td></tr>
        <tr><td>Cost</td><td style="text-align:right;font-weight:600">${peso(summary?.cost ?? 0)}</td></tr>
        <tr><td>Profit</td><td style="text-align:right;font-weight:600">${peso(summary?.profit ?? 0)}</td></tr>
        <tr><td>Orders</td><td style="text-align:right;font-weight:600">${Number(summary?.orders ?? 0).toLocaleString()}</td></tr>
        <tr><td>Items sold</td><td style="text-align:right;font-weight:600">${Number(summary?.items ?? 0).toLocaleString()}</td></tr>
        <tr><td>Avg order value</td><td style="text-align:right;font-weight:600">${peso(summary?.avg_order_value ?? 0)}</td></tr>`;

            const dailyRowsHtml = dailySummary
                .map(
                    (row) => `
        <tr>
          <td>${esc(formatDailyBucketLabel(row.date))}</td>
          <td style="text-align:right">${peso(row.revenue)}</td>
          <td style="text-align:right">${peso(row.cost)}</td>
          <td style="text-align:right">${peso(row.profit)}</td>
        </tr>`,
                )
                .join('');

            const monthlyRowsHtml = monthlySummary
                .map(
                    (row) => `
        <tr>
          <td>${esc(formatMonthlyBucketLabel(row.month))}</td>
          <td style="text-align:right">${peso(row.revenue)}</td>
          <td style="text-align:right">${peso(row.cost)}</td>
          <td style="text-align:right">${peso(row.profit)}</td>
        </tr>`,
                )
                .join('');

            const productRowsHtml = productBreakdown
                .map(
                    (row) => `
        <tr>
          <td>${esc(formatMonthlyBucketLabel(row.month))}</td>
          <td>${esc(row.product_name)}</td>
          <td style="text-align:right">${Number(row.quantity).toLocaleString()}</td>
          <td style="text-align:right">${peso(row.revenue)}</td>
          <td style="text-align:right">${peso(row.cost)}</td>
          <td style="text-align:right">${peso(row.profit)}</td>
        </tr>`,
                )
                .join('');

            const tableRows = rows
                .map((t) => {
                    const deliveryFee = Number(t.delivery_fee) || 0;
                    return `
                        <tr>
                            <td>${esc(t.ref)}</td>
                            <td>${esc(branchLabel(t.branch_key))}</td>
                            <td>${esc(formatDateTime(t.created_at))}</td>
                            <td style="text-align:right">${Number(t.items) || 0}</td>
                            <td style="text-align:right">${peso(t.revenue)}</td>
                            <td style="text-align:right">${peso(t.cost)}</td>
                            <td style="text-align:right">${peso(t.profit)}</td>
                            <td style="text-align:right">${deliveryFee > 0 ? peso(deliveryFee) : '—'}</td>
                            <td style="text-align:right">${peso(t.total)}</td>
                        </tr>
                    `;
                })
                .join('');

            const branchLine = effectiveBranch === 'all' ? 'All branches' : branchLabel(effectiveBranch);
            const periodLine = filters ? formatPeriodLine(filters.from, filters.to) : '';

            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sales Report — ${esc(rangeTitle(range))}</title>
  <style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;}
    body{margin:0;padding:20px;color:#111827;background:#fff;}
    .wrap{max-width:1100px;margin:0 auto;}
    .doc-title{font-size:22px;font-weight:800;margin:0 0 4px;letter-spacing:-0.02em;}
    .doc-sub{font-size:13px;color:#6b7280;margin:0 0 16px;}
    .meta{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 16px;font-size:12px;color:#374151;margin-bottom:20px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;}
    .meta strong{color:#111827;}
    .section{margin-top:22px;page-break-inside:avoid;}
    .section h2{font-size:14px;font-weight:700;margin:0 0 10px;color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:6px;}
    table.report{width:100%;border-collapse:collapse;font-size:12px;}
    table.report th,table.report td{padding:8px 10px;border:1px solid #e5e7eb;vertical-align:top;}
    table.report th{text-align:left;background:#f3f4f6;font-weight:700;}
    table.report td.num,table.report th.num{text-align:right;}
    table.compact{max-width:420px;}
    tfoot td{font-weight:700;background:#f9fafb;}
    .no-print{margin-bottom:12px;}
    @media print{
      body{padding:12px;}
      .wrap{max-width:none;}
      .no-print{display:none!important;}
      table.report{page-break-inside:auto;}
      tr{page-break-inside:avoid;page-break-after:auto;}
      thead{display:table-header-group;}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1 class="doc-title">Sales Report</h1>
    <p class="doc-sub">Owner — consolidated performance for the selected period</p>
    <div class="meta">
      <div><strong>Generated</strong><br/>${esc(stamp)}</div>
      <div><strong>Period</strong><br/>${esc(rangeTitle(range))}</div>
      <div><strong>Date range</strong><br/>${esc(periodLine)}</div>
      <div><strong>Branch</strong><br/>${esc(branchLine)}</div>
    </div>

    <div class="no-print">
      <button type="button" onclick="window.print()" style="padding:10px 16px;border-radius:8px;border:1px solid #e5e7eb;background:#111827;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
    </div>

    <section class="section">
      <h2>Summary</h2>
      <table class="report compact">
        <tbody>${summaryRowsHtml}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Daily summary</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Date</th>
            <th class="num">Revenue</th>
            <th class="num">Cost</th>
            <th class="num">Profit</th>
          </tr>
        </thead>
        <tbody>${dailyRowsHtml || `<tr><td colspan="4" style="color:#6b7280">No daily rows for this period.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Monthly summary</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Month</th>
            <th class="num">Revenue</th>
            <th class="num">Cost</th>
            <th class="num">Profit</th>
          </tr>
        </thead>
        <tbody>${monthlyRowsHtml || `<tr><td colspan="4" style="color:#6b7280">No monthly rows for this period.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Product breakdown (by month)</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Month</th>
            <th>Product</th>
            <th class="num">Qty</th>
            <th class="num">Revenue</th>
            <th class="num">Cost</th>
            <th class="num">Profit</th>
          </tr>
        </thead>
        <tbody>${productRowsHtml || `<tr><td colspan="6" style="color:#6b7280">No product breakdown for this period.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>All transactions (${rows.length})</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Branch</th>
            <th>Date</th>
            <th class="num">Qty</th>
            <th class="num">Revenue</th>
            <th class="num">Cost</th>
            <th class="num">Profit</th>
            <th class="num">Delivery fee</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
        ${tableRows || `<tr><td colspan="9" style="color:#6b7280">No transactions in this period.</td></tr>`}
        </tbody>
        ${rows.length
                    ? `<tfoot>
        <tr>
          <td colspan="3" style="text-align:left">Totals</td>
          <td class="num">${totals.items}</td>
          <td class="num">${peso(totals.revenue)}</td>
          <td class="num">${peso(totals.cost)}</td>
          <td class="num">${peso(totals.profit)}</td>
          <td class="num">${totals.deliveryFee > 0 ? peso(totals.deliveryFee) : '—'}</td>
          <td class="num">${peso(totals.total)}</td>
        </tr>
      </tfoot>`
                    : ''
                }
      </table>
    </section>
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
    }, [branchLabel, effectiveBranch, formatDateTime, formatDailyBucketLabel, formatMonthlyBucketLabel, peso, range]);

    const exportCsv = useCallback(async () => {
        const csvEscape = (v: unknown) => {
            const s = String(v ?? '');
            // Quote fields when they contain special CSV characters.
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };

        const toMoney = (v: unknown) => {
            const num = Number(v);
            return Number.isFinite(num) ? num.toFixed(2) : '0.00';
        };

        try {
            setError('');

            const paramsBase = new URLSearchParams();
            paramsBase.set('branch_key', effectiveBranch);
            paramsBase.set('range', range);

            const firstParams = new URLSearchParams(paramsBase);
            firstParams.set('page', '1');
            firstParams.set('per_page', '1');

            const firstRes = await fetch(`/owner/sales-reports/data?${firstParams.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
            });
            const firstJson = (await firstRes.json().catch(() => null)) as SalesReportResponse | null;
            if (!firstRes.ok || !firstJson) {
                throw new Error((firstJson as any)?.message || 'Failed to load sales report for CSV');
            }

            const exportPerPage = 200;
            let nextPage = 1;
            const lastPage = firstJson.transactions?.meta?.last_page ?? 1;

            if (lastPage > 50) {
                throw new Error('Too many pages to export at once. Please narrow the time range.');
            }

            const allRows: SalesReportResponse['transactions']['data'] = [];

            while (nextPage <= lastPage) {
                const params = new URLSearchParams(paramsBase);
                params.set('page', String(nextPage));
                params.set('per_page', String(exportPerPage));

                const res = await fetch(`/owner/sales-reports/data?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store',
                });

                const json = (await res.json().catch(() => null)) as SalesReportResponse | null;
                if (!res.ok || !json) throw new Error((json as any)?.message || 'Failed to export CSV');

                allRows.push(...(json.transactions?.data ?? []));
                nextPage += 1;
            }

            const totals = allRows.reduce(
                (acc, t) => {
                    acc.items += Number(t.items) || 0;
                    acc.revenue += Number(t.revenue) || 0;
                    acc.cost += Number(t.cost) || 0;
                    acc.profit += Number(t.profit) || 0;
                    acc.deliveryFee += Number(t.delivery_fee) || 0;
                    acc.total += Number(t.total) || 0;
                    return acc;
                },
                { items: 0, revenue: 0, cost: 0, profit: 0, deliveryFee: 0, total: 0 },
            );

            const header = [
                'Ref',
                'Branch',
                'Date',
                'Qty',
                'Revenue',
                'Cost',
                'Profit',
                'Delivery Fee',
                'Total',
            ];

            const lines: string[] = [];
            lines.push(header.map(csvEscape).join(','));

            for (const t of allRows) {
                const deliveryFee = Number(t.delivery_fee) || 0;
                lines.push(
                    [
                        t.ref,
                        branchLabel(t.branch_key),
                        formatDateTime(t.created_at),
                        Number(t.items) || 0,
                        toMoney(t.revenue),
                        toMoney(t.cost),
                        toMoney(t.profit),
                        deliveryFee > 0 ? toMoney(deliveryFee) : '',
                        toMoney(t.total),
                    ]
                        .map(csvEscape)
                        .join(','),
                );
            }

            lines.push(
                [
                    'TOTALS',
                    '',
                    '',
                    totals.items,
                    toMoney(totals.revenue),
                    toMoney(totals.cost),
                    toMoney(totals.profit),
                    totals.deliveryFee > 0 ? toMoney(totals.deliveryFee) : '',
                    toMoney(totals.total),
                ]
                    .map(csvEscape)
                    .join(','),
            );

            const csv = lines.join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales_report_${effectiveBranch}_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Export CSV failed.');
        }
    }, [branchLabel, effectiveBranch, formatDateTime, range]);

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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" disabled={isLoading}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        exportCsv();
                                    }}
                                >
                                    Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        printReport();
                                    }}
                                >
                                    Export PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {!!error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">₱{(summary?.revenue ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">{isLoading ? 'Loading…' : 'Gross sales'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">₱{(summary?.cost ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total purchase cost</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Profit</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">₱{(summary?.profit ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Revenue minus cost</p>
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

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Summary</CardTitle>
                            <CardDescription>Revenue, cost, and profit per day.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead className="text-right">Profit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data?.daily_summary ?? []).map((row) => (
                                            <TableRow key={row.date}>
                                                <TableCell>{formatDailyBucketLabel(row.date)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(row.revenue)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(row.cost)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(row.profit)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {!isLoading && !(data?.daily_summary ?? []).length && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No daily summary yet.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Summary</CardTitle>
                            <CardDescription>Revenue, cost, and profit per month.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Month</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead className="text-right">Profit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data?.monthly_summary ?? []).map((row) => (
                                            <TableRow key={row.month}>
                                                <TableCell>{formatMonthlyBucketLabel(row.month)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(row.revenue)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(row.cost)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(row.profit)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {!isLoading && !(data?.monthly_summary ?? []).length && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No monthly summary yet.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Product Monthly Breakdown</CardTitle>
                        <CardDescription>Per-product monthly quantity, revenue, cost, and profit.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(data?.product_monthly_breakdown ?? []).map((row, idx) => (
                                        <TableRow key={`${row.month}-${row.product_name}-${idx}`}>
                                            <TableCell>{formatMonthlyBucketLabel(row.month)}</TableCell>
                                            <TableCell className="font-medium">{row.product_name}</TableCell>
                                            <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                                            <TableCell className="text-right tabular-nums">{peso(row.revenue)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{peso(row.cost)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{peso(row.profit)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!isLoading && !(data?.product_monthly_breakdown ?? []).length && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No product breakdown yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
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
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
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
                                            <TableCell className="text-right tabular-nums">{peso(t.revenue || 0)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{peso(t.cost || 0)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{peso(t.profit || 0)}</TableCell>
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
                                            <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                                                No transactions found.
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
                <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="bg-orange-600/30 dark:bg-orange-900/20 p-6 border-b border-orange-100/50 dark:border-orange-900/30">
                        <DialogTitle className="flex items-center gap-2 text-orange-950 dark:text-orange-100">
                           <Info className="h-5 w-5" /> Transaction Details
                        </DialogTitle>
                        <DialogDescription className="text-orange-800/70 dark:text-orange-200/60">Comprehensive breakdown of sales, costs, and profit for this transaction.</DialogDescription>
                    </DialogHeader>

                    {isDetailsLoading ? (
                        <div className="p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                            <span className="text-sm font-medium animate-pulse">Retrieving transaction data...</span>
                        </div>
                    ) : detailsError ? (
                        <div className="p-10 flex flex-col items-center justify-center gap-3 text-destructive">
                           <XCircle className="h-10 w-10 opacity-20" />
                           <span className="text-sm font-bold">{detailsError}</span>
                        </div>
                    ) : !detailsSale ? (
                        <div className="p-10 text-center text-muted-foreground italic">No transaction selected.</div>
                    ) : (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] flex-1 overflow-hidden">
                                {/* Side Summary Panel */}
                                <div className="bg-muted/30 p-6 border-r space-y-6 overflow-y-auto">
                                    <div className="space-y-4">
                                        <div className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground border-b pb-1">Transaction Info</div>
                                        <div className="space-y-3">
                                            <div className="rounded-xl border bg-card p-3 shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reference</div>
                                                <div className="mt-0.5 text-sm font-black tracking-tight">{detailsSale.ref}</div>
                                            </div>
                                            <div className="rounded-xl border bg-card p-3 shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time</div>
                                                <div className="mt-0.5 text-sm font-bold leading-tight">{formatDateTime(detailsSale.created_at)}</div>
                                            </div>
                                            <div className="rounded-xl border bg-card p-3 shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Origin Branch</div>
                                                <Badge variant="secondary" className="mt-1 text-[10px] px-2 py-0 bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                                                    {branchLabel(detailsSale.branch_key)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t">
                                        <div className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Financial Summary</div>
                                        <div className="rounded-xl border bg-orange-600 text-white p-4 shadow-md">
                                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Revenue</div>
                                            <div className="mt-1 text-2xl font-black tabular-nums">{peso(detailsSale.subtotal)}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border bg-card p-3 shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profit</div>
                                                <div className="mt-0.5 text-lg font-black text-green-600 dark:text-green-400 tabular-nums">
                                                    {peso(detailsSale.items.reduce((s, i) => s + (Number(i.line_profit) || 0), 0))}
                                                </div>
                                            </div>
                                            <div className="rounded-xl border bg-card p-3 shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost</div>
                                                <div className="mt-0.5 text-lg font-bold text-foreground/70 tabular-nums">
                                                    {peso(detailsSale.items.reduce((s, i) => s + (Number(i.line_cost) || 0), 0))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table Content */}
                                <div className="flex flex-col overflow-hidden">
                                    <div className="p-4 bg-card border-b flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-100 dark:bg-orange-950 p-2 rounded-lg">
                                                <Package className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div className="text-sm font-bold tracking-tight">Included Items ({detailsSale.items.length})</div>
                                        </div>
                                        {detailsSale.delivery_fee > 0 && (
                                            <Badge variant="outline" className="text-[10px] gap-1 font-bold h-6">
                                                <Truck className="h-3 w-3" /> Delivery: {peso(detailsSale.delivery_fee)}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-auto">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Item Description</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3">Qty</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3">Price</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3">Subtotal</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3">Profit</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {detailsSale.items.map((it, idx) => (
                                                    <TableRow key={`${detailsSale.id}-${idx}`} className="group transition-colors">
                                                        <TableCell className="font-bold text-sm tracking-tight py-4">{it.name}</TableCell>
                                                        <TableCell className="text-right tabular-nums py-4">
                                                            <span className="bg-muted px-2 py-1 rounded text-xs font-black">{it.qty}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums text-sm py-4">{peso(it.price)}</TableCell>
                                                        <TableCell className="text-right tabular-nums text-sm font-bold py-4">{peso(it.line_total)}</TableCell>
                                                        <TableCell className="text-right tabular-nums text-sm font-black text-green-600 dark:text-green-500 py-4">
                                                            {peso(it.line_profit)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {!detailsSale.items.length && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="py-20 text-center">
                                                            <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-30">
                                                                <Package className="h-10 w-10" />
                                                                <span className="text-xs font-bold uppercase tracking-widest">No Items Listed</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-4 bg-muted/20 border-t items-center justify-between sm:justify-between">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">
                                    System Transaction Breakdown
                                </div>
                                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="font-black px-6 shadow-sm border-2">
                                    Close Window
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
