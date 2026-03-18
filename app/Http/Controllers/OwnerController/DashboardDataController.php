<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\PosDelivery;
use App\Models\PosSale;
use App\Models\Product;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DashboardDataController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_key' => ['nullable', Rule::in(['all', 'lagonglong', 'balingasag'])],
            'range' => ['nullable', Rule::in(['today', 'week', 'month'])],
        ]);

        $branchKey = $validated['branch_key'] ?? 'all';
        $range = $validated['range'] ?? 'today';

        $now = now();
        $from = match ($range) {
            'today' => $now->copy()->startOfDay(),
            'month' => $now->copy()->startOfMonth(),
            default => $now->copy()->startOfWeek(),
        };
        $to = $now->copy()->endOfDay();

        [$prevFrom, $prevTo] = $this->previousWindow($range, $from, $to);

        $salesQuery = PosSale::query()->whereBetween('created_at', [$from, $to]);
        $prevSalesQuery = PosSale::query()->whereBetween('created_at', [$prevFrom, $prevTo]);

        if ($branchKey !== 'all') {
            $salesQuery->where('branch_key', $branchKey);
            $prevSalesQuery->where('branch_key', $branchKey);
        }

        $salesTotals = (clone $salesQuery)
            ->selectRaw('COUNT(*) as orders, COALESCE(SUM(total),0) as revenue')
            ->first();

        $prevSalesTotals = (clone $prevSalesQuery)
            ->selectRaw('COALESCE(SUM(total),0) as revenue')
            ->first();

        $revenue = (float) ($salesTotals?->revenue ?? 0);
        $orders = (int) ($salesTotals?->orders ?? 0);
        $prevRevenue = (float) ($prevSalesTotals?->revenue ?? 0);

        $growth = $prevRevenue > 0 ? round((($revenue - $prevRevenue) / $prevRevenue) * 100, 2) : ($revenue > 0 ? 100 : 0);

        $salesByBranch = [
            'lagonglong' => 0.0,
            'balingasag' => 0.0,
        ];

        if ($branchKey === 'all') {
            $rows = PosSale::query()
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('branch_key, COALESCE(SUM(total),0) as revenue')
                ->groupBy('branch_key')
                ->get();
            foreach ($rows as $r) {
                $bk = (string) ($r->branch_key ?? '');
                if (isset($salesByBranch[$bk])) {
                    $salesByBranch[$bk] = (float) ($r->revenue ?? 0);
                }
            }
        } elseif ($branchKey === 'lagonglong' || $branchKey === 'balingasag') {
            $salesByBranch[$branchKey] = $revenue;
        }

        $stockQuery = DB::table('product_stocks')
            ->join('products', 'products.id', '=', 'product_stocks.product_id');

        if ($branchKey !== 'all') {
            $stockQuery->where('product_stocks.branch_key', $branchKey);
        }

        $inventoryTotals = (clone $stockQuery)
            ->selectRaw('COUNT(*) as rows_count, COALESCE(COUNT(DISTINCT products.category),0) as categories')
            ->first();

        $totalInventoryRows = (int) ($inventoryTotals?->rows_count ?? 0);
        $categories = (int) ($inventoryTotals?->categories ?? 0);

        $lowStock = (clone $stockQuery)
            ->where('product_stocks.reorder_level', '>', 0)
            ->whereColumn('product_stocks.stock', '<=', 'product_stocks.reorder_level')
            ->count();

        $outOfStock = (clone $stockQuery)
            ->where('product_stocks.stock', '<=', 0)
            ->count();

        $deliveriesQuery = PosDelivery::query()->whereBetween('created_at', [$from, $to]);
        if ($branchKey !== 'all') {
            $deliveriesQuery->where('branch_key', $branchKey);
        }

        $deliveryCounts = (clone $deliveriesQuery)
            ->selectRaw("SUM(CASE WHEN status='preparing' THEN 1 ELSE 0 END) as preparing")
            ->selectRaw("SUM(CASE WHEN status='out_for_delivery' THEN 1 ELSE 0 END) as out_for_delivery")
            ->selectRaw("SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered")
            ->first();

        $preparing = (int) ($deliveryCounts?->preparing ?? 0);
        $outForDelivery = (int) ($deliveryCounts?->out_for_delivery ?? 0);
        $delivered = (int) ($deliveryCounts?->delivered ?? 0);

        $delayed = PosDelivery::query()
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->whereIn('status', ['preparing', 'out_for_delivery'])
            ->whereNotNull('scheduled_for')
            ->where('scheduled_for', '<', $now)
            ->count();

        $staffTotal = DB::table('users')
            ->whereIn('role', ['staff', 'cashier', 'delivery'])
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->count();

        $activeStaff = ActivityLog::query()
            ->whereNotNull('user_id')
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->whereBetween('created_at', [$from, $to])
            ->distinct('user_id')
            ->count('user_id');

        $onlineStaff = ActivityLog::query()
            ->whereNotNull('user_id')
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->where('created_at', '>=', $now->copy()->subMinutes(15))
            ->distinct('user_id')
            ->count('user_id');

        $onLeave = max(0, $staffTotal - $activeStaff);

        $activities = ActivityLog::query()
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->with(['user:id,name,role,branch_key'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(function (ActivityLog $l) {
                $branchLabel = $l->branch_key === 'lagonglong' ? 'Lagonglong' : 'Balingasag';
                return [
                    'id' => $l->id,
                    'title' => (string) ($l->action ?? 'Activity'),
                    'description' => (string) ($l->details ?? ''),
                    'time' => $l->created_at?->diffForHumans() ?? '',
                    'branch' => $branchLabel,
                    'category' => $l->category,
                ];
            })
            ->values();

        $lowStockItems = DB::table('product_stocks')
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->when($branchKey !== 'all', fn ($q) => $q->where('product_stocks.branch_key', $branchKey))
            ->where('product_stocks.reorder_level', '>', 0)
            ->whereColumn('product_stocks.stock', '<=', 'product_stocks.reorder_level')
            ->orderBy('product_stocks.stock')
            ->limit(4)
            ->get([
                'products.name as name',
                'product_stocks.stock as stock',
                'product_stocks.reorder_level as reorder_level',
                'product_stocks.branch_key as branch_key',
            ]);

        $alerts = collect($lowStockItems)->map(function ($r) {
            $bk = (string) ($r->branch_key ?? '');
            $branchLabel = $bk === 'lagonglong' ? 'Lagonglong' : 'Balingasag';
            $stock = (int) ($r->stock ?? 0);
            $level = (int) ($r->reorder_level ?? 0);
            $severity = $stock <= 0 ? 'critical' : 'warning';
            $desc = $stock <= 0
                ? 'Out of stock'
                : "Low stock: {$stock} left (reorder at {$level})";

            return [
                'title' => (string) ($r->name ?? 'Item'),
                'description' => $desc,
                'severity' => $severity,
                'branch' => $branchLabel,
                'action_label' => 'View Inventory',
                'href' => '/inventory',
            ];
        })->values();

        $deliveryUpdates = PosDelivery::query()
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->whereBetween('updated_at', [$from, $to])
            ->orderByDesc('updated_at')
            ->limit(4)
            ->get(['ref', 'status', 'customer_name', 'branch_key', 'updated_at'])
            ->map(function (PosDelivery $d) {
                $bk = $d->branch_key;
                $branchLabel = $bk === 'lagonglong' ? 'Lagonglong' : 'Balingasag';
                $ref = (string) ($d->ref ?? $d->id);
                $customer = (string) ($d->customer_name ?? 'Customer');
                $status = (string) ($d->status ?? '');

                $statusLabel = match ($status) {
                    'delivered' => 'Delivered',
                    'out_for_delivery' => 'Out for Delivery',
                    default => 'Preparing',
                };

                $severity = $status === 'delivered' ? 'info' : 'warning';

                return [
                    'title' => "Delivery {$ref}",
                    'description' => "Status updated: {$statusLabel} ({$customer})",
                    'severity' => $severity,
                    'branch' => $branchLabel,
                    'action_label' => 'View Deliveries',
                    'href' => '/owner/delivery-monitoring',
                ];
            })
            ->values();

        $alerts = $alerts
            ->concat($deliveryUpdates)
            ->take(8)
            ->values();

        $categoryPerf = DB::table('pos_sales')
            ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->leftJoin('products', 'products.id', '=', 'pos_sale_items.product_id')
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->when($branchKey !== 'all', fn ($q) => $q->where('pos_sales.branch_key', $branchKey))
            ->selectRaw("COALESCE(NULLIF(TRIM(products.category),''), 'Uncategorized') as category")
            ->selectRaw('COALESCE(SUM(COALESCE(pos_sale_items.line_total, (pos_sale_items.qty * pos_sale_items.price))),0) as revenue')
            ->groupBy('category')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        $categoryPerf = collect($categoryPerf)->map(fn ($r) => [
            'name' => (string) ($r->category ?? 'Uncategorized'),
            'sales' => (float) ($r->revenue ?? 0),
        ])->values();

        $salesPerf = collect($salesByBranch)->map(function ($value, $key) {
            return [
                'branch_key' => $key,
                'label' => $key === 'lagonglong' ? 'Lagonglong' : 'Balingasag',
                'revenue' => (float) $value,
            ];
        })->values();

        return response()->json([
            'filters' => [
                'branch_key' => $branchKey,
                'range' => $range,
                'from' => $from->toDateTimeString(),
                'to' => $to->toDateTimeString(),
            ],
            'sales' => [
                'revenue' => $revenue,
                'orders' => $orders,
                'growth' => $growth,
                'by_branch' => $salesPerf,
            ],
            'inventory' => [
                'total' => $totalInventoryRows,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'categories' => $categories,
            ],
            'deliveries' => [
                'preparing' => $preparing,
                'out_for_delivery' => $outForDelivery,
                'delivered' => $delivered,
                'delayed' => $delayed,
            ],
            'staff' => [
                'total' => $staffTotal,
                'active' => $activeStaff,
                'on_leave' => $onLeave,
                'online' => $onlineStaff,
            ],
            'activity' => $activities,
            'alerts' => $alerts,
            'category_performance' => $categoryPerf,
        ]);
    }

    private function previousWindow(string $range, CarbonInterface $from, CarbonInterface $to): array
    {
        if ($range === 'today') {
            $prevFrom = $from->copy()->subDay()->startOfDay();
            $prevTo = $to->copy()->subDay()->endOfDay();
            return [$prevFrom, $prevTo];
        }

        if ($range === 'month') {
            $prevFrom = $from->copy()->subMonthNoOverflow()->startOfMonth();
            $prevTo = $from->copy()->subDay()->endOfDay();
            return [$prevFrom, $prevTo];
        }

        $prevFrom = $from->copy()->subWeek()->startOfWeek();
        $prevTo = $from->copy()->subDay()->endOfDay();
        return [$prevFrom, $prevTo];
    }
}
