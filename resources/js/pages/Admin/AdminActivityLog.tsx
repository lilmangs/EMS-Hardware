import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Search,
    Download,
    UserCog,
    LogIn,
    ShieldAlert,
    Settings,
    AlertTriangle,
    Clock,
    Calendar,
    Activity,
    Users,
    Lock,
    Globe,
    ClipboardList,
    RefreshCw,
    FileText,
} from 'lucide-react';
import { useState, useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Superadmin Dashboard',
        href: '/Superadmin',
    },
    {
        title: 'Activity Log',
        href: '/Superadmin/ActivityLog',
    },
];

// --- Sample Data ---
const adminActivities = [
    {
        id: 1,
        actor: 'Super Admin',
        actorEmail: 'admin@system.com',
        actorRole: 'superadmin',
        action: 'Created new user account',
        target: 'John Smith (owner)',
        category: 'user_management',
        severity: 'success',
        timestamp: '2024-06-20T10:30:00Z',
        ipAddress: '192.168.1.1',
        details: 'New owner account created for Lagonglong branch.',
    },
    {
        id: 2,
        actor: 'Super Admin',
        actorEmail: 'admin@system.com',
        actorRole: 'superadmin',
        action: 'Role changed',
        target: 'Maria Garcia (cashier → owner)',
        category: 'user_management',
        severity: 'warning',
        timestamp: '2024-06-20T09:15:00Z',
        ipAddress: '192.168.1.1',
        details: 'Promoted Maria Garcia from Cashier to Owner role.',
    },
    {
        id: 3,
        actor: 'John Smith',
        actorEmail: 'john@hardware.com',
        actorRole: 'owner',
        action: 'Login successful',
        target: 'Self',
        category: 'authentication',
        severity: 'success',
        timestamp: '2024-06-20T08:45:00Z',
        ipAddress: '192.168.1.100',
        details: 'Owner logged in from Lagonglong branch terminal.',
    },
    {
        id: 4,
        actor: 'Unknown',
        actorEmail: 'hacker@external.com',
        actorRole: 'unknown',
        action: 'Failed login attempt',
        target: 'admin@system.com',
        category: 'security',
        severity: 'error',
        timestamp: '2024-06-19T23:50:00Z',
        ipAddress: '45.33.10.212',
        details: 'Multiple failed login attempts from unrecognized IP. Account temporarily locked.',
    },
    {
        id: 5,
        actor: 'Super Admin',
        actorEmail: 'admin@system.com',
        actorRole: 'superadmin',
        action: 'Deleted user account',
        target: 'Juan Dela Cruz (delivery)',
        category: 'user_management',
        severity: 'error',
        timestamp: '2024-06-19T16:20:00Z',
        ipAddress: '192.168.1.1',
        details: 'Permanently deleted delivery account for former employee.',
    },
    {
        id: 6,
        actor: 'System',
        actorEmail: 'system@internal',
        actorRole: 'system',
        action: 'Password reset triggered',
        target: 'robert@hardware.com',
        category: 'security',
        severity: 'warning',
        timestamp: '2024-06-19T14:30:00Z',
        ipAddress: 'System',
        details: 'Password reset link sent after 5 failed login attempts.',
    },
    {
        id: 7,
        actor: 'Super Admin',
        actorEmail: 'admin@system.com',
        actorRole: 'superadmin',
        action: 'System settings updated',
        target: 'Global Configuration',
        category: 'system',
        severity: 'success',
        timestamp: '2024-06-19T11:00:00Z',
        ipAddress: '192.168.1.1',
        details: 'Updated session timeout and two-factor authentication settings.',
    },
    {
        id: 8,
        actor: 'Maria Garcia',
        actorEmail: 'maria@hardware.com',
        actorRole: 'cashier',
        action: 'Logout',
        target: 'Self',
        category: 'authentication',
        severity: 'success',
        timestamp: '2024-06-18T18:00:00Z',
        ipAddress: '192.168.1.101',
        details: 'User logged out at end of shift.',
    },
    {
        id: 9,
        actor: 'Super Admin',
        actorEmail: 'admin@system.com',
        actorRole: 'superadmin',
        action: 'Exported user report',
        target: 'All Users',
        category: 'system',
        severity: 'success',
        timestamp: '2024-06-18T15:30:00Z',
        ipAddress: '192.168.1.1',
        details: 'Full user list exported as CSV for audit purposes.',
    },
    {
        id: 10,
        actor: 'System',
        actorEmail: 'system@internal',
        actorRole: 'system',
        action: 'Scheduled backup completed',
        target: 'Database',
        category: 'system',
        severity: 'success',
        timestamp: '2024-06-18T03:00:00Z',
        ipAddress: 'System',
        details: 'Nightly automated database backup finished successfully.',
    },
];

// --- Helpers ---
const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'user_management': return UserCog;
        case 'authentication': return LogIn;
        case 'security': return ShieldAlert;
        case 'system': return Settings;
        default: return FileText;
    }
};

