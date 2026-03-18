import { Head, router, usePage } from '@inertiajs/react';
import { 
    AlertTriangle, 
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    Clock,
    Target
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        title: 'Cashier Dashboard',
        href: '/dashboard/cashier',
    },
];

export default function Dashboard() {
    const { props } = usePage<{
        branch_key: string | null;
        range: 'today' | 'week' | 'month';
        stats: {
            revenue: number;
            orders: number;
            avg_order: number;
            growth: number;
            items_sold: number;
            customers_served: number;
            inventory: {
                total_rows: number;
                low_stock: number;
                out_of_stock: number;
                categories: number;
            };
        };
        sales_by_hour: {
            labels: string[];
            values: number[];
            max: number;
        };
        top_products: Array<{ name: string; qty: number; revenue: number }>;
        low_stock_items: Array<{ product_id: number; sku: string | null; name: string | null; stock: number; reorder_level: number }>;
    }>();

    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>(props.range ?? 'today');

    const salesGrowth = useMemo(() => {
        const growth = Number(props.stats?.growth) || 0;
        return {
            value: growth,
            isPositive: growth > 0,
            text: `${growth > 0 ? '+' : ''}${growth}% from previous`,
        };
    }, [props.stats?.growth]);

    const onTimeRangeChange = useCallback(
        (value: string) => {
            const next = value as typeof timeRange;
            setTimeRange(next);
            router.get(
                '/dashboard/cashier',
                { range: next },
                {
                    preserveState: true,
                    replace: true,
                    only: ['branch_key', 'range', 'stats', 'sales_by_hour', 'top_products', 'low_stock_items'],
                },
            );
        },
        [timeRange],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cashier Dashboard" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Cashier Dashboard</h1>
                        <p className="text-muted-foreground">Manage your transactions and track your performance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tabs value={timeRange} onValueChange={onTimeRangeChange}>
                            <TabsList>
                                <TabsTrigger value="today">Today</TabsTrigger>
                                <TabsTrigger value="week">This Week</TabsTrigger>
                                <TabsTrigger value="month">This Month</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button
                            className="gap-2"
                            type="button"
                            onClick={() => {
                                router.visit('/Checkout');
                            }}
                        >
                            <Target className="h-4 w-4" />
                            New Transaction
                        </Button>
                    </div>
                </div>

                {/* Enhanced Stat Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{Number(props.stats?.revenue || 0).toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{Number(props.stats?.orders || 0)} orders</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                    {salesGrowth.isPositive ? (
                                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                                    )}
                                    <span className={salesGrowth.isPositive ? "text-green-600" : "text-red-600"}>
                                        {salesGrowth.text}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Avg: ₱{Number(props.stats?.avg_order || 0).toLocaleString()}/order
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Number(props.stats?.items_sold || 0)}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{Number(props.stats?.customers_served || 0)} customers</span>
                                <span>•</span>
                                <span>{Number(props.stats?.inventory?.categories || 0)} categories</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-orange-600">Low Stock</span>
                                    <span className="font-medium">{Number(props.stats?.inventory?.low_stock || 0)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Out of Stock</span>
                                    <span className="font-medium">{Number(props.stats?.inventory?.out_of_stock || 0)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{Number(props.stats?.avg_order || 0).toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Per transaction</span>
                                <span>•</span>
                                <span>{salesGrowth.text}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Customers Served</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Number(props.stats?.customers_served || 0)}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{Number(props.stats?.orders || 0)} transactions</span>
                                <span>•</span>
                                <span>{timeRange}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sales Chart and Lists */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Sales by Hour</CardTitle>
                            <CardDescription>Transaction volume throughout the day</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SalesByHourBarChart labels={props.sales_by_hour?.labels ?? []} values={props.sales_by_hour?.values ?? []} />
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Selling Products</CardTitle>
                                <CardDescription>Most popular items today</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {(props.top_products ?? []).map((p) => (
                                        <div key={p.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                                                    <Package className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{p.name}</div>
                                                    <div className="text-xs text-muted-foreground">{p.qty} sold</div>
                                                </div>
                                            </div>
                                            <Badge variant="secondary">₱{Number(p.revenue || 0).toLocaleString()}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Low Stock Alerts</CardTitle>
                                <CardDescription>Items needing restock</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {(props.low_stock_items ?? []).map((it) => (
                                        <div key={it.product_id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{it.name ?? '-'}</div>
                                                    <div className="text-xs text-muted-foreground">Only {Number(it.stock || 0)} left</div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                Notify
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
}: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-neutral-200 p-4 dark:border-sidebar-border dark:bg-muted/40">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-orange-600">{title}</div>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-100">
                    <Icon className="h-4 w-4 text-orange-600" />
                </div>
            </div>
            <div className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {value}
            </div>
        </div>
    );
}

function SalesByHourChart({
    labels,
    values,
    max,
}: {
    labels: string[];
    values: number[];
    max: number;
}) {
    return null;
}

function SalesByHourBarChart({
    labels,
    values,
}: {
    labels: string[];
    values: number[];
}) {
    const data = useMemo(() => {
        const safeLabels = Array.isArray(labels) ? labels : [];
        const safeValues = Array.isArray(values) ? values : [];
        const len = Math.min(safeLabels.length, safeValues.length);

        return Array.from({ length: len }).map((_, idx) => ({
            hour: safeLabels[idx],
            revenue: Number(safeValues[idx] ?? 0) || 0,
        }));
    }, [labels, values]);

    return (
        <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} width={60} />
                    <Tooltip
                        formatter={(value: any) => {
                            const n = Number(value) || 0;
                            return [`₱${n.toLocaleString()}`, 'Revenue'];
                        }}
                    />
                    <Bar dataKey="revenue" fill="#ea580c" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            {data.length === 0 && <div className="mt-3 text-sm text-muted-foreground">No hourly sales data available.</div>}
        </div>
    );
}
