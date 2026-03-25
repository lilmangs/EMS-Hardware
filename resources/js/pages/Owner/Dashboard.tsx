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
    Plus,
    Bell,
    ReceiptText,
    PieChart as PieIcon
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { cn } from '@/lib/utils';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Owner Dashboard',
        href: '/dashboard/owner',
    },
];

type DashboardAlert = {
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info' | string;
    branch: string;
    action_label: string;
    href: string;
};

type DashboardData = {
    filters: { branch_key: 'all' | 'lagonglong' | 'balingasag'; range: 'today' | 'week' | 'month'; from: string; to: string };
    sales: {
        revenue: number;
        cost: number;
        profit: number;
        orders: number;
        growth: number;
        by_branch: Array<{ branch_key: 'lagonglong' | 'balingasag'; label: string; revenue: number }>;
    };
    inventory: {
        active_products: number;
        total_inventory: number;
        initial_inventory: number;
        restocked: number;
        deducted: number;
        low_stock: number;
        out_of_stock: number;
        categories: number;
        adjustments: number;
        by_branch: Array<{
            branch_key: 'lagonglong' | 'balingasag';
            label: string;
            active_products: number;
            total_inventory: number;
            initial_inventory: number;
            restocked: number;
            deducted: number;
            low_stock: number;
            out_of_stock: number;
            categories: number;
            adjustments: number;
        }>;
    };
    deliveries: {
        preparing: number;
        out_for_delivery: number;
        delivered: number;
        delayed: number;
        by_branch: Array<{
            branch_key: 'lagonglong' | 'balingasag';
            label: string;
            preparing: number;
            out_for_delivery: number;
            delivered: number;
            delayed: number;
        }>;
    };
    staff: {
        total: number;
        active: number;
        on_leave: number;
        online: number;
        online_staff: Array<{ name: string; branch: string }>;
        by_branch: Array<{
            branch_key: 'lagonglong' | 'balingasag';
            label: string;
            total: number;
            active: number;
            on_leave: number;
            online: number;
        }>;
    };
    activity: Array<{ id: number; title: string; description: string; time: string; branch: string; category?: string | null }>;
    alerts: Array<DashboardAlert>;
    notifications: Array<DashboardAlert>;
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

    const branchLabel = useMemo(() => {
        return branch === 'lagonglong' ? 'Lagonglong' : branch === 'balingasag' ? 'Balingasag' : 'All Branches';
    }, [branch]);

    const isAllBranches = branch === 'all';

    const rangeLabel = useMemo(() => {
        return timeRange === 'today' ? "Today's" : timeRange === 'week' ? 'This Week' : 'This Month';
    }, [timeRange]);

    const totalSales = data?.sales.revenue ?? 0;
    const totalOrders = data?.sales.orders ?? 0;

    const lagonglongSales = data?.sales.by_branch.find((b) => b.branch_key === 'lagonglong')?.revenue ?? 0;
    const balingasagSales = data?.sales.by_branch.find((b) => b.branch_key === 'balingasag')?.revenue ?? 0;

    const displaySales = isAllBranches ? totalSales : branch === 'lagonglong' ? lagonglongSales : balingasagSales;

    const invActive = data?.inventory.active_products ?? 0;
    const invTotal = data?.inventory.total_inventory ?? 0;
    const invInitial = data?.inventory.initial_inventory ?? 0;
    const invRestocked = data?.inventory.restocked ?? 0;
    const invDeducted = data?.inventory.deducted ?? 0;
    const invCategories = data?.inventory.categories ?? 0;
    const invAdjustments = data?.inventory.adjustments ?? 0;

    const invLag = data?.inventory.by_branch?.find((b) => b.branch_key === 'lagonglong');
    const invBal = data?.inventory.by_branch?.find((b) => b.branch_key === 'balingasag');

    const displayInvActive = isAllBranches
        ? invActive
        : branch === 'lagonglong'
            ? (invLag?.active_products ?? 0)
            : (invBal?.active_products ?? 0);
    const displayInvTotal = isAllBranches
        ? invTotal
        : branch === 'lagonglong'
            ? (invLag?.total_inventory ?? 0)
            : (invBal?.total_inventory ?? 0);
    const displayInvInitial = isAllBranches
        ? invInitial
        : branch === 'lagonglong'
            ? (invLag?.initial_inventory ?? 0)
            : (invBal?.initial_inventory ?? 0);
    const displayInvRestocked = isAllBranches
        ? invRestocked
        : branch === 'lagonglong'
            ? (invLag?.restocked ?? 0)
            : (invBal?.restocked ?? 0);
    const displayInvDeducted = isAllBranches
        ? invDeducted
        : branch === 'lagonglong'
            ? (invLag?.deducted ?? 0)
            : (invBal?.deducted ?? 0);
    const displayInvCategories = isAllBranches
        ? invCategories
        : branch === 'lagonglong'
            ? (invLag?.categories ?? 0)
            : (invBal?.categories ?? 0);
    const displayInvAdjustments = isAllBranches
        ? invAdjustments
        : branch === 'lagonglong'
            ? (invLag?.adjustments ?? 0)
            : (invBal?.adjustments ?? 0);

    const delPreparing = data?.deliveries.preparing ?? 0;
    const delOut = data?.deliveries.out_for_delivery ?? 0;
    const delDelivered = data?.deliveries.delivered ?? 0;
    const delDelayed = data?.deliveries.delayed ?? 0;

    const delLag = data?.deliveries.by_branch?.find((b) => b.branch_key === 'lagonglong');
    const delBal = data?.deliveries.by_branch?.find((b) => b.branch_key === 'balingasag');

    const displayDelPreparing = isAllBranches
        ? delPreparing
        : branch === 'lagonglong'
            ? (delLag?.preparing ?? 0)
            : (delBal?.preparing ?? 0);
    const displayDelOut = isAllBranches
        ? delOut
        : branch === 'lagonglong'
            ? (delLag?.out_for_delivery ?? 0)
            : (delBal?.out_for_delivery ?? 0);
    const displayDelDelivered = isAllBranches
        ? delDelivered
        : branch === 'lagonglong'
            ? (delLag?.delivered ?? 0)
            : (delBal?.delivered ?? 0);
    const displayDelDelayed = isAllBranches
        ? delDelayed
        : branch === 'lagonglong'
            ? (delLag?.delayed ?? 0)
            : (delBal?.delayed ?? 0);

    const staffTotal = data?.staff.total ?? 0;
    const staffActive = data?.staff.active ?? 0;
    const staffOnLeave = data?.staff.on_leave ?? 0;
    const staffOnline = data?.staff.online ?? 0;

    const staffLag = data?.staff.by_branch?.find((b) => b.branch_key === 'lagonglong');
    const staffBal = data?.staff.by_branch?.find((b) => b.branch_key === 'balingasag');

    const displayStaffTotal = isAllBranches
        ? staffTotal
        : branch === 'lagonglong'
            ? (staffLag?.total ?? 0)
            : (staffBal?.total ?? 0);
    const displayStaffOnline = isAllBranches
        ? staffOnline
        : branch === 'lagonglong'
            ? (staffLag?.online ?? 0)
            : (staffBal?.online ?? 0);
    const displayStaffActive = isAllBranches
        ? staffActive
        : branch === 'lagonglong'
            ? (staffLag?.active ?? 0)
            : (staffBal?.active ?? 0);
    const displayStaffOnLeave = isAllBranches
        ? staffOnLeave
        : branch === 'lagonglong'
            ? (staffLag?.on_leave ?? 0)
            : (staffBal?.on_leave ?? 0);

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
                    <Card
                        className="cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg relative z-0 hover:z-10"
                        onClick={() => router.visit('/SalesReports')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{rangeLabel} Sales{isAllBranches ? '' : ` (${branchLabel})`}</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{displaySales.toLocaleString()}</div>
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
                            {isAllBranches && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-md border bg-background/60 px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Lagonglong</div>
                                        <div className="text-sm font-semibold">₱{lagonglongSales.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-md border bg-background/60 px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Balingasag</div>
                                        <div className="text-sm font-semibold">₱{balingasagSales.toLocaleString()}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg relative z-0 hover:z-10"
                        onClick={() => router.visit('/inventory')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{rangeLabel} Inventory{isAllBranches ? '' : ` (${branchLabel})`}</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 pb-4 border-b">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Initial Inventory</span>
                                    <span>{isLoading ? '…' : displayInvInitial.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                                        <span className="text-emerald-600">Total Restocked</span>
                                    </span>
                                    <span className="text-emerald-600">+{isLoading ? '…' : displayInvRestocked.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                                        <span className="text-red-600">Total Deducted</span>
                                    </span>
                                    <span className="text-red-600">-{isLoading ? '…' : displayInvDeducted.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Inventory</span>
                                    <div className="text-xl font-bold">
                                        {isLoading ? '…' : displayInvTotal.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">

                            </div>

                            {isAllBranches && (
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {[invLag, invBal].map((b) => b && (
                                        <div key={b.branch_key} className="rounded-md border bg-background/40 p-2 text-center">
                                            <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">{b.label}</div>
                                            <div className="text-sm font-black">{isLoading ? '…' : b.total_inventory.toLocaleString()}</div>
                                            <div className="text-[9px] text-muted-foreground mt-0.5">
                                                <span className="text-emerald-600">+{b.restocked}</span> | <span className="text-red-600">-{b.deducted}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg relative z-0 hover:z-10"
                        onClick={() => router.visit('/owner/delivery-monitoring')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{rangeLabel} Delivery Status{isAllBranches ? '' : ` (${branchLabel})`}</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : displayDelPreparing + displayDelOut}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Active deliveries</span>
                                <span>•</span>
                                <span>{rangeLabel}</span>
                            </div>
                            <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-yellow-600">Out for Delivery</span>
                                    <span className="font-medium">{isLoading ? '…' : displayDelOut}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-emerald-600 font-medium">Delivered</span>
                                    <span>{isLoading ? '…' : displayDelDelivered}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Delayed</span>
                                    <span className="font-medium">{isLoading ? '…' : displayDelDelayed}</span>
                                </div>
                            </div>
                            {isAllBranches && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-md border bg-background/60 px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Lagonglong</div>
                                        <div className="text-sm font-semibold">{isLoading ? '…' : (((delLag?.preparing ?? 0) + (delLag?.out_for_delivery ?? 0)).toLocaleString())}</div>
                                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>Out for Delivery</span>
                                            <span>{isLoading ? '…' : (delLag?.out_for_delivery ?? 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground text-emerald-600">
                                            <span>Delivered</span>
                                            <span>{isLoading ? '…' : (delLag?.delivered ?? 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="rounded-md border bg-background/60 px-3 py-2">
                                        <div className="text-[11px] text-muted-foreground">Balingasag</div>
                                        <div className="text-sm font-semibold">{isLoading ? '…' : (((delBal?.preparing ?? 0) + (delBal?.out_for_delivery ?? 0)).toLocaleString())}</div>
                                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>Out for Delivery</span>
                                            <span>{isLoading ? '…' : (delBal?.out_for_delivery ?? 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground text-emerald-600">
                                            <span>Delivered</span>
                                            <span>{isLoading ? '…' : (delBal?.delivered ?? 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg relative z-0 hover:z-10"
                        onClick={() => router.visit('/owner/staff-monitoring')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{rangeLabel} Staff Activity{isAllBranches ? '' : ` (${branchLabel})`}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? '…' : displayStaffOnline}/{isLoading ? '…' : displayStaffTotal}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Online now</span>
                                <span>•</span>
                                <span className={cn(displayStaffOnline > 0 ? "text-emerald-600 font-medium" : "")}>
                                    {displayStaffOnline > 0 ? 'On Duty' : 'Away'}
                                </span>
                            </div>

                            <div className="mt-4 space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                {isLoading ? (
                                    <div className="text-xs text-muted-foreground italic">Checking status...</div>
                                ) : (data?.staff.online_staff || []).length > 0 ? (
                                    (data?.staff.online_staff || []).map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-md bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <span className="font-semibold text-emerald-900 dark:text-emerald-100">{s.name}</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.branch}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[11px] text-muted-foreground p-3 border border-dashed rounded-lg text-center bg-muted/10">
                                        No staff currently online
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-dashed space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground uppercase tracking-wider font-medium">Active</span>
                                    <span className="font-bold">{isLoading ? '…' : displayStaffActive}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground uppercase tracking-wider font-medium">
                                        <span className="text-emerald-600">Total Online</span>
                                    </span>
                                    <span className="font-bold text-emerald-600">{isLoading ? '…' : displayStaffOnline}</span>
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
                                Sales
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
                                <PieIcon className="h-5 w-5" />
                                Top salable product
                            </CardTitle>
                            <CardDescription>Top performing product categories</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EnhancedCategoriesChart data={data?.category_performance ?? []} isLoading={isLoading} />
                        </CardContent>
                    </Card>
                </div>

                {/* Critical Alerts & Notifications Section */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Alerts Card */}
                    <Card className="border-black-100 dark:border-black-900/60">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-black-600 dark:text-black-400">
                                    <AlertTriangle className="h-5 w-5" />
                                    Critical Inventory
                                </CardTitle>
                                <Badge variant="destructive" className="animate-pulse">
                                    {(data?.inventory.low_stock ?? 0) + (data?.inventory.out_of_stock ?? 0)}
                                </Badge>
                            </div>
                            <CardDescription>Items that need restocking immediately</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EnhancedAlertsList alerts={data?.alerts ?? []} isLoading={isLoading} />
                        </CardContent>
                    </Card>

                    {/* Notifications Card */}
                    <Card className="border-black-100 dark:border-black-900/30">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-black-600 dark:text-black-400">
                                    <Bell className="h-5 w-5" />
                                    Recent Notifications
                                </CardTitle>
                                <Badge variant="secondary">{(data?.notifications ?? []).length}</Badge>
                            </div>
                            <CardDescription>Latest logistics and delivery updates</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EnhancedAlertsList alerts={data?.notifications ?? []} isLoading={isLoading} />
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
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} margin={{ top: 24, right: 28, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            interval={0}
                            tickMargin={8}
                        />
                        <YAxis
                            hide
                            domain={[0, Math.ceil(maxValue * 1.15)]}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            formatter={(value: any) => [`₱${Number(value || 0).toLocaleString()}`, 'Revenue']}
                            labelFormatter={(label: any) => String(label ?? '')}
                        />
                        <Bar
                            dataKey="value"
                            fill="#f97316"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={!isLoading}
                        >
                            <LabelList
                                dataKey="value"
                                position="top"
                                formatter={(v: any) => `₱${Number(v || 0).toLocaleString()}`}
                                style={{ fontSize: '11px', fill: '#6b7280', fontWeight: '500' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
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
        const customColors = ['#5E0006', '#9B0F06', '#001F3D', '#7f1d1d', '#0f172a'];
        const base = data.map((c, idx) => {
            const name = c.name.toLowerCase();
            let color = customColors[idx % customColors.length];

            if (name.includes('power tools')) {
                color = '#f97316'; // Vivid Orange
            }

            return {
                name: c.name,
                sales: Number(c.sales) || 0,
                color,
            };
        });

        const total = base.reduce((sum, c) => sum + c.sales, 0) || 1;
        return base.map((c) => ({
            ...c,
            value: Math.round((c.sales / total) * 100),
        }));
    }, [data]);

    return (
        <div className="flex flex-col md:flex-row items-center gap-6 py-2">
            <div className="h-48 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categories}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="sales"
                            isAnimationActive={!isLoading}
                        >
                            {categories.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [`₱${Number(value || 0).toLocaleString()}`, 'Sales']}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-3">
                {categories.map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: category.color }}
                            />
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{category.name}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">₱{isLoading ? '…' : category.sales.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-sm font-bold">{category.value}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EnhancedAlertsList({
    alerts,
    isLoading,
}: {
    alerts: Array<DashboardAlert>;
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
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-all duration-200 hover:-translate-y-1 hover:shadow-lg relative z-0 hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
