import { Head, usePage } from '@inertiajs/react';
import { 
    PhilippinePeso, 
    ReceiptText, 
    ShoppingBag, 
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Filter,
    Download,
    Calendar,
    DollarSign,
    Package,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    MoreHorizontal,
    Target,
    Activity,
    Clock,
    Store,
    CreditCard
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBranchFilter } from '@/hooks/use-branch-filter';

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
    const [reportType, setReportType] = useState<'overview' | 'products' | 'customers' | 'branches'>('overview');

    const report = useMemo(() => {
        const base = {
            today: {
                totals: { 
                    revenue: 28450, 
                    orders: 89, 
                    items: 342, 
                    growth: 12.5,
                    avgOrderValue: 319.66,
                    customers: 67,
                    refundRate: 2.1
                },
                trend: [1200, 1800, 1600, 2200, 2400, 3000, 2800],
                topProducts: [
                    { name: 'Electric Drill', qty: 14, amount: 25900, category: 'Power Tools' },
                    { name: 'Hand Saw', qty: 23, amount: 7360, category: 'Hand Tools' },
                    { name: 'Measuring Tape', qty: 31, amount: 7750, category: 'Measuring Tools' },
                    { name: 'White Paint (1L)', qty: 18, amount: 4320, category: 'Paint' },
                    { name: 'Bolts & Nuts (Assorted)', qty: 45, amount: 4500, category: 'Fasteners' },
                ],
                branchPerformance: [
                    { name: 'Lagonglong', revenue: 18450, orders: 54, growth: 15.2 },
                    { name: 'Balingasag', revenue: 10000, orders: 35, growth: 8.7 },
                ],
                categoryBreakdown: [
                    { name: 'Power Tools', revenue: 12890, percentage: 45.3, color: '#3b82f6' },
                    { name: 'Hand Tools', revenue: 8450, percentage: 29.7, color: '#10b981' },
                    { name: 'Paint', revenue: 4320, percentage: 15.2, color: '#f59e0b' },
                    { name: 'Fasteners', revenue: 2790, percentage: 9.8, color: '#8b5cf6' },
                ],
                transactions: [
                    { id: 'TRX-1001', customer: 'Maria Santos', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 5, total: 3590, date: 'Today 09:12 AM', payment: 'Cash', status: 'completed' },
                    { id: 'TRX-1002', customer: 'Pedro Reyes', branchKey: 'balingasag', branch: 'Balingasag Branch', items: 3, total: 2500, date: 'Today 10:03 AM', payment: 'Card', status: 'completed' },
                    { id: 'TRX-1003', customer: 'Ana Reyes', branchKey: 'balingasag', branch: 'Balingasag Branch', items: 7, total: 6780, date: 'Today 11:45 AM', payment: 'Cash', status: 'completed' },
                    { id: 'TRX-1004', customer: 'Chris Lim', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 4, total: 8450, date: 'Today 02:15 PM', payment: 'Card', status: 'completed' },
                    { id: 'TRX-1005', customer: 'Juan Dela Cruz', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 2, total: 3700, date: 'Today 03:30 PM', payment: 'Cash', status: 'completed' },
                ],
                customerInsights: [
                    { name: 'Maria Santos', orders: 3, totalSpent: 8450, avgOrder: 2816.67, lastPurchase: 'Today 09:12 AM' },
                    { name: 'Chris Lim', orders: 2, totalSpent: 12150, avgOrder: 6075, lastPurchase: 'Today 02:15 PM' },
                    { name: 'Ana Reyes', orders: 2, totalSpent: 9280, avgOrder: 4640, lastPurchase: 'Today 11:45 AM' },
                ],
            },
            week: {
                totals: { 
                    revenue: 178902, 
                    orders: 567, 
                    items: 2456, 
                    growth: 6.2,
                    avgOrderValue: 315.52,
                    customers: 412,
                    refundRate: 1.8
                },
                trend: [21000, 24000, 23000, 27000, 29000, 31000, 33902],
                topProducts: [
                    { name: 'Bolts & Nuts (Assorted)', qty: 320, amount: 32000, category: 'Fasteners' },
                    { name: 'Electric Drill', qty: 48, amount: 88800, category: 'Power Tools' },
                    { name: 'White Paint (1L)', qty: 145, amount: 34800, category: 'Paint' },
                    { name: 'Measuring Tape', qty: 167, amount: 41750, category: 'Measuring Tools' },
                    { name: 'Hand Saw', qty: 89, amount: 28480, category: 'Hand Tools' },
                ],
                branchPerformance: [
                    { name: 'Lagonglong', revenue: 108450, orders: 342, growth: 7.8 },
                    { name: 'Balingasag', revenue: 70452, orders: 225, growth: 4.1 },
                ],
                categoryBreakdown: [
                    { name: 'Power Tools', revenue: 78900, percentage: 44.1, color: '#3b82f6' },
                    { name: 'Hand Tools', revenue: 48200, percentage: 26.9, color: '#10b981' },
                    { name: 'Paint', revenue: 34800, percentage: 19.5, color: '#f59e0b' },
                    { name: 'Fasteners', revenue: 17002, percentage: 9.5, color: '#8b5cf6' },
                ],
                transactions: [
                    { id: 'TRX-0901', customer: 'Maria Santos', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 5, total: 3590, date: 'Mon 09:12 AM', payment: 'Cash', status: 'completed' },
                    { id: 'TRX-0902', customer: 'Pedro Reyes', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 2, total: 3700, date: 'Mon 02:03 PM', payment: 'Card', status: 'completed' },
                    { id: 'TRX-0903', customer: 'Juan Dela Cruz', branchKey: 'balingasag', branch: 'Balingasag Branch', items: 4, total: 6780, date: 'Tue 11:45 AM', payment: 'Cash', status: 'completed' },
                    { id: 'TRX-0904', customer: 'Ana Reyes', branchKey: 'balingasag', branch: 'Balingasag Branch', items: 7, total: 8450, date: 'Wed 04:20 PM', payment: 'Card', status: 'completed' },
                    { id: 'TRX-0905', customer: 'Chris Lim', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 9, total: 12150, date: 'Fri 01:08 PM', payment: 'Cash', status: 'completed' },
                ],
                customerInsights: [
                    { name: 'Maria Santos', orders: 8, totalSpent: 28450, avgOrder: 3556.25, lastPurchase: 'Mon 09:12 AM' },
                    { name: 'Chris Lim', orders: 5, totalSpent: 45200, avgOrder: 9040, lastPurchase: 'Fri 01:08 PM' },
                    { name: 'Ana Reyes', orders: 6, totalSpent: 38900, avgOrder: 6483.33, lastPurchase: 'Wed 04:20 PM' },
                ],
            },
            month: {
                totals: { 
                    revenue: 742105, 
                    orders: 2341, 
                    items: 10234, 
                    growth: 9.1,
                    avgOrderValue: 317.04,
                    customers: 1678,
                    refundRate: 2.3
                },
                trend: [82000, 92000, 88000, 101000, 113000, 120500, 145605],
                topProducts: [
                    { name: 'Bolts & Nuts (Assorted)', qty: 1520, amount: 152000, category: 'Fasteners' },
                    { name: 'Electric Drill', qty: 198, amount: 366300, category: 'Power Tools' },
                    { name: 'White Paint (1L)', qty: 580, amount: 139200, category: 'Paint' },
                    { name: 'Measuring Tape', qty: 678, amount: 169500, category: 'Measuring Tools' },
                    { name: 'Hand Saw', qty: 389, amount: 124480, category: 'Hand Tools' },
                ],
                branchPerformance: [
                    { name: 'Lagonglong', revenue: 448900, orders: 1412, growth: 10.2 },
                    { name: 'Balingasag', revenue: 293205, orders: 929, growth: 7.6 },
                ],
                categoryBreakdown: [
                    { name: 'Power Tools', revenue: 328900, percentage: 44.3, color: '#3b82f6' },
                    { name: 'Hand Tools', revenue: 198450, percentage: 26.7, color: '#10b981' },
                    { name: 'Paint', revenue: 139200, percentage: 18.8, color: '#f59e0b' },
                    { name: 'Fasteners', revenue: 75555, percentage: 10.2, color: '#8b5cf6' },
                ],
                transactions: [
                    { id: 'TRX-0701', customer: 'Maria Santos', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 5, total: 3590, date: 'Week 1', payment: 'Cash', status: 'completed' },
                    { id: 'TRX-0702', customer: 'Pedro Reyes', branchKey: 'balingasag', branch: 'Balingasag Branch', items: 3, total: 2500, date: 'Week 1', payment: 'Card', status: 'completed' },
                    { id: 'TRX-0703', customer: 'Ana Reyes', branchKey: 'balingasag', branch: 'Balingasag Branch', items: 7, total: 6780, date: 'Week 2', payment: 'Cash', status: 'completed' },
                    { id: 'TRX-0704', customer: 'Chris Lim', branchKey: 'lagonglong', branch: 'Lagonglong Main Branch', items: 9, total: 12150, date: 'Week 3', payment: 'Card', status: 'completed' },
                ],
                customerInsights: [
                    { name: 'Maria Santos', orders: 24, totalSpent: 85650, avgOrder: 3568.75, lastPurchase: 'Week 3' },
                    { name: 'Chris Lim', orders: 18, totalSpent: 128900, avgOrder: 7161.11, lastPurchase: 'Week 4' },
                    { name: 'Ana Reyes', orders: 21, totalSpent: 98700, avgOrder: 4700, lastPurchase: 'Week 4' },
                ],
            },
        };

        const current = base[range];
        const filteredTransactions =
            effectiveBranch === 'all' ? current.transactions : current.transactions.filter((t) => t.branchKey === effectiveBranch);
        
        const filteredBranchPerformance =
            effectiveBranch === 'all' ? current.branchPerformance : current.branchPerformance.filter((b) => b.name.toLowerCase().includes(effectiveBranch));

        return {
            ...current,
            transactions: filteredTransactions,
            branchPerformance: filteredBranchPerformance,
        };
    }, [effectiveBranch, range]);

    const getGrowthIcon = (growth: number) => {
        return growth >= 0 ? ArrowUpRight : ArrowDownRight;
    };

    const getGrowthColor = (growth: number) => {
        return growth >= 0 ? 'text-green-600' : 'text-red-600';
    };

    const getPaymentBadgeColor = (payment: string) => {
        switch (payment) {
            case 'Cash': return 'default';
            case 'Card': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Reports" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Sales Reports</h1>
                        <p className="text-muted-foreground">Comprehensive sales analytics and insights</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline">
                            <Calendar className="mr-2 h-4 w-4" />
                            Custom Range
                        </Button>
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
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
                </div>

                {/* Enhanced Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{report.totals.revenue.toLocaleString()}</div>
                            <div className="flex items-center gap-1 text-xs">
                                {(() => {
                                    const Icon = getGrowthIcon(report.totals.growth);
                                    return <Icon className={`h-3 w-3 ${getGrowthColor(report.totals.growth)}`} />;
                                })()}
                                <span className={getGrowthColor(report.totals.growth)}>
                                    {report.totals.growth > 0 ? '+' : ''}{report.totals.growth}%
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Orders</CardTitle>
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{report.totals.orders.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Total transactions</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{report.totals.items.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Products sold</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Order</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{report.totals.avgOrderValue.toFixed(0)}</div>
                            <p className="text-xs text-muted-foreground">Per transaction</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Customers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{report.totals.customers.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Unique buyers</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{report.totals.refundRate}%</div>
                            <p className="text-xs text-muted-foreground">Of total sales</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="products">Products</TabsTrigger>
                        <TabsTrigger value="customers">Customers</TabsTrigger>
                        <TabsTrigger value="branches">Branches</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Sales Trend
                                    </CardTitle>
                                    <CardDescription>Revenue over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <EnhancedSalesTrendChart values={report.trend} range={range} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PieChart className="h-5 w-5" />
                                        Category Breakdown
                                    </CardTitle>
                                    <CardDescription>Sales by category</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CategoryBreakdownChart categories={report.categoryBreakdown} />
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Transactions</CardTitle>
                                <CardDescription>Latest sales activity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EnhancedTransactionsTable transactions={report.transactions} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="products" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Performing Products</CardTitle>
                                <CardDescription>Best-selling items by revenue</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EnhancedTopProductsList items={report.topProducts} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="customers" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Customer Insights</CardTitle>
                                <CardDescription>Top customers by spending</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CustomerInsightsList customers={report.customerInsights} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="branches" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Branch Performance</CardTitle>
                                <CardDescription>Revenue comparison across locations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BranchPerformanceList branches={report.branchPerformance} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

// Enhanced Chart Components
function EnhancedSalesTrendChart({ values, range }: { values: number[]; range: string }) {
    const max = Math.max(...values, 1);
    const getLabels = () => {
        switch (range) {
            case 'today': return ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM', '11PM'];
            case 'week': return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            case 'month': return ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'];
            default: return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        }
    };

    const labels = getLabels();

    return (
        <div className="space-y-4">
            <div className="relative h-64 rounded-lg bg-muted/30 p-4">
                <div className="absolute inset-4 grid grid-rows-4 gap-0">
                    <div className="border-b border-border/50" />
                    <div className="border-b border-border/50" />
                    <div className="border-b border-border/50" />
                    <div className="border-b border-border/50" />
                </div>

                <div className="relative flex h-full items-end gap-2 px-4">
                    {values.map((v, idx) => (
                        <div key={labels[idx] ?? idx} className="flex-1 flex flex-col items-center">
                            <div
                                className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 transition-colors"
                                style={{ height: `${(v / max) * 100}%` }}
                            />
                            <div className="text-xs font-medium text-center mt-2">
                                ₱{(v / 1000).toFixed(1)}k
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
                {labels.map((l) => (
                    <div key={l}>{l}</div>
                ))}
            </div>
        </div>
    );
}

function CategoryBreakdownChart({ categories }: { categories: { name: string; revenue: number; percentage: number; color: string }[] }) {
    return (
        <div className="space-y-4">
            {categories.map((category) => (
                <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold">₱{category.revenue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                        </div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                </div>
            ))}
        </div>
    );
}

function EnhancedTransactionsTable({ transactions }: { transactions: any[] }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                            <TableCell className="font-medium">{transaction.id}</TableCell>
                            <TableCell>{transaction.customer}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{transaction.branch}</Badge>
                            </TableCell>
                            <TableCell>{transaction.items}</TableCell>
                            <TableCell>
                                <Badge variant={transaction.payment === 'Cash' ? 'default' : 'secondary'}>
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    {transaction.payment}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">₱{transaction.total.toLocaleString()}</TableCell>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <ReceiptText className="mr-2 h-4 w-4" />
                                            Print Receipt
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function EnhancedTopProductsList({ items }: { items: { name: string; qty: number; amount: number; category: string }[] }) {
    return (
        <div className="space-y-4">
            {items.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                            {index + 1}
                        </div>
                        <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.category}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium">₱{product.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{product.qty} units sold</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CustomerInsightsList({ customers }: { customers: { name: string; orders: number; totalSpent: number; avgOrder: number; lastPurchase: string }[] }) {
    return (
        <div className="space-y-4">
            {customers.map((customer) => (
                <div key={customer.name} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">Last purchase: {customer.lastPurchase}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium">₱{customer.totalSpent.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{customer.orders} orders • avg ₱{customer.avgOrder.toFixed(0)}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function BranchPerformanceList({ branches }: { branches: { name: string; revenue: number; orders: number; growth: number }[] }) {
    return (
        <div className="space-y-4">
            {branches.map((branch) => (
                <div key={branch.name} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Store className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-medium">{branch.name}</div>
                            <div className="text-sm text-muted-foreground">{branch.orders} orders</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium">₱{branch.revenue.toLocaleString()}</div>
                        <div className="flex items-center justify-end gap-1 text-sm">
                            {(() => {
                                const Icon = branch.growth >= 0 ? ArrowUpRight : ArrowDownRight;
                                return <Icon className={`h-3 w-3 ${branch.growth >= 0 ? 'text-green-600' : 'text-red-600'}`} />;
                            })()}
                            <span className={branch.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {branch.growth > 0 ? '+' : ''}{branch.growth}%
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
