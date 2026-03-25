import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Search, 
    Filter, 
    User, 
    ShoppingCart, 
    Package, 
    DollarSign, 
    Settings, 
    Shield, 
    AlertTriangle,
    CheckCircle,
    Clock,
    Calendar,
    Store,
    Truck,
    FileText,
    Edit,
    Trash2,
    Plus,
    Eye
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useBranchFilter } from '@/hooks/use-branch-filter';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Activity Log',
        href: '/ActivityLog',
    },
];

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

const getActivityIcon = (category: string | null) => {
    switch (category) {
        case 'sales': return ShoppingCart;
        case 'inventory': return Package;
        case 'delivery': return Truck;
        case 'users': return User;
        case 'security': return Shield;
        case 'system': return Settings;
        default: return FileText;
    }
};

const branchLabel = (k: LogRow['branch_key']) => {
    if (!k) return 'All Branches';
    return k.charAt(0).toUpperCase() + k.slice(1);
};

const isInDateRange = (iso: string, range: string) => {
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
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'success': return 'default';
        case 'warning': return 'secondary';
        case 'error': return 'destructive';
        case 'alert': return 'outline';
        default: return 'secondary';
    }
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        relative: getRelativeTime(date),
    };
};

const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
};

export default function ActivityLog() {
    const { logs } = usePage<{ logs: LogRow[] }>().props;
    const { branch: effectiveBranch } = useBranchFilter();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('7days');

    const selectedBranch = effectiveBranch !== 'all' ? effectiveBranch : branchFilter;

    useEffect(() => {
        if (effectiveBranch !== 'all') {
            setBranchFilter(effectiveBranch);
        }
    }, [effectiveBranch]);

    // Filter activities
    const filteredActivities = useMemo(() => {
        const source = logs ?? [];
        return source.filter((activity) => {
            if (!isInDateRange(activity.created_at, dateRange)) return false;

            const matchesSearch =
                String(activity.user ?? '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                String(activity.action ?? '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                String(activity.details ?? '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesCategory = categoryFilter === 'all' || activity.category === categoryFilter;

            const matchesBranch =
                selectedBranch === 'all' ||
                (selectedBranch === 'lagonglong' && activity.branch_key === 'lagonglong') ||
                (selectedBranch === 'balingasag' && activity.branch_key === 'balingasag');

            const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;

            return matchesSearch && matchesCategory && matchesBranch && matchesStatus;
        });
    }, [categoryFilter, dateRange, logs, searchTerm, selectedBranch, statusFilter]);

    // Summary stats
    const totalActivities = (logs ?? []).length;
    const todayActivities = (logs ?? []).filter(a => {
        const today = new Date().toDateString();
        return new Date(a.created_at).toDateString() === today;
    }).length;
    const alertCount = (logs ?? []).filter(a => a.status === 'error' || a.status === 'alert').length;
    const branchCounts = useMemo(() => {
        const counts = { lagonglong: 0, balingasag: 0, all: 0 };
        (logs ?? []).forEach(activity => {
            if (activity.branch_key === 'lagonglong') counts.lagonglong++;
            if (activity.branch_key === 'balingasag') counts.balingasag++;
            if (!activity.branch_key) counts.all++;
        });
        return counts;
    }, [logs]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Activity Log</h1>
                        <p className="text-muted-foreground">Monitor and track all system activities and events</p>
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

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalActivities}</div>
                            <p className="text-xs text-muted-foreground">
                                {todayActivities} today
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Lagonglong</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{branchCounts.lagonglong}</div>
                            <p className="text-xs text-muted-foreground">Main branch</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Balingasag</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{branchCounts.balingasag}</div>
                            <p className="text-xs text-muted-foreground">Secondary branch</p>
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

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                        <CardDescription>Recent system activities and events</CardDescription>
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

                {/* Activity Timeline */}
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
                                        <div className="text-center py-8 text-muted-foreground">
                                            No activities found matching your criteria.
                                        </div>
                                    ) : (
                                        filteredActivities.map((activity, idx) => {
                                            const Icon = getActivityIcon(activity.category);
                                            const formatted = formatTimestamp(activity.created_at);
                                            
                                            return (
                                                <div key={activity.id} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        {idx < filteredActivities.length - 1 && (
                                                            <div className="w-0.5 h-full bg-border mt-2" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{activity.user}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {activity.role}
                                                                </Badge>
                                                                <Badge variant={getStatusColor(activity.status)}>
                                                                    {activity.status}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {formatted.time}
                                                            </div>
                                                        </div>
                                                        <div className="font-medium">{getFriendlyAction(activity)}</div>
                                                        <div className="text-sm text-muted-foreground">{getFriendlyDetails(activity)}</div>
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatted.date}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {formatted.relative}
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
                                            <TableHead>Branch</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredActivities.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No activities found matching your criteria.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredActivities.map((activity) => {
                                                const Icon = getActivityIcon(activity.category);
                                                const formatted = formatTimestamp(activity.created_at);
                                                
                                                return (
                                                    <TableRow key={activity.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <div className="font-medium">{activity.user}</div>
                                                                    <div className="text-sm text-muted-foreground">{activity.email}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{getFriendlyAction(activity)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {branchLabel(activity.branch_key)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusColor(activity.status)}>
                                                                {activity.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <div>{formatted.date}</div>
                                                                <div className="text-muted-foreground">{formatted.time}</div>
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
