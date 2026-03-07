import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Archive',
        href: '/owner/archive',
    },
];

type ArchivedProduct = {
    id: number;
    sku: string;
    barcode_value?: string | null;
    name: string;
    category?: string | null;
    price: string | number;
    stock: number;
    restocking_level?: number;
    image_path?: string | null;
    deleted_at?: string | null;
};

export default function OwnerArchive() {
    const { products } = usePage<{ products: ArchivedProduct[] }>().props;

    const onRestore = (p: ArchivedProduct) => {
        router.post(`/owner/archive/${p.id}/restore`, {}, { preserveScroll: true });
    };

    const onPermanentDelete = (p: ArchivedProduct) => {
        if (!confirm(`Permanently delete ${p.name}? This cannot be undone.`)) return;
        router.delete(`/owner/archive/${p.id}`, { preserveScroll: true });
    };

    return (
       <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Archive" />
        <div className="p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Archived Products</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.isArray(products) && products.length > 0 ? (
                                products.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono">{p.sku}</TableCell>
                                        <TableCell>{p.name}</TableCell>
                                        <TableCell>{p.category ?? ''}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => onRestore(p)}>
                                                    Restore
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => onPermanentDelete(p)}>
                                                    Delete permanently
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No archived products.
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
