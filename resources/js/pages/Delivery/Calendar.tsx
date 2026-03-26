import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Delivery Calendar', href: '/delivery/calendar' },
];

type DeliveryStatus = 'preparing' | 'out_for_delivery' | 'delivered';

type DeliveryRow = {
    id: number;
    ref: string;
    status: DeliveryStatus;
    scheduled_for: string | null;
    delivered_at: string | null;
    queue_order: number | null;
    customer_name: string;
    address: string;
    delivery_fee: number | string;
    delivery_total: number | string;
    items: number;
    proof_photo_path: string | null;
    sale: { ref: string; total: number | string; created_at: string } | null;
};

type CalendarData = {
    range: { start: string; end: string };
    scheduled: DeliveryRow[];
    unscheduled: DeliveryRow[];
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

function formatUserFriendlyDateTime(iso: string | null) {
    if (!iso) return 'No date set';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    let dateStr = '';
    if (dateOnly.getTime() === today.getTime()) {
        dateStr = 'Today';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
        dateStr = 'Tomorrow';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
        dateStr = 'Yesterday';
    } else {
        dateStr = d.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    
    const timeStr = d.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    return `${dateStr} at ${timeStr}`;
}

const toIsoDateTime = (raw: string) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.includes('T')) return s;
    return s.replace(' ', 'T');
};

function statusBadge(d: DeliveryRow) {
    const isDelayed = d.scheduled_for && new Date(d.scheduled_for) < new Date() && d.status !== 'delivered';

    let badge;
    if (d.status === 'preparing') {
        badge = (
            <Badge
                variant="secondary"
                className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800"
            >
                Preparing
            </Badge>
        );
    } else if (d.status === 'out_for_delivery') {
        badge = (
            <Badge
                variant="secondary"
                className="bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-800"
            >
                Out
            </Badge>
        );
    } else {
        badge = (
            <Badge
                variant="secondary"
                className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-200 dark:border-green-800"
            >
                Delivered
            </Badge>
        );
    }

    if (isDelayed) {
        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                    variant="secondary"
                    className="bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-800"
                >
                    Delayed
                </Badge>
                {badge}
            </div>
        );
    }

    return badge;
}

const statusColor = (s: DeliveryStatus) => {
    if (s === 'preparing') return '#f59e0b';
    if (s === 'out_for_delivery') return '#3b82f6';
    return '#22c55e';
};

const eventTitle = (d: Pick<DeliveryRow, 'ref' | 'customer_name'>) => {
    const ref = String(d.ref || '').trim();
    const customer = String(d.customer_name || '').trim();
    const customerShort = customer.length > 22 ? `${customer.slice(0, 22)}…` : customer;
    if (!customerShort) return ref;
    return `${ref}\n${customerShort}`;
};

