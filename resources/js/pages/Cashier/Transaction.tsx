import { useCallback, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

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

    const itemsCountForSale = useCallback((sale: (typeof recentSales)[number]) => {
        return (sale.items ?? []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
    }, [recentSales]);

    const sortedSales = useMemo(() => {
        return [...recentSales].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }, [recentSales]);

    return (
       <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Transaction" />
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto bg-background p-4">
            <h1 className="text-3xl font-bold">Transaction</h1>


            <section className="rounded-xl border border-sidebar-border/70 bg-muted/30 p-4 dark:border-sidebar-border">
                <div className="mb-3 text-sm font-medium text-muted-foreground">Recent Sales</div>

                {sortedSales.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-sm text-muted-foreground">
                        No recent sales yet.
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {sortedSales.map((s) => (
                            <div key={s.id} className="rounded-xl border bg-background p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold truncate">{s.ref}</div>
                                        <div className="text-xs text-muted-foreground truncate">{formatDateTime(s.created_at)}</div>
                                        <div className="mt-1 text-xs text-muted-foreground truncate">
                                            Items: {itemsCountForSale(s)}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            Total: {peso(s.total)}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const r = saleToReceipt(s);
                                            setLastReceipt(r);
                                            printReceipt(r);
                                        }}
                                        className="shrink-0 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
                                    >
                                        Reprint
                                    </button>
                                </div>

                                <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                                    <div className="flex justify-between"><span>Subtotal</span><span>{peso(s.subtotal)}</span></div>
                                    <div className="flex justify-between font-semibold text-foreground"><span>Total</span><span>{peso(s.total)}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {lastReceipt && (
                <div className="hidden" aria-hidden="true">
                    {lastReceipt.ref}
                </div>
            )}
        </div>
       </AppLayout>
    );
}
