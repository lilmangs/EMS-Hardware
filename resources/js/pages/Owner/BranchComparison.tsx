import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users, FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branch Comparison',
        href: '/BranchComparison',
    },
];

type RangeKey = '1month' | '3months' | '6months' | '1year';

type BranchMetrics = {
    branch_key: 'lagonglong' | 'balingasag';
    name: string;
    totalSales: number;
    totalDeliveries: number;
    avgDeliveryValue: number;
    growth: number;
    topProduct: string;
};

type BranchComparisonResponse = {
    filters: { range: RangeKey; from: string; to: string; prev_from: string; prev_to: string };
    summary: { totalSales: number; totalDeliveries: number; totalCustomers: number; avgDeliveryValue: number };
    branches: Record<'lagonglong' | 'balingasag', BranchMetrics>;
    monthlySales: Array<{ month: string; lagonglong: number; balingasag: number }>;
    categoryComparison: Array<{ category: string; lagonglong: number; balingasag: number }>;
    topProducts: Array<{ product: string; lagonglongSales: number; balingasagSales: number }>;
};

export default function BranchComparison() {
    const [range, setRange] = useState<RangeKey>('6months');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<BranchComparisonResponse | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setIsLoading(true);
            setError(null);
            setData(null);
            try {
                const qs = new URLSearchParams({ range });
                const res = await fetch(`/BranchComparison/data?${qs.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store',
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`Request failed (${res.status})`);
                }

                const json = (await res.json()) as BranchComparisonResponse;
                setData(json);
            } catch (e) {
                if ((e as any)?.name === 'AbortError') return;
                setError('Failed to load branch comparison data.');
                setData(null);
            } finally {
                setIsLoading(false);
            }
        };

        load();

        return () => controller.abort();
    }, [range]);

    const peso = (n: number) => `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totalSales = data?.summary.totalSales ?? 0;
    const totalDeliveries = data?.summary.totalDeliveries ?? 0;
    const totalCustomers = data?.summary.totalCustomers ?? 0;
    const avgDeliveryValue = data?.summary.avgDeliveryValue ?? 0;

    const lagonglong = data?.branches?.lagonglong;
    const balingasag = data?.branches?.balingasag;

    const exportReport = async () => {
        const esc = (v: unknown) =>
            String(v ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

        const rangeLabel =
            range === '1month'
                ? 'Last Month'
                : range === '3months'
                    ? 'Last 3 Months'
                    : range === '1year'
                        ? 'Last Year'
                        : 'Last 6 Months';

        const formatPeso = (n: number) =>
            `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

        const formatMonthlyBucketLabel = (bucket: string) => {
            if (!bucket) return '—';
            const d = new Date(`${bucket}-01`);
            if (Number.isNaN(d.getTime())) return bucket;
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
        };

        try {
            setError(null);

            const qs = new URLSearchParams({ range });
            const res = await fetch(`/BranchComparison/data?${qs.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Request failed');
            const json = (await res.json()) as BranchComparisonResponse;

            const pw = window.open('', '_blank', 'width=1200,height=800');
            if (!pw) throw new Error('Popup blocked');

            const stamp = new Date().toLocaleString();
            const filters = json.filters;
            const branches = json.branches;

            const currentPeriodLine = filters ? formatPeriodLine(filters.from, filters.to) : '';
            const previousPeriodLine = filters ? formatPeriodLine(filters.prev_from, filters.prev_to) : '';

            const monthlyRows = (json.monthlySales ?? [])
                .map(
                    (m) => `
        <tr>
          <td>${esc(formatMonthlyBucketLabel(m.month))}</td>
          <td class="num">${esc(formatPeso(Number(m.lagonglong) || 0))}</td>
          <td class="num">${esc(formatPeso(Number(m.balingasag) || 0))}</td>
        </tr>`,
                )
                .join('');

            const categoryRows = (json.categoryComparison ?? [])
                .map(
                    (c) => `
        <tr>
          <td>${esc(c.category)}</td>
          <td class="num">${esc(formatPeso(Number(c.lagonglong) || 0))}</td>
          <td class="num">${esc(formatPeso(Number(c.balingasag) || 0))}</td>
        </tr>`,
                )
                .join('');

            const topProductsRows = (json.topProducts ?? [])
                .map(
                    (p) => `
        <tr>
          <td>${esc(p.product)}</td>
          <td class="num">${esc(formatPeso(Number(p.lagonglongSales) || 0))}</td>
          <td class="num">${esc(formatPeso(Number(p.balingasagSales) || 0))}</td>
        </tr>`,
                )
                .join('');

            const summaryRowsHtml = `
        <tr><td>Total sales</td><td style="text-align:right;font-weight:600">${esc(formatPeso(Number(json.summary?.totalSales) || 0))}</td></tr>
        <tr><td>Total deliveries</td><td style="text-align:right;font-weight:600">${esc(String(json.summary?.totalDeliveries ?? 0))}</td></tr>
        <tr><td>Total customers</td><td style="text-align:right;font-weight:600">${esc(String(json.summary?.totalCustomers ?? 0))}</td></tr>
        <tr><td>Avg delivery value</td><td style="text-align:right;font-weight:600">${esc(formatPeso(Number(json.summary?.avgDeliveryValue) || 0))}</td></tr>`;

            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Branch Comparison — ${esc(rangeLabel)}</title>
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
    table.compact{max-width:520px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .branch-card{border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#fff;}
    .branch-card h3{margin:0 0 8px;font-size:13px;font-weight:700;}
    .pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;font-size:11px;color:#374151;margin-right:6px;}
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
    <h1 class="doc-title">Branch Comparison</h1>
    <p class="doc-sub">Owner — compare Lagonglong and Balingasag performance</p>
    <div class="meta">
      <div><strong>Generated</strong><br/>${esc(stamp)}</div>
      <div><strong>Period</strong><br/>${esc(rangeLabel)}</div>
      <div><strong>Current range</strong><br/>${esc(currentPeriodLine)}</div>
      <div><strong>Previous range</strong><br/>${esc(previousPeriodLine)}</div>
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
      <h2>Branch metrics</h2>
      <div class="grid2">
        <div class="branch-card">
          <h3>${esc(branches?.lagonglong?.name ?? 'Lagonglong')}</h3>
          <table class="report">
            <tbody>
              <tr><td><span class="pill">Sales</span></td><td class="num">${esc(formatPeso(Number(branches?.lagonglong?.totalSales) || 0))}</td></tr>
              <tr><td><span class="pill">Deliveries</span></td><td class="num">${esc(String(branches?.lagonglong?.totalDeliveries ?? 0))}</td></tr>
              <tr><td><span class="pill">Avg delivery</span></td><td class="num">${esc(formatPeso(Number(branches?.lagonglong?.avgDeliveryValue) || 0))}</td></tr>
              <tr><td><span class="pill">Growth</span></td><td class="num">${esc(Number(branches?.lagonglong?.growth ?? 0).toFixed(2))}%</td></tr>
              <tr><td><span class="pill">Top product</span></td><td>${esc(branches?.lagonglong?.topProduct ?? '—')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="branch-card">
          <h3>${esc(branches?.balingasag?.name ?? 'Balingasag')}</h3>
          <table class="report">
            <tbody>
              <tr><td><span class="pill">Sales</span></td><td class="num">${esc(formatPeso(Number(branches?.balingasag?.totalSales) || 0))}</td></tr>
              <tr><td><span class="pill">Deliveries</span></td><td class="num">${esc(String(branches?.balingasag?.totalDeliveries ?? 0))}</td></tr>
              <tr><td><span class="pill">Avg delivery</span></td><td class="num">${esc(formatPeso(Number(branches?.balingasag?.avgDeliveryValue) || 0))}</td></tr>
              <tr><td><span class="pill">Growth</span></td><td class="num">${esc(Number(branches?.balingasag?.growth ?? 0).toFixed(2))}%</td></tr>
              <tr><td><span class="pill">Top product</span></td><td>${esc(branches?.balingasag?.topProduct ?? '—')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Monthly sales</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Month</th>
            <th class="num">Lagonglong</th>
            <th class="num">Balingasag</th>
          </tr>
        </thead>
        <tbody>${monthlyRows || `<tr><td colspan="3" style="color:#6b7280">No data</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Category comparison (top 10)</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Category</th>
            <th class="num">Lagonglong</th>
            <th class="num">Balingasag</th>
          </tr>
        </thead>
        <tbody>${categoryRows || `<tr><td colspan="3" style="color:#6b7280">No data</td></tr>`}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>Top products (top 10)</h2>
      <table class="report">
        <thead>
          <tr>
            <th>Product</th>
            <th class="num">Lagonglong</th>
            <th class="num">Balingasag</th>
          </tr>
        </thead>
        <tbody>${topProductsRows || `<tr><td colspan="3" style="color:#6b7280">No data</td></tr>`}</tbody>
      </table>
    </section>
  </div>
  <script>window.onload=function(){window.print();};</script>
</body>
</html>`;

            pw.document.open();
            pw.document.write(html);
            pw.document.close();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Export failed.');
        }
    };

    const exportCsv = async () => {
        const csvEscape = (v: unknown) => {
            const s = String(v ?? '');
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };

        const toPesoNumber = (n: unknown) => {
            const num = Number(n);
            return Number.isFinite(num) ? num : 0;
        };

        const pushRow = (lines: string[], row: unknown[]) => {
            lines.push(row.map(csvEscape).join(','));
        };

        try {
            setError(null);

            const qs = new URLSearchParams({ range });
            const res = await fetch(`/BranchComparison/data?${qs.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!res.ok) throw new Error('Request failed');
            const json = (await res.json()) as BranchComparisonResponse;

            const rangeLabel =
                range === '1month'
                    ? 'Last Month'
                    : range === '3months'
                        ? 'Last 3 Months'
                        : range === '1year'
                            ? 'Last Year'
                            : 'Last 6 Months';

            const lines: string[] = [];
            pushRow(lines, ['Section', 'Key', 'Value']);
            pushRow(lines, ['Info', 'Range', rangeLabel]);
            pushRow(lines, ['Info', 'From', json.filters?.from ?? '']);
            pushRow(lines, ['Info', 'To', json.filters?.to ?? '']);
            pushRow(lines, ['Info', 'Previous From', json.filters?.prev_from ?? '']);
            pushRow(lines, ['Info', 'Previous To', json.filters?.prev_to ?? '']);
            lines.push('');

            pushRow(lines, ['Section', 'Metric', 'Value']);
            pushRow(lines, ['Summary', 'Total Sales', toPesoNumber(json.summary?.totalSales).toFixed(2)]);
            pushRow(lines, ['Summary', 'Total Deliveries', json.summary?.totalDeliveries ?? 0]);
            pushRow(lines, ['Summary', 'Total Customers', json.summary?.totalCustomers ?? 0]);
            pushRow(lines, ['Summary', 'Avg Delivery Value', toPesoNumber(json.summary?.avgDeliveryValue).toFixed(2)]);
            lines.push('');

            pushRow(lines, ['Section', 'Month', 'Lagonglong Sales', 'Balingasag Sales']);
            (json.monthlySales ?? []).forEach((m) => {
                pushRow(lines, [
                    'Monthly Sales',
                    m.month ?? '',
                    toPesoNumber(m.lagonglong).toFixed(2),
                    toPesoNumber(m.balingasag).toFixed(2),
                ]);
            });
            lines.push('');

            pushRow(lines, ['Section', 'Category', 'Lagonglong Sales', 'Balingasag Sales']);
            (json.categoryComparison ?? []).forEach((c) => {
                pushRow(lines, [
                    'Category Comparison',
                    c.category ?? '',
                    toPesoNumber(c.lagonglong).toFixed(2),
                    toPesoNumber(c.balingasag).toFixed(2),
                ]);
            });
            lines.push('');

            pushRow(lines, ['Section', 'Product', 'Lagonglong Sales', 'Balingasag Sales']);
            (json.topProducts ?? []).forEach((p) => {
                pushRow(lines, [
                    'Top Products',
                    p.product ?? '',
                    toPesoNumber(p.lagonglongSales).toFixed(2),
                    toPesoNumber(p.balingasagSales).toFixed(2),
                ]);
            });

            const csv = lines.join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `branch_comparison_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            setError('Export failed.');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branch Comparison" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Branch Comparison</h1>
                        <p className="text-muted-foreground">Compare performance between Lagonglong and Balingasag branches</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1month">Last Month</SelectItem>
                                <SelectItem value="3months">Last 3 Months</SelectItem>
                                <SelectItem value="6months">Last 6 Months</SelectItem>
                                <SelectItem value="1year">Last Year</SelectItem>
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
                                        exportReport();
                                    }}
                                >
                                    Export PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : peso(totalSales)}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                    <span>Lagonglong: {isLoading ? '…' : `${(lagonglong?.growth ?? 0) > 0 ? '+' : ''}${(lagonglong?.growth ?? 0).toFixed(2)}%`}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                    <span>Balingasag: {isLoading ? '…' : `${(balingasag?.growth ?? 0) > 0 ? '+' : ''}${(balingasag?.growth ?? 0).toFixed(2)}%`}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : totalDeliveries}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Lagonglong: {isLoading ? '…' : (lagonglong?.totalDeliveries ?? 0)}</span>
                                <span>•</span>
                                <span>Balingasag: {isLoading ? '…' : (balingasag?.totalDeliveries ?? 0)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : totalCustomers}</div>
                            <div className="text-xs text-muted-foreground">Unique delivery customers</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Delivery Value</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : peso(avgDeliveryValue)}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Lagonglong: {isLoading ? '…' : peso(lagonglong?.avgDeliveryValue ?? 0)}</span>
                                <span>•</span>
                                <span>Balingasag: {isLoading ? '…' : peso(balingasag?.avgDeliveryValue ?? 0)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts and Tables */}
                <Tabs defaultValue="sales-trend" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="sales-trend">Sales Comparison</TabsTrigger>
                        <TabsTrigger value="category-comparison">Category Comparison</TabsTrigger>
                        <TabsTrigger value="top-products">Top Products</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sales-trend" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sales Comparison</CardTitle>
                                <CardDescription>Total sales per branch for the selected range</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="py-10 text-center text-muted-foreground">Loading…</div>
                                ) : !lagonglong && !balingasag ? (
                                    <div className="py-10 text-center text-muted-foreground">No data available for the selected range.</div>
                                ) : (
                                    <SalesComparisonBarChart
                                        lagonglongLabel="Lagonglong"
                                        balingasagLabel="Balingasag"
                                        lagonglongSales={lagonglong?.totalSales ?? 0}
                                        balingasagSales={balingasag?.totalSales ?? 0}
                                        formatValue={peso}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="category-comparison" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sales by Category</CardTitle>
                                <CardDescription>Category performance comparison between branches</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <div className="py-10 text-center text-muted-foreground">Loading…</div>
                                    ) : (data?.categoryComparison?.length ?? 0) === 0 ? (
                                        <div className="py-10 text-center text-muted-foreground">No category data available.</div>
                                    ) : (
                                        (data?.categoryComparison ?? []).map((category) => {
                                        const lagonglongValue = Number(category.lagonglong) || 0;
                                        const balingasagValue = Number(category.balingasag) || 0;
                                        const total = lagonglongValue + balingasagValue;
                                        const lagonglongPercent = total > 0 ? (lagonglongValue / total) * 100 : 0;
                                        const balingasagPercent = total > 0 ? (balingasagValue / total) * 100 : 0;

                                        return (
                                            <div key={category.category} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{category.category}</span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span>Lagonglong: {peso(lagonglongValue)}</span>
                                                        <span>Balingasag: {peso(balingasagValue)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <Progress value={lagonglongPercent} className="h-2" />
                                                        <p className="text-xs text-muted-foreground mt-1">Lagonglong {lagonglongPercent.toFixed(1)}%</p>
                                                    </div>
                                                    <div className="flex-1">
                                                        <Progress value={balingasagPercent} className="h-2" />
                                                        <p className="text-xs text-muted-foreground mt-1">Balingasag {balingasagPercent.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="top-products" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Products Comparison</CardTitle>
                                <CardDescription>Best-selling products across both branches</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="py-10 text-center text-muted-foreground">Loading…</div>
                                ) : (data?.topProducts?.length ?? 0) === 0 ? (
                                    <div className="py-10 text-center text-muted-foreground">No product data available.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2">Product</th>
                                                    <th className="text-right p-2">Lagonglong Sales</th>
                                                    <th className="text-right p-2">Balingasag Sales</th>
                                                    <th className="text-right p-2">Total Sales</th>
                                                    <th className="text-center p-2">Performance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data?.topProducts ?? []).map((product) => {
                                                    const lagonglongSales = Number(product.lagonglongSales) || 0;
                                                    const balingasagSales = Number(product.balingasagSales) || 0;
                                                    const total = lagonglongSales + balingasagSales;
                                                    const isLagonglongBetter = lagonglongSales > balingasagSales;

                                                    return (
                                                        <tr key={product.product} className="border-b">
                                                            <td className="p-2 font-medium">{product.product}</td>
                                                            <td className="text-right p-2">{peso(lagonglongSales)}</td>
                                                            <td className="text-right p-2">{peso(balingasagSales)}</td>
                                                            <td className="text-right p-2 font-medium">{peso(total)}</td>
                                                            <td className="text-center p-2">
                                                                <Badge variant={isLagonglongBetter ? 'default' : 'secondary'}>
                                                                    {isLagonglongBetter ? 'Lagonglong' : 'Balingasag'} Lead
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </AppLayout>
    );
}

function SalesComparisonBarChart({
    lagonglongLabel,
    balingasagLabel,
    lagonglongSales,
    balingasagSales,
    formatValue,
}: {
    lagonglongLabel: string;
    balingasagLabel: string;
    lagonglongSales: number;
    balingasagSales: number;
    formatValue: (n: number) => string;
}) {
    const max = Math.max(1, Number(lagonglongSales) || 0, Number(balingasagSales) || 0);
    const lagonglongPct = ((Number(lagonglongSales) || 0) / max) * 100;
    const balingasagPct = ((Number(balingasagSales) || 0) / max) * 100;

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{lagonglongLabel}</span>
                    <span className="text-muted-foreground">{formatValue(Number(lagonglongSales) || 0)}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden" role="img" aria-label={`${lagonglongLabel} sales bar`}>
                    <div className="h-full bg-blue-500" style={{ width: `${lagonglongPct}%` }} />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{balingasagLabel}</span>
                    <span className="text-muted-foreground">{formatValue(Number(balingasagSales) || 0)}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden" role="img" aria-label={`${balingasagLabel} sales bar`}>
                    <div className="h-full bg-emerald-500" style={{ width: `${balingasagPct}%` }} />
                </div>
            </div>

            <div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Higher sales</span>
                    <span className="font-medium">
                        {(Number(lagonglongSales) || 0) === (Number(balingasagSales) || 0)
                            ? 'Tie'
                            : (Number(lagonglongSales) || 0) > (Number(balingasagSales) || 0)
                                ? lagonglongLabel
                                : balingasagLabel}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Difference</span>
                    <span className="font-medium tabular-nums">{formatValue(Math.abs((Number(lagonglongSales) || 0) - (Number(balingasagSales) || 0)))}</span>
                </div>
            </div>
        </div>
    );
}
