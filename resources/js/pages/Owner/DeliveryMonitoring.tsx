import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw, Store, Package, Truck, CheckCircle2, MapPin, Hash, Clock, Boxes, PhilippinePeso, MoreHorizontal } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useBranchFilter } from '@/hooks/use-branch-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';

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
    proof_photo_url?: string | null;
};

type DeliveryMonitoringData = {
    filters: { branch_key: 'all' | 'lagonglong' | 'balingasag'; date: string };
    summary: { total_today: number; preparing: number; out_for_delivery: number; delivered: number };
    by_branch: Array<{ branch_key: 'lagonglong' | 'balingasag'; branch: string; count: number }>;
    deliveries: DeliveryRecord[];
};

const peso = (n: number | null | undefined) => `₱${(Number(n) || 0).toLocaleString()}`;

const statusColor = (s: DeliveryStatus) => {
    switch (s) {
        case 'preparing':
            return '#FF9800';
        case 'out_for_delivery':
            return '#2196F3';
        default:
            return '#4CAF50';
    }
};

const statusLabel = (s: DeliveryStatus) => {
    switch (s) {
        case 'preparing':
            return 'Preparing';
        case 'out_for_delivery':
            return 'Out for Delivery';
        default:
            return 'Delivered';
    }
};

const toIsoDateTime = (raw: string) => {
    const s = String(raw || '').trim();
    if (!s) return new Date().toISOString();
    if (s.includes('T')) return s;
    return s.replace(' ', 'T');
};

