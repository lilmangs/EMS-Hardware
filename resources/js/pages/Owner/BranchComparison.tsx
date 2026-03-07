import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, BarChart3, PieChart, Table } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branch Comparison',
        href: '/BranchComparison',
    },
];

// Sample data
const branchData = {
    lagonglong: {
        name: 'Lagonglong Main Branch',
        totalSales: 284500,
        totalOrders: 142,
        totalCustomers: 89,
        topProduct: 'Hammer',
        growth: 12.5,
    },
    balingasag: {
        name: 'Balingasag Branch',
        totalSales: 198200,
        totalOrders: 98,
        totalCustomers: 62,
        topProduct: 'Drill Set',
        growth: -3.2,
    },
};

const monthlySalesData = [
    { month: 'Jan', lagonglong: 220000, balingasag: 180000 },
    { month: 'Feb', lagonglong: 235000, balingasag: 175000 },
    { month: 'Mar', lagonglong: 260000, balingasag: 190000 },
    { month: 'Apr', lagonglong: 275000, balingasag: 195000 },
    { month: 'May', lagonglong: 290000, balingasag: 200000 },
    { month: 'Jun', lagonglong: 284500, balingasag: 198200 },
];

const categoryComparison = [
    { category: 'Power Tools', lagonglong: 85000, balingasag: 65000 },
    { category: 'Hand Tools', lagonglong: 72000, balingasag: 58000 },
    { category: 'Building Materials', lagonglong: 68000, balingasag: 45000 },
    { category: 'Electrical', lagonglong: 35000, balingasag: 22000 },
    { category: 'Plumbing', lagonglong: 24500, balingasag: 8200 },
];

const topProductsComparison = [
    { product: 'Hammer', lagonglongSales: 45000, balingasagSales: 32000 },
    { product: 'Drill Set', lagonglongSales: 38000, balingasagSales: 41000 },
    { product: 'Saw', lagonglongSales: 32000, balingasagSales: 28000 },
    { product: 'Screwdriver Set', lagonglongSales: 28000, balingasagSales: 24000 },
    { product: 'Wrench Set', lagonglongSales: 25000, balingasagSales: 18000 },
];

export default function BranchComparison() {
    const totalSales = branchData.lagonglong.totalSales + branchData.balingasag.totalSales;
    const totalOrders = branchData.lagonglong.totalOrders + branchData.balingasag.totalOrders;
    const totalCustomers = branchData.lagonglong.totalCustomers + branchData.balingasag.totalCustomers;

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
                        <Select defaultValue="6months">
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
                        <Button>Export Report</Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{totalSales.toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                    <span>Lagonglong: +12.5%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                    <span>Balingasag: -3.2%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalOrders}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Lagonglong: {branchData.lagonglong.totalOrders}</span>
                                <span>•</span>
                                <span>Balingasag: {branchData.balingasag.totalOrders}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalCustomers}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Lagonglong: {branchData.lagonglong.totalCustomers}</span>
                                <span>•</span>
                                <span>Balingasag: {branchData.balingasag.totalCustomers}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{Math.round(totalSales / totalOrders).toLocaleString()}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Lagonglong: ₱{Math.round(branchData.lagonglong.totalSales / branchData.lagonglong.totalOrders).toLocaleString()}</span>
                                <span>•</span>
                                <span>Balingasag: ₱{Math.round(branchData.balingasag.totalSales / branchData.balingasag.totalOrders).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts and Tables */}
                <Tabs defaultValue="sales-trend" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="sales-trend">Sales Trend</TabsTrigger>
                        <TabsTrigger value="category-comparison">Category Comparison</TabsTrigger>
                        <TabsTrigger value="top-products">Top Products</TabsTrigger>
                        <TabsTrigger value="performance-metrics">Performance Metrics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sales-trend" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly Sales Comparison</CardTitle>
                                <CardDescription>Sales performance over the last 6 months</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                                    <div className="text-center">
                                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">Sales trend chart will be displayed here</p>
                                        <p className="text-sm text-muted-foreground mt-2">Lagonglong vs Balingasag monthly comparison</p>
                                    </div>
                                </div>
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
                                    {categoryComparison.map((category) => {
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
                                    })}
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
                                            {topProductsComparison.map((product) => {
                                                const total = product.lagonglongSales + product.balingasagSales;
                                                const isLagonglongBetter = product.lagonglongSales > product.balingasagSales;

                                                return (
                                                    <tr key={product.product} className="border-b">
                                                        <td className="p-2 font-medium">{product.product}</td>
                                                        <td className="text-right p-2">₱{product.lagonglongSales.toLocaleString()}</td>
                                                        <td className="text-right p-2">₱{product.balingasagSales.toLocaleString()}</td>
                                                        <td className="text-right p-2 font-medium">₱{total.toLocaleString()}</td>
                                                        <td className="text-center p-2">
                                                            <Badge variant={isLagonglongBetter ? "default" : "secondary"}>
                                                                {isLagonglongBetter ? "Lagonglong" : "Balingasag"} Lead
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="performance-metrics" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Lagonglong Performance</CardTitle>
                                    <CardDescription>Key metrics for Lagonglong Main Branch</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span>Growth Rate</span>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="font-medium text-green-600">+12.5%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Top Product</span>
                                        <Badge variant="outline">{branchData.lagonglong.topProduct}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Customer Retention</span>
                                        <span className="font-medium">78%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Inventory Turnover</span>
                                        <span className="font-medium">4.2x</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Balingasag Performance</CardTitle>
                                    <CardDescription>Key metrics for Balingasag Branch</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span>Growth Rate</span>
                                        <div className="flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            <span className="font-medium text-red-600">-3.2%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Top Product</span>
                                        <Badge variant="outline">{branchData.balingasag.topProduct}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Customer Retention</span>
                                        <span className="font-medium">65%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Inventory Turnover</span>
                                        <span className="font-medium">3.1x</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
