import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

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
        try {
            const qs = new URLSearchParams({ range });
            const res = await fetch(`/BranchComparison/data?${qs.toString()}`, {
                headers: { Accept: 'application/json' },
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

            const formatPeso = (n: number) =>
                `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const safe = (v: unknown) => String(v ?? '—');
            const formatDateTime = (raw: string) => {
                const d = new Date(raw);
                if (Number.isNaN(d.getTime())) return raw;
                return d.toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            };

            const printWindow = window.open('', '_blank');
            if (!printWindow) throw new Error('Popup blocked');

            const stamp = new Date().toLocaleString();
            const filters = json.filters;
            const branches = json.branches;

            const monthlyRows = (json.monthlySales ?? [])
                .map(
                    (m) => `
                        <tr>
                            <td>${safe(m.month)}</td>
                            <td style="text-align:right">${formatPeso(Number(m.lagonglong) || 0)}</td>
                            <td style="text-align:right">${formatPeso(Number(m.balingasag) || 0)}</td>
                        </tr>
                    `
                )
                .join('');

            const categoryRows = (json.categoryComparison ?? [])
                .map(
                    (c) => `
                        <tr>
                            <td>${safe(c.category)}</td>
                            <td style="text-align:right">${formatPeso(Number(c.lagonglong) || 0)}</td>
                            <td style="text-align:right">${formatPeso(Number(c.balingasag) || 0)}</td>
                        </tr>
                    `
                )
                .join('');

            const topProductsRows = (json.topProducts ?? [])
                .map(
                    (p) => `
                        <tr>
                            <td>${safe(p.product)}</td>
                            <td style="text-align:right">${formatPeso(Number(p.lagonglongSales) || 0)}</td>
                            <td style="text-align:right">${formatPeso(Number(p.balingasagSales) || 0)}</td>
                        </tr>
                    `
                )
                .join('');

            const html = `
                <!doctype html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Branch Comparison Report</title>
                    <style>
                        * { box-sizing: border-box; }
                        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color: #111827; }
                        .muted { color: #6b7280; }
                        .title { font-size: 20px; font-weight: 700; margin: 0; }
                        .subtitle { margin: 6px 0 0; font-size: 12px; }
                        .row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
                        .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; min-width: 220px; flex: 1; }
                        .card h3 { margin: 0; font-size: 12px; color: #6b7280; font-weight: 600; }
                        .card .val { margin-top: 6px; font-size: 18px; font-weight: 700; }
                        .section { margin-top: 16px; }
                        .section h2 { font-size: 14px; margin: 0 0 8px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; vertical-align: top; }
                        th { background: #f9fafb; text-align: left; }
                        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                        .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f3f4f6; font-size: 11px; color: #374151; }
                        @media print { body { margin: 0; } .no-print { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="display:flex;justify-content:flex-end;margin-bottom:12px;">
                        <button onclick="window.print()" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#111827;color:white;cursor:pointer;">Print / Save as PDF</button>
                    </div>

                    <div>
                        <p class="title">Branch Comparison Report</p>
                        <p class="subtitle muted">${safe(rangeLabel)} • Generated ${safe(stamp)}</p>
                        <p class="subtitle muted">Range: ${safe(formatDateTime(safe(filters?.from)))} to ${safe(formatDateTime(safe(filters?.to)))}</p>
                        <p class="subtitle muted">Previous: ${safe(formatDateTime(safe(filters?.prev_from)))} to ${safe(formatDateTime(safe(filters?.prev_to)))}</p>
                    </div>

                    <div class="row">
                        <div class="card">
                            <h3>Total Sales</h3>
                            <div class="val">${formatPeso(Number(json.summary?.totalSales) || 0)}</div>
                        </div>
                        <div class="card">
                            <h3>Total Deliveries</h3>
                            <div class="val">${safe(json.summary?.totalDeliveries ?? 0)}</div>
                        </div>
                        <div class="card">
                            <h3>Total Customers</h3>
                            <div class="val">${safe(json.summary?.totalCustomers ?? 0)}</div>
                        </div>
                        <div class="card">
                            <h3>Avg Delivery Value</h3>
                            <div class="val">${formatPeso(Number(json.summary?.avgDeliveryValue) || 0)}</div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Branch Metrics</h2>
                        <div class="grid2">
                            <div class="card">
                                <h3>${safe(branches?.lagonglong?.name ?? 'Lagonglong')}</h3>
                                <div style="margin-top:8px;font-size:12px;">
                                    <div><span class="pill">Sales</span> <strong>${formatPeso(Number(branches?.lagonglong?.totalSales) || 0)}</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Deliveries</span> <strong>${safe(branches?.lagonglong?.totalDeliveries ?? 0)}</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Avg Delivery</span> <strong>${formatPeso(Number(branches?.lagonglong?.avgDeliveryValue) || 0)}</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Growth</span> <strong>${safe(Number(branches?.lagonglong?.growth ?? 0).toFixed(2))}%</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Top Product</span> <strong>${safe(branches?.lagonglong?.topProduct ?? '—')}</strong></div>
                                </div>
                            </div>
                            <div class="card">
                                <h3>${safe(branches?.balingasag?.name ?? 'Balingasag')}</h3>
                                <div style="margin-top:8px;font-size:12px;">
                                    <div><span class="pill">Sales</span> <strong>${formatPeso(Number(branches?.balingasag?.totalSales) || 0)}</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Deliveries</span> <strong>${safe(branches?.balingasag?.totalDeliveries ?? 0)}</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Avg Delivery</span> <strong>${formatPeso(Number(branches?.balingasag?.avgDeliveryValue) || 0)}</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Growth</span> <strong>${safe(Number(branches?.balingasag?.growth ?? 0).toFixed(2))}%</strong></div>
                                    <div style="margin-top:6px;"><span class="pill">Top Product</span> <strong>${safe(branches?.balingasag?.topProduct ?? '—')}</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Monthly Sales</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:34%">Month</th>
                                    <th style="width:33%;text-align:right">Lagonglong</th>
                                    <th style="width:33%;text-align:right">Balingasag</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthlyRows || '<tr><td colspan="3" class="muted">No data</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Category Comparison (Top 10)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:34%">Category</th>
                                    <th style="width:33%;text-align:right">Lagonglong</th>
                                    <th style="width:33%;text-align:right">Balingasag</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categoryRows || '<tr><td colspan="3" class="muted">No data</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Top Products (Top 10)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:34%">Product</th>
                                    <th style="width:33%;text-align:right">Lagonglong</th>
                                    <th style="width:33%;text-align:right">Balingasag</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topProductsRows || '<tr><td colspan="3" class="muted">No data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
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
                        <Button onClick={exportReport} disabled={isLoading}>Export Report</Button>
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