export default function Calendar() {
    usePage();

    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [calendarHeight, setCalendarHeight] = useState(500);

    const [data, setData] = useState<CalendarData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
        const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    
    const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsDelivery, setDetailsDelivery] = useState<DeliveryRow | null>(null);

    const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);
    const [pendingReschedule, setPendingReschedule] = useState<{
        delivery: DeliveryRow;
        newDate: Date;
        revert: () => void;
    } | null>(null);

    const [proofPhoto, setProofPhoto] = useState<File | null>(null);
    const [proofPhotoPreview, setProofPhotoPreview] = useState<string>('');

    const [proofInputRef] = [useRef<HTMLInputElement | null>(null)];

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const abortRef = useRef<AbortController | null>(null);
    const seqRef = useRef(0);
    const rangeRef = useRef<{ start: string; end: string } | null>(null);

    const fetchData = useCallback(async (range?: { start: string; end: string }) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const seq = ++seqRef.current;

        setIsLoading(true);
        try {
            setError('');
            const params = new URLSearchParams();
            if (range?.start) params.set('start', range.start);
            if (range?.end) params.set('end', range.end);

            const res = await fetch(`/delivery/calendar/data?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to load calendar');
            if (seq !== seqRef.current) return;
            setData(json as CalendarData);
            setLastUpdatedAt(new Date());
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError(e?.message ? String(e.message) : 'Failed to load calendar');
        } finally {
            if (seq === seqRef.current) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        return () => abortRef.current?.abort();
    }, [fetchData]);

    useEffect(() => {
        if (!data) return;
        const params = new URLSearchParams(window.location.search);
        const rawDeliveryId = params.get('delivery_id');
        if (!rawDeliveryId) return;

        const targetId = Number(rawDeliveryId);
        if (!Number.isFinite(targetId)) return;

        const allDeliveries = [...data.scheduled, ...data.unscheduled];
        const match = allDeliveries.find((d) => d.id === targetId);

        if (match) {
            setDetailsDelivery(match);
            setIsDetailsOpen(true);
            setProofPhoto(null);
            if (match.scheduled_for) {
                setSelectedDay(match.scheduled_for.slice(0, 10));
            }

            params.delete('delivery_id');
            const nextQuery = params.toString();
            const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
            window.history.replaceState(null, '', nextUrl);
        }
    }, [data]);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 640px)');
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    // Robust measurement of available height for no-scroll display
    useLayoutEffect(() => {
        const compute = () => {
            if (containerRef.current) {
                // We want the calendar to fill the card height.
                // The card itself is inside a flex-1 min-h-0 container.
                // Let's measure the CardContent's available space more directly.
                const rect = containerRef.current.getBoundingClientRect();
                // Subscriptions often need a bit of buffer
                setCalendarHeight(Math.max(300, Math.floor(rect.height) - 4));
            }
        };
        const timer = setTimeout(compute, 100); // Wait for layout
        window.addEventListener('resize', compute);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', compute);
        };
    }, []);

    const onDatesSet = useCallback(
        (arg: DatesSetArg) => {
            rangeRef.current = { start: arg.startStr, end: arg.endStr };
            fetchData({ start: arg.startStr, end: arg.endStr }).catch(() => null);
        },
        [fetchData],
    );

    const eventContent = useCallback(
        (arg: any) => {
            if (isMobile && arg?.view?.type === 'dayGridMonth') {
                const color = String(arg?.event?.backgroundColor || '#16a34a');
                return (
                    <div className="w-full px-1">
                        <div className="h-1 w-full rounded" style={{ backgroundColor: color }} />
                    </div>
                );
            }

            const color = String(arg?.event?.backgroundColor || '#16a34a');
            const rawTitle = String(arg?.event?.title ?? '');
            const ref = rawTitle.split('\n')[0] || rawTitle;

            return (
                <div className="truncate text-[11px] leading-4">
                    <span
                        className="inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: color, color: '#fff' }}
                        title={rawTitle}
                    >
                        {ref}
                    </span>
                </div>
            );
        },
        [isMobile],
    );

    useEffect(() => {
        setError('');
        toast.dismiss();
        setSelectedIds([]);
    }, [selectedDay]);

    useEffect(() => {
        if (!proofPhoto) {
            if (proofPhotoPreview) URL.revokeObjectURL(proofPhotoPreview);
            setProofPhotoPreview('');
            return;
        }

        const next = URL.createObjectURL(proofPhoto);
        setProofPhotoPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return next;
        });

        return () => {
            URL.revokeObjectURL(next);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proofPhoto]);

    const events = useMemo(() => {
        const scheduled = data?.scheduled ?? [];
        return scheduled
            .filter((d) => !!d.scheduled_for)
            .map((d) => {
                const start = toIsoDateTime(String(d.scheduled_for));
                const title = eventTitle(d);
                const color = statusColor(d.status);
                return {
                    id: String(d.id),
                    title,
                    start,
                    allDay: false,
                    backgroundColor: color,
                    borderColor: color,
                    editable: d.status !== 'delivered',
                    extendedProps: { delivery: d },
                };
            });
    }, [data?.scheduled]);

    const queueForSelectedDay = useMemo(() => {
        const scheduled = data?.scheduled ?? [];
        const day = selectedDay;
        const list = scheduled.filter((d) => (d.scheduled_for ?? '').slice(0, 10) === day && d.status !== 'delivered');
        return list.sort((a, b) => {
            return String(a.scheduled_for ?? '').localeCompare(String(b.scheduled_for ?? ''));
        });
    }, [data?.scheduled, selectedDay]);

    const onDateClick = useCallback((arg: DateClickArg) => {
        setSelectedDay(arg.dateStr.slice(0, 10));
    }, []);

    const bulkSetOutForDelivery = useCallback(async () => {
        if (selectedIds.length === 0) return;
        setError('');
        toast.dismiss();
        setIsLoading(true);
        try {
            const res = await fetch('/delivery/calendar/bulk-status', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ delivery_ids: selectedIds, status: 'out_for_delivery' }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                console.error('Bulk status error:', JSON.stringify(json, null, 2));
                console.error('Status:', res.status);
                console.error('Sent payload:', { delivery_ids: selectedIds, status: 'out_for_delivery' });
                throw new Error(json?.message || json?.errors?.delivery_ids?.[0] || json?.errors?.status?.[0] || `Failed to update status (${res.status})`);
            }

            toast.success(`${selectedIds.length} order${selectedIds.length > 1 ? 's' : ''} set as Out for Delivery.`);
            setSelectedIds([]);
            await fetchData(rangeRef.current ?? undefined);
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Failed to update status');
        } finally {
            setIsLoading(false);
        }
    }, [fetchData, selectedIds]);

    const onEventDrop = useCallback(
        async (arg: EventDropArg) => {
            const delivery = (arg.event.extendedProps as any)?.delivery as DeliveryRow | undefined;
            if (!delivery) return;
            const next = arg.event.start;
            if (!next) return;

            // Show confirmation dialog instead of immediately rescheduling
            setPendingReschedule({
                delivery,
                newDate: next,
                revert: arg.revert,
            });
            setIsRescheduleConfirmOpen(true);
        },
        [],
    );

    const confirmReschedule = useCallback(async () => {
        if (!pendingReschedule) return;

        try {
            const res = await fetch('/delivery/calendar/schedule', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    delivery_id: pendingReschedule.delivery.id,
                    scheduled_for: pendingReschedule.newDate.toISOString(),
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to reschedule');

            toast.success('Rescheduled successfully', {
                style: {
                    background: '#ea580c',
                    color: '#ffffff',
                    border: '1px solid #c2410c',
                },
            });
            await fetchData();
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Failed to reschedule');
            pendingReschedule.revert();
        } finally {
            setIsRescheduleConfirmOpen(false);
            setPendingReschedule(null);
        }
    }, [pendingReschedule, fetchData]);

    const cancelReschedule = useCallback(() => {
        if (pendingReschedule) {
            pendingReschedule.revert();
        }
        setIsRescheduleConfirmOpen(false);
        setPendingReschedule(null);
    }, [pendingReschedule]);

    const onEventClick = useCallback((arg: EventClickArg) => {
        const delivery = (arg.event.extendedProps as any)?.delivery as DeliveryRow | undefined;
        if (!delivery) return;
        setDetailsDelivery(delivery);
        setIsDetailsOpen(true);
        setProofPhoto(null);
        if (delivery.scheduled_for) {
            setSelectedDay(delivery.scheduled_for.slice(0, 10));
        }
    }, []);

    const setDeliveryStatus = useCallback(
        async (deliveryId: number, status: DeliveryStatus) => {
            if (status === 'delivered') {
                if (!proofPhoto) {
                    throw new Error('Proof photo is required to mark as delivered');
                }

                const form = new FormData();
                form.append('delivery_id', String(deliveryId));
                form.append('status', status);
                form.append('proof_photo', proofPhoto);

                const res = await fetch('/delivery/calendar/status', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                    body: form,
                });

                const json = await res.json().catch(() => null);
                if (!res.ok) throw new Error(json?.message || 'Failed to update status');

                await fetchData();
                setIsDetailsOpen(false);
                setDetailsDelivery(null);
                setProofPhoto(null);
                return;
            }

            const res = await fetch('/delivery/calendar/status', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ delivery_id: deliveryId, status }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to update status');

            await fetchData();
            setIsDetailsOpen(false);
            setDetailsDelivery(null);
            setProofPhoto(null);
        },
        [fetchData, proofPhoto],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Delivery Calendar" />
            <div className="flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto p-1.5 bg-muted/5 border-t">

                {/* ── Compact Header Bar ── */}
                <div className="flex shrink-0 items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold tracking-tight">Delivery Calendar</h1>
                        {lastUpdatedAt && (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline-block bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Live • Updated {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 text-xs font-semibold"
                            onClick={() => fetchData(rangeRef.current ?? undefined)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading…' : 'Refresh'}
                        </Button>
                    </div>
                </div>

                {/* ── Alerts ── */}
                {error && (
                    <div className="shrink-0 animate-in slide-in-from-top-1 px-1">
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="font-semibold">{error}</span>
                                </div>
                                <button onClick={() => setError('')} className="ml-2 opacity-50 hover:opacity-100 font-bold">×</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Main Layout ── */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">

                    {/* Calendar (fills 8/12 on LG) */}
                    <div className="order-2 flex min-h-0 flex-col lg:order-1 lg:col-span-8">
                        <Card className="flex min-h-0 flex-1 flex-col shadow-sm border-none bg-background">

                            <CardContent ref={containerRef} className="min-h-0 flex-1 overflow-visible p-0">
                                <div className="h-full">
                                    <FullCalendar
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                        initialView="dayGridMonth"
                                        headerToolbar={
                                            isMobile
                                                ? { left: 'prev', center: 'title', right: 'next' }
                                                : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
                                        }
                                        height={calendarHeight}
                                        events={events as any}
                                        datesSet={onDatesSet}
                                        displayEventTime={false}
                                        dateClick={onDateClick}
                                        eventClick={onEventClick}
                                        editable={!isLoading && !isMobile}
                                        eventDrop={onEventDrop}
                                        eventResizableFromStart={false}
                                        nowIndicator
                                        dayMaxEvents={isMobile ? 1 : true}
                                        moreLinkClick="popover"
                                        fixedWeekCount={false}
                                        dayHeaderFormat={isMobile ? { weekday: 'narrow' } : { weekday: 'short' }}
                                        titleFormat={isMobile ? { month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' }}
                                        eventContent={eventContent}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Queue / Pending Panel */}
                    <div className="order-1 flex min-h-0 flex-col lg:order-2 lg:col-span-4">
                        <Card className="flex min-h-0 flex-1 flex-col shadow-sm border-none bg-background">
                            {/* Panel Tab Header */}
                            <CardHeader className="shrink-0 space-y-2 bg-orange-100/30 dark:bg-orange-900/20 pb-2 p-3 border-b border-orange-200/50 dark:border-orange-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex bg-orange-200/50 dark:bg-orange-800/30 p-1 rounded-lg">
                                        <button
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all bg-orange-600 text-white shadow-sm`}
                                        >
                                            Day Queue
                                        </button>
                                    </div>
                                    <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded accent-orange-600"
                                            checked={selectedIds.length === queueForSelectedDay.length && queueForSelectedDay.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(queueForSelectedDay.map((d) => d.id));
                                                } else {
                                                    setSelectedIds([]);
                                                }
                                            }}
                                        />
                                        All
                                    </label>
                                </div>

                                <div className="space-y-1">
                                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        Deliveries for {selectedDay || 'Today'}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] italic">
                                        Items scheduled for this date.
                                    </CardDescription>
                                </div>

                                {selectedIds.length > 0 && (
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={bulkSetOutForDelivery}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-2.5 text-xs font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                                            {selectedIds.length}
                                        </span>
                                        {isLoading ? 'Updating…' : 'Set as Out for Delivery'}
                                    </button>
                                )}
                            </CardHeader>

                            {/* Scrollable list content */}
                            <CardContent className="min-h-0 flex-1 overflow-y-auto bg-orange-50/20 dark:bg-orange-950/10 p-4 pt-2">
                                {(() => {
                                    const list = queueForSelectedDay;
                                    if (list.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                                                <div className="mb-2 text-2xl">📦</div>
                                                <div className="text-xs font-bold uppercase tracking-wide">No queue items</div>
                                                <div className="text-[10px]">Everything looks clear!</div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="space-y-3 pt-2">
                                            {list.map((d, idx) => {
                                                const isChecked = selectedIds.includes(d.id);
                                                return (
                                                    <div
                                                        key={d.id}
                                                        className={`group relative overflow-hidden rounded-xl border bg-background p-4 shadow-sm transition-all hover:shadow-md ${
                                                            isChecked ? 'border-orange-500 ring-1 ring-orange-500/20' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-5 w-5 cursor-pointer disabled:cursor-not-allowed rounded-full accent-orange-600"
                                                                    disabled={d.status === 'delivered'}
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedIds((prev) => [...prev, d.id]);
                                                                        } else {
                                                                            setSelectedIds((prev) => prev.filter((id) => id !== d.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-[10px] font-bold text-muted-foreground/50">#{idx + 1}</span>
                                                            </div>
                                                            <div
                                                                className="min-w-0 flex-1 cursor-pointer"
                                                                onClick={() => {
                                                                    setDetailsDelivery(d);
                                                                    setIsDetailsOpen(true);
                                                                }}
                                                            >
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <div className="text-sm font-bold tracking-tight text-foreground">{d.ref}</div>
                                                                    {statusBadge(d)}
                                                                </div>
                                                                <div className="line-clamp-1 text-xs font-medium text-foreground/80">{d.customer_name}</div>
                                                                <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{d.address}</div>

                                                                <div className="mt-2 flex items-center justify-between border-t border-muted pt-2 text-[10px]">
                                                                    <div className="font-bold text-orange-600">{peso(d.delivery_total)}</div>
                                                                    <div className="font-medium text-muted-foreground italic">
                                                                        {formatUserFriendlyDateTime(d.scheduled_for)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>


            <Dialog
                open={isDetailsOpen}
                onOpenChange={(open) => {
                    setIsDetailsOpen(open);
                    if (!open) {
                        setDetailsDelivery(null);
                        setProofPhoto(null);
                    }
                }}
            >
                <DialogContent className="max-h-[95vh] overflow-hidden p-0 sm:max-w-3xl">
                    <DialogHeader className="border-b bg-orange-600/10 p-6 text-left">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl font-bold">Delivery Details</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-orange-600">
                                    Ref: {detailsDelivery?.ref}
                                </DialogDescription>
                            </div>
                            {detailsDelivery && (
                                <div className="hidden sm:block">
                                    {statusBadge(detailsDelivery)}
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {detailsDelivery && (
                        <div className="overflow-y-auto p-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-6">
                                    {/* Customer Info Card */}
                                    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                                        <div className="flex items-center justify-between sm:hidden">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
                                            {statusBadge(detailsDelivery)}
                                        </div>
                                        
                                        <div>
                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Name</div>
                                            <div className="text-base font-semibold">{detailsDelivery.customer_name}</div>
                                        </div>
                                        
                                        <div>
                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shipping Address</div>
                                            <div className="text-sm leading-relaxed text-muted-foreground">{detailsDelivery.address}</div>
                                        </div>
                                        
                                        <div>
                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled For</div>
                                            <div className="text-sm font-medium">
                                                {formatUserFriendlyDateTime(detailsDelivery.scheduled_for)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                            <div>
                                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items</div>
                                                <div className="text-lg font-bold">{detailsDelivery.items} units</div>
                                            </div>
                                            <div>
                                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Value</div>
                                                <div className="text-lg font-bold text-orange-600">{peso(detailsDelivery.delivery_total)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Proof Card */}
                                <div className="flex flex-col space-y-4 rounded-xl border bg-muted/30 p-5 shadow-inner">
                                    <div>
                                        <div className="text-sm font-bold">Proof of Delivery</div>
                                        {detailsDelivery.status === 'delivered' ? (
                                            <div className="mt-1 text-xs text-green-600 font-medium">
                                                Captured on {formatUserFriendlyDateTime(detailsDelivery.delivered_at)}
                                            </div>
                                        ) : (
                                            <div className="mt-1 text-xs text-muted-foreground">Marking as "Delivered" requires a photo.</div>
                                        )}
                                    </div>

                                    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background/50 transition-colors hover:border-muted-foreground/50">
                                        {proofPhotoPreview || detailsDelivery.proof_photo_path ? (
                                            <img
                                                src={proofPhotoPreview || `/storage/${detailsDelivery.proof_photo_path}`}
                                                alt="Proof of delivery"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <div className="rounded-full bg-muted p-3">
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span className="text-xs">No image captured</span>
                                            </div>
                                        )}
                                    </div>

                                    {detailsDelivery.status !== 'delivered' && (
                                        <div className="space-y-2">
                                            <input
                                                ref={proofInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] ?? null;
                                                    setProofPhoto(file);
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                className="w-full text-xs font-bold"
                                                onClick={() => proofInputRef.current?.click()}
                                            >
                                                {proofPhoto ? 'Change Photo' : 'Capture Proof Photo'}
                                            </Button>
                                            {proofPhoto && (
                                                <button
                                                    type="button"
                                                    onClick={() => setProofPhoto(null)}
                                                    className="w-full text-[10px] font-bold uppercase tracking-wider text-red-500 hover:underline"
                                                >
                                                    Discard Photo
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="sticky bottom-0 flex flex-col-reverse justify-between gap-3 border-t bg-gray-50/90 p-6 backdrop-blur-sm sm:flex-row dark:bg-gray-900/50">
                        <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="sm:flex-none">
                            Close
                        </Button>
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                            {detailsDelivery && (() => {
                                const now = new Date();
                                const isDelayed = detailsDelivery.scheduled_for && new Date(detailsDelivery.scheduled_for) < now && detailsDelivery.status !== 'delivered';
                                
                                return (
                                    <>
                                        {detailsDelivery.status !== 'delivered' && (
                                            <>
                                                {isDelayed && (
                                                    <Button
                                                        variant="outline"
                                                        className="border-red-200 text-red-600 hover:bg-red-50"
                                                        onClick={async () => {
                                                            const tmr = new Date();
                                                            tmr.setDate(tmr.getDate() + 1);
                                                            tmr.setHours(9, 0, 0, 0);
                                                            try {
                                                                const res = await fetch('/delivery/calendar/schedule', {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Accept': 'application/json',
                                                                        'Content-Type': 'application/json',
                                                                        'X-CSRF-TOKEN': csrfToken(),
                                                                        'X-Requested-With': 'XMLHttpRequest',
                                                                    },
                                                                    body: JSON.stringify({
                                                                        delivery_id: detailsDelivery.id,
                                                                        scheduled_for: tmr.toISOString(),
                                                                    }),
                                                                });
                                                                if (!res.ok) throw new Error();
                                                                setIsDetailsOpen(false);
                                                                fetchData();
                                                            } catch {
                                                                setError('Failed to reschedule');
                                                            }
                                                        }}
                                                    >
                                                        Reschedule (Tmrw)
                                                    </Button>
                                                )}
                                                <Button variant="outline" onClick={() => setDeliveryStatus(detailsDelivery.id, 'preparing')}>
                                                    Preparing
                                                </Button>
                                                <Button variant="outline" onClick={() => setDeliveryStatus(detailsDelivery.id, 'out_for_delivery')}>
                                                    Out for Delivery
                                                </Button>
                                                <Button
                                                    className="bg-orange-600 hover:bg-orange-700 active:scale-95 transition-transform"
                                                    disabled={!proofPhoto}
                                                    onClick={() => {
                                                        setError('');
                                                        toast.dismiss();
                                                        setDeliveryStatus(detailsDelivery.id, 'delivered')
                                                            .then(() => toast.success('Delivered.'))
                                                            .catch((e: any) => {
                                                                setError(e?.message ? String(e.message) : 'Failed to mark delivered');
                                                            });
                                                    }}
                                                >
                                                    Complete Delivery
                                                </Button>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reschedule Confirmation Dialog */}
            <Dialog open={isRescheduleConfirmOpen} onOpenChange={setIsRescheduleConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Confirm Reschedule</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Are you sure you want to reschedule this delivery?
                        </DialogDescription>
                    </DialogHeader>
                    
                    {pendingReschedule && (
                        <div className="py-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Delivery Ref:</span>
                                    <span>{pendingReschedule.delivery.ref}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Customer:</span>
                                    <span>{pendingReschedule.delivery.customer_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">New Date:</span>
                                    <span className="text-orange-600 font-medium">
                                        {formatUserFriendlyDateTime(pendingReschedule.newDate.toISOString())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={cancelReschedule}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={confirmReschedule}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Confirm Reschedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
