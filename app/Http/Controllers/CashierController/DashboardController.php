<?php

namespace App\Http\Controllers\CashierController;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\ProductStock;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        $validated = $request->validate([
            'range' => ['nullable', Rule::in(['today', 'week', 'month'])],
        ]);

        $range = $validated['range'] ?? 'today';

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return Inertia::render('Cashier/Dashboard', [
                'branch_key' => null,
                'range' => $range,
                'stats' => [
                    'revenue' => 0.0,
                    'orders' => 0,
                    'avg_order' => 0.0,
                    'growth' => 0.0,
                    'items_sold' => 0,
                    'customers_served' => 0,
                    'inventory' => [
                        'total_rows' => 0,
                        'low_stock' => 0,
                        'out_of_stock' => 0,
                        'categories' => 0,
                    ],
                ],
                'sales_by_hour' => [
                    'labels' => [],
                    'values' => [],
                    'max' => 0,
                ],
                'top_products' => [],
                'low_stock_items' => [],
            ]);
        }

        $now = now();
        $from = match ($range) {
            'today' => $now->copy()->startOfDay(),
            'month' => $now->copy()->startOfMonth(),
            default => $now->copy()->startOfWeek(),
        };
        $to = $now->copy()->endOfDay();

        [$prevFrom, $prevTo] = $this->previousWindow($range, $from, $to);

        $salesQuery = PosSale::query()
            ->where('branch_key', $branchKey)
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$from, $to]);

        $prevSalesQuery = PosSale::query()
            ->where('branch_key', $branchKey)
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$prevFrom, $prevTo]);

        $salesTotals = (clone $salesQuery)
            ->selectRaw('COUNT(*) as orders, COALESCE(SUM(total),0) as revenue')
            ->first();

        $prevSalesTotals = (clone $prevSalesQuery)
            ->selectRaw('COALESCE(SUM(total),0) as revenue')
            ->first();

        $revenue = (float) ($salesTotals?->revenue ?? 0);
        $orders = (int) ($salesTotals?->orders ?? 0);
        $avgOrder = $orders > 0 ? round($revenue / $orders, 2) : 0.0;

        $prevRevenue = (float) ($prevSalesTotals?->revenue ?? 0);
        $growth = $prevRevenue > 0
            ? round((($revenue - $prevRevenue) / $prevRevenue) * 100, 2)
            : ($revenue > 0 ? 100.0 : 0.0);

        $itemsSold = PosSaleItem::query()
            ->join('pos_sales', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->where('pos_sales.branch_key', $branchKey)
            ->where('pos_sales.user_id', $user->id)
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->sum('pos_sale_items.qty');

        $stocksQuery = ProductStock::query()
            ->where('branch_key', $branchKey)
            ->with([
                'product:id,sku,name,category,price,image_path',
            ]);

        $inventoryTotals = (clone $stocksQuery)->count();
        $categories = DB::table('product_stocks')
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->where('product_stocks.branch_key', $branchKey)
            ->selectRaw('COUNT(DISTINCT products.category) as categories')
            ->first();

        $lowStock = (clone $stocksQuery)
            ->where('reorder_level', '>', 0)
            ->whereColumn('stock', '<=', 'reorder_level')
            ->where('stock', '>', 0)
            ->count();

        $outOfStock = (clone $stocksQuery)
            ->where('stock', '<=', 0)
            ->count();

        $lowStockItems = (clone $stocksQuery)
            ->where(function ($q) {
                $q->where('stock', '<=', 0)
                    ->orWhere(function ($q2) {
                        $q2->where('reorder_level', '>', 0)
                            ->where('stock', '>', 0)
                            ->whereColumn('stock', '<=', 'reorder_level');
                    });
            })
            ->orderBy('stock')
            ->limit(6)
            ->get()
            ->map(function (ProductStock $ps) {
                return [
                    'product_id' => $ps->product_id,
                    'sku' => $ps->product?->sku,
                    'name' => $ps->product?->name,
                    'stock' => (int) ($ps->stock ?? 0),
                    'reorder_level' => (int) ($ps->reorder_level ?? 0),
                ];
            })
            ->values();

        $topProducts = PosSaleItem::query()
            ->join('pos_sales', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->where('pos_sales.branch_key', $branchKey)
            ->where('pos_sales.user_id', $user->id)
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->groupBy('pos_sale_items.name')
            ->selectRaw('pos_sale_items.name as name, SUM(pos_sale_items.qty) as qty, COALESCE(SUM(pos_sale_items.line_total),0) as revenue')
            ->orderByDesc('revenue')
            ->limit(3)
            ->get()
            ->map(function ($r) {
                return [
                    'name' => (string) ($r->name ?? ''),
                    'qty' => (int) ($r->qty ?? 0),
                    'revenue' => (float) ($r->revenue ?? 0),
                ];
            })
            ->values();

        $hourBuckets = PosSale::query()
            ->where('branch_key', $branchKey)
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('HOUR(created_at) as hr, COALESCE(SUM(total),0) as revenue')
            ->groupBy('hr')
            ->pluck('revenue', 'hr');

        $labels = [];
        $values = [];
        for ($h = 9; $h <= 20; $h++) {
            $labels[] = Carbon::createFromTime($h, 0)->format('gA');
            $values[] = (float) ($hourBuckets[$h] ?? 0);
        }
        $max = (int) ceil(max([1, ...array_map(fn ($v) => (float) $v, $values)]) / 100) * 100;

        return Inertia::render('Cashier/Dashboard', [
            'branch_key' => $branchKey,
            'range' => $range,
            'stats' => [
                'revenue' => $revenue,
                'orders' => $orders,
                'avg_order' => $avgOrder,
                'growth' => $growth,
                'items_sold' => (int) $itemsSold,
                'customers_served' => $orders,
                'inventory' => [
                    'total_rows' => (int) $inventoryTotals,
                    'low_stock' => (int) $lowStock,
                    'out_of_stock' => (int) $outOfStock,
                    'categories' => (int) ($categories?->categories ?? 0),
                ],
            ],
            'sales_by_hour' => [
                'labels' => $labels,
                'values' => $values,
                'max' => $max,
            ],
            'top_products' => $topProducts,
            'low_stock_items' => $lowStockItems,
        ]);
    }

    private function previousWindow(string $range, $from, $to): array
    {
        $durationSeconds = $to->diffInSeconds($from);

        return match ($range) {
            'today' => [$from->copy()->subDay(), $to->copy()->subDay()],
            'month' => [$from->copy()->subMonthNoOverflow(), $to->copy()->subMonthNoOverflow()],
            default => [$from->copy()->subWeek(), $to->copy()->subWeek()],
        };
    }
}
