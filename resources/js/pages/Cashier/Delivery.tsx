import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, MoreHorizontal, Search } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Deliveries',
        href: '/cashier/deliveries',
    },
];

type DeliveryStaff = {
    id: number;
    name: string;
    branch_key: string;
};

type DeliveryStatus = 'preparing' | 'out_for_delivery' | 'delivered';

type SaleLineItem = {
    name: string;
    qty: number;
    price: number | string;
    line_total: number | string;
};

type DeliveryRow = {
    id: number;
    ref: string;
    status: DeliveryStatus;
    scheduled_for?: string | null;
    customer_name: string;
    address: string;
    delivery_fee: number | string;
    notes: string | null;
    assigned_to: { id: number; name: string } | null;
    created_at: string;
    assigned_at: string | null;
    delivered_at: string | null;
    items: number;
    delivery_total?: number | string;
    sale: { id: number; ref: string; total: number | string; created_at: string } | null;
    sale_items?: SaleLineItem[];
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

function statusBadge(status: DeliveryStatus) {
    if (status === 'preparing') {
        return (
            <Badge
                variant="secondary"
                className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800"
            >
                Preparing
            </Badge>
        );
    }

    if (status === 'out_for_delivery') {
        return (
            <Badge
                variant="secondary"
                className="bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-800"
            >
                Out for delivery
            </Badge>
        );
    }

    return (
        <Badge
            variant="secondary"
            className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-200 dark:border-green-800"
        >
            Delivered
        </Badge>
    );
}

function deliveryMatchesQuery(d: DeliveryRow, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const chunks = [
        d.ref,
        d.customer_name,
        d.address,
        d.notes ?? '',
        d.sale?.ref ?? '',
        String(d.sale?.id ?? ''),
        d.assigned_to?.name ?? '',
        String(d.id),
        d.status,
        d.status === 'out_for_delivery' ? 'out for delivery' : '',
        ...(d.sale_items ?? []).map((it) => it.name),
    ];
    return chunks.some((c) => c.toLowerCase().includes(q));
}

export default function Delivery() {
    const { props } = usePage<{ branch_key: string | null }>();
    const branchKey = props.branch_key;

    const [saleRef, setSaleRef] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [address, setAddress] = useState('');
    const [deliveryFee, setDeliveryFee] = useState('0');
    const [assignedToUserId, setAssignedToUserId] = useState<string>('0');
    const [scheduledFor, setScheduledFor] = useState<string>('');
    const [notes, setNotes] = useState('');

    const [filterStatus, setFilterStatus] = useState<'all' | DeliveryStatus>('all');
    const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [staff, setStaff] = useState<DeliveryStaff[]>([]);
    const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRow | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const seqRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    const loadStaff = useCallback(async () => {
        try {
            const res = await fetch('/cashier/deliveries/staff', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to load delivery staff');
            setStaff((json?.staff ?? []) as DeliveryStaff[]);
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'Failed to load delivery staff';
            throw new Error(`Staff: ${msg}`);
        }
    }, []);

    const loadDeliveries = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const seq = ++seqRef.current;
        setIsLoading(true);

        try {
            const params = new URLSearchParams();
            params.set('status', filterStatus);
            params.set('assigned', filterAssigned);

            const res = await fetch(`/cashier/deliveries/data?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to load deliveries');

            if (seq !== seqRef.current) return;
            setDeliveries((json?.deliveries ?? []) as DeliveryRow[]);
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            const msg = e instanceof Error ? e.message : 'Failed to load deliveries';
            throw new Error(`List: ${msg}`);
        } finally {
            if (seq === seqRef.current) setIsLoading(false);
        }
    }, [filterAssigned, filterStatus]);

    useEffect(() => {
        setError('');
        setSuccess('');
    }, [saleRef, customerName, address, deliveryFee, assignedToUserId, scheduledFor, notes, filterStatus, filterAssigned]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await loadStaff();
                if (cancelled) return;
                await loadDeliveries();
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message ? String(e.message) : 'Failed to load deliveries');
            }
        })();
        return () => {
            cancelled = true;
            abortRef.current?.abort();
        };
    }, [loadDeliveries, loadStaff]);

    const createDelivery = useCallback(async () => {
        if (!saleRef.trim()) {
            setError('Sale reference is required.');
            return;
        }
        if (!customerName.trim()) {
            setError('Customer name is required.');
            return;
        }
        if (!address.trim()) {
            setError('Address is required.');
            return;
        }

        setIsCreating(true);
        try {
            setError('');
            setSuccess('');

            const res = await fetch('/cashier/deliveries/create', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    sale_ref: saleRef.trim(),
                    customer_name: customerName.trim(),
                    address: address.trim(),
                    delivery_fee: Number(deliveryFee) || 0,
                    assigned_to_user_id: Number(assignedToUserId) > 0 ? Number(assignedToUserId) : null,
                    scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
                    notes: notes.trim() ? notes.trim() : null,
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to create delivery');

            setSuccess(`Delivery created: ${json?.ref ?? ''}`.trim());
            setSaleRef('');
            setCustomerName('');
            setAddress('');
            setDeliveryFee('0');
            setAssignedToUserId('0');
            setScheduledFor('');
            setNotes('');
            await loadDeliveries();

            setCreateOpen(false);
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'Failed to create delivery';
            setError(`Create: ${msg}`);
        } finally {
            setIsCreating(false);
        }
    }, [address, customerName, deliveryFee, assignedToUserId, scheduledFor, loadDeliveries, notes, saleRef]);

    const assignDelivery = useCallback(
        async (deliveryId: number, assignedToUserId: number | null) => {
            try {
                const res = await fetch('/cashier/deliveries/assign', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        delivery_id: deliveryId,
                        assigned_to_user_id: assignedToUserId,
                    }),
                });

                const json = await res.json().catch(() => null);
                if (!res.ok) throw new Error(json?.message || 'Failed to assign delivery');

                await loadDeliveries();
            } catch (e: any) {
                const msg = e instanceof Error ? e.message : 'Failed to assign delivery';
                throw new Error(`Assign: ${msg}`);
            }
        },
        [loadDeliveries],
    );

    const staffOptions = useMemo(() => {
        return [{ id: 0, name: 'Unassigned', branch_key: branchKey ?? '' } as DeliveryStaff, ...staff];
    }, [branchKey, staff]);

    const filteredDeliveries = useMemo(
        () => deliveries.filter((d) => deliveryMatchesQuery(d, searchQuery)),
        [deliveries, searchQuery],
    );

    const openDeliveryDetails = useCallback((d: DeliveryRow) => {
        setSelectedDelivery(d);
        setIsDetailsOpen(true);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Deliveries" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">Deliveries</h1>
                        <p className="text-muted-foreground">
                            Create, schedule, and assign deliveries for your branch.
                        </p>
                    </div>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>Create Delivery</Button>
                        </DialogTrigger>
                        <DialogContent className="flex min-h-0 max-h-[min(90dvh,100dvh)] w-full max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden p-4 sm:max-w-3xl sm:p-6">
                            <DialogHeader className="shrink-0 space-y-1.5 text-left">
                                <DialogTitle>Create Delivery</DialogTitle>
                                <DialogDescription>
                                    Use a sale reference and enter delivery details.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Sale Ref</label>
                                        <Input
                                            value={saleRef}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaleRef(e.target.value)}
                                            placeholder="e.g. TRX-1001"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Customer Name</label>
                                        <Input
                                            value={customerName}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                                            placeholder="e.g. Juan Dela Cruz"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Delivery Date &amp; Time</label>
                                        <Input
                                            type="datetime-local"
                                            value={scheduledFor}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledFor(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                        <label className="text-sm font-medium">Address</label>
                                        <Textarea
                                            value={address}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAddress(e.target.value)}
                                            placeholder="Delivery address"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Delivery Fee</label>
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            value={deliveryFee}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryFee(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Assign To</label>
                                        <Select value={assignedToUserId} onValueChange={(v) => setAssignedToUserId(v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select staff" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {staffOptions.map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {staff.length === 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                No delivery staff users found for your branch.
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                        <label className="text-sm font-medium">Notes (optional)</label>
                                        <Textarea
                                            value={notes}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                                            placeholder="Landmark, instructions..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {(error || success) && (
                                <div className="shrink-0 space-y-2">
                                    {error && (
                                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                                            {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200">
                                            {success}
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="shrink-0">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" disabled={isCreating} className="w-full sm:w-auto">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    onClick={createDelivery}
                                    disabled={isCreating}
                                    className="w-full sm:min-w-[180px] sm:w-auto"
                                >
                                    {isCreating ? 'Creating...' : 'Create Delivery'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader className="space-y-2">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle>Delivery List</CardTitle>
                                <CardDescription>Assign or reassign deliveries to delivery staff.</CardDescription>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
                                <Select value={filterAssigned} onValueChange={(v) => setFilterAssigned(v as any)}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Assigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        <SelectItem value="assigned">Assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="preparing">Preparing</SelectItem>
                                        <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                                        <SelectItem value="delivered">Delivered</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button variant="outline" onClick={loadDeliveries} disabled={isLoading} className="w-full">
                                    {isLoading ? 'Refreshing...' : 'Refresh'}
                                </Button>
                            </div>
                        </div>
                        <div className="relative max-w-full sm:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search ref, customer, address, sale..."
                                className="pl-9"
                                aria-label="Search deliveries"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Delivery</TableHead>
                                            <TableHead>Sale</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Schedule</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Fee</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Assigned To</TableHead>
                                            <TableHead className="text-right w-12">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                                                    {isLoading ? 'Loading...' : 'No deliveries found.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredDeliveries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                                                    {`No deliveries match "${searchQuery.trim()}". Try a different term or clear the search.`}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredDeliveries.map((d) => {
                                                const assignedValue = d.assigned_to?.id ? String(d.assigned_to.id) : '0';
                                                const fee = Number(d.delivery_fee) || 0;
                                                const saleTotal = Number(d.sale?.total) || 0;
                                                const total =
                                                    Number(d.delivery_total) ||
                                                    saleTotal;
                                                return (
                                                    <TableRow
                                                        key={d.id}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => openDeliveryDetails(d)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                openDeliveryDetails(d);
                                                            }
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">{d.ref}</div>
                                                            <div className="text-xs text-muted-foreground">{formatDateTime(d.created_at)}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{d.sale?.ref ?? '—'}</div>
                                                            <div className="text-xs text-muted-foreground">{d.sale?.created_at ? formatDateTime(d.sale.created_at) : ''}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{d.customer_name}</div>
                                                            <div className="max-w-[360px] text-xs text-muted-foreground line-clamp-2">
                                                                {d.address}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                            {d.scheduled_for ? formatDateTime(d.scheduled_for) : '—'}
                                                        </TableCell>
                                                        <TableCell className="tabular-nums">{d.items}</TableCell>
                                                        <TableCell className="tabular-nums">{peso(fee)}</TableCell>
                                                        <TableCell className="tabular-nums">{peso(total)}</TableCell>
                                                        <TableCell>{statusBadge(d.status)}</TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={assignedValue}
                                                                onValueChange={(v) => {
                                                                    const n = Number(v);
                                                                    assignDelivery(d.id, n > 0 ? n : null).catch((err: unknown) => {
                                                                        const msg = err instanceof Error ? err.message : 'Failed to assign';
                                                                        setError(msg);
                                                                    });
                                                                }}
                                                            >
                                                                <SelectTrigger
                                                                    className="w-[220px]"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                    }}
                                                                >
                                                                    <SelectValue placeholder="Select staff" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {staffOptions.map((s) => (
                                                                        <SelectItem key={s.id} value={String(s.id)}>
                                                                            {s.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                        }}
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-44">
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            openDeliveryDetails(d);
                                                                        }}
                                                                    >
                                                                        <FileText className="mr-2 h-4 w-4" />
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
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Dialog
                    open={isDetailsOpen}
                    onOpenChange={(open) => {
                        setIsDetailsOpen(open);
                        if (!open) setSelectedDelivery(null);
                    }}
                >
                    <DialogContent className="flex min-h-0 max-h-[min(90dvh,100dvh)] w-full max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden p-4 sm:max-w-5xl sm:p-6">
                        <DialogHeader className="shrink-0 space-y-1.5 text-left">
                            <DialogTitle>Delivery Details</DialogTitle>
                            <DialogDescription>View delivery information.</DialogDescription>
                        </DialogHeader>

                        {!selectedDelivery ? (
                            <div className="text-sm text-muted-foreground">No delivery selected.</div>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                                <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
                                        <div>
                                            <div className="text-muted-foreground">Delivery Ref</div>
                                            <div className="font-medium">{selectedDelivery.ref}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Status</div>
                                            <div className="font-medium">{statusBadge(selectedDelivery.status)}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Created</div>
                                            <div className="font-medium">{formatDateTime(selectedDelivery.created_at)}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Scheduled</div>
                                            <div className="font-medium">
                                                {selectedDelivery.scheduled_for ? formatDateTime(selectedDelivery.scheduled_for) : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Items</div>
                                            <div className="font-medium tabular-nums">{selectedDelivery.items}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Assigned To</div>
                                            <div className="font-medium">{selectedDelivery.assigned_to?.name ?? 'Unassigned'}</div>
                                        </div>
                                    </div>

                                    <div className="rounded-md border p-4 text-sm">
                                        <div className="text-muted-foreground">Customer</div>
                                        <div className="mt-1 font-medium">{selectedDelivery.customer_name}</div>
                                        <div className="mt-3 text-muted-foreground">Address</div>
                                        <div className="mt-1 font-medium whitespace-pre-line">{selectedDelivery.address}</div>
                                    </div>

                                    {!!selectedDelivery.notes && (
                                        <div className="rounded-md border p-4 text-sm">
                                            <div className="text-muted-foreground">Notes</div>
                                            <div className="mt-1 font-medium whitespace-pre-line">{selectedDelivery.notes}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-md border p-4 text-sm">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <div className="text-muted-foreground">Sale Ref</div>
                                                <div className="mt-1 font-medium">{selectedDelivery.sale?.ref ?? '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Sale Date</div>
                                                <div className="mt-1 font-medium">
                                                    {selectedDelivery.sale?.created_at ? formatDateTime(selectedDelivery.sale.created_at) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {(selectedDelivery.sale_items?.length ?? 0) > 0 && (
                                        <div className="rounded-md border">
                                            <div className="border-b px-4 py-3 text-sm font-medium">Items</div>
                                            <div className="divide-y">
                                                {selectedDelivery.sale_items!.map((line, idx) => (
                                                    <div key={idx} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                                                        <div className="min-w-0">
                                                            <div className="break-words font-medium leading-snug">{line.name}</div>
                                                            <div className="text-muted-foreground text-xs tabular-nums">
                                                                {line.qty} × {peso(line.price)}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 font-medium tabular-nums">{peso(line.line_total)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-md border">
                                        <div className="border-b px-4 py-3 text-sm font-medium">Totals</div>
                                        <div className="space-y-2 p-4 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-muted-foreground">Delivery Fee</span>
                                                <span className="font-medium tabular-nums">{peso(selectedDelivery.delivery_fee)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-muted-foreground">Total</span>
                                                <span className="font-semibold tabular-nums">
                                                    {peso(
                                                        (selectedDelivery.delivery_total ??
                                                            Number(selectedDelivery.sale?.total)) || 0,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
