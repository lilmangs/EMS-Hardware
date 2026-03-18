import { Head, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Barcode,
    Boxes,
    Search,
    Package,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Filter,
    Download,
    Upload,
    Plus,
    Edit,
    Trash2,
    Eye,
    MoreHorizontal,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    AlertCircle,
    CheckCircle,
    Clock,
    DollarSign,
    Target,
    Info,
    Minus,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Inventory',
        href: '/inventory',
    },
];

type InventoryItem = {
    productId: number;
    sku: string;
    name: string;
    category: 'Hand Tools' | 'Power Tools' | 'Fasteners' | 'Paint' | 'Measuring Tools';
    imagePath?: string | null;
    branchKey: 'lagonglong' | 'balingasag' | 'all';
    branch: string;
    stock: number;
    totalStock: number;
    defectiveQty: number;
    reorderLevel: number;
    price: number;
    lastUpdated: string;
    minStock: number;
    maxStock: number;
};

type NewInventoryItem = {
    sku: string;
    name: string;
    category: InventoryItem['category'];
    branchKey: InventoryItem['branchKey'];
    stock: number;
    reorderLevel: number;
    price: number;
    minStock: number;
    maxStock: number;
};

export default function Inventory() {
    const { auth } = usePage<{ auth: { user: { role: string; branch_key: 'lagonglong' | 'balingasag' | null } | null } }>().props;
    const user = auth?.user ?? null;
    const userBranchKey = user?.branch_key ?? null;
    const isBranchRestrictedUser = !!user && ['staff', 'cashier', 'delivery'].includes(user.role) && !!userBranchKey;
    const canRestock = !!user && user.role === 'staff';

    const { branch: globalBranch, setBranch: setGlobalBranch } = useBranchFilter();

    const effectiveBranch: 'all' | 'lagonglong' | 'balingasag' = isBranchRestrictedUser
        ? (userBranchKey as 'lagonglong' | 'balingasag')
        : globalBranch;

    const [category, setCategory] = useState<'all' | 'Hand Tools' | 'Power Tools' | 'Fasteners' | 'Paint' | 'Measuring Tools'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
    const [conditionFilter, setConditionFilter] = useState<'sellable' | 'defective' | 'all'>('sellable');
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'category'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [query, setQuery] = useState('');

    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Barcode generation dialog state
    const [barcodeDialogItem, setBarcodeDialogItem] = useState<InventoryItem | null>(null);
    const [barcodeGenQty, setBarcodeGenQty] = useState(1);
    const [barcodesGenerated, setBarcodesGenerated] = useState(false);
    const barcodeContainerRef = useRef<HTMLDivElement>(null);

    // Details dialog state
    const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);

    // Manual restock dialog state
    const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
    const [restockQty, setRestockQty] = useState(1);

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [actionError, setActionError] = useState('');

    const [newItem, setNewItem] = useState<NewInventoryItem>({
        sku: '',
        name: '',
        category: 'Hand Tools',
        branchKey: 'lagonglong',
        stock: 1,
        reorderLevel: 10,
        price: 0,
        minStock: 5,
        maxStock: 50,
    });

    useEffect(() => {
        if (isBranchRestrictedUser && userBranchKey) {
            setNewItem((p) => ({ ...p, branchKey: userBranchKey }));
            return;
        }

        if (globalBranch !== 'all') {
            setNewItem((p) => ({ ...p, branchKey: globalBranch }));
        }
    }, [globalBranch, isBranchRestrictedUser, userBranchKey]);

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';

    const productImageUrl = (imagePath?: string | null) => {
        if (!imagePath) return null;
        return `/storage/${String(imagePath).replace(/^\//, '')}`;
    };

    const fetchItems = useCallback(async () => {
        setIsLoadingItems(true);
        try {
            setActionError('');
            const params = new URLSearchParams();
            if (effectiveBranch !== 'all') params.set('branch_key', effectiveBranch);
            if (query.trim().length > 0) params.set('search', query.trim());

            const res = await fetch(`/inventory/items?${params.toString()}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin',
            });

            if (!res.ok) throw new Error('Failed to load inventory');
            const data = await res.json();

            const mapped: InventoryItem[] = (data.items ?? []).map((it: any) => {
                const branchKey = it.branch_key as InventoryItem['branchKey'];
                const totalStock = Number(it.stock) || 0;
                const defectiveQty = Number(it.defective_qty) || 0;
                const sellableQty = Number(it.sellable_qty);
                const sellable = Number.isFinite(sellableQty) ? sellableQty : Math.max(0, totalStock - defectiveQty);
                return {
                    productId: Number(it.product_id),
                    sku: it.sku,
                    name: it.name,
                    category: (it.category ?? 'Hand Tools') as InventoryItem['category'],
                    imagePath: it.image_path ?? null,
                    branchKey,
                    branch: branchLabel(branchKey),
                    stock: sellable,
                    totalStock,
                    defectiveQty,
                    reorderLevel: Number(it.reorder_level) || 0,
                    price: Number(it.price) || 0,
                    lastUpdated: it.updated_at ?? new Date().toISOString(),
                    minStock: Number(it.min_stock) || 0,
                    maxStock: Number(it.max_stock) || 0,
                };
            });

            setItems(mapped);
        } catch (e: any) {
            setActionError(e?.message ? String(e.message) : 'Failed to load inventory');
        } finally {
            setIsLoadingItems(false);
        }
    }, [effectiveBranch, query]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const applyManualRestock = () => {
        if (!restockItem) return;
        const qty = Math.max(1, Number(restockQty) || 1);

        if (isBranchRestrictedUser && userBranchKey && restockItem.branchKey !== userBranchKey) {
            return;
        }

        (async () => {
            try {
                setActionError('');
                const res = await fetch(`/inventory/items/${restockItem.productId}/restock`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ branch_key: restockItem.branchKey, qty }),
                });

                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(msg || 'Failed to restock');
                }

                setRestockItem(null);
                setRestockQty(1);
                fetchItems();
            } catch (e: any) {
                setActionError(e?.message ? String(e.message) : 'Failed to restock');
            }
        })();
    };

    const branchLabel = (k: InventoryItem['branchKey']) =>
        k === 'lagonglong' ? 'Lagonglong Main Branch' : k === 'balingasag' ? 'Balingasag Branch' : 'All Branches';

    const displayedItems = useMemo(() => {
        if (effectiveBranch !== 'all') return items;

        const byProduct = new Map<number, InventoryItem>();

        for (const it of items) {
            const existing = byProduct.get(it.productId);
            if (!existing) {
                byProduct.set(it.productId, {
                    ...it,
                    branchKey: 'all',
                    branch: 'All Branches',
                });
                continue;
            }

            byProduct.set(it.productId, {
                ...existing,
                imagePath: existing.imagePath ?? it.imagePath,
                stock: existing.stock + it.stock,
                defectiveQty: existing.defectiveQty + it.defectiveQty,
                totalStock: existing.totalStock + it.totalStock,
                reorderLevel: Math.max(existing.reorderLevel, it.reorderLevel),
                minStock: Math.min(existing.minStock, it.minStock),
                maxStock: Math.max(existing.maxStock, it.maxStock),
                lastUpdated:
                    new Date(existing.lastUpdated).getTime() >= new Date(it.lastUpdated).getTime()
                        ? existing.lastUpdated
                        : it.lastUpdated,
                branchKey: 'all',
                branch: 'All Branches',
            });
        }

        return Array.from(byProduct.values());
    }, [effectiveBranch, items]);

    const getStockStatus = (item: InventoryItem) => {
        if (item.stock === 0) return 'out-of-stock';
        if (item.stock <= item.minStock) return 'low-stock';
        return 'in-stock';
    };

    const getStockStatusColor = (status: string) => {
        switch (status) {
            case 'out-of-stock': return 'destructive';
            case 'low-stock': return 'secondary';
            case 'in-stock': return 'default';
            default: return 'secondary';
        }
    };

    const getStockStatusIcon = (status: string) => {
        switch (status) {
            case 'out-of-stock': return AlertCircle;
            case 'low-stock': return AlertTriangle;
            case 'in-stock': return CheckCircle;
            default: return AlertCircle;
        }
    };

    const onAddProduct = () => {
        const sku = newItem.sku.trim();
        const name = newItem.name.trim();
        if (!sku || !name) return;

        (async () => {
            try {
                setActionError('');
                const res = await fetch('/inventory/items', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        sku,
                        name,
                        category: newItem.category,
                        price: Number(newItem.price) || 0,
                        branch_key: newItem.branchKey,
                        stock: Number(newItem.stock) || 0,
                        reorder_level: Number(newItem.reorderLevel) || 0,
                        min_stock: Number(newItem.minStock) || 0,
                        max_stock: Number(newItem.maxStock) || 0,
                    }),
                });

                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(msg || 'Failed to add product');
                }

                setNewItem({
                    sku: '',
                    name: '',
                    category: 'Hand Tools',
                    branchKey: newItem.branchKey,
                    stock: 1,
                    reorderLevel: 10,
                    price: 0,
                    minStock: 5,
                    maxStock: 50,
                });
                fetchItems();
            } catch (e: any) {
                setActionError(e?.message ? String(e.message) : 'Failed to add product');
            }
        })();
    };

    const filteredItems = useMemo(() => {
        let filtered = displayedItems.filter((it) => {
            const branchOk = effectiveBranch === 'all' ? true : it.branchKey === effectiveBranch;
            const categoryOk = category === 'all' ? true : it.category === category;
            const queryOk =
                query.trim().length === 0 ||
                it.name.toLowerCase().includes(query.toLowerCase()) ||
                it.sku.toLowerCase().includes(query.toLowerCase()) ||
                it.category.toLowerCase().includes(query.toLowerCase());

            const conditionOk =
                conditionFilter === 'all'
                    ? true
                    : conditionFilter === 'defective'
                        ? it.defectiveQty > 0
                        : !(it.stock === 0 && it.defectiveQty > 0);

            const stockStatus = getStockStatus(it);
            const statusOk = statusFilter === 'all' ? true : stockStatus === statusFilter;

            return branchOk && categoryOk && queryOk && conditionOk && statusOk;
        });

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'stock':
                    comparison = a.stock - b.stock;
                    break;
                case 'price':
                    comparison = a.price - b.price;
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [effectiveBranch, category, conditionFilter, statusFilter, sortBy, sortOrder, displayedItems, query]);

    const stats = useMemo(() => {
        const totalSkus = filteredItems.length;
        const lowStock = filteredItems.filter((i) => getStockStatus(i) === 'low-stock').length;
        const outOfStock = filteredItems.filter((i) => getStockStatus(i) === 'out-of-stock').length;
        const totalUnits = filteredItems.reduce((sum, i) => sum + (conditionFilter === 'defective' ? i.defectiveQty : i.stock), 0);
        const totalValue = filteredItems.reduce((sum, i) => sum + ((conditionFilter === 'defective' ? i.defectiveQty : i.stock) * i.price), 0);

        return { totalSkus, lowStock, outOfStock, totalUnits, totalValue };
    }, [conditionFilter, filteredItems]);

    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: typeof sortBy }) => {
        if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
        return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    };

    const toggleItemSelection = (itemId: string) => {
        setSelectedItems((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedItems.length === filteredItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredItems.map((item) => `${item.branchKey}-${item.sku}`));
        }
    };

    const openBarcodeDialog = (item: InventoryItem) => {
        setBarcodeDialogItem(item);
        setBarcodeGenQty(1);
        setBarcodesGenerated(false);
    };

    const generateBarcodes = useCallback(() => {
        if (!barcodeDialogItem || !barcodeContainerRef.current) return;
        const container = barcodeContainerRef.current;
        container.innerHTML = '';

        for (let i = 0; i < barcodeGenQty; i++) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText =
                'display:inline-flex;flex-direction:column;align-items:center;padding:12px;border:1px dashed #d1d5db;border-radius:8px;background:#fff;gap:4px;';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            wrapper.appendChild(svg);

            const nameEl = document.createElement('div');
            nameEl.style.cssText =
                'font-size:10px;font-weight:600;color:#374151;text-align:center;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            nameEl.textContent = barcodeDialogItem.name;
            wrapper.appendChild(nameEl);

            const priceEl = document.createElement('div');
            priceEl.style.cssText = 'font-size:9px;color:#6b7280;';
            priceEl.textContent = `₱${barcodeDialogItem.price.toFixed(2)}`;
            wrapper.appendChild(priceEl);

            container.appendChild(wrapper);

            try {
                JsBarcode(svg, barcodeDialogItem.sku, {
                    format: 'CODE128',
                    width: 1.5,
                    height: 40,
                    displayValue: true,
                    fontSize: 11,
                    margin: 4,
                    textMargin: 2,
                });
            } catch {
                svg.textContent = 'Error';
            }
        }
        setBarcodesGenerated(true);
    }, [barcodeDialogItem, barcodeGenQty]);

    const printBarcodes = () => {
        if (!barcodeContainerRef.current || !barcodeDialogItem) return;
        const pw = window.open('', '_blank', 'width=800,height=600');
        if (!pw) return;
        pw.document.write(`<!DOCTYPE html><html><head><title>Barcodes - ${barcodeDialogItem.name}</title>
        <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:16px}
        .print-header{text-align:center;margin-bottom:16px;font-size:14px;font-weight:bold;color:#374151}
        .barcode-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
        .barcode-item{display:inline-flex;flex-direction:column;align-items:center;padding:10px;border:1px dashed #d1d5db;border-radius:6px;gap:3px}
        @media print{.barcode-item{border:1px dashed #999;page-break-inside:avoid}}</style>
        </head><body><div class="print-header">${barcodeDialogItem.name} (${barcodeDialogItem.sku}) — ${barcodeGenQty} Barcode(s)</div>
        <div class="barcode-grid">${barcodeContainerRef.current.innerHTML}</div>
        <script>window.onload=function(){window.print()}<\/script></body></html>`);
        pw.document.close();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Management" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Inventory Management</h1>
                        <p className="text-muted-foreground">Manage stock levels and products across branches</p>
                    </div>
                </div>

                <Tabs defaultValue="inventory" className="space-y-4">
                    

                    <TabsContent value="inventory" className="space-y-4">
                        {/* Filters and Search */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Inventory Overview</CardTitle>
                                <CardDescription>Manage and monitor your stock levels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {actionError.trim().length > 0 && (
                                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                        {actionError}
                                    </div>
                                )}
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-1 items-center gap-2">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search products..."
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                <SelectItem value="Hand Tools">Hand Tools</SelectItem>
                                                <SelectItem value="Power Tools">Power Tools</SelectItem>
                                                <SelectItem value="Fasteners">Fasteners</SelectItem>
                                                <SelectItem value="Paint">Paint</SelectItem>
                                                <SelectItem value="Measuring Tools">Measuring Tools</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={conditionFilter} onValueChange={(value: any) => setConditionFilter(value)}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Condition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sellable">Active</SelectItem>
                                                <SelectItem value="defective">Defective</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="in-stock">In Stock</SelectItem>
                                                <SelectItem value="low-stock">Low Stock</SelectItem>
                                                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Inventory Table */}
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                                                    onChange={toggleAllSelection}
                                                    className="rounded"
                                                />
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-foreground select-none"
                                                onClick={() => handleSort('name')}
                                            >
                                                <span className="inline-flex items-center">
                                                    Product <SortIcon field="name" />
                                                </span>
                                            </TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-foreground select-none"
                                                onClick={() => handleSort('category')}
                                            >
                                                <span className="inline-flex items-center">
                                                    Category <SortIcon field="category" />
                                                </span>
                                            </TableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-foreground select-none"
                                                onClick={() => handleSort('stock')}
                                            >
                                                <span className="inline-flex items-center">
                                                    {conditionFilter === 'defective' ? 'Defective' : 'Stock'} <SortIcon field="stock" />
                                                </span>
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:text-foreground select-none"
                                                onClick={() => handleSort('price')}
                                            >
                                                <span className="inline-flex items-center">
                                                    Price <SortIcon field="price" />
                                                </span>
                                            </TableHead>
                                            <TableHead>Total Value</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingItems ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                    Loading inventory...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                    No products found matching your criteria.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredItems.map((item) => {
                                                const stockStatus = getStockStatus(item);
                                                const StatusIcon = getStockStatusIcon(stockStatus);
                                                const itemId = `${item.branchKey}-${item.sku}`;
                                                const displayQty = conditionFilter === 'defective' ? item.defectiveQty : item.stock;

                                                return (
                                                    <TableRow
                                                        key={itemId}
                                                        className="cursor-pointer"
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => setDetailsItem(item)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setDetailsItem(item);
                                                            }
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedItems.includes(itemId)}
                                                                onChange={() => toggleItemSelection(itemId)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="rounded"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                                                    {productImageUrl(item.imagePath) ? (
                                                                        <img
                                                                            src={productImageUrl(item.imagePath) ?? undefined}
                                                                            alt={item.name}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <Package className="h-5 w-5" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium">{item.name}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{item.category}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">{item.branch}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-center">
                                                                <div className="font-medium">
                                                                    {conditionFilter === 'defective' ? `${displayQty} defective` : displayQty}
                                                                </div>
                                                                <Progress
                                                                    value={(displayQty / item.maxStock) * 100}
                                                                    className="w-16 h-2 mt-1"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {conditionFilter === 'defective' ? (
                                                                <Badge variant="secondary">Defective</Badge>
                                                            ) : (
                                                                <Badge variant={getStockStatusColor(stockStatus)} className="gap-1">
                                                                    <StatusIcon className="h-3 w-3" />
                                                                    {stockStatus.replace('-', ' ')}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>₱{item.price.toFixed(2)}</TableCell>
                                                        <TableCell>₱{(displayQty * item.price).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    {canRestock && (
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setRestockItem(item);
                                                                                setRestockQty(1);
                                                                            }}
                                                                            disabled={item.branchKey === 'all'}
                                                                        >
                                                                            <Plus className="mr-2 h-4 w-4" />
                                                                            Restock
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDetailsItem(item);
                                                                        }}
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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

            {canRestock && (
                <>
                    {/* Restock Dialog */}
                    <Dialog
                        open={!!restockItem}
                        onOpenChange={(open) => {
                            if (!open) {
                                setRestockItem(null);
                                setRestockQty(1);
                                setActionError('');
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-green-600" />
                                    Restock Product
                                </DialogTitle>
                                <DialogDescription>
                                    Add stock to <span className="font-semibold text-foreground">{restockItem?.name}</span>
                                </DialogDescription>
                            </DialogHeader>

                            {restockItem && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                                                <Package className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">{restockItem.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    SKU: {restockItem.sku} · {restockItem.branch}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-3 space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Current Stock</span>
                                                <span className="font-semibold">{restockItem.stock} units</span>
                                            </div>
                                            <Progress
                                                value={
                                                    restockItem.maxStock > 0
                                                        ? Math.min(100, (restockItem.stock / restockItem.maxStock) * 100)
                                                        : 0
                                                }
                                                className="h-2"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Min: {restockItem.minStock}</span>
                                                <span>Max: {restockItem.maxStock}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div>
                                                <div className="text-sm font-medium">Add Quantity</div>
                                                <div className="text-xs text-muted-foreground">Units to add to current stock</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setRestockQty((q) => Math.max(1, q - 1))}
                                                    disabled={restockQty <= 1}
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={restockQty}
                                                    onChange={(e) => setRestockQty(Math.max(1, Number(e.target.value) || 1))}
                                                    className="h-8 w-16 text-center"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setRestockQty((q) => q + 1)}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                                            <span className="text-sm text-green-700 dark:text-green-400">Stock after restock</span>
                                            <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                                {restockItem.stock + restockQty} units
                                            </span>
                                        </div>

                                        {actionError && (
                                            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                                {actionError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="gap-2 sm:gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setRestockItem(null);
                                        setRestockQty(1);
                                        setActionError('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={applyManualRestock} className="bg-green-600 hover:bg-green-700 text-white">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Confirm Restock
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {/* Product Details Dialog */}
            <Dialog open={!!detailsItem} onOpenChange={(open) => { if (!open) setDetailsItem(null); }}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            Product Details
                        </DialogTitle>
                    </DialogHeader>
                    {detailsItem && (() => {
                        const stockStatus = getStockStatus(detailsItem);
                        const StatusIcon = getStockStatusIcon(stockStatus);
                        const stockPct = Math.min(100, (detailsItem.stock / detailsItem.maxStock) * 100);
                        const imgUrl = productImageUrl(detailsItem.imagePath);
                        return (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center rounded-lg bg-muted p-6">
                                        {imgUrl ? (
                                            <img src={imgUrl} alt={detailsItem.name} className="h-24 w-24 rounded-xl object-cover border" />
                                        ) : (
                                            <div className="h-16 w-16 rounded-xl bg-orange-100 flex items-center justify-center dark:bg-orange-950">
                                                <Package className="h-8 w-8 text-orange-600" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-lg border p-3 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Sellable Stock</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getStockStatusColor(stockStatus)} className="gap-1">
                                                    <StatusIcon className="h-3 w-3" />
                                                    {stockStatus.replace('-', ' ')}
                                                </Badge>
                                                <span className="text-sm font-medium">{detailsItem.stock} / {detailsItem.maxStock}</span>
                                            </div>
                                        </div>
                                        <Progress value={stockPct} className="h-2" />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Min: {detailsItem.minStock}</span>
                                            <span>Reorder at: {detailsItem.reorderLevel}</span>
                                            <span>Max: {detailsItem.maxStock}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Name</span>
                                        <span className="text-sm font-medium">{detailsItem.name}</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">SKU</span>
                                        <span className="text-sm font-mono font-medium">{detailsItem.sku}</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Category</span>
                                        <Badge variant="outline">{detailsItem.category}</Badge>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Branch</span>
                                        <Badge variant="secondary">{detailsItem.branch}</Badge>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Price</span>
                                        <span className="text-sm font-semibold text-primary">₱{detailsItem.price.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Defective Qty</span>
                                        <span className="text-sm font-medium">{detailsItem.defectiveQty}</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Total Qty</span>
                                        <span className="text-sm font-medium">{detailsItem.totalStock}</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Stock Value</span>
                                        <span className="text-sm font-semibold">₱{(detailsItem.price * detailsItem.stock).toLocaleString()}</span>
                                    </div>
                                    <div className="border-t" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Last Updated</span>
                                        <span className="text-sm">
                                            {new Date(detailsItem.lastUpdated).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Barcode Generation Dialog */}
            <Dialog
                open={!!barcodeDialogItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setBarcodeDialogItem(null);
                        setBarcodesGenerated(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Barcode className="h-5 w-5" />
                            Generate Barcodes
                        </DialogTitle>
                        <DialogDescription>
                            Generate printable barcodes for{' '}
                            <span className="font-semibold text-foreground">{barcodeDialogItem?.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
                                <Package className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm">{barcodeDialogItem?.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    SKU: {barcodeDialogItem?.sku} • {barcodeDialogItem?.branch} • ₱
                                    {barcodeDialogItem?.price.toFixed(2)}
                                </div>
                            </div>
                            <Badge variant="outline">CODE128</Badge>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <div className="text-sm font-medium">Number of Barcodes</div>
                                <div className="text-xs text-muted-foreground">How many barcode labels to generate</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setBarcodeGenQty((q) => Math.max(1, q - 1))}
                                    disabled={barcodeGenQty <= 1}
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={barcodeGenQty}
                                    onChange={(e) =>
                                        setBarcodeGenQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                                    }
                                    className="h-8 w-16 text-center"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setBarcodeGenQty((q) => Math.min(100, q + 1))}
                                    disabled={barcodeGenQty >= 100}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {!barcodesGenerated && (
                            <Button onClick={generateBarcodes} className="w-full">
                                <Barcode className="mr-2 h-4 w-4" />
                                Generate {barcodeGenQty} Barcode{barcodeGenQty > 1 ? 's' : ''}
                            </Button>
                        )}

                        <div
                            ref={barcodeContainerRef}
                            className="flex flex-wrap gap-3 justify-center max-h-64 overflow-auto rounded-lg border bg-white p-4 dark:bg-zinc-950"
                            style={{ minHeight: barcodesGenerated ? '120px' : '0' }}
                        />

                        {!barcodesGenerated && (
                            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                                <Barcode className="h-10 w-10 mb-2 opacity-30" />
                                <span className="text-sm">Set quantity and click generate to preview barcodes</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        {barcodesGenerated && (
                            <>
                                <Button variant="outline" onClick={generateBarcodes}>
                                    <Barcode className="mr-2 h-4 w-4" />
                                    Regenerate
                                </Button>
                                <Button onClick={printBarcodes}>
                                    <Barcode className="mr-2 h-4 w-4" />
                                    Print Barcodes
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}