const getSeverityVariant = (severity: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (severity) {
        case 'success': return 'default';
        case 'warning': return 'secondary';
        case 'error': return 'destructive';
        case 'alert': return 'outline';
        default: return 'secondary';
    }
};

const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
        case 'superadmin': return 'destructive';
        case 'owner': return 'default';
        case 'cashier': return 'secondary';
        case 'delivery': return 'outline';
        case 'system': return 'outline';
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

// --- Component ---
export default function AdminActivityLog() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [dateRange, setDateRange] = useState('7days');

    const filteredActivities = useMemo(() => {
        return adminActivities.filter((a) => {
            const matchesSearch =
                a.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.details.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
            const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
            const matchesRole = roleFilter === 'all' || a.actorRole === roleFilter;
            return matchesSearch && matchesCategory && matchesSeverity && matchesRole;
        });
    }, [searchTerm, categoryFilter, severityFilter, roleFilter]);

    // Summary stats
    const totalEvents = adminActivities.length;
    const todayEvents = adminActivities.filter(a => {
        const today = new Date().toDateString();
        return new Date(a.timestamp).toDateString() === today;
    }).length;
    const alertCount = adminActivities.filter(a => a.severity === 'error' || a.severity === 'warning').length;
    const userMgmtCount = adminActivities.filter(a => a.category === 'user_management').length;
    const securityCount = adminActivities.filter(a => a.category === 'security').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Activity Log" />
            <div className="space-y-6 p-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Activity Log</h1>
                        <p className="text-muted-foreground">Full audit trail of system-wide administrative actions</p>
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
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalEvents}</div>
                            <p className="text-xs text-muted-foreground">{todayEvents} today</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">User Management</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userMgmtCount}</div>
                            <p className="text-xs text-muted-foreground">Accounts created / modified</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{securityCount}</div>
                            <p className="text-xs text-muted-foreground">Login & permission events</p>
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

                {/* ── Filter Bar ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                        <CardDescription>Recent system-wide admin actions and events</CardDescription>
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
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="user_management">User Management</SelectItem>
                                        <SelectItem value="authentication">Authentication</SelectItem>
                                        <SelectItem value="security">Security</SelectItem>
                                        <SelectItem value="system">System</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={severityFilter} onValueChange={setSeverityFilter}>
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

                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="superadmin">Superadmin</SelectItem>
                                        <SelectItem value="owner">Owner</SelectItem>
                                        <SelectItem value="cashier">Cashier</SelectItem>
                                        <SelectItem value="delivery">Delivery</SelectItem>
                                        <SelectItem value="system">System</SelectItem>
                                        <SelectItem value="unknown">Unknown</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Tabs: Timeline / Table ── */}
                <Tabs defaultValue="timeline" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="table">Table View</TabsTrigger>
                    </TabsList>

                    {/* ══ Timeline ══ */}
                    <TabsContent value="timeline" className="space-y-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {filteredActivities.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No activities found matching your criteria.
                                        </div>
                                    ) : (
                                        filteredActivities.map((activity) => {
                                            const Icon = getCategoryIcon(activity.category);
                                            const formatted = formatTimestamp(activity.timestamp);

                                            return (
                                                <div key={activity.id} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        {activity.id < filteredActivities[filteredActivities.length - 1].id && (
                                                            <div className="w-0.5 h-full bg-border mt-2" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{activity.actor}</span>
                                                                <Badge variant={getRoleBadgeVariant(activity.actorRole)} className="text-xs">
                                                                    {activity.actorRole}
                                                                </Badge>
                                                                <Badge variant={getSeverityVariant(activity.severity)}>
                                                                    {activity.severity}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {formatted.time}
                                                            </div>
                                                        </div>
                                                        <div className="font-medium">{activity.action}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Target: {activity.target}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{activity.details}</div>
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
                                                                <Globe className="h-3 w-3" />
                                                                {activity.ipAddress}
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

                    {/* ══ Table ══ */}
                    <TabsContent value="table" className="space-y-4">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Actor</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Target</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>IP Address</TableHead>
                                            <TableHead>Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredActivities.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No activities found matching your criteria.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredActivities.map((activity) => {
                                                const Icon = getCategoryIcon(activity.category);
                                                const formatted = formatTimestamp(activity.timestamp);

                                                return (
                                                    <TableRow key={activity.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <div className="font-medium">{activity.actor}</div>
                                                                    <div className="text-sm text-muted-foreground">{activity.actorEmail}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{activity.action}</TableCell>
                                                        <TableCell className="text-sm">{activity.target}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize">
                                                                {activity.category.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={getSeverityVariant(activity.severity)}>
                                                                {activity.severity}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Globe className="h-3 w-3" />
                                                                {activity.ipAddress}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">{formatted.date}</div>
                                                            <div className="text-muted-foreground text-xs">{formatted.time}</div>
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
