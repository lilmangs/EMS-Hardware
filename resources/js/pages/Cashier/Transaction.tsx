import { useCallback, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, PhilippinePeso, Printer } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Transaction',
        href: '/transaction',
    },
];

type Receipt = {
    ref: string;
    createdAt: string;
    branchKey: string | null;
    items: Array<{ name: string; qty: number; price: number; lineTotal: number }>;
    subtotal: number;
    total: number;
    received: number;
    change: number;
};

const peso = (n: number | string) => {
    const v = typeof n === 'number' ? n : Number(n);
    return `₱${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
};

export default function Transaction() {
    const { props } = usePage<{
        branch_key: string | null;
        recent_sales: Array<{
            id: number;
            ref: string;
            created_at: string;
            subtotal: number | string;
            total: number | string;
            received: number | string;
            change: number | string;
            items: Array<{ name: string; qty: number; price: number | string; line_total: number | string }>;
        }>;
    }>();

    const branchKey = props.branch_key;
    const recentSales = props.recent_sales ?? [];
    const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const formatDateTime = useCallback((iso: string) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString();
    }, []);

    const printReceipt = useCallback((receipt: Receipt) => {
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
    <h1 class="h1">POS Receipt</h1>
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
      <div class="big"><span>Total</span><span>${peso(receipt.total)}</span></div>
      <div><span>Received</span><span>${peso(receipt.received)}</span></div>
      <div><span>Change</span><span>${peso(receipt.change)}</span></div>
    </div>
    <div class="foot">Powered by your POS system</div>
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

    const saleToReceipt = useCallback((sale: (typeof recentSales)[number]): Receipt => {
        return {
            ref: sale.ref,
            createdAt: formatDateTime(sale.created_at),
            branchKey,
            items: (sale.items ?? []).map((it) => ({
                name: it.name,
                qty: Number(it.qty) || 0,
                price: Number(it.price) || 0,
                lineTotal: Number(it.line_total) || 0,
            })),
            subtotal: Number(sale.subtotal) || 0,
            total: Number(sale.total) || 0,
            received: Number(sale.received) || 0,
            change: Number(sale.change) || 0,
        };
    }, [branchKey, formatDateTime, recentSales]);

    const openPreview = useCallback(
        (sale: (typeof recentSales)[number]) => {
            const r = saleToReceipt(sale);
            setLastReceipt(r);
            setIsPreviewOpen(true);
        },
        [saleToReceipt],
    );

    const itemsCountForSale = useCallback((sale: (typeof recentSales)[number]) => {
        return (sale.items ?? []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    }, [recentSales]);

    const sortedSales = useMemo(() => {
        return [...recentSales].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }, [recentSales]);

    const stats = useMemo(() => {
        const salesCount = sortedSales.length;
        const grossTotal = sortedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const grossSubtotal = sortedSales.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
        const itemsSold = sortedSales.reduce((sum, s) => sum + itemsCountForSale(s), 0);

        return {
            salesCount,
            itemsSold,
            grossSubtotal,
            grossTotal,
        };
    }, [itemsCountForSale, sortedSales]);

    const branchLabel = useMemo(() => {
        if (!branchKey) return '—';
        if (branchKey === 'lagonglong') return 'Lagonglong';
        if (branchKey === 'balingasag') return 'Balingasag';
        return branchKey;
    }, [branchKey]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transaction" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">Transaction</h1>
                        <p className="text-muted-foreground">Review and reprint your recent sales</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{stats.salesCount}</div>
                            <p className="text-xs text-muted-foreground">Last 50 transactions</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                            <Printer className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{stats.itemsSold}</div>
                            <p className="text-xs text-muted-foreground">Total quantity across sales</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Subtotal</CardTitle>
                            <PhilippinePeso className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{peso(stats.grossSubtotal)}</div>
                            <p className="text-xs text-muted-foreground">Before totals</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total</CardTitle>
                            <PhilippinePeso className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tabular-nums">{peso(stats.grossTotal)}</div>
                            <p className="text-xs text-muted-foreground">Total collected</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle>Recent Sales</CardTitle>
                        <CardDescription>Click a transaction to reprint the receipt.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sortedSales.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
                                No recent sales yet.
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {sortedSales.map((s) => (
                                    <div
                                        key={s.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openPreview(s)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') openPreview(s);
                                        }}
                                        className="group cursor-pointer rounded-xl border bg-background p-4 transition-colors hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold">{s.ref}</div>
                                                <div className="truncate text-xs text-muted-foreground">{formatDateTime(s.created_at)}</div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="tabular-nums">Items: {itemsCountForSale(s)}</span>
                                                    <span className="text-border">|</span>
                                                    <span className="tabular-nums">Total: {peso(s.total)}</span>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openPreview(s);
                                                }}
                                                className="shrink-0"
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                View
                                            </Button>
                                        </div>

                                        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                                            <div className="flex justify-between gap-3">
                                                <span>Subtotal</span>
                                                <span className="tabular-nums">{peso(s.subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between gap-3 font-semibold text-foreground">
                                                <span>Total</span>
                                                <span className="tabular-nums">{peso(s.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Receipt Preview</DialogTitle>
                            <DialogDescription>Review the details before printing.</DialogDescription>
                        </DialogHeader>

                        {!lastReceipt ? (
                            <div className="text-sm text-muted-foreground">No receipt selected.</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-3 rounded-md border p-4 text-sm md:grid-cols-3">
                                    <div>
                                        <div className="text-muted-foreground">Reference</div>
                                        <div className="font-medium">{lastReceipt.ref}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Date</div>
                                        <div className="font-medium">{lastReceipt.createdAt}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Branch</div>
                                        <div className="font-medium">{branchLabel}</div>
                                    </div>
                                </div>

                                <div className="max-h-[45vh] overflow-auto rounded-md border">
                                    <div className="min-w-full">
                                        <div className="grid grid-cols-[1fr_70px_110px] gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                                            <div>Item</div>
                                            <div className="text-right">Qty</div>
                                            <div className="text-right">Amount</div>
                                        </div>
                                        <div className="divide-y">
                                            {lastReceipt.items.map((it, idx) => (
                                                <div
                                                    key={`${lastReceipt.ref}-${idx}`}
                                                    className="grid grid-cols-[1fr_70px_110px] gap-2 px-4 py-2 text-sm"
                                                >
                                                    <div className="min-w-0 truncate">{it.name}</div>
                                                    <div className="text-right tabular-nums">{it.qty}</div>
                                                    <div className="text-right tabular-nums">{peso(it.lineTotal)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2 rounded-md border p-4 text-sm">
                                    <div className="flex justify-between gap-3 text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums">{peso(lastReceipt.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between gap-3 font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums">{peso(lastReceipt.total)}</span>
                                    </div>
                                    <div className="flex justify-between gap-3 text-muted-foreground">
                                        <span>Received</span>
                                        <span className="tabular-nums">{peso(lastReceipt.received)}</span>
                                    </div>
                                    <div className="flex justify-between gap-3 text-muted-foreground">
                                        <span>Change</span>
                                        <span className="tabular-nums">{peso(lastReceipt.change)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    if (!lastReceipt) return;
                                    printReceipt(lastReceipt);
                                }}
                                disabled={!lastReceipt}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Reprint
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {lastReceipt && (
                    <div className="hidden" aria-hidden="true">
                        {lastReceipt.ref}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
