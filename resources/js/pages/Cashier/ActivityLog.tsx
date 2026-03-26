import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertTriangle,
    Calendar,
    Clock,
    Download,
    FileText,
    Package,
    Settings,
    Shield,
    ShoppingCart,
    Store,
    Truck,
    User,
    Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type LogRow = {
    id: number;
    user: string;
    email: string | null;
    role: string | null;
    branch_key: 'lagonglong' | 'balingasag' | null;
    method: string;
    path: string;
    route_name: string | null;
    action: string;
    details: string | null;
    category: string | null;
    status: string;
    ip_address: string | null;
    created_at: string;
};

function getFriendlyAction(l: LogRow): string {
    const rn = (l.route_name ?? '').toLowerCase();
    const method = (l.method ?? '').toUpperCase();

    if (method === 'POST' && rn === 'checkout.cart') return 'Updated cart';
    if (method === 'POST' && rn === 'checkout.complete') return 'Completed checkout';
    if (method === 'POST' && rn === 'refund.create') return 'Created refund';
    if (method === 'DELETE' && rn === 'products.destroy') return 'Removed product';

    if (l.category === 'sales') return 'Updated sales record';
    if (l.category === 'inventory') return 'Updated inventory';
    if (l.category === 'delivery') return 'Updated delivery';
    if (l.category === 'users') return 'Updated user account';
    if (l.category === 'security') return 'Security action';
    return 'System update';
}

function getFriendlyDetails(l: LogRow): string {
    if (l.category === 'sales') return 'Sales related activity';
    if (l.category === 'inventory') return 'Inventory related activity';
    if (l.category === 'delivery') return 'Delivery related activity';
    if (l.category === 'users') return 'User related activity';
    if (l.category === 'security') return 'Security related activity';
    return 'System related activity';
}

const getActivityIcon = (category: string | null | undefined) => {
    switch (category) {
        case 'sales':
            return ShoppingCart;
        case 'inventory':
            return Package;
        case 'delivery':
            return Truck;
        case 'users':
            return User;
        case 'security':
            return Shield;
        case 'system':
        default:
            return Settings;
    }
};

function statusBadge(status: string) {
    if (status === 'success') return <Badge>success</Badge>;
    if (status === 'error') return <Badge variant="destructive">error</Badge>;
    if (status === 'warning') return <Badge variant="secondary">warning</Badge>;
    if (status === 'alert') return <Badge variant="outline">alert</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
}

const branchLabel = (k: LogRow['branch_key']) => {
    if (!k) return '—';
    return k === 'lagonglong' ? 'Lagonglong' : 'Balingasag';
};

function isInDateRange(iso: string, range: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return true;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    if (range === 'today') {
        return d >= startOfToday;
    }
    const days = range === '30days' ? 30 : range === '90days' ? 90 : 7;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - (days - 1));
    return d >= start;
}

export default function CashierActivityLog() {
    const { props } = usePage<{ logs: LogRow[]; auth?: { user?: { role: string } } }>();
    const logs = props.logs;
    const userRole = props.auth?.user?.role;

    const breadcrumbs: BreadcrumbItem[] = [
        ...(userRole === 'cashier' ? [{
            title: 'Checkout',
            href: '/Checkout',
        }] : []),
        {
            title: 'Activity Log',
            href: '/cashier/activity-log',
        },
    ];

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('7days');

    const filteredActivities = useMemo(() => {
        const s = searchTerm.trim().toLowerCase();
        return (logs ?? []).filter((l) => {
            if (!isInDateRange(l.created_at, dateRange)) return false;

            const matchesSearch =
                !s ||
                String(l.user ?? '').toLowerCase().includes(s) ||
                String(l.email ?? '').toLowerCase().includes(s) ||
                String(l.action ?? '').toLowerCase().includes(s) ||
                String(l.details ?? '').toLowerCase().includes(s) ||
                String(l.route_name ?? '').toLowerCase().includes(s) ||
                String(l.path ?? '').toLowerCase().includes(s);

            const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' || l.status === statusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [categoryFilter, dateRange, logs, searchTerm, statusFilter]);

    const totalActivities = (logs ?? []).filter((l) => isInDateRange(l.created_at, dateRange)).length;
    const todayActivities = (logs ?? []).filter((l) => isInDateRange(l.created_at, 'today')).length;
    const alertCount = (logs ?? []).filter((l) => l.status === 'error' || l.status === 'alert').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Activity Log</h1>
                        <p className="text-muted-foreground">Track your actions inside the system</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                <SelectItem value="90days">Last 90 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalActivities}</div>
                            <p className="text-xs text-muted-foreground">{todayActivities} today</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Branch</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{branchLabel((logs ?? [])[0]?.branch_key ?? null)}</div>
                            <p className="text-xs text-muted-foreground">Current branch</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Success</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(logs ?? []).filter((l) => l.status === 'success' && isInDateRange(l.created_at, dateRange)).length}
                            </div>
                            <p className="text-xs text-muted-foreground">Completed actions</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{alertCount}</div>
                            <p className="text-xs text-muted-foreground">Need attention</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                        <CardDescription>Recent activities and events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 items-center gap-2">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search activities..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="inventory">Inventory</SelectItem>
                                        <SelectItem value="delivery">Delivery</SelectItem>
                                        <SelectItem value="users">Users</SelectItem>
                                        <SelectItem value="security">Security</SelectItem>
                                        <SelectItem value="system">System</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="warning">Warning</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                        <SelectItem value="alert">Alert</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="timeline" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="table">Table View</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="space-y-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {filteredActivities.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">No activities found.</div>
                                    ) : (
                                        filteredActivities.map((activity, idx) => {
                                            const Icon = getActivityIcon(activity.category);
                                            const d = new Date(activity.created_at);
                                            const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                            const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <div key={activity.id} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        {idx < filteredActivities.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{activity.user}</span>
                                                                {!!activity.role && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {activity.role}
                                                                    </Badge>
                                                                )}
                                                                {statusBadge(activity.status)}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">{time}</div>
                                                        </div>
                                                        <div className="font-medium">{getFriendlyAction(activity)}</div>
                                                        <div className="text-sm text-muted-foreground">{getFriendlyDetails(activity)}</div>
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {date}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {time}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Store className="h-3 w-3" />
                                                                {branchLabel(activity.branch_key)}
                                                            </span>
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

                    <TabsContent value="table" className="space-y-4">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredActivities.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No activities found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredActivities.map((activity) => {
                                                const Icon = getActivityIcon(activity.category);
                                                const d = new Date(activity.created_at);
                                                const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                                const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                                                return (
                                                    <TableRow key={activity.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <div className="font-medium">{activity.user}</div>
                                                                    <div className="text-sm text-muted-foreground">{activity.email ?? ''}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{getFriendlyAction(activity)}</TableCell>
                                                        <TableCell>{activity.category ?? '—'}</TableCell>
                                                        <TableCell>{statusBadge(activity.status)}</TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <div>{date}</div>
                                                                <div className="text-muted-foreground">{time}</div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