const formatReadableDateTime = (raw: string) => {
    const iso = toIsoDateTime(raw);
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

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

    const activeFetchRef = useRef<AbortController | null>(null);
    const fetchSeqRef = useRef(0);

    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');

    const [proofViewerUrl, setProofViewerUrl] = useState<string>('');

    const [listPage, setListPage] = useState(1);
    const listPerPage = 15;

    const fetchData = useCallback(async () => {
        const seq = ++fetchSeqRef.current;
        if (activeFetchRef.current) {
            activeFetchRef.current.abort();
        }
        const controller = new AbortController();
        activeFetchRef.current = controller;

        setIsLoading(true);
        try {
            setError('');
            const params = new URLSearchParams();
            params.set('branch_key', effectiveBranch);

            const res = await fetch(`/owner/delivery-monitoring/data?${params.toString()}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
            });

            if (!res.ok) throw new Error('Failed to load deliveries');
            const json = (await res.json()) as DeliveryMonitoringData;
            if (seq === fetchSeqRef.current && !controller.signal.aborted) {
                setData(json);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError(e?.message ? String(e.message) : 'Failed to load deliveries');
        } finally {
            if (seq === fetchSeqRef.current && !controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [effectiveBranch]);

    useEffect(() => {
        setSelectedDelivery(null);
        setData(null);
        setListPage(1);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setListPage(1);
    }, [effectiveBranch, viewMode, statusFilter]);

    useEffect(() => {
        return () => {
            if (activeFetchRef.current) {
                activeFetchRef.current.abort();
            }
        };
    }, []);

    const deliveriesFiltered = useMemo(() => {
        const list = data?.deliveries ?? [];
        if (statusFilter === 'all') return list;
        return list.filter((d) => d.status === statusFilter);
    }, [data?.deliveries, statusFilter]);

    const listPagination = useMemo(() => {
        const total = deliveriesFiltered.length;
        const lastPage = Math.max(1, Math.ceil(total / listPerPage));
        const page = Math.min(Math.max(1, listPage), lastPage);
        const startIndex = (page - 1) * listPerPage;
        const items = deliveriesFiltered.slice(startIndex, startIndex + listPerPage);
        return { total, lastPage, page, items };
    }, [deliveriesFiltered, listPage]);

    const events = useMemo(() => {
        return deliveriesFiltered.map((d) => {
            const start = toIsoDateTime(d.started_at);
            const startDate = new Date(start);
            const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
            const title = `${String(d.order_id)} - ${String(d.customer)}`;
            const color = statusColor(d.status);
            return {
                id: d.id,
                title,
                start,
                end: endDate.toISOString(),
                backgroundColor: color,
                borderColor: color,
                extendedProps: {
                    delivery: d,
                },
            };
        });
    }, [deliveriesFiltered]);

    const deliveriesByDay = useMemo(() => {
        const map = new Map<string, number>();
        for (const d of deliveriesFiltered) {
            const day = toIsoDateTime(d.started_at).slice(0, 10);
            map.set(day, (map.get(day) ?? 0) + 1);
        }
        return map;
    }, [deliveriesFiltered]);

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

    const toggleStatus = (s: DeliveryStatus) => {
        setStatusFilter(s);
    };

    const updateSelectedStatus = (next: DeliveryStatus) => {
        if (!selectedDelivery) return;
        setData((prev) => {
            if (!prev) return prev;
            const deliveries = prev.deliveries.map((d) => (d.id === selectedDelivery.id ? { ...d, status: next } : d));
            return { ...prev, deliveries };
        });
        setSelectedDelivery((prev) => (prev ? { ...prev, status: next } : prev));
    };

    const onEventClick = (arg: EventClickArg) => {
        const delivery = (arg.event.extendedProps as any)?.delivery as DeliveryRecord | undefined;
        if (delivery) setSelectedDelivery(delivery);
    };

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
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchData}
                                disabled={isLoading}
                            >
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <TabsList>
                                        <TabsTrigger value="list">List View</TabsTrigger>
                                        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={statusFilter}
                                            onValueChange={(v) => setStatusFilter(v as 'all' | DeliveryStatus)}
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="preparing">Preparing</SelectItem>
                                                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                                <SelectItem value="delivered">Delivered</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <TabsContent value="list">
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
                                                <TableHead className="text-right w-12">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {listPagination.items.map((d) => (
                                                <TableRow
                                                    key={d.id}
                                                    className="cursor-pointer"
                                                    tabIndex={0}
                                                    role="button"
                                                    onClick={() => setSelectedDelivery(d)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setSelectedDelivery(d);
                                                        }
                                                    }}
                                                >
                                                    <TableCell className="font-medium">{d.id}</TableCell>
                                                    <TableCell>{d.order_id}</TableCell>
                                                    <TableCell>{d.branch}</TableCell>
                                                    <TableCell>{statusBadge(d.status)}</TableCell>
                                                    <TableCell>{d.customer}</TableCell>
                                                    <TableCell className="max-w-[360px] truncate">{d.address}</TableCell>
                                                    <TableCell className="text-right">{d.items}</TableCell>
                                                    <TableCell className="text-right">{peso(d.total)}</TableCell>
                                                    <TableCell className="text-muted-foreground">{formatReadableDateTime(d.started_at)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-44">
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedDelivery(d);
                                                                    }}
                                                                >
                                                                    View Details
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {!isLoading && deliveriesFiltered.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                                                        No deliveries found.
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {isLoading && (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                                                        Loading…
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            {`Page ${listPagination.page} of ${listPagination.lastPage} • ${listPagination.total} total`}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                                                disabled={isLoading || listPagination.page <= 1}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setListPage((p) => p + 1)}
                                                disabled={isLoading || listPagination.page >= listPagination.lastPage}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="calendar">
                                    <div id="calendar" className="rounded-lg border overflow-hidden">
                                        <FullCalendar
                                            key={`${effectiveBranch}-${viewMode}`}
                                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                            headerToolbar={{
                                                left: 'prev,next today',
                                                center: 'title',
                                                right: 'dayGridMonth,timeGridWeek',
                                            }}
                                            initialView="dayGridMonth"
                                            height="auto"
                                            events={events as any}
                                            eventClick={onEventClick}
                                            eventDidMount={(info) => {
                                                const d = (info.event.extendedProps as any)?.delivery as DeliveryRecord | undefined;
                                                if (!d) return;
                                                info.el.setAttribute(
                                                    'title',
                                                    `${d.customer} • ${d.items} items • ${statusLabel(d.status)}\n${d.address}`
                                                );
                                            }}
                                            dayMaxEvents={4}
                                            moreLinkContent={(args) => `+${args.num} more`}
                                            eventDisplay="block"
                                            dayCellContent={(info) => {
                                                const dayKey = info.date.toISOString().slice(0, 10);
                                                const count = deliveriesByDay.get(dayKey) ?? 0;
                                                const badge =
                                                    count > 0
                                                        ? `<span style="margin-left:6px;display:inline-flex;align-items:center;border-radius:9999px;padding:1px 6px;font-size:10px;background:rgba(0,0,0,.06);">${count}</span>`
                                                        : '';
                                                return { html: `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span>${info.dayNumberText}</span>${badge}</div>` };
                                            }}
                                            dateClick={(info) => {
                                                const api = info.view.calendar;
                                                api.changeView('timeGridWeek', info.dateStr);
                                            }}
                                            eventContent={(arg) => {
                                                const start = arg.event.start;
                                                const time = start
                                                    ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : '';
                                                return (
                                                    <div className="truncate">
                                                        <span className="mr-2 text-[10px] opacity-80">{time}</span>
                                                        <span className="text-[11px] font-medium">{arg.event.title}</span>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!selectedDelivery} onOpenChange={(open) => { if (!open) setSelectedDelivery(null); }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-3">
                            <span>Delivery Details</span>
                            {selectedDelivery ? statusBadge(selectedDelivery.status) : null}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedDelivery ? `Delivery ${selectedDelivery.id} • ${selectedDelivery.branch}` : ''}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDelivery && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-4">
                                <div className="rounded-lg border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm text-muted-foreground">Order</div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <Hash className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-semibold">{selectedDelivery.order_id}</span>
                                            </div>
                                            <div className="mt-2 text-sm text-muted-foreground">Customer</div>
                                            <div className="mt-1 truncate font-medium">{selectedDelivery.customer}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium">Delivery Address</div>
                                            <div className="mt-1 text-sm text-muted-foreground break-words">{selectedDelivery.address}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border p-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Boxes className="h-4 w-4" />
                                            Items
                                        </div>
                                        <div className="mt-1 text-lg font-semibold">{selectedDelivery.items}</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <PhilippinePeso className="h-4 w-4" />
                                            Total
                                        </div>
                                        <div className="mt-1 text-lg font-semibold">{peso(selectedDelivery.total)}</div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            Scheduled/Started
                                        </div>
                                        <div className="mt-1 text-sm font-medium">
                                            {formatReadableDateTime(selectedDelivery.started_at)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border p-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Store className="h-4 w-4" />
                                            Branch
                                        </div>
                                        <div className="mt-1 text-sm font-medium">{selectedDelivery.branch}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs text-muted-foreground">Proof of Delivery</div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedDelivery.proof_photo_url ? 'Uploaded' : 'Awaiting upload'}
                                        </div>
                                    </div>
                                    <div className="mt-2 overflow-hidden rounded-md border bg-muted/20">
                                        {selectedDelivery.proof_photo_url ? (
                                            <img
                                                src={selectedDelivery.proof_photo_url}
                                                alt="Proof of delivery"
                                                className="w-full max-h-96 cursor-zoom-in object-cover"
                                                onClick={() => setProofViewerUrl(selectedDelivery.proof_photo_url || '')}
                                            />
                                        ) : (
                                            <div className="flex max-h-96 min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
                                                <div className="text-sm font-medium">No proof photo yet</div>
                                                <div className="text-xs text-muted-foreground">
                                                    This will appear once the delivery staff uploads the proof of delivery photo.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button variant="outline" onClick={() => setSelectedDelivery(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!proofViewerUrl} onOpenChange={(open) => { if (!open) setProofViewerUrl(''); }}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Proof of Delivery</DialogTitle>
                        <DialogDescription>Click outside to close.</DialogDescription>
                    </DialogHeader>

                    {proofViewerUrl && (
                        <div className="overflow-hidden rounded-md border bg-muted/20">
                            <img
                                src={proofViewerUrl}
                                alt="Proof of delivery full size"
                                className="max-h-[75vh] w-full object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
