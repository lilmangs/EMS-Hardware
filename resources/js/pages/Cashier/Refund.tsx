import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Search, TicketX } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Refund',
        href: '/Refund',
    },
];

type RefundStatus = 'approved' | 'rejected';

type RefundCondition = 'resellable' | 'defective';

type RefundableSaleItem = {
    id: number;
    product_id: number | null;
    name: string;
    price: number;
    purchased_qty: number;
    refunded_qty: number;
    remaining_qty: number;
};

type RefundableSale = {
    id: number;
    ref: string;
    branch_key: string;
    created_at: string;
    total: number;
    items: RefundableSaleItem[];
};

type RecentRefund = {
    id: number;
    ref: string;
    sale_ref: string | null;
    status: RefundStatus;
    amount: number | string;
    reason: string | null;
    restock?: boolean;
    created_at: string;
    items: Array<{ name: string; qty: number; amount: number | string }>;
};

const peso = (n: number | string | null | undefined) => {
    const v = typeof n === 'number' ? n : Number(n);
    return `₱${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
};

const csrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';

function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function statusBadge(s: RefundStatus) {
    if (s === 'approved') {
        return (
            <Badge
                variant="secondary"
                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
            >
                Approved
            </Badge>
        );
    }
    return (
        <Badge
            variant="secondary"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
        >
            Rejected
        </Badge>
    );
}

function restockBadge(restock?: boolean) {
    if (restock === true) {
        return (
            <Badge
                variant="secondary"
                className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800"
            >
                Restock
            </Badge>
        );
    }

    return (
        <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground border-border"
        >
            No restock
        </Badge>
    );
}

export default function Refund() {
    const { props } = usePage<{ branch_key: string | null; recent_refunds: RecentRefund[] }>();
    const branchKey = props.branch_key;
    const recentRefunds = props.recent_refunds ?? [];

    const [saleRef, setSaleRef] = useState('');
    const [sale, setSale] = useState<RefundableSale | null>(null);
    const [selectedQty, setSelectedQty] = useState<Record<number, number>>({});
    const [reason, setReason] = useState('');
    const [condition, setCondition] = useState<RefundCondition>('resellable');

    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

    const [isLoadingSale, setIsLoadingSale] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setError('');
        setSuccess('');
    }, [saleRef]);

    const refundableTotal = useMemo(() => {
        if (!sale) return 0;
        return sale.items.reduce((sum, it) => sum + it.remaining_qty * it.price, 0);
    }, [sale]);

    const selectedTotal = useMemo(() => {
        if (!sale) return 0;
        return sale.items.reduce((sum, it) => {
            const qty = Number(selectedQty[it.id] ?? 0) || 0;
            return sum + qty * it.price;
        }, 0);
    }, [sale, selectedQty]);

    const lookupSale = useCallback(async (opts?: { openModal?: boolean }) => {
        const openModal = opts?.openModal !== false;
        if (!branchKey) {
            setError('No assigned branch.');
            return;
        }
        if (!saleRef.trim()) {
            setError('Enter a sale reference to lookup.');
            return;
        }

        setIsLoadingSale(true);
        try {
            setError('');
            setSuccess('');
            setSale(null);
            setSelectedQty({});

            const params = new URLSearchParams();
            params.set('ref', saleRef.trim());

            const res = await fetch(`/Refund/sale?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to lookup sale');

            setSale(json.sale as RefundableSale);
            if (openModal) setIsRefundModalOpen(true);
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Failed to lookup sale');
        } finally {
            setIsLoadingSale(false);
        }
    }, [branchKey, saleRef]);

    const setQtyForItem = useCallback((itemId: number, next: number, max: number) => {
        const n = Math.max(0, Math.min(max, Math.floor(next)));
        setSelectedQty((prev) => ({ ...prev, [itemId]: n }));
    }, []);

    const submitRefund = useCallback(async () => {
        if (!sale) {
            setError('Lookup a sale first.');
            return;
        }
        if (!reason.trim()) {
            setError('Reason is required.');
            return;
        }

        const items = Object.entries(selectedQty)
            .map(([k, v]) => ({ pos_sale_item_id: Number(k), qty: Number(v) }))
            .filter((x) => Number.isFinite(x.pos_sale_item_id) && x.pos_sale_item_id > 0 && (Number(x.qty) || 0) > 0);

        if (!items.length) {
            setError('Select at least one item quantity to refund.');
            return;
        }

        setIsSubmitting(true);
        try {
            setError('');
            setSuccess('');

            const res = await fetch('/Refund/create', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    sale_ref: sale.ref,
                    condition,
                    reason: reason.trim(),
                    items,
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to create refund');

            setSuccess(`Refund created: ${json?.ref ?? ''}`.trim());
            setReason('');
            setCondition('resellable');
            setIsRefundModalOpen(false);
            await lookupSale({ openModal: false });
            router.reload({ only: ['recent_refunds'] });
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Failed to create refund');
        } finally {
            setIsSubmitting(false);
        }
    }, [condition, lookupSale, reason, sale, selectedQty]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Refund" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold">Refund</h1>
                    <p className="text-muted-foreground">Lookup a sale and process a refund</p>
                </div>

                {!!error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4" />
                            <div>{error}</div>
                        </div>
                    </div>
                )}

                {!!success && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4" />
                            <div>{success}</div>
                        </div>
                    </div>
                )}

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle>Find Sale</CardTitle>
                        <CardDescription>Enter the receipt/reference number to find items eligible for refund.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                            <Input
                                value={saleRef}
                                onChange={(e) => setSaleRef(e.target.value)}
                                placeholder="Enter sale reference"
                            />
                            <Button
                                className="w-full md:w-auto"
                                onClick={() => lookupSale({ openModal: true })}
                                disabled={isLoadingSale}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Lookup
                            </Button>
                        </div>

                        {sale && (
                            <div className="rounded-md border p-4">
                                <div className="grid gap-3 text-sm md:grid-cols-3">
                                    <div>
                                        <div className="text-muted-foreground">Sale Ref</div>
                                        <div className="font-medium">{sale.ref}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Date</div>
                                        <div className="font-medium">{formatDateTime(sale.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Sale Total</div>
                                        <div className="font-medium">{peso(sale.total)}</div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <div>Refundable remaining (max)</div>
                                    <div className="font-medium text-foreground">{peso(refundableTotal)}</div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Refund Items</DialogTitle>
                        <DialogDescription>
                            {sale ? `Sale Ref: ${sale.ref}` : 'Lookup a sale to start a refund.'}
                        </DialogDescription>
                    </DialogHeader>

                    {!sale ? (
                        <div className="text-sm text-muted-foreground">Lookup a sale first to see items.</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-3 rounded-md border p-4 text-sm md:grid-cols-3">
                                <div>
                                    <div className="text-muted-foreground">Date</div>
                                    <div className="font-medium">{formatDateTime(sale.created_at)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Sale Total</div>
                                    <div className="font-medium">{peso(sale.total)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Refundable remaining (max)</div>
                                    <div className="font-medium">{peso(refundableTotal)}</div>
                                </div>
                            </div>

                            <div className="max-h-[50vh] overflow-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Purchased</TableHead>
                                            <TableHead className="text-right">Refunded</TableHead>
                                            <TableHead className="text-right">Remaining</TableHead>
                                            <TableHead className="w-[120px] text-right">Refund Qty</TableHead>
                                            <TableHead className="text-right">Line</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.items.map((it) => {
                                            const max = it.remaining_qty;
                                            const qty = Number(selectedQty[it.id] ?? 0) || 0;
                                            const disabled = max <= 0;
                                            return (
                                                <TableRow key={it.id}>
                                                    <TableCell className="font-medium">{it.name}</TableCell>
                                                    <TableCell className="text-right">{peso(it.price)}</TableCell>
                                                    <TableCell className="text-right">{it.purchased_qty}</TableCell>
                                                    <TableCell className="text-right">{it.refunded_qty}</TableCell>
                                                    <TableCell className="text-right">{it.remaining_qty}</TableCell>
                                                    <TableCell className="w-[120px] text-right">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={max}
                                                            value={qty}
                                                            disabled={disabled}
                                                            onChange={(e) => setQtyForItem(it.id, Number(e.target.value), max)}
                                                            className="h-8 w-full text-right"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{peso(qty * it.price)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-2">
                                <div className="text-xs font-medium text-muted-foreground">Reason (required)</div>
                                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Defective product" />
                            </div>

                            <div className="grid gap-2">
                                <div className="text-xs font-medium text-muted-foreground">Condition</div>
                                <Select value={condition} onValueChange={(v) => setCondition(v as RefundCondition)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select condition" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="resellable">Resellable (Restock)</SelectItem>
                                        <SelectItem value="defective">Defective (No restock)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Selected total
                                    <span className="ml-2 font-medium text-foreground tabular-nums">{peso(selectedTotal)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsRefundModalOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={submitRefund} disabled={isSubmitting || selectedTotal <= 0}>
                                        <TicketX className="mr-2 h-4 w-4" />
                                        Create Refund
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle>Recent Refunds</CardTitle>
                        <CardDescription>Latest refunds you processed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Refund Ref</TableHead>
                                    <TableHead>Sale Ref</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Inventory</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentRefunds.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.ref}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.sale_ref ?? '—'}</TableCell>
                                        <TableCell>{statusBadge(r.status)}</TableCell>
                                        <TableCell>{restockBadge(r.restock)}</TableCell>
                                        <TableCell className="text-right font-medium">{peso(r.amount)}</TableCell>
                                        <TableCell className="max-w-[320px] truncate" title={r.reason ?? ''}>{r.reason ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                                    </TableRow>
                                ))}
                                {!recentRefunds.length && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                                            No refunds yet.
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
