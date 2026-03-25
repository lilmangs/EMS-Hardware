import { useEffect, useMemo, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Bell, ChevronDown } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem } from '@/types';
import type { User } from '@/types/auth';

type InventoryItem = {
    product_id: number;
    name: string | null;
    sellable_qty: number;
    reorder_level: number;
};

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItem[] }) {
    const { auth } = usePage().props as { auth: { user: User } };
    const userRole = auth?.user?.role;
    const branchKey = auth?.user?.branch_key;
    const cleanup = useMobileNavigation();
    const getInitials = useInitials();
    const now = new Date();
    const formattedDate = now.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    const formattedRole = (auth?.user?.role ?? 'user')
        .toString()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const formattedBranch =
        branchKey === 'lagonglong'
            ? 'Lagonglong Branch'
            : branchKey === 'balingasag'
                ? 'Balingasag Branch'
                : '';

    const roleLine = formattedRole;

    const [inventoryAlerts, setInventoryAlerts] = useState<{ low: number; out: number } | null>(null);
    const [inventoryAlertItems, setInventoryAlertItems] = useState<InventoryItem[]>([]);

    const [deliveryAlerts, setDeliveryAlerts] = useState<{ new: number; delayed: number } | null>(null);
    const [deliveryAlertItems, setDeliveryAlertItems] = useState<{ new: any[]; delayed: any[] }>({ new: [], delayed: [] });

    useEffect(() => {
        if (userRole !== 'staff') return;

        let cancelled = false;
        const controller = new AbortController();

        (async () => {
            try {
                const params = new URLSearchParams();
                if (typeof branchKey === 'string' && branchKey.trim() !== '') {
                    params.set('branch_key', branchKey);
                }

                const res = await fetch(`/inventory/items?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });

                if (!res.ok) return;
                const data = (await res.json()) as { items?: InventoryItem[] };
                const items = Array.isArray(data.items) ? data.items : [];

                const outItems = items.filter((it) => (Number(it.sellable_qty) || 0) <= 0);
                const lowItems = items.filter((it) => {
                    const sellable = Number(it.sellable_qty) || 0;
                    const reorder = Number(it.reorder_level) || 0;
                    return reorder > 0 && sellable > 0 && sellable <= reorder;
                });
                const out = outItems.length;
                const low = lowItems.length;

                if (!cancelled) {
                    setInventoryAlerts({ low, out });
                    setInventoryAlertItems(items);
                }
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [branchKey, userRole]);

    useEffect(() => {
        if (userRole !== 'delivery') return;

        let cancelled = false;
        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch('/delivery/calendar/data', {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });

                if (!res.ok) return;
                const data = await res.json();
                
                const now = new Date();
                const delayedItems = (data.scheduled || []).filter((d: any) => {
                    if (!d.scheduled_for) return false;
                    const scheduledFor = new Date(d.scheduled_for);
                    return scheduledFor < now && d.status !== 'delivered';
                });
                
                const newItems = data.unscheduled || [];

                if (!cancelled) {
                    setDeliveryAlerts({ new: newItems.length, delayed: delayedItems.length });
                    setDeliveryAlertItems({ new: newItems, delayed: delayedItems });
                }
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [userRole]);

    const outOfStockItems = useMemo(
        () => inventoryAlertItems.filter((it) => (Number(it.sellable_qty) || 0) <= 0),
        [inventoryAlertItems],
    );

    const lowStockItems = useMemo(
        () =>
            inventoryAlertItems.filter((it) => {
                const sellable = Number(it.sellable_qty) || 0;
                const reorder = Number(it.reorder_level) || 0;
                return reorder > 0 && sellable > 0 && sellable <= reorder;
            }),
        [inventoryAlertItems],
    );

    const notificationCount = userRole === 'delivery' 
        ? ((Number(deliveryAlerts?.new) || 0) + (Number(deliveryAlerts?.delayed) || 0))
        : (Number(inventoryAlerts?.low) || 0);

    const openInventoryAlerts = () => {
        const url = new URL('/inventory', window.location.origin);
        if (typeof branchKey === 'string' && branchKey.trim() !== '') {
            url.searchParams.set('branch_key', branchKey);
        }
        router.visit(url.toString(), { preserveScroll: true });
    };

    const openDeliveryCalendar = (deliveryId?: number) => {
        const url = new URL('/delivery/calendar', window.location.origin);
        if (deliveryId) {
            url.searchParams.set('delivery_id', String(deliveryId));
        }
        router.visit(url.toString(), { preserveScroll: true });
    };

    const openInventoryRestock = (productId: number) => {
        const url = new URL('/inventory', window.location.origin);
        url.searchParams.set('restock_product_id', String(productId));
        if (typeof branchKey === 'string' && branchKey.trim() !== '') {
            url.searchParams.set('branch_key', branchKey);
        }
        router.visit(url.toString(), { preserveScroll: true });
    };



    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex shrink-0 flex-col border-b border-sidebar-border/50 bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-auto">
            <div className="flex h-16 items-center gap-2 px-6 md:px-4">
                {userRole !== 'delivery' && (
                    <div className="flex items-center md:hidden">
                        <SidebarTrigger />
                    </div>
                )}
                <div className="ml-2 flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-transparent">
                            <img
                                src="/ems-logo.png"
                                alt="EM's Hardware"
                                className="h-9 w-9 object-contain"
                            />
                        </div>
                        <div className="leading-tight">
                            <div className="text-lg font-semibold text-orange-600">
                                EM&apos;s Hardware
                                <span className="-mt-0.5 block text-sm font-normal text-gray-600">
                                    {formattedBranch}
                                </span>
                                   
                            </div>
                        </div>

                        {breadcrumbs.length > 0 && (
                            <div className="ml-8 hidden items-center text-xs text-muted-foreground sm:flex border-l-3 pl-6 border-orange-300">
                                <Breadcrumbs breadcrumbs={breadcrumbs} />
                            </div>
                        )}

                        <div className="ml-20 hidden flex-col gap-1 text-xs md:flex">
                            <div className="text-muted-foreground">
                                {formattedDate} ({formattedTime})
                            </div>
                            {userRole === 'cashier' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">SHIFT:</span>
                                    <span className="font-medium text-green-600">Active</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {(userRole === 'staff' || userRole === 'delivery') && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Notifications"
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        <span className="relative">
                                            <Bell className="h-5 w-5" />
                                            {notificationCount > 0 && (
                                                <span className="absolute -top-1.5 -right-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white shadow-sm">
                                                    {notificationCount > 99 ? '99+' : notificationCount}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-80 rounded-xl p-2 shadow-lg" align="end" sideOffset={8}>
                                    <DropdownMenuLabel className="px-2 py-2">Notifications</DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    <div className="max-h-[320px] overflow-auto">
                                        {notificationCount === 0 ? (
                                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications.</div>
                                        ) : (
                                            <div className="space-y-3">
                                                {userRole === 'staff' && (Number(inventoryAlerts?.low) || 0) > 0 && (
                                                    <div className="space-y-1">
                                                        <button
                                                            type="button"
                                                            onClick={openInventoryAlerts}
                                                            className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-medium text-foreground">
                                                                        Low Stock ({Number(inventoryAlerts?.low) || 0})
                                                                    </div>
                                                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                                        Click to view in inventory.
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 text-[11px] text-muted-foreground">{formattedTime}</div>
                                                            </div>
                                                        </button>

                                                        <div className="space-y-1 pl-2">
                                                            {lowStockItems.slice(0, 6).map((it) => (
                                                                <button
                                                                    key={`low-${it.product_id}`}
                                                                    type="button"
                                                                    onClick={() => openInventoryRestock(it.product_id)}
                                                                    className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <div className="truncate text-sm font-medium text-foreground">
                                                                                {it.name ?? 'Unnamed product'}
                                                                            </div>
                                                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                                                Stock: {Number(it.sellable_qty) || 0} · Reorder: {Number(it.reorder_level) || 0}
                                                                            </div>
                                                                        </div>
                                                                        <div className="shrink-0 text-[11px] text-muted-foreground">Restock</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {userRole === 'delivery' && (Number(deliveryAlerts?.new) || 0) > 0 && (
                                                    <div className="space-y-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeliveryCalendar()}
                                                            className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-medium text-foreground">
                                                                        New Deliveries ({Number(deliveryAlerts?.new) || 0})
                                                                    </div>
                                                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                                        Click to view in calendar.
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 text-[11px] text-muted-foreground">{formattedTime}</div>
                                                            </div>
                                                        </button>

                                                        <div className="space-y-1 pl-2">
                                                            {deliveryAlertItems.new.slice(0, 3).map((it) => (
                                                                <button
                                                                    key={`new-${it.id}`}
                                                                    type="button"
                                                                    onClick={() => openDeliveryCalendar(it.id)}
                                                                    className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <div className="truncate text-sm font-medium text-foreground">
                                                                                {it.customer_name || 'Customer'}
                                                                            </div>
                                                                            <div className="mt-0.5 text-xs text-muted-foreground truncate">
                                                                                {it.address || 'No address'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="shrink-0 text-[11px] text-muted-foreground">New</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {userRole === 'delivery' && (Number(deliveryAlerts?.delayed) || 0) > 0 && (
                                                    <div className="space-y-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeliveryCalendar()}
                                                            className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-medium text-foreground">
                                                                        Delayed Deliveries ({Number(deliveryAlerts?.delayed) || 0})
                                                                    </div>
                                                                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                                        Requires rescheduling.
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 text-[11px] text-red-500">{formattedTime}</div>
                                                            </div>
                                                        </button>

                                                        <div className="space-y-1 pl-2">
                                                            {deliveryAlertItems.delayed.slice(0, 3).map((it) => (
                                                                <button
                                                                    key={`del-${it.id}`}
                                                                    type="button"
                                                                    onClick={() => openDeliveryCalendar(it.id)}
                                                                    className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <div className="truncate text-sm font-medium text-red-600">
                                                                                {it.customer_name || 'Customer'}
                                                                            </div>
                                                                            <div className="mt-0.5 text-xs text-muted-foreground truncate">
                                                                                {it.address || 'No address'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="shrink-0 text-[11px] text-destructive">Delayed</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled>Mark all as read</DropdownMenuItem>
                                    <DropdownMenuItem disabled>View all</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="group inline-flex items-center gap-3 rounded-xl border border-transparent bg-transparent p-1.5 transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                                    <div className="hidden text-right leading-tight sm:block">
                                        <div className="max-w-40 truncate text-sm font-semibold text-foreground">
                                            {auth?.user?.name}
                                        </div>
                                        <div className="max-w-40 truncate text-xs text-muted-foreground">
                                            {roleLine}
                                        </div>
                                    </div>
                                    <Avatar className="h-9 w-9 border border-orange-500/10 bg-orange-50 dark:bg-orange-500/10">
                                        <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.name} />
                                        <AvatarFallback className="rounded-full bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200">
                                            {getInitials(auth?.user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 rounded-xl p-2 shadow-lg" align="end" sideOffset={8}>
                                <UserMenuContent user={auth?.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

        </header>
    );
}
