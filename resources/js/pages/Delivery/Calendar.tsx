import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    queue_order: number | null;
    customer_name: string;
    address: string;
    delivery_fee: number | string;
    delivery_total: number | string;
    items: number;
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

    const [data, setData] = useState<CalendarData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsDelivery, setDetailsDelivery] = useState<DeliveryRow | null>(null);

    const [proofPhoto, setProofPhoto] = useState<File | null>(null);
    const [proofPhotoPreview, setProofPhotoPreview] = useState<string>('');

    const proofInputRef = useRef<HTMLInputElement | null>(null);

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
        setSuccess('');
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
                    extendedProps: { delivery: d },
                };
            });
    }, [data?.scheduled]);

    const queueForSelectedDay = useMemo(() => {
        const scheduled = data?.scheduled ?? [];
        const day = selectedDay;
        const list = scheduled.filter((d) => (d.scheduled_for ?? '').slice(0, 10) === day);
        return list.sort((a, b) => {
            return String(a.scheduled_for ?? '').localeCompare(String(b.scheduled_for ?? ''));
        });
    }, [data?.scheduled, selectedDay]);

    const onDateClick = useCallback((arg: DateClickArg) => {
        setSelectedDay(arg.dateStr.slice(0, 10));
    }, []);

    const onEventClick = useCallback((arg: EventClickArg) => {
        const delivery = (arg.event.extendedProps as any)?.delivery as DeliveryRow | undefined;
        if (!delivery) return;
        setDetailsDelivery(delivery);
        setIsDetailsOpen(true);
        setProofPhoto(null);
        if (delivery.scheduled_for) setSelectedDay(delivery.scheduled_for.slice(0, 10));
    }, []);

    const onEventDrop = useCallback(
        async (arg: EventDropArg) => {
            const delivery = (arg.event.extendedProps as any)?.delivery as DeliveryRow | undefined;
            if (!delivery) return;
            const next = arg.event.start;
            if (!next) return;

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
                        delivery_id: delivery.id,
                        scheduled_for: next.toISOString(),
                    }),
                });

                const json = await res.json().catch(() => null);
                if (!res.ok) throw new Error(json?.message || 'Failed to reschedule');

                setSuccess('Rescheduled.');
                await fetchData();
            } catch (e: any) {
                setError(e?.message ? String(e.message) : 'Failed to reschedule');
                arg.revert();
            }
        },
        [fetchData],
    );

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
                body: JSON.stringify({
                    delivery_id: deliveryId,
                    status,
                }),
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
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">Delivery Calendar</h1>
                        <p className="text-muted-foreground">View your scheduled deliveries and manage your daily queue.</p>
                        <p className="text-xs text-muted-foreground">
                            {lastUpdatedAt ? `Last updated: ${lastUpdatedAt.toLocaleString()}` : (isLoading ? 'Loading…' : 'Not loaded yet')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => fetchData(rangeRef.current ?? undefined)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading…' : 'Refresh'}
                    </Button>
                </div>

                {(error || success) && (
                    <div className="space-y-2">
                        {error && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>{error}</div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchData(rangeRef.current ?? undefined).catch(() => null)}
                                        disabled={isLoading}
                                    >
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        )}
                        {success && (
                            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
                                {success}
                            </div>
                        )}
                    </div>
                )}

                <div className={isMobile ? 'space-y-6' : 'grid gap-6 lg:grid-cols-12'}>
                    <div className={isMobile ? '' : 'space-y-6 lg:col-span-8'}>
                        <Card>
                            <CardHeader className="space-y-1">
                                <CardTitle>Calendar</CardTitle>
                                <CardDescription>Drag and drop to reschedule.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-hidden rounded-lg border">
                                    <div className={isMobile ? 'p-0' : 'p-2'}>
                                        <FullCalendar
                                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                            initialView="dayGridMonth"
                                            headerToolbar={
                                                isMobile
                                                    ? { left: 'prev', center: 'title', right: 'next' }
                                                    : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }
                                            }
                                            height="auto"
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
                                            fixedWeekCount={!isMobile}
                                            dayHeaderFormat={isMobile ? { weekday: 'narrow' } : undefined}
                                            titleFormat={isMobile ? { month: 'short', year: 'numeric' } : undefined}
                                            eventContent={eventContent}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className={isMobile ? '' : 'space-y-6 lg:col-span-4'}>
                        <Card>
                            <CardHeader className="space-y-2">
                                <div>
                                    <CardTitle>Selected Day</CardTitle>
                                    <CardDescription>Pick a date on the calendar to view the queue.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm text-muted-foreground">{selectedDay}</div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Queue</div>
                                    <div className="text-xs text-muted-foreground">
                                        What to deliver first.
                                    </div>

                                    {queueForSelectedDay.length === 0 ? (
                                        <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                                            No scheduled deliveries for this day.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {queueForSelectedDay.map((d, idx) => (
                                                <div
                                                    key={d.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    className="rounded-lg border bg-background p-3 cursor-pointer transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    onClick={() => {
                                                        setDetailsDelivery(d);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setDetailsDelivery(d);
                                                            setIsDetailsOpen(true);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                                                            {idx + 1}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="font-medium">{d.ref}</div>
                                                                {statusBadge(d)}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                                {d.customer_name} • {d.address}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {d.scheduled_for ? formatDateTime(d.scheduled_for) : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Delivery Details</DialogTitle>
                        <DialogDescription>{detailsDelivery ? detailsDelivery.ref : ''}</DialogDescription>
                    </DialogHeader>

                    {detailsDelivery && (
                        <div className="grid gap-6 md:grid-cols-2 text-sm mt-2">
                            <div className="space-y-5 rounded-md border p-5 bg-card shadow-sm h-full relative">
                                <div>
                                    <div className="font-semibold text-muted-foreground text-xs uppercase mb-1">Customer Name</div> 
                                    <div className="text-base">{detailsDelivery.customer_name}</div>
                                </div>
                                <div className="absolute top-5 right-5">{statusBadge(detailsDelivery)}</div>
                                <div>
                                    <div className="font-semibold text-muted-foreground text-xs uppercase mb-1">Address</div> 
                                    <div>{detailsDelivery.address}</div>
                                </div>
                                <div>
                                    <div className="font-semibold text-muted-foreground text-xs uppercase mb-1">Scheduled For</div> 
                                    <div className="text-sm font-medium">{detailsDelivery.scheduled_for ? formatDateTime(detailsDelivery.scheduled_for) : '—'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-1 border-t">
                                    <div>
                                        <div className="font-semibold text-muted-foreground text-xs uppercase mb-1">Items Count</div> 
                                        <div className="text-base">{detailsDelivery.items}</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-muted-foreground text-xs uppercase mb-1">Total Amount</div> 
                                        <div className="text-base font-semibold">{peso(detailsDelivery.delivery_total)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-md border p-5 bg-muted/10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="text-sm font-semibold mb-1">Proof of Delivery Photo</div>
                                    <div className="text-xs text-muted-foreground mb-4">A photo is required before marking this delivery as completed.</div>

                                    <div className="rounded-md border bg-muted/40 p-1 relative h-44 mb-4">
                                        {proofPhotoPreview ? (
                                            <img
                                                src={proofPhotoPreview}
                                                alt="Proof of delivery preview"
                                                className="h-full w-full rounded object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-2 h-full items-center justify-center text-xs text-muted-foreground">
                                                <span>Image Preview</span>
                                                <span className="text-[10px] opacity-70">Capture or select an image</span>
                                            </div>
                                        )}
                                    </div>

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
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => proofInputRef.current?.click()}
                                            >
                                                Take / Upload Photo
                                            </Button>
                                            {proofPhoto && (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() => setProofPhoto(null)}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                        {proofPhoto && (
                                            <div className="text-xs text-center mt-1 text-muted-foreground truncate px-2">Selected: {proofPhoto.name}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="justify-between sm:justify-between">
                        <div className="flex gap-2">
                            {detailsDelivery ? (() => {
                                const now = new Date();
                                const isDelayed = detailsDelivery.scheduled_for && new Date(detailsDelivery.scheduled_for) < now && detailsDelivery.status !== 'delivered';
                                
                                return (
                                <>
                                    {isDelayed && (
                                        <Button
                                            variant="outline"
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={async () => {
                                                const tmr = new Date();
                                                tmr.setDate(tmr.getDate() + 1);
                                                tmr.setHours(9, 0, 0, 0);
                                                try {
                                                    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                                                    const res = await fetch('/delivery/calendar/schedule', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Accept': 'application/json',
                                                            'Content-Type': 'application/json',
                                                            'X-CSRF-TOKEN': csrf,
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
                                    <Button variant="outline" onClick={() => setDeliveryStatus(detailsDelivery.id, 'preparing').catch(() => null)}>
                                        Preparing
                                    </Button>
                                    <Button variant="outline" onClick={() => setDeliveryStatus(detailsDelivery.id, 'out_for_delivery').catch(() => null)}>
                                        Out
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setError('');
                                            setSuccess('');
                                            setDeliveryStatus(detailsDelivery.id, 'delivered')
                                                .then(() => setSuccess('Delivered.'))
                                                .catch((e: any) => {
                                                    setError(e?.message ? String(e.message) : 'Failed to mark delivered');
                                                });
                                        }}
                                        disabled={!proofPhoto}
                                    >
                                        Delivered
                                    </Button>
                                </>
                                );
                            })() : null}
                        </div>
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
