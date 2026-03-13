import { Head, router } from '@inertiajs/react';
import { 
    AlertTriangle, 
    BarChart3, 
    Boxes, 
    Box, 
    ClipboardList, 
    PhilippinePeso, 
    Scale, 
    Truck, 
    Users,
    TrendingUp,
    TrendingDown,
    Package,
    ShoppingCart,
    DollarSign,
    Activity,
    Target,
    Zap,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    Eye,
    Edit,
    Plus
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBranchFilter } from '@/hooks/use-branch-filter';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Owner Dashboard',
        href: '/dashboard/owner',
    },
];

type DashboardData = {
    filters: { branch_key: 'all' | 'lagonglong' | 'balingasag'; range: 'today' | 'week' | 'month'; from: string; to: string };
    sales: {
        revenue: number;
        orders: number;
        growth: number;
        by_branch: Array<{ branch_key: 'lagonglong' | 'balingasag'; label: string; revenue: number }>;
    };
    inventory: { total: number; low_stock: number; out_of_stock: number; categories: number };
    deliveries: { preparing: number; out_for_delivery: number; delivered: number; delayed: number };
    staff: { total: number; active: number; on_leave: number; online: number };
    activity: Array<{ id: number; title: string; description: string; time: string; branch: string; category?: string | null }>;
    alerts: Array<{ title: string; description: string; severity: 'critical' | 'warning' | string; branch: string; action_label: string; href: string }>;
    category_performance: Array<{ name: string; sales: number }>;
};

