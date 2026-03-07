import { Head } from '@inertiajs/react';
import { Users, Settings, Shield, Database, ClipboardList } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Superadmin Dashboard',
        href: '/Superadmin',
    },
];

export default function Superadmin() {
    const menuItems = [
        {
            title: 'User Management',
            description: 'Create, edit, and manage all user accounts',
            icon: Users,
            href: '/Superadmin/Users',
            color: 'bg-blue-500',
        },
        {
            title: 'System Settings',
            description: 'Configure system-wide settings and preferences',
            icon: Settings,
            href: '#',
            color: 'bg-green-500',
        },
        {
            title: 'Security & Permissions',
            description: 'Manage roles, permissions, and access control',
            icon: Shield,
            href: '#',
            color: 'bg-red-500',
        },
        {
            title: 'Database Management',
            description: 'Monitor and manage database operations',
            icon: Database,
            href: '#',
            color: 'bg-purple-500',
        },
        {
            title: 'Activity Log',
            description: 'Track all admin and system-wide user activity',
            icon: ClipboardList,
            href: '/Superadmin/ActivityLog',
            color: 'bg-orange-500',
        },
    ];

    const handleModuleClick = (href: string) => {
        if (href !== '#') {
            window.location.href = href;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Superadmin Dashboard" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Superadmin Dashboard</h1>
                        <p className="text-muted-foreground">Manage the entire system and all user accounts</p>
                    </div>
                </div>

                {/* System Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">24</div>
                            <p className="text-xs text-muted-foreground">Across all roles</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">18</div>
                            <p className="text-xs text-muted-foreground">Currently online</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">System Health</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">98%</div>
                            <p className="text-xs text-muted-foreground">All systems operational</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">42</div>
                            <p className="text-xs text-muted-foreground">Actions in last hour</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Management Modules */}
                <div className="grid gap-4 md:grid-cols-2">
                    {menuItems.map((item) => (
                        <Card key={item.title} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${item.color}`}>
                                        <item.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                        <CardDescription>{item.description}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    className="w-full"
                                    variant={item.href !== '#' ? 'default' : 'secondary'}
                                    disabled={item.href === '#'}
                                    onClick={() => handleModuleClick(item.href)}
                                >
                                    {item.href !== '#' ? 'Access Module' : 'Coming Soon'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Button variant="outline" className="justify-start h-auto p-4">
                                <div className="text-left">
                                    <div className="font-medium">Create User</div>
                                    <div className="text-xs text-muted-foreground">Add new system user</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto p-4">
                                <div className="text-left">
                                    <div className="font-medium">System Backup</div>
                                    <div className="text-xs text-muted-foreground">Create data backup</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto p-4">
                                <div className="text-left">
                                    <div className="font-medium">View Logs</div>
                                    <div className="text-xs text-muted-foreground">Check system logs</div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}