import { Head, router, usePage } from '@inertiajs/react';
import {
    Search, Package, MoreVertical, Barcode, Printer, Eye, Minus, Plus,
    LayoutGrid, List, ArrowUpDown, AlertTriangle, CheckCircle, XCircle,
    DollarSign, Boxes, TrendingUp, SortAsc, SortDesc, Info, Pencil, Trash2
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/Products' },
];

type Product = {
    id: number;
    name: string;
    description?: string | null;
    price: number | string;
    category: string;
    color?: string | null;
    stock: number;
    defective_qty?: number;
    total_stock?: number;
    restocking_level?: number | null;
    sku: string;
    barcode_value?: string | null;
    unit_of_measure?: string | null;
    brand?: string | null;
    image_path?: string | null;
    status?: 'out_of_stock' | 'reserved';
};

type Paginated<T> = {
    data: T[];
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
};

const categories = [
    'All',
    'Hand Tools',
    'Power Tools',
    'Fasteners',
    'Electrical Supplies',
    'Plumbing Supplies',
    'Paint & Finishing',
    'Safety Equipment',
    'Measuring Tools',
    'Miscellaneous',
];

const peso = (n: number | string | null | undefined) => {
    const num = typeof n === 'number' ? n : Number(n);
    return `₱${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
};

const uomOptions = ['pc', 'pair', 'set', 'box', 'pack', 'roll', 'meter', 'foot', 'inch', 'kg', 'liter', 'gallon'] as const;

const productImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    return `/storage/${String(imagePath).replace(/^\//, '')}`;
};

const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out';
    if (stock <= 5) return 'critical';
    if (stock <= 15) return 'low';
    return 'ok';
};

const stockContextLabel = (branch: 'all' | 'lagonglong' | 'balingasag') => {
    if (branch === 'lagonglong') return 'Lagonglong';
    if (branch === 'balingasag') return 'Balingasag';
    return 'All Branches';
};

const stockBadge = (stock: number, context?: string) => {
    const status = getStockStatus(stock);
    const text = context ? `${stock} pcs (${context})` : `${stock} pcs`;
    switch (status) {
        case 'out':
            return <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-3 w-3" />Out</Badge>;
        case 'critical':
            return <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />{text}</Badge>;
        case 'low':
            return <Badge variant="secondary" className="text-[10px] gap-1 text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800"><AlertTriangle className="h-3 w-3" />{text}</Badge>;
        default:
            return <Badge variant="secondary" className="text-[10px] gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800"><CheckCircle className="h-3 w-3" />{text}</Badge>;
    }
};

const lowStockBadge = (stock: number, restockingLevel: number) => {
    const intensity = stock <= Math.max(1, Math.floor(restockingLevel / 2)) ? 'critical' : 'low';
    const label = `Low Stock! Only ${stock} left`;

    if (intensity === 'critical') {
        return (
            <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                {label}
            </Badge>
        );
    }

    return (
        <Badge
            variant="secondary"
            className="text-[10px] gap-1 text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800"
        >
            <AlertTriangle className="h-3 w-3" />
            {label}
        </Badge>
    );
};

type SortKey = 'name' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';
type ViewMode = 'grid' | 'list';

export default function Products() {
    const { products: productsPaginator, filters } = usePage<{ products?: Paginated<Product>; filters?: { status?: string } }>().props;
    const { auth } = usePage<{ auth?: { user?: { role: string; branch_key: 'lagonglong' | 'balingasag' | null } } }>().props;
    const user = auth?.user ?? null;
    const isOwner = user?.role === 'owner';
    const canAddProduct = user?.role === 'staff';
    const canManageProducts = user?.role === 'staff';
    const userBranchKey = user?.branch_key ?? null;
    const isBranchRestrictedUser = !!user && ['staff', 'cashier', 'delivery'].includes(user.role) && !!userBranchKey;

    const { branch: globalBranch } = useBranchFilter();
    const effectiveBranch: 'all' | 'lagonglong' | 'balingasag' = isBranchRestrictedUser
        ? (userBranchKey as 'lagonglong' | 'balingasag')
        : globalBranch;

    const [productsRefreshNonce, setProductsRefreshNonce] = useState(0);
    const [products, setProducts] = useState<Product[]>(productsPaginator?.data ?? []);

    const currentPage = typeof productsPaginator?.current_page === 'number' ? productsPaginator.current_page : 1;
    const lastPage = typeof productsPaginator?.last_page === 'number' ? productsPaginator.last_page : 1;
    const perPage = typeof productsPaginator?.per_page === 'number' ? productsPaginator.per_page : undefined;
    const total = typeof productsPaginator?.total === 'number' ? productsPaginator.total : undefined;

    const goToPage = useCallback(
        (page: number) => {
            const nextPage = Math.max(1, Math.min(page, lastPage || 1));
            router.get(
                '/Products',
                {
                    ...(filters ?? {}),
                    page: nextPage,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                    only: ['products', 'filters'],
                },
            );
        },
        [filters, lastPage],
    );
    const [allBranchStockById, setAllBranchStockById] = useState<Map<number, number>>(new Map());
    const [allBranchDefectiveById, setAllBranchDefectiveById] = useState<Map<number, number>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortBy, setSortBy] = useState<SortKey>('name');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [statusFilter, setStatusFilter] = useState<'defective' | 'out_of_stock' | 'reserved' | 'low_stock'>(() => {
        const v = String(filters?.status ?? 'reserved');
        if (['defective', 'out_of_stock', 'reserved', 'low_stock'].includes(v)) return v as any;
        return 'reserved';
    });

    useEffect(() => {
        if (isBranchRestrictedUser) return;

        const url = new URL(window.location.href);
        const current = String(url.searchParams.get('branch_key') ?? '');
        const next = effectiveBranch === 'all' ? '' : effectiveBranch;

        if (current === next) return;

        if (effectiveBranch !== 'all') {
            url.searchParams.set('branch_key', effectiveBranch);
        } else {
            url.searchParams.delete('branch_key');
        }

        router.visit(url.toString(), {
            only: ['products', 'filters'],
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }, [effectiveBranch, isBranchRestrictedUser]);

    useEffect(() => {
        setProducts(productsPaginator?.data ?? []);
    }, [productsPaginator]);

    useEffect(() => {
        const v = String(filters?.status ?? 'active');
        if (['defective', 'out_of_stock', 'reserved', 'low_stock'].includes(v)) {
            setStatusFilter(v as any);
        } else {
            setStatusFilter('reserved');
        }
    }, [filters?.status]);

    useEffect(() => {
        if (effectiveBranch !== 'all') return;

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`/inventory/items`, {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'same-origin',
                });

                if (!res.ok) return;
                const data = await res.json();
                const totals = new Map<number, { stock: number; defective: number }>();
                for (const it of (data.items ?? []) as any[]) {
                    const id = Number(it.product_id);
                    const stock = Number(it.stock) || 0;
                    const defective = Number(it.defective_qty) || 0;
                    const prev = totals.get(id) ?? { stock: 0, defective: 0 };
                    totals.set(id, { stock: prev.stock + stock, defective: prev.defective + defective });
                }

                if (cancelled) return;

                const stockTotals = new Map<number, number>();
                const defectiveTotals = new Map<number, number>();
                for (const [id, v] of totals.entries()) {
                    stockTotals.set(id, v.stock);
                    defectiveTotals.set(id, v.defective);
                }

                setAllBranchStockById(stockTotals);
                setAllBranchDefectiveById(defectiveTotals);

                const base = productsPaginator?.data ?? [];
                setProducts(
                    base.map((p) => {
                        const totalStock = stockTotals.get(p.id) ?? p.stock;
                        const defectiveQty = defectiveTotals.get(p.id) ?? 0;
                        const sellable = Math.max(0, totalStock - defectiveQty);
                        return { ...p, stock: sellable, total_stock: totalStock, defective_qty: defectiveQty };
                    })
                );
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [effectiveBranch, productsPaginator, productsRefreshNonce]);

    useEffect(() => {
        if (effectiveBranch === 'all') {
            const base = productsPaginator?.data ?? [];
            setProducts(
                base.map((p) => {
                    const totalStock = allBranchStockById.get(p.id) ?? p.stock;
                    const defectiveQty = allBranchDefectiveById.get(p.id) ?? 0;
                    const sellable = Math.max(0, totalStock - defectiveQty);
                    return { ...p, stock: sellable, total_stock: totalStock, defective_qty: defectiveQty };
                })
            );
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const params = new URLSearchParams();
                params.set('branch_key', effectiveBranch);

                const res = await fetch(`/inventory/items?${params.toString()}`, {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'same-origin',
                });

                if (!res.ok) return;
                const data = await res.json();

                const stockById = new Map<number, { stock: number; defective: number }>();
                for (const it of (data.items ?? []) as any[]) {
                    const id = Number(it.product_id);
                    stockById.set(id, {
                        stock: Number(it.stock) || 0,
                        defective: Number(it.defective_qty) || 0,
                    });
                }

                const base = productsPaginator?.data ?? [];
                const merged = base.map((p) => ({
                    ...p,
                    stock: Math.max(0, (stockById.get(p.id)?.stock ?? p.stock) - (stockById.get(p.id)?.defective ?? 0)),
                    total_stock: stockById.get(p.id)?.stock ?? p.stock,
                    defective_qty: stockById.get(p.id)?.defective ?? 0,
                }));

                if (!cancelled) setProducts(merged);
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [effectiveBranch, productsPaginator, allBranchStockById, allBranchDefectiveById, productsRefreshNonce]);

    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
        sku: '',
        barcode_value: '',
        unit_of_measure: 'pc',
        brand: '',
        color: '',
        name: '',
        description: '',
        category: '',
        price: 0,
        stock: 0,
        restocking_level: 0,
        image_path: null,
        status: 'reserved',
    });

    const [newProductImage, setNewProductImage] = useState<File | null>(null);
    const [newProductImagePreviewUrl, setNewProductImagePreviewUrl] = useState<string | null>(null);

    // Barcode dialog state
    const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
    const [barcodeQty, setBarcodeQty] = useState(1);
    const [barcodesGenerated, setBarcodesGenerated] = useState(false);
    const barcodeContainerRef = useRef<HTMLDivElement>(null);

    // Details dialog state
    const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);

    // Edit dialog state
    const [isEditProductOpen, setIsEditProductOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [editProductImage, setEditProductImage] = useState<File | null>(null);
    const [editProductImagePreviewUrl, setEditProductImagePreviewUrl] = useState<string | null>(null);

    // Remove dialog state
    const [removeProduct, setRemoveProduct] = useState<Product | null>(null);
    const [removeError, setRemoveError] = useState('');
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        return () => {
            if (editProductImagePreviewUrl) {
                URL.revokeObjectURL(editProductImagePreviewUrl);
            }
        };
    }, [editProductImagePreviewUrl]);

    // --- Filtering & Sorting ---
    const filteredProducts = useMemo(() => {
        let filtered = products.filter((p) => {
            const matchesSearch =
                searchQuery.trim().length === 0 ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(p.id).toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });

        switch (sortBy) {
            case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'price-asc': filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
            case 'price-desc': filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
            case 'stock-asc': filtered.sort((a, b) => a.stock - b.stock); break;
            case 'stock-desc': filtered.sort((a, b) => b.stock - a.stock); break;
        }

        return filtered;
    }, [products, searchQuery, activeCategory, sortBy]);

    // --- Stats ---
    const stats = useMemo(() => {
        const totalProducts = filteredProducts.length;
        const totalValue = filteredProducts.reduce((s, p) => s + (Number(p.price) || 0) * p.stock, 0);
        const totalUnits = filteredProducts.reduce((s, p) => s + p.stock, 0);
        const lowStockCount = filteredProducts.filter(p => getStockStatus(p.stock) === 'low' || getStockStatus(p.stock) === 'critical').length;
        const outOfStock = filteredProducts.filter(p => p.stock === 0).length;
        return { totalProducts, totalValue, totalUnits, lowStockCount, outOfStock };
    }, [filteredProducts]);

    // --- Barcode Logic ---
    const openBarcodeDialog = (product: Product) => {
        if (!canManageProducts) return;
        setBarcodeProduct(product);
        setBarcodeQty(1);
        setBarcodesGenerated(false);
    };

    const openEditDialog = (product: Product) => {
        if (!canManageProducts) return;
        setEditProduct(product);
        setEditProductImage(null);
        setEditProductImagePreviewUrl(productImageUrl(product.image_path));
        setIsEditProductOpen(true);
    };

    const openRemoveDialog = (product: Product) => {
        if (!canManageProducts) return;
        setRemoveProduct(product);
        setRemoveError('');
    };

    const closeBarcodeDialog = () => {
        setBarcodeProduct(null);
        setBarcodesGenerated(false);
    };

    const closeRemoveDialog = () => {
        setRemoveProduct(null);
        setRemoveError('');
        setIsRemoving(false);
    };

    const onRemoveProduct = () => {
        if (!removeProduct) return;

        setIsRemoving(true);
        setRemoveError('');

        router.delete(`/Products/${removeProduct.id}`, {
            preserveScroll: true,
            onError: (errors) => {
                const anyErr = (errors as any) ?? {};
                const msg =
                    typeof anyErr?.message === 'string'
                        ? anyErr.message
                        : typeof anyErr?.error === 'string'
                            ? anyErr.error
                            : 'Failed to remove product.';
                setRemoveError(msg);
                setIsRemoving(false);
            },
            onSuccess: () => {
                setProductsRefreshNonce((n) => n + 1);
                router.visit(window.location.href, { only: ['products'], preserveScroll: true });
                closeRemoveDialog();
            },
            onFinish: () => {
                setIsRemoving(false);
            },
        });
    };

    const generateBarcodes = useCallback(() => {
        if (!barcodeProduct || !barcodeContainerRef.current) return;
        const container = barcodeContainerRef.current;
        container.innerHTML = '';

        const barcodeValue =
            (barcodeProduct.barcode_value && String(barcodeProduct.barcode_value).trim() !== ''
                ? String(barcodeProduct.barcode_value)
                : barcodeProduct.sku && String(barcodeProduct.sku).trim() !== ''
                    ? String(barcodeProduct.sku)
                    : String(barcodeProduct.id));

        for (let i = 0; i < barcodeQty; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'barcode-item';
            wrapper.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;padding:12px;border:1px dashed #d1d5db;border-radius:8px;background:#fff;gap:4px;';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            wrapper.appendChild(svg);

            const nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-size:10px;font-weight:600;color:#374151;text-align:center;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            nameEl.textContent = barcodeProduct.name;
            wrapper.appendChild(nameEl);

            const priceEl = document.createElement('div');
            priceEl.style.cssText = 'font-size:9px;color:#6b7280;';
            priceEl.textContent = peso(barcodeProduct.price);
            wrapper.appendChild(priceEl);

            container.appendChild(wrapper);

            try {
                JsBarcode(svg, barcodeValue, {
                    format: 'CODE128', width: 1.5, height: 40,
                    displayValue: true, fontSize: 11, margin: 4, textMargin: 2,
                });
            } catch {
                svg.textContent = 'Error';
            }
        }
        setBarcodesGenerated(true);
    }, [barcodeProduct, barcodeQty]);

    const printBarcodes = () => {
        if (!barcodeContainerRef.current) return;
        const pw = window.open('', '_blank', 'width=800,height=600');
        if (!pw) return;
        pw.document.write(`<!DOCTYPE html><html><head><title>Barcodes - ${barcodeProduct?.name ?? 'Product'}</title>
        <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:16px}
        .print-header{text-align:center;margin-bottom:16px;font-size:14px;font-weight:bold;color:#374151}
        .barcode-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
        .barcode-item{display:inline-flex;flex-direction:column;align-items:center;padding:10px;border:1px dashed #d1d5db;border-radius:6px;gap:3px}
        .barcode-item svg{display:block}@media print{.barcode-item{border:1px dashed #999;page-break-inside:avoid}}</style>
        </head><body><div class="print-header">${barcodeProduct?.name ?? 'Product'} — ${barcodeQty} Barcode(s)</div>
        <div class="barcode-grid">${barcodeContainerRef.current.innerHTML}</div>
        <script>window.onload=function(){window.print()}<\/script></body></html>`);
        pw.document.close();
    };

    const generateSku = useCallback(() => {
        const category = (newProduct.category ?? '').trim();
        const prefix = (category.length > 0
            ? category
                .split(/\s+/)
                .filter(Boolean)
                .map((w) => w[0] ?? '')
                .join('')
            : 'PRD'
        )
            .toUpperCase()
            .slice(0, 4);

        const suffix = String(Date.now()).slice(-4);
        setNewProduct((p) => ({ ...p, sku: `${prefix}-${suffix}` }));
    }, [newProduct.category]);

    const generateBarcodeValue = useCallback((sku: string) => {
        const base = String(sku || '').trim() || 'PRD';
        const stamp = String(Date.now());
        const rand = String(Math.floor(Math.random() * 900) + 100);
        const raw = `${base}-${stamp.slice(-6)}${rand}`;
        return raw.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 32);
    }, []);


    const onCreateProduct = () => {
        const sku = newProduct.sku.trim();
        const name = newProduct.name.trim();
        if (!sku || !name) return;

        const form = new FormData();
        form.append('sku', sku);
        form.append('name', name);
        form.append('category', String(newProduct.category ?? ''));
        form.append('barcode_value', String(newProduct.barcode_value ?? ''));
        form.append('unit_of_measure', String(newProduct.unit_of_measure ?? 'pc'));
        form.append('brand', String(newProduct.brand ?? ''));
        form.append('color', String(newProduct.color ?? ''));
        form.append('description', String(newProduct.description ?? ''));
        form.append('price', String(newProduct.price ?? 0));
        form.append('stock', String(newProduct.stock ?? 0));
        form.append('restocking_level', String(newProduct.restocking_level ?? 0));

        if (newProductImage) {
            form.append('image', newProductImage);
        }

        router.post('/Products', form, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setIsAddProductOpen(false);
                setNewProduct({
                    sku: '',
                    barcode_value: '',
                    unit_of_measure: 'pc',
                    brand: '',
                    color: '',
                    name: '',
                    description: '',
                    category: '',
                    price: 0,
                    stock: 0,
                    restocking_level: 0,
                    image_path: null,
                    status: 'reserved',
                });
                setNewProductImage(null);
            },
        });
    };

    const onUpdateProduct = () => {
        if (!editProduct) return;

        const sku = editProduct.sku.trim();
        const name = editProduct.name.trim();
        if (!sku || !name) return;

        const status = String(editProduct.status ?? 'active');

        const form = new FormData();
        form.append('sku', sku);
        if (String(editProduct.barcode_value ?? '').trim() !== '') {
            form.append('barcode_value', String(editProduct.barcode_value));
        }
        form.append('unit_of_measure', String(editProduct.unit_of_measure ?? 'pc'));
        form.append('brand', String(editProduct.brand ?? ''));
        form.append('color', String(editProduct.color ?? ''));
        form.append('name', name);
        form.append('description', String(editProduct.description ?? ''));
        form.append('category', editProduct.category ?? '');
        form.append('price', String(Number(editProduct.price) || 0));
        form.append('restocking_level', String(Number(editProduct.restocking_level) || 0));
        form.append('status', status);
        if (editProductImage) {
            form.append('image', editProductImage);
        }

        router.put(`/Products/${editProduct.id}`, form, {
            preserveScroll: true,
            forceFormData: true,
            onError: (errors) => {
                // eslint-disable-next-line no-console
                console.error('Update product failed:', errors);
            },
            onSuccess: () => {
                setProductsRefreshNonce((n) => n + 1);
                router.visit(window.location.href, { only: ['products'], preserveScroll: true });
                setIsEditProductOpen(false);
                setEditProduct(null);
                setEditProductImage(null);
            },
        });
    };

    const applyStatusFilter = (next: typeof statusFilter) => {
        setStatusFilter(next);
        const url = new URL(window.location.href);
        url.searchParams.set('status', next);
        if (effectiveBranch !== 'all') {
            url.searchParams.set('branch_key', effectiveBranch);
        } else {
            url.searchParams.delete('branch_key');
        }
        router.visit(url.toString(), { only: ['products', 'filters'], preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />
            <div className="space-y-6 p-6">

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Products</h1>
                        <p className="text-muted-foreground">Manage your inventory and product catalog</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {canAddProduct && (
                            <Button onClick={() => setIsAddProductOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Product
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">Products</CardTitle>
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalProducts}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeCategory !== 'All' ? `in ${activeCategory}` : 'total items'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">Units</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalUnits.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">in stock</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">Inventory Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{stats.totalValue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">total value</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">Low Stock</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.outOfStock > 0 ? `${stats.outOfStock} out of stock` : 'items need attention'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="rounded-xl border-border bg-card p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="pt-1 text-xs font-semibold text-muted-foreground shrink-0">Status:</div>
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    { key: 'reserved', label: 'In stock' },
                                    { key: 'low_stock', label: 'Low stock' },
                                    { key: 'out_of_stock', label: 'Out of stock' },
                                    { key: 'defective', label: 'Defective' },
                                ] as const
                            ).map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => applyStatusFilter(s.key)}
                                    className={
                                        statusFilter === s.key
                                            ? 'rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors'
                                            : 'rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
                                    }
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Search by name, SKU, or ID..."
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={sortBy} onValueChange={(v: SortKey) => setSortBy(v)}>
                                <SelectTrigger className="w-[160px] h-9">
                                    <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name (A-Z)</SelectItem>
                                    <SelectItem value="price-asc">Price: Low → High</SelectItem>
                                    <SelectItem value="price-desc">Price: High → Low</SelectItem>
                                    <SelectItem value="stock-asc">Stock: Low → High</SelectItem>
                                    <SelectItem value="stock-desc">Stock: High → Low</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex rounded-lg border overflow-hidden">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="pt-1 text-xs font-semibold text-muted-foreground shrink-0">Catalog:</div>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setActiveCategory(c)}
                                    className={
                                        activeCategory === c
                                            ? 'rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors'
                                            : 'rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
                                    }
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border-border bg-card p-4">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Package className="h-12 w-12 mb-3 opacity-30" />
                            <div className="font-medium">No products found</div>
                            <div className="text-sm mt-1">Try adjusting your filters</div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="max-h-[calc(100svh-22rem)] overflow-auto pr-1">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                {filteredProducts.map((p) => (
                                    <ProductCardGrid
                                        key={p.id}
                                        product={p}
                                        onGenerateBarcode={canManageProducts ? openBarcodeDialog : undefined}
                                        onViewDetails={setDetailsProduct}
                                        onEdit={canManageProducts ? openEditDialog : undefined}
                                        onRemove={canManageProducts ? openRemoveDialog : undefined}
                                        branch={effectiveBranch}
                                        hideBadges={statusFilter === 'defective'}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-h-[calc(100svh-22rem)] overflow-auto pr-1 space-y-2">
                            {filteredProducts.map((p) => (
                                <ProductCardList
                                    key={p.id}
                                    product={p}
                                    onGenerateBarcode={canManageProducts ? openBarcodeDialog : undefined}
                                    onViewDetails={setDetailsProduct}
                                    onEdit={canManageProducts ? openEditDialog : undefined}
                                    onRemove={canManageProducts ? openRemoveDialog : undefined}
                                    branch={effectiveBranch}
                                    hideBadges={statusFilter === 'defective'}
                                />
                            ))}
                        </div>
                    )}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">
                            {typeof total === 'number' && typeof perPage === 'number' ? (
                                <span>
                                    Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, total)} of {total}
                                </span>
                            ) : (
                                <span>
                                    Page {currentPage} of {lastPage}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                Prev
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage >= lastPage}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>

                <Dialog
                    open={!!detailsProduct}
                    onOpenChange={(open) => {
                        if (!open) setDetailsProduct(null);
                    }}
                >
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Product Details</DialogTitle>
                            <DialogDescription>View product information.</DialogDescription>
                        </DialogHeader>

                        {!detailsProduct ? (
                            <div className="text-sm text-muted-foreground">No product selected.</div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                                <div className="rounded-lg bg-muted p-3">
                                    <div className="aspect-square w-full overflow-hidden rounded-md bg-background relative">
                                        {productImageUrl(detailsProduct.image_path) ? (
                                            <img
                                                src={productImageUrl(detailsProduct.image_path) ?? undefined}
                                                alt={detailsProduct.name}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Package className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <div>
                                        <div className="text-lg font-semibold truncate">{detailsProduct.name}</div>
                                        <div className="mt-1 text-xs text-muted-foreground font-mono">SKU: {detailsProduct.sku}</div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Price</div>
                                            <div className="mt-1 font-semibold text-primary">{peso(detailsProduct.price)}</div>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Category</div>
                                            <div className="mt-1 font-medium">{detailsProduct.category || '—'}</div>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Stock ({stockContextLabel(effectiveBranch)})</div>
                                            <div className="mt-1 font-medium tabular-nums">{Number(detailsProduct.stock ?? 0).toLocaleString()}</div>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Stock threshold</div>
                                            <div className="mt-1 font-medium tabular-nums">{Number(detailsProduct.restocking_level ?? 0).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Barcode</div>
                                            <div className="mt-1 text-sm font-mono break-words">
                                                {String(detailsProduct.barcode_value ?? '').trim() ? String(detailsProduct.barcode_value) : '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Unit of Measure</div>
                                            <div className="mt-1 text-sm font-medium">
                                                {String(detailsProduct.unit_of_measure ?? '').trim() ? String(detailsProduct.unit_of_measure) : '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Brand</div>
                                            <div className="mt-1 text-sm font-medium">
                                                {String(detailsProduct.brand ?? '').trim() ? String(detailsProduct.brand) : '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs text-muted-foreground">Color</div>
                                            <div className="mt-1 text-sm font-medium">
                                                {String(detailsProduct.color ?? '').trim() ? String(detailsProduct.color) : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-md border p-3">
                                        <div className="text-xs text-muted-foreground">Description</div>
                                        <div className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
                                            {String(detailsProduct.description ?? '').trim() ? String(detailsProduct.description) : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDetailsProduct(null)}>
                                Close
                            </Button>
                        </DialogFooter>
                        </DialogContent>
                    </Dialog>

                {canManageProducts && (
                    <Dialog
                        open={isEditProductOpen}
                        onOpenChange={(open) => {
                            setIsEditProductOpen(open);
                            if (!open) {
                                setEditProduct(null);
                                setEditProductImage(null);
                                if (editProductImagePreviewUrl) {
                                    URL.revokeObjectURL(editProductImagePreviewUrl);
                                }
                                setEditProductImagePreviewUrl(null);
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>Update product information.</DialogDescription>
                        </DialogHeader>

                        {!editProduct ? (
                            <div className="text-sm text-muted-foreground">No product selected.</div>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                                <div className="rounded-lg bg-muted p-6">
                                    <div className="flex items-center justify-center">
                                        {editProductImagePreviewUrl ? (
                                            <img
                                                src={editProductImagePreviewUrl}
                                                alt={editProduct.name || 'Product'}
                                                className="h-56 w-full max-w-sm rounded-xl object-cover border"
                                            />
                                        ) : (
                                            <div className="h-40 w-full max-w-sm rounded-xl bg-orange-100 flex items-center justify-center dark:bg-orange-950">
                                                <Package className="h-10 w-10 text-orange-600" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Product image</label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] ?? null;

                                                if (editProductImagePreviewUrl) {
                                                    URL.revokeObjectURL(editProductImagePreviewUrl);
                                                }

                                                setEditProductImage(file);
                                                setEditProductImagePreviewUrl(file ? URL.createObjectURL(file) : productImageUrl(editProduct.image_path));
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-3 max-h-[70vh] overflow-auto pr-1">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                                        <Select
                                            value={editProduct.category ?? ''}
                                            onValueChange={(value: any) =>
                                                setEditProduct((p) => (p ? { ...p, category: value } : p))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.filter((c) => c !== 'All').map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">
                                                SKU <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                value={editProduct.sku}
                                                onChange={(e) =>
                                                    setEditProduct((p) => (p ? { ...p, sku: e.target.value } : p))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">
                                                Product name <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                value={editProduct.name}
                                                onChange={(e) =>
                                                    setEditProduct((p) => (p ? { ...p, name: e.target.value } : p))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Unit price (₱)</label>
                                            <Input
                                                type="number"
                                                value={Number(editProduct.price) || 0}
                                                onChange={(e) =>
                                                    setEditProduct((p) =>
                                                        p ? { ...p, price: Number(e.target.value) || 0 } : p
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Stock Threshold</label>
                                            <Input
                                                type="number"
                                                value={Number(editProduct.restocking_level) || 0}
                                                onChange={(e) =>
                                                    setEditProduct((p) =>
                                                        p
                                                            ? {
                                                                ...p,
                                                                restocking_level: Number(e.target.value) || 0,
                                                            }
                                                            : p
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Barcode</label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={String(editProduct.barcode_value ?? '')}
                                                onChange={(e) =>
                                                    setEditProduct((p) => (p ? { ...p, barcode_value: e.target.value } : p))
                                                }
                                                placeholder="Auto / scan"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setEditProduct((p) =>
                                                        p ? { ...p, barcode_value: generateBarcodeValue(p.sku) } : p,
                                                    )
                                                }
                                                className="shrink-0"
                                            >
                                                Generate
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Unit of Measure</label>
                                        <Select
                                            value={String(editProduct.unit_of_measure ?? 'pc')}
                                            onValueChange={(value) =>
                                                setEditProduct((p) => (p ? { ...p, unit_of_measure: value } : p))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select UoM" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uomOptions.map((u) => (
                                                    <SelectItem key={u} value={u}>
                                                        {u}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Brand</label>
                                        <Input
                                            value={String(editProduct.brand ?? '')}
                                            onChange={(e) =>
                                                setEditProduct((p) => (p ? { ...p, brand: e.target.value } : p))
                                            }
                                            placeholder="e.g. Bosch"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Color</label>
                                        <Input
                                            value={String(editProduct.color ?? '')}
                                            onChange={(e) =>
                                                setEditProduct((p) => (p ? { ...p, color: e.target.value } : p))
                                            }
                                            placeholder="e.g. Black"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                                        <textarea
                                            value={String(editProduct.description ?? '')}
                                            onChange={(e) =>
                                                setEditProduct((p) => (p ? { ...p, description: e.target.value } : p))
                                            }
                                            placeholder="Optional product details"
                                            className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditProductOpen(false);
                                    setEditProduct(null);
                                    setEditProductImage(null);
                                    if (editProductImagePreviewUrl) {
                                        URL.revokeObjectURL(editProductImagePreviewUrl);
                                    }
                                    setEditProductImagePreviewUrl(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={onUpdateProduct} disabled={!editProduct}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                )}

                {canManageProducts && (
                    <Dialog
                        open={!!barcodeProduct}
                        onOpenChange={(open) => {
                            if (!open) {
                                closeBarcodeDialog();
                                if (barcodeContainerRef.current) {
                                    barcodeContainerRef.current.innerHTML = '';
                                }
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Generate Barcodes</DialogTitle>
                                <DialogDescription>Generate printable barcodes for the selected product.</DialogDescription>
                            </DialogHeader>

                            {!barcodeProduct ? (
                                <div className="text-sm text-muted-foreground">No product selected.</div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="font-semibold truncate">{barcodeProduct.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono truncate">SKU: {barcodeProduct.sku}</div>
                                        </div>

                                        <div className="flex items-end gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={barcodeQty}
                                                    onChange={(e) => {
                                                        const n = Number(e.target.value) || 1;
                                                        setBarcodeQty(Math.max(1, n));
                                                        setBarcodesGenerated(false);
                                                        if (barcodeContainerRef.current) {
                                                            barcodeContainerRef.current.innerHTML = '';
                                                        }
                                                    }}
                                                    className="w-[120px]"
                                                />
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={generateBarcodes}
                                                disabled={!barcodeProduct}
                                            >
                                                Generate
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border bg-muted/30 p-3">
                                        <div
                                            ref={barcodeContainerRef}
                                            className="barcode-grid flex flex-wrap gap-3 justify-center max-h-72 overflow-auto rounded-lg border bg-white p-4 dark:bg-zinc-950"
                                            style={{ minHeight: barcodesGenerated ? '120px' : '0' }}
                                        />

                                        {!barcodesGenerated && (
                                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                                <Barcode className="h-10 w-10 mb-2 opacity-30" />
                                                <span className="text-sm">Set quantity and click generate to preview barcodes</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="gap-2 sm:gap-0">
                                {barcodesGenerated && (
                                    <>
                                        <Button variant="outline" onClick={generateBarcodes}>
                                            Regenerate
                                        </Button>
                                        <Button onClick={printBarcodes}>Print Barcodes</Button>
                                    </>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {canManageProducts && (
                    <Dialog
                        open={!!removeProduct}
                        onOpenChange={(open) => {
                            if (!open) closeRemoveDialog();
                        }}
                    >
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Remove Product</DialogTitle>
                                <DialogDescription>This action cannot be undone.</DialogDescription>
                            </DialogHeader>

                            {!removeProduct ? (
                                <div className="text-sm text-muted-foreground">No product selected.</div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="rounded-md border bg-muted/30 p-3">
                                        <div className="text-sm font-semibold">{removeProduct.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono mt-1">SKU: {removeProduct.sku}</div>
                                    </div>

                                    {removeError && (
                                        <div className="text-sm text-destructive">{removeError}</div>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={closeRemoveDialog} disabled={isRemoving}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={onRemoveProduct} disabled={!removeProduct || isRemoving}>
                                    Remove
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {canAddProduct && (
                    <Dialog
                        open={isAddProductOpen}
                        onOpenChange={(open) => {
                            setIsAddProductOpen(open);
                            if (!open) {
                                setNewProductImage(null);
                                if (newProductImagePreviewUrl) {
                                    URL.revokeObjectURL(newProductImagePreviewUrl);
                                    setNewProductImagePreviewUrl(null);
                                }
                            }
                        }}
                    >
                        <DialogContent className="!w-[86vw] sm:!max-w-6xl max-h-[90svh] overflow-hidden flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Add Product</DialogTitle>
                                <DialogDescription>Fill in the product details to add it to the catalog.</DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto pr-1">
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="rounded-lg border bg-card p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-semibold">Product Image</div>
                                            <div className="text-xs text-muted-foreground">Optional</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-center">
                                        {newProductImagePreviewUrl ? (
                                            <img
                                                src={newProductImagePreviewUrl}
                                                alt={newProduct.name || 'New product'}
                                                className="h-56 w-full max-w-sm rounded-xl object-cover border"
                                            />
                                        ) : (
                                            <div className="h-40 w-full max-w-sm rounded-xl bg-muted flex items-center justify-center">
                                                <Package className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Upload</label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] ?? null;

                                                if (newProductImagePreviewUrl) {
                                                    URL.revokeObjectURL(newProductImagePreviewUrl);
                                                }

                                                setNewProductImage(file);
                                                setNewProductImagePreviewUrl(file ? URL.createObjectURL(file) : null);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="rounded-lg border bg-card p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-semibold">Basic Information</div>
                                                <div className="text-xs text-muted-foreground">Required fields marked with *</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Category</label>
                                                <Select
                                                    value={newProduct.category}
                                                    onValueChange={(value: any) => setNewProduct((p) => ({ ...p, category: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.filter((c) => c !== 'All').map((c) => (
                                                            <SelectItem key={c} value={c}>
                                                                {c}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">
                                                    SKU <span className="text-destructive">*</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={newProduct.sku}
                                                        onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                                                    />
                                                    <Button type="button" variant="outline" size="sm" onClick={generateSku} className="shrink-0">
                                                        Auto
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">
                                                    Product name <span className="text-destructive">*</span>
                                                </label>
                                                <Input
                                                    value={newProduct.name}
                                                    onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Barcode</label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={String(newProduct.barcode_value ?? '')}
                                                        onChange={(e) => setNewProduct((p) => ({ ...p, barcode_value: e.target.value }))}
                                                        placeholder="Auto / scan"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setNewProduct((p) => ({
                                                                ...p,
                                                                barcode_value: generateBarcodeValue(p.sku),
                                                            }))
                                                        }
                                                        className="shrink-0"
                                                    >
                                                        Generate
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Unit of Measure</label>
                                                <Select
                                                    value={String(newProduct.unit_of_measure ?? 'pc')}
                                                    onValueChange={(value) => setNewProduct((p) => ({ ...p, unit_of_measure: value }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select UoM" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {uomOptions.map((u) => (
                                                            <SelectItem key={u} value={u}>
                                                                {u}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Brand</label>
                                                <Input
                                                    value={String(newProduct.brand ?? '')}
                                                    onChange={(e) => setNewProduct((p) => ({ ...p, brand: e.target.value }))}
                                                    placeholder="e.g. Bosch"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Color</label>
                                                <Input
                                                    value={String(newProduct.color ?? '')}
                                                    onChange={(e) => setNewProduct((p) => ({ ...p, color: e.target.value }))}
                                                    placeholder="e.g. Black"
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="rounded-lg border bg-card p-5">
                                        <div>
                                            <div className="text-sm font-semibold">Pricing & Stock</div>
                                            <div className="text-xs text-muted-foreground">Set initial inventory for your branch</div>
                                        </div>

                                        <div className="mt-4 grid gap-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-muted-foreground">Unit price (₱)</label>
                                                    <Input
                                                        type="number"
                                                        value={Number(newProduct.price) || 0}
                                                        onChange={(e) =>
                                                            setNewProduct((p) => ({ ...p, price: Number(e.target.value) || 0 }))
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-muted-foreground">Initial stock</label>
                                                    <Input
                                                        type="number"
                                                        value={Number(newProduct.stock) || 0}
                                                        onChange={(e) =>
                                                            setNewProduct((p) => ({ ...p, stock: Number(e.target.value) || 0 }))
                                                        }
                                                        placeholder="e.g. 10"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Stock Threshold</label>
                                                <Input
                                                    type="number"
                                                    value={Number(newProduct.restocking_level) || 0}
                                                    onChange={(e) =>
                                                        setNewProduct((p) => ({
                                                            ...p,
                                                            restocking_level: Number(e.target.value) || 0,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border bg-card p-5">
                                        <div>
                                            <div className="text-sm font-semibold">Description</div>
                                            <div className="text-xs text-muted-foreground">Optional product details</div>
                                        </div>

                                        <div className="mt-4 space-y-1">
                                            <textarea
                                                value={String(newProduct.description ?? '')}
                                                onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                                                placeholder="Optional product details"
                                                className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={onCreateProduct}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Product
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            </AppLayout>
        );
}

// ---- Grid Card ----
function ProductCardGrid({
    product,
    onGenerateBarcode,
    onViewDetails,
    onEdit,
    onRemove,
    branch,
    hideBadges,
}: {
    product: Product;
    onGenerateBarcode?: (p: Product) => void;
    onViewDetails: (p: Product) => void;
    onEdit?: (p: Product) => void;
    onRemove?: (p: Product) => void;
    branch: 'all' | 'lagonglong' | 'balingasag';
    hideBadges: boolean;
}) {
    const status = getStockStatus(product.stock);
    const restockingLevel = Number(product.restocking_level) || 0;
    const showLowStock = restockingLevel > 0 && product.stock <= restockingLevel;

    const totalStock = Number(product.total_stock ?? product.stock) || 0;
    const defectiveQty = Number(product.defective_qty ?? 0) || 0;

    return (
        <div
            className="group relative overflow-hidden rounded-xl border bg-card text-left shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onViewDetails(product)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewDetails(product);
                }
            }}
        >
            {/* Dropdown */}
            <div className="absolute top-1.5 right-1.5 z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(product);
                            }}
                        >
                            <Eye className="h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        {onEdit && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(product);
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                        )}
                        {onGenerateBarcode && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onGenerateBarcode(product);
                                }}
                            >
                                <Barcode className="h-4 w-4" />
                                Generate Barcode
                            </DropdownMenuItem>
                        )}
                        {onRemove && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(product);
                                    }}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Stock indicator */}
            {!hideBadges && status !== 'ok' && (
                <div className="absolute top-1.5 left-1.5 z-10">
                    {status === 'out' && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Out</Badge>}
                    {status === 'critical' && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Low</Badge>}
                    {status === 'low' && <Badge className="text-[9px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600">Low</Badge>}
                </div>
            )}

            <div className={`aspect-square w-full bg-muted relative overflow-hidden ${status === 'out' ? 'opacity-50' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 opacity-20" />
                {productImageUrl(product.image_path) ? (
                    <img
                        src={productImageUrl(product.image_path) ?? undefined}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center dark:bg-orange-950">
                            <Package className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                )}
            </div>
            <div className="p-3">
                <div className="truncate text-xs font-semibold group-hover:text-primary transition-colors">
                    {product.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{product.sku}</div>
                <div className="mt-1.5">
                    <div className="text-xs font-semibold text-primary">{peso(product.price)}</div>
                    {!hideBadges && (
                        <div className="mt-1 flex flex-col items-start gap-1">
                            {showLowStock && lowStockBadge(product.stock, restockingLevel)}
                            {product.stock === 0 && defectiveQty > 0 ? (
                                <Badge variant="destructive" className="text-[10px]">
                                    {`Out (All Defective) (${stockContextLabel(branch)})`}
                                </Badge>
                            ) : (
                                stockBadge(product.stock, stockContextLabel(branch))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- List Card ----
function ProductCardList({
    product,
    onGenerateBarcode,
    onViewDetails,
    onEdit,
    onRemove,
    branch,
    hideBadges,
}: {
    product: Product;
    onGenerateBarcode?: (p: Product) => void;
    onViewDetails: (p: Product) => void;
    onEdit?: (p: Product) => void;
    onRemove?: (p: Product) => void;
    branch: 'all' | 'lagonglong' | 'balingasag';
    hideBadges: boolean;
}) {
    const status = getStockStatus(product.stock);
    const restockingLevel = Number(product.restocking_level) || 0;
    const showLowStock = restockingLevel > 0 && product.stock <= restockingLevel;

    const totalStock = Number(product.total_stock ?? product.stock) || 0;
    const defectiveQty = Number(product.defective_qty ?? 0) || 0;

    return (
        <div
            className="group flex items-center gap-4 rounded-lg border bg-card p-3 hover:shadow-sm transition-all cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onViewDetails(product)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewDetails(product);
                }
            }}
        >
            {/* Icon */}
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted relative overflow-hidden ${status === 'out' ? 'opacity-50' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 opacity-20" />
                {productImageUrl(product.image_path) ? (
                    <img
                        src={productImageUrl(product.image_path) ?? undefined}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <Package className="h-6 w-6 text-orange-600 relative z-10" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{product.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{product.category}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{product.sku}</span>
                </div>
            </div>

            {/* Price + Alerts */}
            <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-primary">{peso(product.price)}</div>
                {!hideBadges && (
                    <div className="mt-1 flex flex-col items-end gap-1">
                        {showLowStock && lowStockBadge(product.stock, restockingLevel)}
                        {product.stock === 0 && defectiveQty > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">
                                {`Out (All Defective) (${stockContextLabel(branch)})`}
                            </Badge>
                        ) : (
                            stockBadge(product.stock, stockContextLabel(branch))
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(product);
                        }}
                    >
                        <Eye className="h-4 w-4" />
                        View Details
                    </DropdownMenuItem>
                    {onEdit && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(product);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                    )}
                    {onGenerateBarcode && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onGenerateBarcode(product);
                                }}
                            >
                                <Barcode className="h-4 w-4" />
                                Generate Barcode
                            </DropdownMenuItem>
                        </>
                    )}
                    {onRemove && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(product);
                                }}
                                className="text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