export default function Dashboard() {
    const { branch } = useBranchFilter();
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            setError('');
            const params = new URLSearchParams();
            params.set('branch_key', branch);
            params.set('range', timeRange);
            const res = await fetch(`/owner/dashboard/data?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Failed to load dashboard');
            const json = (await res.json()) as DashboardData;
            setData(json);
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Failed to load dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [branch, timeRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const salesGrowth = useMemo(() => {
        const growth = data?.sales.growth ?? 0;
        return {
            value: growth,
            isPositive: growth > 0,
            text: `${growth > 0 ? '+' : ''}${growth}% from previous period`,
        };
    }, [data?.sales.growth]);

    const totalSales = data?.sales.revenue ?? 0;
    const totalOrders = data?.sales.orders ?? 0;

    const invTotal = data?.inventory.total ?? 0;
    const invLow = data?.inventory.low_stock ?? 0;
    const invOut = data?.inventory.out_of_stock ?? 0;
    const invCategories = data?.inventory.categories ?? 0;

    const delPreparing = data?.deliveries.preparing ?? 0;
    const delOut = data?.deliveries.out_for_delivery ?? 0;
    const delDelivered = data?.deliveries.delivered ?? 0;
    const delDelayed = data?.deliveries.delayed ?? 0;

    const staffTotal = data?.staff.total ?? 0;
    const staffActive = data?.staff.active ?? 0;
    const staffOnLeave = data?.staff.on_leave ?? 0;
    const staffOnline = data?.staff.online ?? 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Owner Dashboard" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground">Real-time overview of your hardware store operations</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
                            <TabsList>
                                <TabsTrigger value="today">Today</TabsTrigger>
                                <TabsTrigger value="week">This Week</TabsTrigger>
                                <TabsTrigger value="month">This Month</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                {/* Enhanced Stat Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="cursor-pointer" onClick={() => router.visit('/SalesReports')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{totalSales.toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{isLoading ? '…' : totalOrders} orders</span>
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
                            <div className="mt-2 flex gap-2 text-xs">
                                <span className="text-muted-foreground">Lagonglong: ₱{(data?.sales.by_branch.find((b) => b.branch_key === 'lagonglong')?.revenue ?? 0).toLocaleString()}</span>
                                <span className="text-muted-foreground">Balingasag: ₱{(data?.sales.by_branch.find((b) => b.branch_key === 'balingasag')?.revenue ?? 0).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer" onClick={() => router.visit('/inventory')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : invTotal}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Total items</span>
                                <span>•</span>
                                <span>{isLoading ? '…' : invCategories} categories</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-orange-600">Low Stock</span>
                                    <span className="font-medium">{isLoading ? '…' : invLow}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Out of Stock</span>
                                    <span className="font-medium">{isLoading ? '…' : invOut}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer" onClick={() => router.visit('/owner/delivery-monitoring')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Delivery Status</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : delPreparing + delOut}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Pending deliveries</span>
                                <span>•</span>
                                <span>{isLoading ? '…' : delDelivered} delivered</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-blue-600">In Transit</span>
                                    <span className="font-medium">{isLoading ? '…' : delOut}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Delayed</span>
                                    <span className="font-medium">{isLoading ? '…' : delDelayed}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer" onClick={() => router.visit('/owner/staff-monitoring')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Staff Activity</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : staffOnline}/{isLoading ? '…' : staffTotal}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Online now</span>
                                <span>•</span>
                                <span>{isLoading ? '…' : staffActive} active</span>
                            </div>
                            <div className="mt-2">
                                <div className="flex -space-x-2">
                                    {[...Array(Math.min(staffOnline, 5))].map((_, i) => (
                                        <div key={i} className="h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                            <div className="h-2 w-2 rounded-full bg-white" />
                                        </div>
                                    ))}
                                    {staffOnline > 5 && (
                                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                            +{staffOnline - 5}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Enhanced Charts Section */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Sales Performance
                            </CardTitle>
                            <CardDescription>Revenue comparison across branches</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EnhancedSalesChart branch={branch} timeRange={timeRange} data={data?.sales.by_branch ?? []} isLoading={isLoading} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Category Performance
                            </CardTitle>
                            <CardDescription>Top performing product categories</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EnhancedCategoriesChart data={data?.category_performance ?? []} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                </div>

                {/* Activity and Alerts Section */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Recent Activity
                                    </CardTitle>
                                    <CardDescription>Latest system events and updates</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => router.visit('/ActivityLog')}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EnhancedActivityList activities={data?.activity ?? []} isLoading={isLoading} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Alerts & Notifications
                                    </CardTitle>
                                    <CardDescription>Items requiring attention</CardDescription>
                                </div>
                                <Badge variant="destructive">{(data?.inventory.low_stock ?? 0) + (data?.inventory.out_of_stock ?? 0)}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EnhancedAlertsList alerts={data?.alerts ?? []} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Quick Actions
                        </CardTitle>
                        <CardDescription>Frequently used tasks and shortcuts</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EnhancedQuickActions />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

// Enhanced Chart Components
function EnhancedSalesChart({
    branch,
    timeRange,
    data,
    isLoading,
}: {
    branch: string;
    timeRange: string;
    data: Array<{ branch_key: 'lagonglong' | 'balingasag'; label: string; revenue: number }>;
    isLoading: boolean;
}) {
    const rows = useMemo(() => {
        const base = data.map((d) => ({
            label: d.label,
            value: Number(d.revenue) || 0,
            color: d.branch_key === 'lagonglong' ? '#3b82f6' : '#10b981',
        }));

        if (branch === 'all') return base;
        if (branch === 'lagonglong') return base.filter((d) => d.label === 'Lagonglong');
        if (branch === 'balingasag') return base.filter((d) => d.label === 'Balingasag');
        return base;
    }, [branch, data]);

    const maxValue = Math.max(1, ...rows.map((d) => d.value));

    return (
        <div className="space-y-4">
            <div className="grid gap-4">
                {rows.map((item) => (
                    <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.label}</span>
                            <span className="font-bold">₱{isLoading ? '…' : item.value.toLocaleString()}</span>
                        </div>
                        <Progress 
                            value={(item.value / maxValue) * 100} 
                            className="h-3"
                            style={{ 
                                '--progress-background': item.color,
                            } as React.CSSProperties}
                        />
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Total Revenue</span>
                <span className="font-semibold">₱{rows.reduce((sum, item) => sum + item.value, 0).toLocaleString()}</span>
            </div>
        </div>
    );
}

function EnhancedCategoriesChart({ data, isLoading }: { data: Array<{ name: string; sales: number }>; isLoading: boolean }) {
    const categories = useMemo(() => {
        const base = data.map((c, idx) => ({
            name: c.name,
            sales: Number(c.sales) || 0,
            color: ['#06b6d4', '#a855f7', '#84cc16', '#f59e0b', '#ef4444'][idx % 5],
        }));

        const total = base.reduce((sum, c) => sum + c.sales, 0) || 1;
        return base.map((c) => ({
            ...c,
            value: Math.round((c.sales / total) * 100),
        }));
    }, [data]);

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {categories.map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: category.color }}
                            />
                            <div>
                                <div className="text-sm font-medium">{category.name}</div>
                                <div className="text-xs text-muted-foreground">₱{isLoading ? '…' : category.sales.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold">{category.value}%</div>
                            <div className="w-16 bg-muted rounded-full h-1.5 mt-1">
                                <div 
                                    className="h-1.5 rounded-full" 
                                    style={{ 
                                        width: `${category.value}%`,
                                        backgroundColor: category.color 
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EnhancedActivityList({
    activities,
    isLoading,
}: {
    activities: Array<{ id: number; title: string; description: string; time: string; branch: string; category?: string | null }>;
    isLoading: boolean;
}) {
    const rows = useMemo(() => {
        return activities.map((a) => {
            const cat = String(a.category || '').toLowerCase();
            const icon = cat.includes('inventory')
                ? Package
                : cat.includes('delivery')
                    ? Truck
                    : cat.includes('sale')
                        ? ShoppingCart
                        : cat.includes('staff')
                            ? Users
                            : Activity;
            const color = cat.includes('error') ? 'text-red-600' : 'text-muted-foreground';
            return { ...a, icon, color };
        });
    }, [activities]);

    return (
        <div className="space-y-4">
            {rows.map((activity) => {
                const Icon = activity.icon as any;
                return (
                    <div key={activity.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 ${activity.color}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{isLoading ? 'Loading…' : activity.title}</div>
                            <div className="text-xs text-muted-foreground">{isLoading ? '' : activity.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{isLoading ? '' : activity.time}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <Badge variant="outline" className="text-xs">{activity.branch}</Badge>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function EnhancedAlertsList({
    alerts,
    isLoading,
}: {
    alerts: Array<{ title: string; description: string; severity: string; branch: string; action_label: string; href: string }>;
    isLoading: boolean;
}) {

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'destructive';
            case 'warning': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-3">
            {alerts.map((alert, index) => (
                <div key={`${alert.title}-${index}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{alert.title}</div>
                            <div className="text-xs text-muted-foreground">{alert.description}</div>
                            <Badge variant="outline" className="text-xs mt-1">{alert.branch}</Badge>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant={getSeverityColor(alert.severity) as any}
                        onClick={() => router.visit(alert.href)}
                        disabled={isLoading}
                    >
                        {alert.action_label}
                    </Button>
                </div>
            ))}
        </div>
    );
}

