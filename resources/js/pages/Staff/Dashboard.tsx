import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Boxes, ClipboardList, PackageSearch, ShoppingCart } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Staff Dashboard',
        href: '/dashboard/staff',
    },
];

export default function Dashboard() {
    const { props } = usePage<{
        branch_key: string | null;
        stats: {
            total_products: number;
            total_units: number;
            low_stock_count: number;
            out_of_stock_count: number;
        };
        low_stock_items: Array<{
            product_id: number;
            sku: string | null;
            name: string | null;
            category: string | null;
            price: number | string | null;
            image_path: string | null;
            stock: number;
        }>;
        recent_restocks: Array<{
            id: number;
            created_at: string;
            qty: number;
            note: string | null;
            product: { id: number | null; sku: string | null; name: string | null };
            performed_by: string | null;
        }>;
        recent_adjustments: Array<{
            id: number;
            created_at: string;
            type: string;
            qty_change: number;
            note: string | null;
            product: { id: number | null; sku: string | null; name: string | null };
            performed_by: string | null;
        }>;
    }>();

    const branchKey = props.branch_key;
    const stats = props.stats;

    const branchLabel = branchKey === 'lagonglong'
        ? 'Lagonglong'
        : branchKey === 'balingasag'
            ? 'Balingasag'
            : 'Unassigned';

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Dashboard" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Staff Dashboard</h1>
                        <p className="text-muted-foreground">Quick access to daily inventory and product tasks</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild className="gap-2">
                            <Link href="/inventory">
                                <PackageSearch className="h-4 w-4" />
                                Inventory
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/Products">
                                <ShoppingCart className="h-4 w-4" />
                                Products
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                        <div>
                            <CardTitle>Assigned Branch</CardTitle>
                            <CardDescription>Your inventory actions are limited to your assigned branch.</CardDescription>
                        </div>
                        <Badge variant={branchKey ? 'secondary' : 'destructive'} className="h-6">
                            {branchLabel}
                        </Badge>
                    </CardHeader>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Products (Branch)</CardTitle>
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_products ?? 0}</div>
                            <p className="text-xs text-muted-foreground">Products tracked in {branchLabel}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                            <PackageSearch className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{(stats?.total_units ?? 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">All units in {branchLabel}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.low_stock_count ?? 0}</div>
                            <p className="text-xs text-muted-foreground">Needs restock soon</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.out_of_stock_count ?? 0}</div>
                            <p className="text-xs text-muted-foreground">Restock required</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-3">
                            <div>
                                <CardTitle>Low / Out of Stock</CardTitle>
                                <CardDescription>Items in {branchLabel} that need attention</CardDescription>
                            </div>
                            <Button asChild variant="outline" className="shrink-0">
                                <Link href="/inventory">Open Inventory</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {(!props.low_stock_items || props.low_stock_items.length === 0) ? (
                                <div className="text-sm text-muted-foreground">No low stock items found.</div>
                            ) : (
                                <div className="space-y-2">
                                    {props.low_stock_items.map((it) => (
                                        <div key={it.product_id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                            <div className="min-w-0">
                                                <div className="font-medium truncate">{it.name ?? 'Unnamed product'}</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate">{it.sku ?? `#${it.product_id}`}</div>
                                            </div>
                                            <Badge variant={it.stock === 0 ? 'destructive' : 'secondary'}>
                                                {it.stock === 0 ? 'Out' : `${it.stock} left`}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest restocks and stock adjustments for {branchLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium">Restocks</div>
                                    <div className="mt-2 space-y-2">
                                        {(!props.recent_restocks || props.recent_restocks.length === 0) ? (
                                            <div className="text-sm text-muted-foreground">No restocks yet.</div>
                                        ) : (
                                            props.recent_restocks.map((r) => (
                                                <div key={r.id} className="rounded-lg border p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-medium truncate">{r.product?.name ?? 'Product'}</div>
                                                            <div className="text-xs text-muted-foreground font-mono truncate">{r.product?.sku ?? '-'}</div>
                                                        </div>
                                                        <Badge variant="secondary">+{r.qty}</Badge>
                                                    </div>
                                                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                                                        <span>{formatDateTime(r.created_at)}</span>
                                                        {r.performed_by && <span>by {r.performed_by}</span>}
                                                        {r.note && <span className="truncate">{r.note}</span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium">Adjustments</div>
                                    <div className="mt-2 space-y-2">
                                        {(!props.recent_adjustments || props.recent_adjustments.length === 0) ? (
                                            <div className="text-sm text-muted-foreground">No adjustments yet.</div>
                                        ) : (
                                            props.recent_adjustments.map((a) => (
                                                <div key={a.id} className="rounded-lg border p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-medium truncate">{a.product?.name ?? 'Product'}</div>
                                                            <div className="text-xs text-muted-foreground font-mono truncate">{a.product?.sku ?? '-'}</div>
                                                        </div>
                                                        <Badge variant={a.qty_change < 0 ? 'destructive' : 'secondary'}>
                                                            {a.qty_change > 0 ? `+${a.qty_change}` : String(a.qty_change)}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                                                        <span className="uppercase">{a.type}</span>
                                                        <span>{formatDateTime(a.created_at)}</span>
                                                        {a.performed_by && <span>by {a.performed_by}</span>}
                                                        {a.note && <span className="truncate">{a.note}</span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
