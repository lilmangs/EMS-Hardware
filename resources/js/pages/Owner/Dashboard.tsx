import { Head } from '@inertiajs/react';
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
import { useMemo, useState } from 'react';
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

export default function Dashboard() {
    const { branch } = useBranchFilter();
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

    // Enhanced data with more realistic metrics
    const dashboardData = useMemo(() => ({
        todaySales: { 
            lagonglong: 28450, 
            balingasag: 19200, 
            total: 47650,
            growth: 12.5,
            orders: 89
        },
        inventory: {
            total: 1247,
            lowStock: 23,
            outOfStock: 4,
            categories: 8
        },
        deliveries: {
            pending: 18,
            inTransit: 12,
            delivered: 156,
            delayed: 3
        },
        staff: {
            total: 12,
            active: 10,
            onLeave: 2,
            online: 8
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
                            <div className="mt-2 flex gap-2 text-xs">
                                <span className="text-muted-foreground">Lagonglong: ₱{dashboardData.todaySales.lagonglong.toLocaleString()}</span>
                                <span className="text-muted-foreground">Balingasag: ₱{dashboardData.todaySales.balingasag.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboardData.inventory.total}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Total items</span>
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
                            <CardTitle className="text-sm font-medium">Delivery Status</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboardData.deliveries.pending + dashboardData.deliveries.inTransit}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Pending deliveries</span>
                                <span>•</span>
                                <span>{dashboardData.deliveries.delivered} delivered today</span>
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-blue-600">In Transit</span>
                                    <span className="font-medium">{dashboardData.deliveries.inTransit}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Delayed</span>
                                    <span className="font-medium">{dashboardData.deliveries.delayed}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Staff Activity</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboardData.staff.online}/{dashboardData.staff.total}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Online now</span>
                                <span>•</span>
                                <span>{dashboardData.staff.active} active today</span>
                            </div>
                            <div className="mt-2">
                                <div className="flex -space-x-2">
                                    {[...Array(Math.min(dashboardData.staff.online, 5))].map((_, i) => (
                                        <div key={i} className="h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                            <div className="h-2 w-2 rounded-full bg-white" />
                                        </div>
                                    ))}
                                    {dashboardData.staff.online > 5 && (
                                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                            +{dashboardData.staff.online - 5}
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
                            <EnhancedSalesChart branch={branch} timeRange={timeRange} />
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
                            <EnhancedCategoriesChart />
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
                                <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EnhancedActivityList />
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
                                <Badge variant="destructive">{dashboardData.inventory.lowStock + dashboardData.inventory.outOfStock}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <EnhancedAlertsList />
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
function EnhancedSalesChart({ branch, timeRange }: { branch: string; timeRange: string }) {
    const data = useMemo(() => {
        const baseData = [
            { label: 'Lagonglong', value: 28450, color: '#3b82f6' },
            { label: 'Balingasag', value: 19200, color: '#10b981' },
        ];

        if (branch === 'all') return baseData;
        if (branch === 'lagonglong') return baseData.filter((d) => d.label === 'Lagonglong');
        if (branch === 'balingasag') return baseData.filter((d) => d.label === 'Balingasag');
        return baseData;
    }, [branch]);

    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div className="space-y-4">
            <div className="grid gap-4">
                {data.map((item) => (
                    <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.label}</span>
                            <span className="font-bold">₱{item.value.toLocaleString()}</span>
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
                <span className="font-semibold">₱{data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}</span>
            </div>
        </div>
    );
}

function EnhancedCategoriesChart() {
    const categories = [
        { name: 'Hand Tools', value: 35, color: '#06b6d4', sales: 12450 },
        { name: 'Power Tools', value: 28, color: '#a855f7', sales: 9980 },
        { name: 'Fasteners', value: 18, color: '#84cc16', sales: 6420 },
        { name: 'Paint Supplies', value: 12, color: '#f59e0b', sales: 4280 },
        { name: 'Safety Equipment', value: 7, color: '#ef4444', sales: 2490 },
    ];

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
                                <div className="text-xs text-muted-foreground">₱{category.sales.toLocaleString()}</div>
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

function EnhancedActivityList() {
    const activities = [
        {
            title: 'New sale completed',
            description: 'Maria Garcia processed ₱2,450 order',
            time: '2 minutes ago',
            icon: ShoppingCart,
            color: 'text-green-600',
            branch: 'Lagonglong'
        },
        {
            title: 'Low stock alert',
            description: 'Electric Drill below threshold (5 units)',
            time: '15 minutes ago',
            icon: AlertTriangle,
            color: 'text-orange-600',
            branch: 'Balingasag'
        },
        {
            title: 'Staff login',
            description: 'Robert Chen started shift',
            time: '1 hour ago',
            icon: Users,
            color: 'text-blue-600',
            branch: 'Lagonglong'
        },
        {
            title: 'Delivery completed',
            description: 'Order #12345 delivered successfully',
            time: '2 hours ago',
            icon: Truck,
            color: 'text-green-600',
            branch: 'Balingasag'
        },
        {
            title: 'Inventory updated',
            description: 'Added 10 units of Hand Saw',
            time: '3 hours ago',
            icon: Package,
            color: 'text-purple-600',
            branch: 'Lagonglong'
        },
    ];

    return (
        <div className="space-y-4">
            {activities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                    <div key={index} className="flex items-start gap-3">
                        <div className={`mt-0.5 ${activity.color}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{activity.title}</div>
                            <div className="text-xs text-muted-foreground">{activity.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{activity.time}</span>
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

function EnhancedAlertsList() {
    const alerts = [
        {
            title: 'Electric Drill',
            description: 'Critical: Only 2 units remaining',
            severity: 'critical',
            branch: 'Lagonglong',
            action: 'Reorder Now'
        },
        {
            title: 'Hand Saw',
            description: 'Low stock: 5 units remaining',
            severity: 'warning',
            branch: 'Balingasag',
            action: 'View Details'
        },
        {
            title: 'Delivery Delay',
            description: 'Order #67890 delayed by 2 days',
            severity: 'warning',
            branch: 'Balingasag',
            action: 'Contact Customer'
        },
        {
            title: 'Power Drill',
            description: 'Out of stock',
            severity: 'critical',
            branch: 'Lagonglong',
            action: 'Urgent Restock'
        },
    ];

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
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{alert.title}</div>
                            <div className="text-xs text-muted-foreground">{alert.description}</div>
                            <Badge variant="outline" className="text-xs mt-1">{alert.branch}</Badge>
                        </div>
                    </div>
                    <Button size="sm" variant={getSeverityColor(alert.severity) as any}>
                        {alert.action}
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
            href: '/StaffManagement'
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
