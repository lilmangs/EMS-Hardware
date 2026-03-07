import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Store, Package, Truck, CheckCircle2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Delivery Monitoring',
        href: '/owner/delivery-monitoring',
    },
];

type DeliveryStatus = 'preparing' | 'out_for_delivery' | 'delivered';

type DeliveryRecord = {
    id: string;
    order_id: string;
    branch_key: 'lagonglong' | 'balingasag';
    branch: string;
    status: DeliveryStatus;
    customer: string;
    address: string;
    items: number;
    total: number;
    started_at: string;
};

type DeliveryMonitoringData = {
    filters: { branch_key: 'all' | 'lagonglong' | 'balingasag'; date: string };
    summary: { total_today: number; preparing: number; out_for_delivery: number; delivered: number };
    by_branch: Array<{ branch_key: 'lagonglong' | 'balingasag'; branch: string; count: number }>;
    deliveries: DeliveryRecord[];
};

const peso = (n: number | null | undefined) => `₱${(Number(n) || 0).toLocaleString()}`;

export default function DeliveryMonitoring() {
    const { auth } = usePage<{ auth?: { user?: { role: string; branch_key: 'lagonglong' | 'balingasag' | null } } }>().props;
    const user = auth?.user ?? null;
    const userBranchKey = user?.branch_key ?? null;
    const isBranchRestrictedUser = !!user && ['staff', 'cashier', 'delivery'].includes(user.role) && !!userBranchKey;

    const { branch: globalBranch } = useBranchFilter();
    const effectiveBranch: 'all' | 'lagonglong' | 'balingasag' = isBranchRestrictedUser
        ? (userBranchKey as 'lagonglong' | 'balingasag')
        : globalBranch;

    const [data, setData] = useState<DeliveryMonitoringData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            setError('');
            const params = new URLSearchParams();
            params.set('branch_key', effectiveBranch);

            const res = await fetch(`/owner/delivery-monitoring/data?${params.toString()}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin',
            });

            if (!res.ok) throw new Error('Failed to load deliveries');
            const json = (await res.json()) as DeliveryMonitoringData;
            setData(json);
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Failed to load deliveries');
        } finally {
            setIsLoading(false);
        }
    }, [effectiveBranch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const statusBadge = useCallback((s: DeliveryStatus) => {
        switch (s) {
            case 'preparing':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
                    >
                        Preparing
                    </Badge>
                );
            case 'out_for_delivery':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
                    >
                        Out for Delivery
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
                    >
                        Delivered
                    </Badge>
                );
        }
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Delivery Monitoring" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Delivery Monitoring</h1>
                        <p className="text-muted-foreground">Monitor home deliveries from in-store purchases</p>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Deliveries Today</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.total_today ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">
                                {effectiveBranch === 'all' ? 'All branches' : `Branch: ${effectiveBranch}`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Preparing</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.preparing ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">Being packed at branch</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.out_for_delivery ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">With rider now</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.summary.delivered ?? (isLoading ? '…' : 0)}</div>
                            <p className="text-xs text-muted-foreground">Successfully completed</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total per Branch</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {(data?.by_branch ?? []).map((b) => (
                                <div key={b.branch_key} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {b.branch_key === 'lagonglong' ? 'Lagonglong' : 'Balingasag'}
                                    </span>
                                    <span className="font-medium">{b.count}</span>
                                </div>
                            ))}
                            {!data?.by_branch?.length && !isLoading && (
                                <div className="text-sm text-muted-foreground">No data</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Deliveries</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                Status flow: Preparing → Out for Delivery → Delivered 
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Delivery ID</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead className="text-right">Items</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Started</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data?.deliveries ?? []).map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-medium">{d.id}</TableCell>
                                        <TableCell>{d.order_id}</TableCell>
                                        <TableCell>{d.branch}</TableCell>
                                        <TableCell>{statusBadge(d.status)}</TableCell>
                                        <TableCell>{d.customer}</TableCell>
                                        <TableCell className="max-w-[360px] truncate">{d.address}</TableCell>
                                        <TableCell className="text-right">{d.items}</TableCell>
                                        <TableCell className="text-right">{peso(d.total)}</TableCell>
                                        <TableCell>{d.started_at}</TableCell>
                                    </TableRow>
                                ))}

                                {!isLoading && (data?.deliveries?.length ?? 0) === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                                            No deliveries found.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                                            Loading…
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
