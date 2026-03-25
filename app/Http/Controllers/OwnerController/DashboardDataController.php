<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\InventoryAdjustment;
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
            'range' => ['nullable', Rule::in(['today', 'week', 'month'])],
            'branch_key' => ['nullable', Rule::in(['all', 'lagonglong', 'balingasag'])],
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

        $salesTotals = DB::table('pos_sales')
            ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->when($branchKey !== 'all', fn ($q) => $q->where('pos_sales.branch_key', $branchKey))
            ->selectRaw('COUNT(DISTINCT pos_sales.id) as orders')
            ->selectRaw('COALESCE(SUM(pos_sale_items.line_total),0) as revenue')
            ->selectRaw('COALESCE(SUM(pos_sale_items.line_cost),0) as cost')
            ->first();

        $prevSalesTotals = DB::table('pos_sales')
            ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->whereBetween('pos_sales.created_at', [$prevFrom, $prevTo])
            ->when($branchKey !== 'all', fn ($q) => $q->where('pos_sales.branch_key', $branchKey))
            ->selectRaw('COALESCE(SUM(pos_sale_items.line_total),0) as revenue')
            ->first();

        $revenue = (float) ($salesTotals?->revenue ?? 0);
        $cost = (float) ($salesTotals?->cost ?? 0);
        $profit = $revenue - $cost;
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
            ->selectRaw('COUNT(*) as rows_count, SUM(product_stocks.stock) as total_inventory, COALESCE(COUNT(DISTINCT products.category),0) as categories')
            ->first();

        $totalInventoryRows = (int) data_get($inventoryTotals, 'rows_count', 0);
        $totalInventory = (int) data_get($inventoryTotals, 'total_inventory', 0);
        $categories = (int) data_get($inventoryTotals, 'categories', 0);

        $lowStock = (clone $stockQuery)
            ->where('product_stocks.reorder_level', '>', 0)
            ->whereColumn('product_stocks.stock', '<=', 'product_stocks.reorder_level')
            ->count();

        $outOfStock = (clone $stockQuery)
            ->where('product_stocks.stock', '<=', 0)
            ->count();

        $adjustmentStats = DB::table('inventory_adjustments')
            ->whereBetween('created_at', [$from, $to])
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->selectRaw("COALESCE(SUM(CASE WHEN qty_change > 0 THEN qty_change ELSE 0 END), 0) as restocked")
            ->selectRaw("COALESCE(SUM(CASE WHEN qty_change < 0 THEN ABS(qty_change) ELSE 0 END), 0) as deducted")
            ->selectRaw("COALESCE(SUM(qty_change), 0) as net_change")
            ->first();

        $restocked = (int) ($adjustmentStats?->restocked ?? 0);
        $deducted = (int) ($adjustmentStats?->deducted ?? 0);
        $netChange = (int) ($adjustmentStats?->net_change ?? 0);
        $initialInventory = $totalInventory - $netChange;

        $adjustments = DB::table('inventory_adjustments')
            ->whereBetween('created_at', [$from, $to])
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->count();

        $inventoryByBranch = collect(
            DB::table('product_stocks')
                ->join('products', 'products.id', '=', 'product_stocks.product_id')
                ->selectRaw('product_stocks.branch_key as branch_key')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('SUM(product_stocks.stock) as total_inventory')
                ->selectRaw("SUM(CASE WHEN product_stocks.reorder_level > 0 AND product_stocks.stock <= product_stocks.reorder_level THEN 1 ELSE 0 END) as low_stock")
                ->selectRaw("SUM(CASE WHEN product_stocks.stock <= 0 THEN 1 ELSE 0 END) as out_of_stock")
                ->selectRaw('COALESCE(COUNT(DISTINCT products.category),0) as categories')
                ->selectRaw("(SELECT COUNT(*) FROM inventory_adjustments WHERE inventory_adjustments.branch_key = product_stocks.branch_key AND inventory_adjustments.created_at BETWEEN '{$from}' AND '{$to}') as adjustments")
                ->selectRaw("(SELECT COALESCE(SUM(CASE WHEN qty_change > 0 THEN qty_change ELSE 0 END), 0) FROM inventory_adjustments WHERE inventory_adjustments.branch_key = product_stocks.branch_key AND inventory_adjustments.created_at BETWEEN '{$from}' AND '{$to}') as restocked")
                ->selectRaw("(SELECT COALESCE(SUM(CASE WHEN qty_change < 0 THEN ABS(qty_change) ELSE 0 END), 0) FROM inventory_adjustments WHERE inventory_adjustments.branch_key = product_stocks.branch_key AND inventory_adjustments.created_at BETWEEN '{$from}' AND '{$to}') as deducted")
                ->selectRaw("(SELECT COALESCE(SUM(qty_change), 0) FROM inventory_adjustments WHERE inventory_adjustments.branch_key = product_stocks.branch_key AND inventory_adjustments.created_at BETWEEN '{$from}' AND '{$to}') as net_change")
                ->groupBy('product_stocks.branch_key')
                ->get()
        )
            ->keyBy(fn ($r) => (string) ($r->branch_key ?? ''));

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

        $delayedByBranch = DB::table('pos_deliveries')
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('status', ['preparing', 'out_for_delivery'])
            ->whereNotNull('scheduled_for')
            ->where('scheduled_for', '<', $now)
            ->groupBy('branch_key')
            ->selectRaw('branch_key, COUNT(*) as delayed_count')
            ->pluck('delayed_count', 'branch_key');

        $deliveryByBranch = collect(
            DB::table('pos_deliveries')
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('branch_key')
                ->selectRaw("SUM(CASE WHEN status='preparing' THEN 1 ELSE 0 END) as preparing")
                ->selectRaw("SUM(CASE WHEN status='out_for_delivery' THEN 1 ELSE 0 END) as out_for_delivery")
                ->selectRaw("SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered")
                ->groupBy('branch_key')
                ->get()
        )
            ->keyBy(fn ($r) => (string) ($r->branch_key ?? ''));

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

        $onlineStaffUsers = DB::table('users')
            ->join('activity_logs', 'users.id', '=', 'activity_logs.user_id')
            ->where('activity_logs.created_at', '>=', $now->copy()->subMinutes(15))
            ->when($branchKey !== 'all', fn ($q) => $q->where('users.branch_key', $branchKey))
            ->distinct('users.id')
            ->select('users.name', 'users.branch_key')
            ->get()
            ->map(fn($u) => [
                'name' => $u->name,
                'branch' => $u->branch_key === 'lagonglong' ? 'Lagonglong' : 'Balingasag'
            ]);

        $onlineStaff = $onlineStaffUsers->count();

        $onLeave = max(0, $staffTotal - $activeStaff);

        $staffTotalByBranch = collect(
            DB::table('users')
                ->whereIn('role', ['staff', 'cashier', 'delivery'])
                ->selectRaw('branch_key')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('branch_key')
                ->get()
        )
            ->keyBy(fn ($r) => (string) ($r->branch_key ?? ''));

        $activeStaffByBranch = collect(
            DB::table('activity_logs')
                ->whereNotNull('user_id')
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('branch_key')
                ->selectRaw('COUNT(DISTINCT user_id) as active')
                ->groupBy('branch_key')
                ->get()
        )
            ->keyBy(fn ($r) => (string) ($r->branch_key ?? ''));

        $onlineStaffByBranch = collect(
            DB::table('activity_logs')
                ->whereNotNull('user_id')
                ->where('created_at', '>=', $now->copy()->subMinutes(15))
                ->selectRaw('branch_key')
                ->selectRaw('COUNT(DISTINCT user_id) as online')
                ->groupBy('branch_key')
                ->get()
        )
            ->keyBy(fn ($r) => (string) ($r->branch_key ?? ''));

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

        $alertsToReturn = $alerts;
        $notifications = $deliveryUpdates;

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

        $inventoryPerf = collect(['lagonglong', 'balingasag'])->map(function ($key) use ($inventoryByBranch) {
            $row = $inventoryByBranch->get($key);
            return [
                'branch_key' => $key,
                'label' => $key === 'lagonglong' ? 'Lagonglong' : 'Balingasag',
                'active_products' => (int) ($row?->total ?? 0),
                'total_inventory' => (int) ($row?->total_inventory ?? 0),
                'low_stock' => (int) ($row?->low_stock ?? 0),
                'out_of_stock' => (int) ($row?->out_of_stock ?? 0),
                'categories' => (int) ($row?->categories ?? 0),
                'adjustments' => (int) ($row?->adjustments ?? 0),
                'restocked' => (int) ($row?->restocked ?? 0),
                'deducted' => (int) ($row?->deducted ?? 0),
                'initial_inventory' => (int) ($row?->total_inventory ?? 0) - (int) ($row?->net_change ?? 0),
            ];
        })->values();

        $deliveryPerf = collect(['lagonglong', 'balingasag'])->map(function ($key) use ($deliveryByBranch) {
            $row = $deliveryByBranch->get($key);
            return [
                'branch_key' => $key,
                'label' => $key === 'lagonglong' ? 'Lagonglong' : 'Balingasag',
                'preparing' => (int) ($row?->preparing ?? 0),
                'out_for_delivery' => (int) ($row?->out_for_delivery ?? 0),
                'delivered' => (int) ($row?->delivered ?? 0),
                'delayed' => (int) ($delayedByBranch[$key] ?? 0),
            ];
        })->values();

        $staffPerf = collect(['lagonglong', 'balingasag'])->map(function ($key) use ($staffTotalByBranch, $activeStaffByBranch, $onlineStaffByBranch) {
            $total = (int) ($staffTotalByBranch->get($key)?->total ?? 0);
            $active = (int) ($activeStaffByBranch->get($key)?->active ?? 0);
            $online = (int) ($onlineStaffByBranch->get($key)?->online ?? 0);
            return [
                'branch_key' => $key,
                'label' => $key === 'lagonglong' ? 'Lagonglong' : 'Balingasag',
                'total' => $total,
                'active' => $active,
                'online' => $online,
                'on_leave' => max(0, $total - $active),
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
                'cost' => $cost,
                'profit' => $profit,
                'orders' => $orders,
                'growth' => $growth,
                'by_branch' => $salesPerf,
            ],
            'inventory' => [
                'active_products' => $totalInventoryRows,
                'total_inventory' => $totalInventory,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'categories' => $categories,
                'adjustments' => $adjustments,
                'restocked' => $restocked,
                'deducted' => $deducted,
                'initial_inventory' => $initialInventory,
                'by_branch' => $inventoryPerf,
            ],
            'deliveries' => [
                'preparing' => $preparing,
                'out_for_delivery' => $outForDelivery,
                'delivered' => $delivered,
                'delayed' => $delayed,
                'by_branch' => $deliveryPerf,
            ],
            'staff' => [
                'total' => $staffTotal,
                'active' => $activeStaff,
                'on_leave' => $onLeave,
                'online' => $onlineStaff,
                'online_staff' => $onlineStaffUsers,
                'by_branch' => $staffPerf,
            ],
            'activity' => $activities,
            'alerts' => $alertsToReturn,
            'notifications' => $notifications,
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
