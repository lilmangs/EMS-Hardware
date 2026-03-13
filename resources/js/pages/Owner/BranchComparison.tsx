import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package } from 'lucide-react';
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
            try {
                const qs = new URLSearchParams({ range });
                const res = await fetch(`/BranchComparison/data?${qs.toString()}`, {
                    headers: { Accept: 'application/json' },
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
            const json = await res.json();

            const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `branch-comparison-${range}.json`;
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
                                        const total = category.lagonglong + category.balingasag;
                                        const lagonglongPercent = (category.lagonglong / total) * 100;
                                        const balingasagPercent = (category.balingasag / total) * 100;

                                        return (
                                            <div key={category.category} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{category.category}</span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span>Lagonglong: ₱{category.lagonglong.toLocaleString()}</span>
                                                        <span>Balingasag: ₱{category.balingasag.toLocaleString()}</span>
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
                                                    const total = product.lagonglongSales + product.balingasagSales;
                                                    const isLagonglongBetter = product.lagonglongSales > product.balingasagSales;

                                                    return (
                                                        <tr key={product.product} className="border-b">
                                                            <td className="p-2 font-medium">{product.product}</td>
                                                            <td className="text-right p-2">{peso(product.lagonglongSales)}</td>
                                                            <td className="text-right p-2">{peso(product.balingasagSales)}</td>
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