function EnhancedQuickActions() {
    const actions = [
        {
            title: 'Add New Product',
            description: 'Add items to inventory',
            icon: Plus,
            color: 'bg-blue-500 hover:bg-blue-600',
            href: '/inventory'
        },
        {
            title: 'Generate Sales Report',
            description: 'View detailed analytics',
            icon: BarChart3,
            color: 'bg-green-500 hover:bg-green-600',
            href: '/SalesReports'
        },
        {
            title: 'Manage Staff',
            description: 'Update roles and permissions',
            icon: Users,
            color: 'bg-purple-500 hover:bg-purple-600',
            href: '/owner/staff-monitoring'
        },
        {
            title: 'View Activity Log',
            description: 'Monitor system events',
            icon: Activity,
            color: 'bg-orange-500 hover:bg-orange-600',
            href: '/ActivityLog'
        },
        {
            title: 'Compare Branches',
            description: 'Analyze performance',
            icon: Scale,
            color: 'bg-cyan-500 hover:bg-cyan-600',
            href: '/BranchComparison'
        },
        {
            title: 'Delivery Monitoring',
            description: 'Monitor in-store home deliveries',
            icon: Truck,
            color: 'bg-indigo-500 hover:bg-indigo-600',
            href: '/owner/delivery-monitoring'
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                    <a
                        key={index}
                        href={action.href}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                        <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center text-white`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium">{action.title}</div>
                            <div className="text-xs text-muted-foreground">{action.description}</div>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}
