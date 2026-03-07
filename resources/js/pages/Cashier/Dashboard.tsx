import { Head } from '@inertiajs/react';
import { 
    AlertTriangle, 
    Box, 
    PhilippinePeso, 
    ShoppingCart, 
    DollarSign,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    Users,
    Clock,
    Target
} from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cashier Dashboard',
        href: '/dashboard/cashier',
    },
];

export default function Dashboard() {
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

    // Enhanced data for cashier dashboard
    const dashboardData = useMemo(() => ({
        todaySales: { 
            total: 1923.84, 
            growth: 8.2,
            orders: 15,
            avgOrder: 128.26
        },
        inventory: {
            total: 342,
            lowStock: 4,
            outOfStock: 1,
            categories: 6
        },
        performance: {
            itemsSold: 74,
            customersServed: 15,
            avgTransactionTime: 3.5, // minutes
            efficiency: 92
        },
        shift: {
            startTime: '8:00 AM',
            endTime: '5:00 PM',
            currentProgress: 65,
            remainingCustomers: 25
        }
    }), []);

    const getSalesGrowth = () => {
        const growth = dashboardData.todaySales.growth;
        return {
            value: growth,
            isPositive: growth > 0,
            text: `${growth > 0 ? '+' : ''}${growth}% from yesterday`
        };
    };

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
                        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
                            <TabsList>
                                <TabsTrigger value="today">Today</TabsTrigger>
                                <TabsTrigger value="week">This Week</TabsTrigger>
                                <TabsTrigger value="month">This Month</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button className="gap-2">
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
                            <div className="text-2xl font-bold">₱{dashboardData.todaySales.total.toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{dashboardData.todaySales.orders} orders</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                    {getSalesGrowth().isPositive ? (
                                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                                    )}
                                    <span className={getSalesGrowth().isPositive ? "text-green-600" : "text-red-600"}>
                                        {getSalesGrowth().text}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Avg: ₱{dashboardData.todaySales.avgOrder.toLocaleString()}/order
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboardData.performance.itemsSold}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{dashboardData.performance.customersServed} customers</span>
                                <span>•</span>
                                <span>{dashboardData.inventory.categories} categories</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-orange-600">Low Stock</span>
                                    <span className="font-medium">{dashboardData.inventory.lowStock}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Out of Stock</span>
                                    <span className="font-medium">{dashboardData.inventory.outOfStock}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Performance</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboardData.performance.efficiency}%</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Efficiency score</span>
                                <span>•</span>
                                <span>{dashboardData.performance.avgTransactionTime} min avg</span>
                            </div>
                            <div className="mt-2">
                                <Progress value={dashboardData.performance.efficiency} className="h-2" />
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Above target performance
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Shift Progress</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboardData.shift.remainingCustomers}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Customers remaining</span>
                                <span>•</span>
                                <span>{dashboardData.shift.startTime} - {dashboardData.shift.endTime}</span>
                            </div>
                            <div className="mt-2">
                                <Progress value={dashboardData.shift.currentProgress} className="h-2" />
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {dashboardData.shift.currentProgress}% complete
                                </div>
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
                            <SalesByHourChart />
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
                                    {["Faucet Kitchen Chrome", "Door Handle Set", "LED Bulb Pack"].map((product, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                                                    <Package className="h-4 w-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{product}</div>
                                                    <div className="text-xs text-muted-foreground">12 sold</div>
                                                </div>
                                            </div>
                                            <Badge variant="secondary">₱2,450</Badge>
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
                                    {["Hammer 16oz", "Screwdriver Set", "Measuring Tape"].map((item, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{item}</div>
                                                    <div className="text-xs text-muted-foreground">Only 3 left</div>
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

function SalesByHourChart() {
    const hours = ['9AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM'];
    const values = [80, 380, 540, 320, 620, 0, 540, 580, 0, 0, 0];
    const max = 600;

    return (
        <div className="w-full">
            <div className="grid grid-cols-[40px_1fr] gap-3">
                <div className="flex flex-col justify-between text-xs font-medium text-muted-foreground">
                    <span>{max}</span>
                    <span>450</span>
                    <span>300</span>
                    <span>150</span>
                    <span>0</span>
                </div>

                <div className="relative h-56 rounded-lg bg-muted/30 p-3">
                    <div className="absolute inset-3 grid grid-rows-4 gap-0">
                        <div className="border-b border-border/50" />
                        <div className="border-b border-border/50" />
                        <div className="border-b border-border/50" />
                        <div className="border-b border-border/50" />
                    </div>

                    <div className="relative flex h-full items-end gap-2">
                        {values.map((v, idx) => (
                            <div key={hours[idx]} className="flex-1">
                                <div
                                    className="mx-auto w-full rounded-md bg-gradient-to-t from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 transition-colors"
                                    style={{ height: `${(v / max) * 100}%` }}
                                    title={`${hours[idx]}: ₱${v}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-3 pb-1">
                        {hours.map((hour, idx) => (
                            <div key={idx} className="flex-1 text-center">
                                <span className="text-xs text-muted-foreground">{hour}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
