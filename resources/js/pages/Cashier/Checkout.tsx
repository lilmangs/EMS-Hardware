import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Minus, Plus, Search, Trash2, Package, Camera, CameraOff, CheckCircle, AlertCircle, Video, ShoppingCart } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Checkout',
        href: '/Checkout',
    },
];

type CartItem = {
    id: number;
    name: string;
    price: number;
    qty: number;
};

type Product = {
    id: number;
    sku?: string | null;
    barcode_value?: string | null;
    name: string;
    price: number | string;
    image_path?: string | null;
    stock: number;
};

type Receipt = {
    ref: string;
    createdAt: string;
    branchKey: string | null;
    items: Array<{ name: string; qty: number; price: number; lineTotal: number }>;
    subtotal: number;
    total: number;
    delivery_fee?: number;
    received: number;
    change: number;
};

const peso = (n: number | string) => {
    const v = typeof n === 'number' ? n : Number(n);
    return `₱${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
};

const productImageUrl = (path?: string | null) => {
    if (!path) return null;
    return `/storage/${path}`;
};

type DeliveryStaff = {
    id: number;
    name: string;
    branch_key: string;
};

const csrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
};

export default function Checkout() {
    const { props } = usePage<{
        branch_key: string | null;
        products: Product[];
        cart: {
            items: Array<{ product_id: number; qty: number }>;
            received: number;
        };
    }>();
    const branchKey = props.branch_key;
    const products = props.products ?? [];

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [received, setReceived] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [checkoutError, setCheckoutError] = useState('');
    const [checkoutSuccess, setCheckoutSuccess] = useState('');
    const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
    const [pendingDeliveryReceipt, setPendingDeliveryReceipt] = useState<Receipt | null>(null);

    const [createDeliveryOpen, setCreateDeliveryOpen] = useState(false);
    const [deliverySaleRef, setDeliverySaleRef] = useState('');
    const [deliveryCustomerName, setDeliveryCustomerName] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryFee, setDeliveryFee] = useState('0');
    const [deliveryAssignedToUserId, setDeliveryAssignedToUserId] = useState<string>('0');
    const [deliveryScheduledFor, setDeliveryScheduledFor] = useState<string>('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [deliveryStaff, setDeliveryStaff] = useState<DeliveryStaff[]>([]);
    const [deliveryIsCreating, setDeliveryIsCreating] = useState(false);
    const [deliveryError, setDeliveryError] = useState('');
    const [deliverySuccess, setDeliverySuccess] = useState('');

    const productById = useMemo(() => {
        const map = new Map<number, Product>();
        for (const p of products) map.set(p.id, p);
        return map;
    }, [products]);

    // Load server draft cart into UI whenever props.cart/products change
    useEffect(() => {
        const serverItems = Array.isArray(props.cart?.items) ? props.cart.items : [];

        const restored: CartItem[] = serverItems
            .map((it) => {
                const id = Number(it?.product_id);
                const qty = Number(it?.qty) || 0;
                const product = productById.get(id);
                return {
                    id,
                    name: product?.name ?? `Product #${id}`,
                    price: Number(product?.price) || 0,
                    qty,
                };
            })
            .filter((it) => Number.isFinite(it.id) && it.id > 0 && it.qty > 0);

        setCartItems(restored);
        setReceived(Number(props.cart?.received) || 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productById, props.cart?.items, props.cart?.received]);

    const saveTimerRef = useRef<number | null>(null);
    const savingRef = useRef(false);
    const pendingItemsRef = useRef<CartItem[] | null>(null);
    const pendingReceivedRef = useRef<number | null>(null);
    const saveCartToServerRef = useRef<((nextItems: CartItem[], nextReceived: number) => void) | null>(null);

    const saveCartToServer = useCallback((nextItems: CartItem[], nextReceived: number) => {
        if (!branchKey) return;

        if (savingRef.current) {
            pendingItemsRef.current = nextItems;
            pendingReceivedRef.current = nextReceived;
            return;
        }

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

        savingRef.current = true;

        fetch('/Checkout/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                received: nextReceived,
                items: nextItems.map((i) => ({ product_id: i.id, qty: i.qty })),
            }),
        })
            .then(async (res) => {
                if (res.ok) return;
                const body = await res.text().catch(() => '');
                // eslint-disable-next-line no-console
                console.error('Save cart failed:', res.status, body);
            })
            .catch((e) => {
                console.error(e);
            })
            .finally(() => {
                savingRef.current = false;

                const pendingItems = pendingItemsRef.current;
                const pendingReceived = pendingReceivedRef.current;
                pendingItemsRef.current = null;
                pendingReceivedRef.current = null;
                if (pendingItems && pendingReceived !== null) {
                    saveCartToServerRef.current?.(pendingItems, pendingReceived);
                }
            });
    }, [branchKey]);

    useEffect(() => {
        saveCartToServerRef.current = saveCartToServer;
    }, [saveCartToServer]);

    const loadDeliveryStaff = useCallback(async () => {
        try {
            const res = await fetch('/cashier/deliveries/staff', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to load delivery staff');
            setDeliveryStaff((json?.staff ?? []) as DeliveryStaff[]);
        } catch {
            setDeliveryStaff([]);
        }
    }, []);

    const printReceipt = useCallback((receipt: Receipt) => {
        const deliveryFeeAmount = Number(receipt.delivery_fee) || 0;
        const grandTotal = (Number(receipt.total) || 0) + (deliveryFeeAmount > 0 ? deliveryFeeAmount : 0);
        const receivedAmount = Number(receipt.received) || 0;
        const changeAmount = Math.max(0, receivedAmount - grandTotal);

        const lines = receipt.items
            .map((it) => {
                const name = String(it.name ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `
                    <tr>
                        <td class="name">${name}</td>
                        <td class="qty">${it.qty}</td>
                        <td class="amt">${peso(it.lineTotal)}</td>
                    </tr>
                `;
            })
            .join('');

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt</title>
  <style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;}
    body{margin:0;padding:16px;background:#fff;color:#111;}
    .wrap{max-width:340px;margin:0 auto;}
    .h1{font-weight:800;font-size:16px;text-align:center;margin:0;}
    .sub{font-size:12px;text-align:center;margin:4px 0 0;color:#555;}
    .meta{margin:10px 0 12px;font-size:12px;color:#333;}
    .meta div{display:flex;justify-content:space-between;gap:10px;}
    .hr{border-top:1px dashed #bbb;margin:10px 0;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    td{padding:4px 0;vertical-align:top;}
    td.qty{width:34px;text-align:right;white-space:nowrap;}
    td.amt{width:80px;text-align:right;white-space:nowrap;}
    td.name{padding-right:8px;}
    .totals{margin-top:8px;font-size:12px;}
    .totals div{display:flex;justify-content:space-between;gap:10px;padding:2px 0;}
    .totals .big{font-weight:800;font-size:13px;}
    .foot{margin-top:14px;text-align:center;font-size:12px;color:#555;}
    @media print{body{padding:0}.wrap{max-width:none;width:80mm}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1 class="h1">EM'S HARDWARE</h1>
    <div class="sub">EMMA B. ZAPORTIZA</div>
    <div class="sub">Thank you for your purchase</div>
    <div class="meta">
      <div><span>Ref</span><span>${receipt.ref}</span></div>
      <div><span>Date</span><span>${receipt.createdAt}</span></div>
      <div><span>Branch</span><span>${receipt.branchKey ?? '-'}</span></div>
    </div>
    <div class="hr"></div>
    <table>
      ${lines}
    </table>
    <div class="hr"></div>
    <div class="totals">
      <div><span>Subtotal</span><span>${peso(receipt.subtotal)}</span></div>
      ${deliveryFeeAmount > 0 ? `<div><span>Delivery Fee</span><span>${peso(deliveryFeeAmount)}</span></div>` : ''}
      <div class="big"><span>Total</span><span>${peso(grandTotal)}</span></div>
      <div><span>Received</span><span>${peso(receivedAmount)}</span></div>
      <div><span>Change</span><span>${peso(changeAmount)}</span></div>
    </div>
  </div>
  <script>window.onload=function(){window.print();};</script>
</body>
</html>`;

        const pw = window.open('', '_blank', 'width=420,height=720');
        if (!pw) return;
        pw.document.open();
        pw.document.write(html);
        pw.document.close();
    }, []);

    const completeCheckout = useCallback(
        async ({ shouldPrint }: { shouldPrint: boolean }) => {
            if (cartItems.length === 0) return null;

            setCheckoutError('');
            setCheckoutSuccess('');

            const currentSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
            const currentTotal = currentSubtotal;
            if (received < currentTotal) {
                setCheckoutError('Insufficient amount received.');
                return null;
            }

            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

                const res = await fetch('/Checkout/complete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        received,
                        items: cartItems.map((i) => ({ product_id: i.id, qty: i.qty })),
                    }),
                });

                const data = await res.json().catch(() => ({} as any));
                if (!res.ok || !data?.ok) {
                    setCheckoutError(data?.message || 'Checkout failed.');
                    return null;
                }

                const now = new Date();
                const ref =
                    String(data.ref ?? '').trim() ||
                    `S-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`;
                const receipt: Receipt = {
                    ref,
                    createdAt: now.toLocaleString(),
                    branchKey,
                    items: cartItems.map((i) => ({
                        name: i.name,
                        qty: i.qty,
                        price: i.price,
                        lineTotal: i.price * i.qty,
                    })),
                    subtotal: currentTotal,
                    total: currentTotal,
                    received,
                    change: Number(data.change ?? 0),
                };

                setLastReceipt(receipt);

                setCheckoutSuccess(`Payment successful. Change: ${peso(data.change ?? 0)}`);
                setCartItems([]);
                setReceived(0);

                if (shouldPrint) {
                    printReceipt(receipt);
                }

                return receipt;
            } catch (e) {
                console.error(e);
                setCheckoutError('Checkout failed. Please try again.');
                return null;
            }
        },
        [branchKey, cartItems, printReceipt, received],
    );

    const openCreateDelivery = useCallback(async () => {
        setDeliveryError('');
        setDeliverySuccess('');

        const currentSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
        const currentDeliveryFee = Math.max(0, Number(deliveryFee) || 0);
        const grandTotal = currentSubtotal + (currentDeliveryFee > 0 ? currentDeliveryFee : 0);
        if (cartItems.length > 0 && received < grandTotal) {
            setCheckoutError('Insufficient amount received.');
            return;
        }

        if (cartItems.length > 0) {
            const receipt = await completeCheckout({ shouldPrint: false });
            if (!receipt) return;

            setPendingDeliveryReceipt(receipt);
            setDeliverySaleRef(receipt.ref);
        } else {
            const ref = lastReceipt?.ref ?? '';
            setDeliverySaleRef(ref);
        }

        setCreateDeliveryOpen(true);
        void loadDeliveryStaff();
    }, [cartItems.length, completeCheckout, lastReceipt?.ref, loadDeliveryStaff]);

    const onCreateDeliveryOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen && pendingDeliveryReceipt) {
                printReceipt(pendingDeliveryReceipt);
                setPendingDeliveryReceipt(null);
            }

            setCreateDeliveryOpen(nextOpen);
        },
        [pendingDeliveryReceipt, printReceipt],
    );

    const createDelivery = useCallback(async () => {
        if (!deliverySaleRef.trim()) {
            setDeliveryError('Sale reference is required.');
            return;
        }
        if (!deliveryCustomerName.trim()) {
            setDeliveryError('Customer name is required.');
            return;
        }
        if (!deliveryAddress.trim()) {
            setDeliveryError('Address is required.');
            return;
        }

        setDeliveryIsCreating(true);
        try {
            setDeliveryError('');
            setDeliverySuccess('');

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
                    sale_ref: deliverySaleRef.trim(),
                    customer_name: deliveryCustomerName.trim(),
                    address: deliveryAddress.trim(),
                    delivery_fee: Number(deliveryFee) || 0,
                    assigned_to_user_id:
                        Number(deliveryAssignedToUserId) > 0 ? Number(deliveryAssignedToUserId) : null,
                    scheduled_for: deliveryScheduledFor ? new Date(deliveryScheduledFor).toISOString() : null,
                    notes: deliveryNotes.trim() ? deliveryNotes.trim() : null,
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.message || 'Failed to create delivery');

            setDeliverySuccess(`Delivery created: ${json?.ref ?? ''}`.trim());
            setCreateDeliveryOpen(false);

            const baseReceipt = pendingDeliveryReceipt ?? lastReceipt;
            if (baseReceipt) {
                printReceipt({
                    ...baseReceipt,
                    delivery_fee: Number(deliveryFee) || 0,
                });
            }
            setPendingDeliveryReceipt(null);
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'Failed to create delivery';
            setDeliveryError(`Create: ${msg}`);
        } finally {
            setDeliveryIsCreating(false);
        }
    }, [
        deliveryAddress,
        deliveryAssignedToUserId,
        deliveryCustomerName,
        deliveryFee,
        deliveryNotes,
        deliverySaleRef,
        deliveryScheduledFor,
        lastReceipt,
        pendingDeliveryReceipt,
        printReceipt,
    ]);

    // Debounced autosave when cart/received changes
    useEffect(() => {
        if (!branchKey) return;

        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = window.setTimeout(() => {
            saveCartToServer(cartItems, received);
        }, 350);

        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
            }
        };
    }, [branchKey, cartItems, received, saveCartToServer]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) => {
            const sku = (p.sku ?? '').toLowerCase();
            const name = (p.name ?? '').toLowerCase();
            const barcode = (p.barcode_value ?? '').toLowerCase();
            return sku.includes(q) || name.includes(q) || barcode.includes(q) || String(p.id).includes(q);
        });
    }, [products, searchQuery]);

    const cartQtyFor = useCallback((productId: number) => {
        return cartItems.find((i) => i.id === productId)?.qty ?? 0;
    }, [cartItems]);

    const addProductToCart = (product: Product) => {
        const available = Number(product.stock) || 0;
        const currentInCart = cartQtyFor(product.id);
        if (available <= 0) {
            setCheckoutError('Item is out of stock.');
            setTimeout(() => setCheckoutError(''), 2500);
            return;
        }
        if (currentInCart >= available) {
            setCheckoutError('Not enough stock available.');
            setTimeout(() => setCheckoutError(''), 2500);
            return;
        }

        pendingScrollToProductIdRef.current = product.id;

        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            } else {
                return [...prev, { id: product.id, name: product.name, price: Number(product.price) || 0, qty: 1 }];
            }
        });
    };

    const incrementQty = useCallback((id: number) => {
        const product = productById.get(id);
        const available = product ? (Number(product.stock) || 0) : 0;

        pendingScrollToProductIdRef.current = id;

        setCartItems((prev) => {
            const current = prev.find((i) => i.id === id)?.qty ?? 0;
            if (available > 0 && current >= available) {
                setCheckoutError('Not enough stock available.');
                setTimeout(() => setCheckoutError(''), 2500);
                return prev;
            }
            const newItems = prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item));
            saveCartToServer(newItems, received);
            return newItems;
        });
    }, [productById, received, saveCartToServer]);

    const decrementQty = useCallback((id: number) => {
        setCartItems((prev) => {
            const newItems = prev
                .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
                .filter((item) => item.qty > 0);
            saveCartToServer(newItems, received);
            return newItems;
        });
    }, [received, saveCartToServer]);

    const removeItem = useCallback((id: number) => {
        setCartItems((prev) => {
            const newItems = prev.filter((item) => item.id !== id);
            saveCartToServer(newItems, received);
            return newItems;
        });
    }, [received, saveCartToServer]);

    const clearCart = useCallback(() => {
        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        setCartItems([]);
        setReceived(0);
        setCheckoutError('');
        setCheckoutSuccess('');
        // Immediately save empty cart to server to prevent reappearance on refresh
        // Backend will delete the PosCart row when items=[] and received=0.
        saveCartToServer([], 0);
    }, [saveCartToServer]);

    const handleCheckout = useCallback(async () => {
        await completeCheckout({ shouldPrint: true });
    }, [completeCheckout]);

    const [isScanning, setIsScanning] = useState(false);
    const [scannerError, setScannerError] = useState('');
    const [scannerSuccess, setScannerSuccess] = useState('');
    const [lastScanned, setLastScanned] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const codeReader = useRef(new BrowserMultiFormatReader());

    const handleScanResult = useCallback((scannedId: string) => {
        const scanned = scannedId.trim();
        const product = products.find((p) => {
            return (
                String(p.id) === scanned ||
                String(p.sku ?? '') === scanned ||
                String(p.barcode_value ?? '') === scanned
            );
        });
        if (product) {
            addProductToCart(product);
            setScannerError('');
            setScannerSuccess(`✓ ${product.name} added to cart`);
            setLastScanned(product.name);
            setTimeout(() => setScannerSuccess(''), 3000);
        } else {
            setScannerError(`Product not found for: ${scanned}`);
            setScannerSuccess('');
        }
    }, [addProductToCart]);

    const startScanning = async () => {
        try {
            setScannerError('');
            setScannerSuccess('');
            if (!window.isSecureContext) {
                setScannerError('Camera requires HTTPS (or localhost).');
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                setScannerError('Camera not supported in this browser.');
                return;
            }
            const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
            const selectedDeviceId = videoInputDevices[0]?.deviceId;
            if (!selectedDeviceId) {
                setScannerError('No camera found on this device.');
                return;
            }
            setIsScanning(true);

            // Wait for the video element to be mounted & ref assigned.
            await new Promise((r) => setTimeout(r, 50));
            const videoEl = videoRef.current;
            if (!videoEl) {
                setScannerError('Scanner video element not ready.');
                setIsScanning(false);
                return;
            }

            // Attach camera stream.
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: selectedDeviceId } },
                audio: false,
            });
            videoEl.srcObject = streamRef.current;
            await videoEl.play();

            // Continuous decoding loop.
            const scanLoop = async () => {
                while (streamRef.current && videoEl.srcObject) {
                    try {
                        const result = await codeReader.current.decodeOnceFromVideoDevice(selectedDeviceId, videoEl);
                        if (result) {
                            const scannedText = result.getText();
                            handleScanResult(scannedText);
                            // Brief pause so the same barcode isn't scanned multiple times.
                            await new Promise((r) => setTimeout(r, 1500));
                        }
                    } catch {
                        // decodeOnce can throw on timeout — just break.
                        break;
                    }
                }
            };
            scanLoop();
        } catch (err) {
            setScannerError('Failed to start camera scanner. Check permissions.');
            setIsScanning(false);
            console.error(err);
        }
    };

    const stopScanning = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsScanning(false);
    }, []);

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const cartListRef = useRef<HTMLDivElement | null>(null);
    const cartRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const prevCartCountRef = useRef<number>(0);
    const pendingScrollToProductIdRef = useRef<number | null>(null);

    useEffect(() => {
        const prev = prevCartCountRef.current;
        const next = cartItems.length;
        prevCartCountRef.current = next;

        const pendingId = pendingScrollToProductIdRef.current;

        if (pendingId != null) {
            const row = cartRowRefs.current.get(pendingId);
            pendingScrollToProductIdRef.current = null;
            if (!row) return;
            window.requestAnimationFrame(() => {
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            return;
        }

        if (next > prev) {
            const el = cartListRef.current;
            if (!el) return;
            window.requestAnimationFrame(() => {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            });
        }
    }, [cartItems]);

    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const baseTotal = subtotal;
    const deliveryFeeAmount = Math.max(0, Number(deliveryFee) || 0);
    const total = baseTotal + (deliveryFeeAmount > 0 ? deliveryFeeAmount : 0);
    const change = Math.max(0, received - total);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Checkout" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto bg-background p-4">
                <h1 className="text-3xl font-bold">Checkout</h1>


                <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                    <section className="space-y-4">
                        <div className="rounded-xl border border-sidebar-border/70 bg-muted/30 p-4 dark:border-sidebar-border">
                            {/* Feedback Messages */}
                            {scannerError && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {scannerError}
                                </div>
                            )}
                            {scannerSuccess && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                                    <CheckCircle className="h-4 w-4 shrink-0" />
                                    {scannerSuccess}
                                </div>
                            )}

                            {checkoutError && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {checkoutError}
                                </div>
                            )}

                            {checkoutSuccess && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                                    <CheckCircle className="h-4 w-4 shrink-0" />
                                    {checkoutSuccess}
                                </div>
                            )}

                            <div className="mb-3 rounded-xl border border-sidebar-border/70 bg-background/60 p-3 dark:border-sidebar-border">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-medium text-muted-foreground">Camera Scanner</div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isScanning) {
                                                stopScanning();
                                                setIsScannerOpen(false);
                                                return;
                                            }
                                            setIsScannerOpen(true);
                                            startScanning();
                                        }}
                                        aria-label={isScanning ? 'Stop scanning' : 'Start camera scan'}
                                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${isScanning
                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            }`}
                                    >
                                        {isScanning ? (
                                            <><CameraOff className="h-3.5 w-3.5" /> Stop</>
                                        ) : (
                                            <><Camera className="h-3.5 w-3.5" /> Start</>
                                        )}
                                    </button>
                                </div>

                                {isScannerOpen && (
                                    <>
                                        <div className="mt-3 relative overflow-hidden rounded-lg border bg-black">
                                            <video
                                                ref={videoRef}
                                                className="w-full h-56 object-cover"
                                                autoPlay
                                                playsInline
                                                muted
                                            />

                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute inset-3 border-2 border-dashed border-white/50 rounded-lg" />
                                                {isScanning && (
                                                    <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-green-400/70 animate-pulse" />
                                                )}
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                                                    <span className={`h-2 w-2 rounded-full ${isScanning ? 'bg-red-500 animate-pulse' : 'bg-white/50'}`} />
                                                    {isScanning ? 'Scanning...' : 'Starting camera...'}
                                                </span>
                                                {lastScanned && (
                                                    <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-green-400">
                                                        Last: {lastScanned}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {!isScanning && (
                                            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                                <Video className="h-4 w-4" />
                                                Starting camera...
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="mt-3 flex items-center gap-2 rounded-lg border-border bg-background px-3 py-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <input
                                    className="w-full bg-transparent text-sm outline-none"
                                    placeholder="Search item"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                                    Quick Selection Items
                                </div>
                            </div>

                            <div className="mt-4 max-h-[60vh] overflow-auto pr-1">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {filteredProducts.map((p) => (
                                        <ProductCard key={p.id} product={p} onAddToCart={addProductToCart} inCartQty={cartQtyFor(p.id)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="sticky top-4 self-start">
                        <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-sidebar-border/70 bg-muted/30 p-4 dark:border-sidebar-border">
                            <div className="mb-3 text-sm font-medium text-muted-foreground">
                                Current Sale
                            </div>

                            <div ref={cartListRef} className="flex-1 space-y-3 overflow-auto pr-1">
                                {cartItems.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-sm text-muted-foreground">
                                        No items in current sale.
                                    </div>
                                ) : (
                                    cartItems.map((item) => (
                                        <div
                                            key={item.id}
                                            ref={(el) => {
                                                if (el) cartRowRefs.current.set(item.id, el);
                                                else cartRowRefs.current.delete(item.id);
                                            }}
                                        >
                                            <CartRow
                                                item={item}
                                                product={productById.get(item.id)}
                                                onIncrement={incrementQty}
                                                onDecrement={decrementQty}
                                                onRemove={removeItem}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-4 border-t border-border pt-4">
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <div className="text-muted-foreground">Subtotal:</div>
                                    <div className="text-right font-semibold">
                                        {peso(subtotal)}
                                    </div>

                                    <div className="text-muted-foreground">Delivery Fee (optional):</div>
                                    <div className="flex items-center justify-end">
                                        <input
                                            className="h-8 w-32 rounded-md border-border bg-background px-2 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={deliveryFee === '0' ? '' : String(deliveryFee)}
                                            onChange={(e) => {
                                                const next = e.target.value;
                                                setDeliveryFee(next);
                                            }}
                                            inputMode="decimal"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="text-muted-foreground">Total:</div>
                                    <div className="text-right font-semibold text-lg">
                                        {peso(total)}
                                    </div>

                                    <div className="text-muted-foreground">Received:</div>
                                    <div className="flex items-center justify-end">
                                        <input
                                            className="h-8 w-32 rounded-md border-border bg-background px-2 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={received === 0 ? '' : String(received)}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setReceived(Number.isFinite(v) ? v : 0);
                                            }}
                                            inputMode="numeric"
                                        />
                                    </div>

                                    <div className="text-muted-foreground">Change:</div>
                                    <div className="text-right font-semibold text-green-600">
                                        {peso(change)}
                                    </div>
                                </div>
                            </div>

                            <div className="my-4 h-px bg-border" />

                            <div className="mb-3 text-sm font-medium text-muted-foreground">
                                Quick Actions
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <ActionButton label="Check - Out" onClick={handleCheckout} disabled={cartItems.length === 0} />
                                <ActionButton label="Create Delivery" onClick={openCreateDelivery} disabled={cartItems.length === 0} />
                                <ActionButton
                                    label="Clear"
                                    onClick={clearCart}
                                    disabled={cartItems.length === 0}
                                    className="md:col-span-2"
                                />
                            </div>

                            {lastReceipt && (
                                <div className="mt-3" />
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <Dialog open={createDeliveryOpen} onOpenChange={onCreateDeliveryOpenChange}>
                <DialogContent className="!w-[86vw] !max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create Delivery</DialogTitle>
                        <DialogDescription>Use a sale reference and enter delivery details.</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-y-auto pr-1">
                        {deliveryError && (
                            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {deliveryError}
                            </div>
                        )}
                        {deliverySuccess && (
                            <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
                                {deliverySuccess}
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sale Ref</label>
                                <Input
                                    value={deliverySaleRef}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliverySaleRef(e.target.value)}
                                    placeholder="e.g. TRX-1001"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Customer Name</label>
                                <Input
                                    value={deliveryCustomerName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryCustomerName(e.target.value)}
                                    placeholder="e.g. Juan Dela Cruz"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Delivery Date &amp; Time</label>
                                <Input
                                    type="datetime-local"
                                    value={deliveryScheduledFor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryScheduledFor(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                <label className="text-sm font-medium">Address</label>
                                <Textarea
                                    value={deliveryAddress}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeliveryAddress(e.target.value)}
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
                                <Select value={deliveryAssignedToUserId} onValueChange={(v) => setDeliveryAssignedToUserId(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Unassigned</SelectItem>
                                        {deliveryStaff.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                <label className="text-sm font-medium">Notes (optional)</label>
                                <Textarea
                                    value={deliveryNotes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeliveryNotes(e.target.value)}
                                    placeholder="Extra instructions"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={deliveryIsCreating}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button onClick={createDelivery} disabled={deliveryIsCreating} className="sm:min-w-[180px]">
                            {deliveryIsCreating ? 'Creating...' : 'Create Delivery'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}

function CartRow({
    item,
    product,
    onIncrement,
    onDecrement,
    onRemove,
}: {
    item: CartItem;
    product?: Product;
    onIncrement: (id: number) => void;
    onDecrement: (id: number) => void;
    onRemove: (id: number) => void;
}) {
    const lineTotal = item.price * item.qty;

    return (
        <div className="rounded-xl border-border bg-card p-3 shadow-sm">
            <div className="flex gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 opacity-20" />
                    {productImageUrl(product?.image_path) ? (
                        <img
                            src={productImageUrl(product?.image_path) ?? undefined}
                            alt={product?.name ?? item.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <Package className="h-6 w-6 text-orange-600" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                                {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {peso(item.price)} each
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onDecrement(item.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border-border bg-background hover:bg-muted transition-colors"
                            >
                                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <div className="w-8 text-center text-sm font-semibold">
                                {item.qty}
                            </div>
                            <button
                                type="button"
                                onClick={() => onIncrement(item.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border-border bg-background hover:bg-muted transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="text-sm font-semibold">
                            {peso(lineTotal)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({
    label,
    onClick,
    disabled,
    className,
}: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'h-12 min-h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 disabled:pointer-events-none',
                className,
            )}
        >
            {label}
        </button>
    );
}
function ProductCard({
    product,
    onAddToCart,
    inCartQty,
}: {
    product: Product;
    onAddToCart: (product: Product) => void;
    inCartQty: number;
}) {
    const stock = Number(product.stock) || 0;
    const canAdd = stock > 0 && inCartQty < stock;

    return (
        <button
            onClick={() => onAddToCart(product)}
            disabled={!canAdd}
            className="group overflow-hidden rounded-xl border-border bg-card text-left shadow-sm hover:bg-accent/50 transition-all duration-200 hover:shadow-md disabled:opacity-60 disabled:pointer-events-none"
        >
            <div className="aspect-square w-full bg-muted relative overflow-hidden">
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
                        <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                )}
            </div>
            <div className="p-3">
                <div className="truncate text-xs font-semibold group-hover:text-primary transition-colors">
                    {product.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {product.barcode_value ?? product.sku ?? `#${product.id}`}
                </div>
                <div className="mt-1 flex items-center justify-between">
                    <div className="text-xs font-semibold text-primary">
                        {peso(product.price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {stock <= 0 ? 'Out' : `${stock} in stock`}
                    </div>
                </div>
            </div>
        </button>
    );
}
