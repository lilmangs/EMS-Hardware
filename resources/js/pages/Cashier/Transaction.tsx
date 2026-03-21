import { useCallback, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, FileDown, FileText, PhilippinePeso, Printer, LayoutGrid, List, MoreHorizontal } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    delivery_fee?: number;
    received: number;
    change: number;
};

type SaleItem = { name: string; qty: number; price: number | string; line_total: number | string };

type Sale = {
    id: number;
    ref: string;
    created_at: string;
    subtotal: number | string;
    total: number | string;
    received: number | string;
    change: number | string;
    delivery: {
        ref: string;
        status: string;
        scheduled_for: string | null;
        delivery_fee: number | string;
    } | null;
    items: SaleItem[];
};

type Paginated<T> = {
    data: T[];
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
};

const peso = (n: number | string) => {
    const v = typeof n === 'number' ? n : Number(n);
    return `₱${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
};

export default function Transaction() {
    const { props } = usePage<{
        branch_key: string | null;
        filters?: {
            search?: string;
        };
        recent_sales: Sale[];
    }>();

    const branchKey = props.branch_key;
    const recentSales = props.recent_sales ?? [];
    const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [filterDate, setFilterDate] = useState('');
    const [search, setSearch] = useState(() => String(props.filters?.search ?? ''));

    const branchLabel = useMemo(() => {
        if (!branchKey) return '—';
        if (branchKey === 'lagonglong') return 'Lagonglong';
        if (branchKey === 'balingasag') return 'Balingasag';
        return branchKey;
    }, [branchKey]);

    const formatDateTime = useCallback((iso: string) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString();
    }, []);

    const toStartOfDay = useCallback((yyyyMmDd: string) => {
        const d = new Date(`${yyyyMmDd}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
    }, []);

    const toEndOfDay = useCallback((yyyyMmDd: string) => {
        const d = new Date(`${yyyyMmDd}T23:59:59.999`);
        return Number.isNaN(d.getTime()) ? null : d;
    }, []);

    const printReceipt = useCallback((receipt: Receipt) => {
        const deliveryFeeAmount = Number(receipt.delivery_fee) || 0;
        const grandTotal = Number(receipt.total) || 0;
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

    const saleToReceipt = useCallback((sale: Sale): Receipt => {
        return {
            ref: sale.ref,
            createdAt: formatDateTime(sale.created_at),
            branchKey,
            items: (sale.items ?? []).map((it: SaleItem) => ({
                name: it.name,
                qty: Number(it.qty) || 0,
                price: Number(it.price) || 0,
                lineTotal: Number(it.line_total) || 0,
            })),
            subtotal: Number(sale.subtotal) || 0,
            total: Number(sale.total) || 0,
            delivery_fee: sale.delivery ? Number(sale.delivery.delivery_fee) || 0 : 0,
            received: Number(sale.received) || 0,
            change: Number(sale.change) || 0,
        };
    }, [branchKey, formatDateTime, recentSales]);

    const deliveryBadge = useCallback((status?: string | null) => {
        const v = String(status ?? '').toLowerCase();
        if (!v) return null;
        if (v === 'delivered') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Delivered</Badge>;
        if (v === 'out_for_delivery') return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Out for delivery</Badge>;
        if (v === 'preparing') return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Preparing</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    }, []);

    const openPreview = useCallback(
        (sale: Sale) => {
            const r = saleToReceipt(sale);
            setLastReceipt(r);
            setIsPreviewOpen(true);
        },
        [saleToReceipt],
    );

    const itemsCountForSale = useCallback((sale: Sale) => {
        return (sale.items ?? []).reduce((sum: number, it: SaleItem) => sum + (Number(it.qty) || 0), 0);
    }, []);

    const filteredSales = useMemo(() => {
        const from = filterDate ? toStartOfDay(filterDate) : null;
        const to = filterDate ? toEndOfDay(filterDate) : null;

        if (!from || !to) return recentSales;

        return recentSales.filter((s: Sale) => {
            const d = new Date(String(s.created_at));
            if (Number.isNaN(d.getTime())) return false;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        });
    }, [filterDate, recentSales, toEndOfDay, toStartOfDay]);

    const sortedSales = useMemo(() => {
        return [...filteredSales].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }, [filteredSales]);

    const submitSearch = useCallback(() => {
        router.get(
            '/Transaction',
            { search: search.trim() || undefined },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['branch_key', 'filters', 'recent_sales'],
            },
        );
    }, [search]);

    const exportCsv = useCallback(() => {
        const rows = sortedSales;
        const escapeCell = (v: unknown) => {
            const s = String(v ?? '');
            const needsQuotes = /[",\n\r]/.test(s);
            const escaped = s.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
        };

        const header = ['Ref', 'Date', 'Quantity', 'Subtotal', 'Delivery Fee', 'Total', 'Received', 'Change', 'Delivery Ref', 'Delivery Status'];
        const lines = [header.map(escapeCell).join(',')];

        for (const s of rows) {
            const deliveryFee = s.delivery ? Number(s.delivery.delivery_fee) || 0 : 0;
            lines.push(
                [
                    s.ref,
                    formatDateTime(s.created_at),
                    itemsCountForSale(s),
                    Number(s.subtotal) || 0,
                    deliveryFee,
                    Number(s.total) || 0,
                    Number(s.received) || 0,
                    Number(s.change) || 0,
                    s.delivery?.ref ?? '',
                    s.delivery?.status ?? '',
                ]
                    .map(escapeCell)
                    .join(','),
            );
        }

        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = url;
        a.download = `transactions-${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, [formatDateTime, itemsCountForSale, sortedSales]);

    const printReport = useCallback(() => {
        const rows = sortedSales;
        const stamp = new Date().toLocaleString();

        const totals = rows.reduce(
            (acc, s) => {
                acc.subtotal += Number(s.subtotal) || 0;
                acc.deliveryFee += s.delivery ? Number(s.delivery.delivery_fee) || 0 : 0;
                acc.total += Number(s.total) || 0;
                acc.items += itemsCountForSale(s);
                return acc;
            },
            { subtotal: 0, deliveryFee: 0, total: 0, items: 0 },
        );

        const tableRows = rows
            .map((s) => {
                const deliveryFee = s.delivery ? Number(s.delivery.delivery_fee) || 0 : 0;
                return `
                    <tr>
                        <td>${String(s.ref ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                        <td>${String(formatDateTime(s.created_at)).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                        <td style="text-align:right">${itemsCountForSale(s)}</td>
                        <td style="text-align:right">${peso(s.subtotal)}</td>
                        <td style="text-align:right">${deliveryFee > 0 ? peso(deliveryFee) : '—'}</td>
                        <td style="text-align:right">${peso(s.total)}</td>
                    </tr>
                `;
            })
            .join('');

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Transactions Report</title>
  <style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;}
    body{margin:0;padding:16px;color:#111;background:#fff;}
    .wrap{max-width:1000px;margin:0 auto;}
    .title{font-size:16px;font-weight:800;margin:0;}
    .meta{margin:6px 0 14px;font-size:12px;color:#555;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th,td{padding:8px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top;}
    th{text-align:left;background:#f3f4f6;font-weight:700;}
    .totals-row{font-weight:700;background:#f9fafb;border-top:2px solid #e5e7eb;}
    @media print{body{padding:0}.wrap{max-width:none}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1 class="title">Transaction Report</h1>
    <div class="meta">
      <div>Generated: ${String(stamp).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div>Branch: ${String(branchLabel).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Ref</th>
          <th>Date</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Subtotal</th>
          <th style="text-align:right">Delivery Fee</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tbody>
        <tr class="totals-row">
          <td colspan="2" style="font-weight:700;text-align:left;">TOTALS (${rows.length} transactions)</td>
          <td style="text-align:right">${totals.items}</td>
          <td style="text-align:right">${peso(totals.subtotal)}</td>
          <td style="text-align:right">${totals.deliveryFee > 0 ? peso(totals.deliveryFee) : '—'}</td>
          <td style="text-align:right">${peso(totals.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <script>window.onload=function(){window.print();};</script>
</body>
</html>`;

        const pw = window.open('', '_blank', 'width=1100,height=800');
        if (!pw) return;
        pw.document.open();
        pw.document.write(html);
        pw.document.close();
    }, [branchLabel, formatDateTime, itemsCountForSale, sortedSales]);

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transaction" />
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold">Transaction</h1>
                        <p className="text-muted-foreground">Review and reprint your recent sales</p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        exportCsv();
                                    }}
                                >
                                    Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        printReport();
                                    }}
                                >
                                    Export PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <CardTitle>Recent Sales</CardTitle>
                                <CardDescription>Click a transaction to reprint the receipt.</CardDescription>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">Search</div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') submitSearch();
                                            }}
                                            placeholder="Search ref, product, delivery..."
                                        />
                                        <Button type="button" variant="secondary" onClick={submitSearch}>
                                            Search
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-end gap-2">
                                    <Button type="button" variant="outline" onClick={printReport}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Print
                                    </Button>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">Date</div>
                                    <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            setFilterDate('');
                                        }}
                                        disabled={!filterDate}
                                    >
                                        Clear
                                    </Button>

                                    <div className="flex rounded-lg border overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                                        >
                                            <LayoutGrid className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                                        >
                                            <List className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {sortedSales.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
                                No recent sales yet.
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="max-h-[calc(100svh-22rem)] overflow-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ref</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead>Delivery</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedSales.map((s) => (
                                            <TableRow
                                                key={s.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openPreview(s)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        openPreview(s);
                                                    }
                                                }}
                                                className="cursor-pointer hover:bg-muted/50"
                                            >
                                                <TableCell className="font-medium">{s.ref}</TableCell>
                                                <TableCell className="text-muted-foreground">{formatDateTime(s.created_at)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{itemsCountForSale(s)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{peso(s.total)}</TableCell>
                                                <TableCell>
                                                    {s.delivery ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {deliveryBadge(s.delivery.status)}
                                                            <span className="text-xs text-muted-foreground">
                                                                {peso(s.delivery.delivery_fee)}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground font-mono">{s.delivery.ref}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
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
                                                                    openPreview(s);
                                                                }}
                                                            >
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="max-h-[calc(100svh-22rem)] overflow-auto pr-1">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {sortedSales.map((s) => (
                                        <div
                                            key={s.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openPreview(s)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    openPreview(s);
                                                }
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

                                                    {s.delivery && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            {deliveryBadge(s.delivery.status)}
                                                            <span className="text-xs text-muted-foreground">
                                                                Fee: <span className="tabular-nums">{peso(s.delivery.delivery_fee)}</span>
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Ref: <span className="font-mono">{s.delivery.ref}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
                                                                openPreview(s);
                                                            }}
                                                        >
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            View
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                            </div>
                        )}

                        <div className="mt-4 text-xs text-muted-foreground text-center">
                            Showing {sortedSales.length} transaction(s)
                        </div>
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
                                    {Number(lastReceipt.delivery_fee) > 0 && (
                                        <div className="flex justify-between gap-3 text-muted-foreground">
                                            <span>Delivery Fee</span>
                                            <span className="tabular-nums">{peso(Number(lastReceipt.delivery_fee) || 0)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between gap-3 font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums">
                                            {peso(Number(lastReceipt.total) || 0)}
                                        </span>
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
