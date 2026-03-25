<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\PosDelivery;
use App\Models\PosSale;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BranchComparisonController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/BranchComparison');
    }

    public function data(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => ['nullable', Rule::in(['1month', '3months', '6months', '1year'])],
        ]);

        $range = $validated['range'] ?? '6months';
        [$from, $to] = $this->resolveRange($range);
        [$prevFrom, $prevTo] = $this->previousWindow($range, $from, $to);

        $branches = ['lagonglong', 'balingasag'];
        $labels = [
            'lagonglong' => 'Lagonglong Main Branch',
            'balingasag' => 'Balingasag Branch',
        ];

        $salesAgg = PosSale::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('branch_key', $branches)
            ->selectRaw('branch_key, COALESCE(SUM(total),0) as revenue')
            ->groupBy('branch_key')
            ->get()
            ->keyBy('branch_key');

        $prevSalesAgg = PosSale::query()
            ->whereBetween('created_at', [$prevFrom, $prevTo])
            ->whereIn('branch_key', $branches)
            ->selectRaw('branch_key, COALESCE(SUM(total),0) as revenue')
            ->groupBy('branch_key')
            ->get()
            ->keyBy('branch_key');

        $deliveriesAgg = PosDelivery::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('branch_key', $branches)
            ->selectRaw('branch_key, COUNT(*) as deliveries')
            ->groupBy('branch_key')
            ->get()
            ->keyBy('branch_key');

        $avgDeliveryValueByBranch = DB::table('pos_deliveries')
            ->join('pos_sales', 'pos_sales.id', '=', 'pos_deliveries.pos_sale_id')
            ->whereBetween('pos_deliveries.created_at', [$from, $to])
            ->whereIn('pos_deliveries.branch_key', $branches)
            ->selectRaw('pos_deliveries.branch_key as branch_key')
            ->selectRaw('AVG(pos_sales.total) as avg_value')
            ->groupBy('pos_deliveries.branch_key')
            ->pluck('avg_value', 'branch_key');

        $topProductByBranch = [];
        foreach ($branches as $bk) {
            $top = DB::table('pos_sales')
                ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
                ->whereBetween('pos_sales.created_at', [$from, $to])
                ->where('pos_sales.branch_key', $bk)
                ->selectRaw('pos_sale_items.name as name, COALESCE(SUM(pos_sale_items.line_total),0) as revenue')
                ->groupBy('pos_sale_items.name')
                ->orderByDesc('revenue')
                ->limit(1)
                ->first();
            $topProductByBranch[$bk] = (string) ($top->name ?? '—');
        }

        $salesByBranch = [];
        $totalRevenue = 0.0;
        $totalDeliveries = 0;
        foreach ($branches as $bk) {
            $revenue = (float) ($salesAgg[$bk]->revenue ?? 0);
            $deliveries = (int) ($deliveriesAgg[$bk]->deliveries ?? 0);
            $prevRevenue = (float) ($prevSalesAgg[$bk]->revenue ?? 0);
            $growth = $prevRevenue > 0 ? round((($revenue - $prevRevenue) / $prevRevenue) * 100, 2) : ($revenue > 0 ? 100 : 0);
            $avgDeliveryValue = (float) ($avgDeliveryValueByBranch[$bk] ?? 0);

            $totalRevenue += $revenue;
            $totalDeliveries += $deliveries;
            $salesByBranch[$bk] = [
                'branch_key' => $bk,
                'name' => $labels[$bk],
                'totalSales' => $revenue,
                'totalDeliveries' => $deliveries,
                'avgDeliveryValue' => round($avgDeliveryValue, 2),
                'growth' => $growth,
                'topProduct' => $topProductByBranch[$bk] ?? '—',
            ];
        }

        $totalCustomers = (int) DB::table('pos_deliveries')
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('branch_key', $branches)
            ->whereNotNull('customer_name')
            ->whereRaw("TRIM(customer_name) <> ''")
            ->distinct('customer_name')
            ->count('customer_name');

        $avgDeliveryValueAll = $totalDeliveries > 0 ? round($totalRevenue / $totalDeliveries, 2) : 0;

        $categoryRows = DB::table('pos_sales')
            ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->leftJoin('products', 'products.id', '=', 'pos_sale_items.product_id')
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->whereIn('pos_sales.branch_key', $branches)
            ->selectRaw("COALESCE(NULLIF(TRIM(products.category),''), 'Uncategorized') as category")
            ->selectRaw("SUM(CASE WHEN pos_sales.branch_key='lagonglong' THEN pos_sale_items.line_total ELSE 0 END) as lagonglong")
            ->selectRaw("SUM(CASE WHEN pos_sales.branch_key='balingasag' THEN pos_sale_items.line_total ELSE 0 END) as balingasag")
            ->groupBy('category')
            ->orderByDesc(DB::raw('lagonglong + balingasag'))
            ->limit(10)
            ->get();

        $categoryComparison = $categoryRows->map(fn ($r) => [
            'category' => (string) $r->category,
            'lagonglong' => (float) ($r->lagonglong ?? 0),
            'balingasag' => (float) ($r->balingasag ?? 0),
        ])->values();

        $topProductsRows = DB::table('pos_sales')
            ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->whereBetween('pos_sales.created_at', [$from, $to])
            ->whereIn('pos_sales.branch_key', $branches)
            ->selectRaw('pos_sale_items.name as product')
            ->selectRaw("SUM(CASE WHEN pos_sales.branch_key='lagonglong' THEN pos_sale_items.line_total ELSE 0 END) as lagonglongSales")
            ->selectRaw("SUM(CASE WHEN pos_sales.branch_key='balingasag' THEN pos_sale_items.line_total ELSE 0 END) as balingasagSales")
            ->groupBy('pos_sale_items.name')
            ->orderByDesc(DB::raw('lagonglongSales + balingasagSales'))
            ->limit(10)
            ->get();

        $topProducts = $topProductsRows->map(fn ($r) => [
            'product' => (string) $r->product,
            'lagonglongSales' => (float) ($r->lagonglongSales ?? 0),
            'balingasagSales' => (float) ($r->balingasagSales ?? 0),
        ])->values();

        $monthlyRows = PosSale::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('branch_key', $branches)
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym")
            ->selectRaw("SUM(CASE WHEN branch_key='lagonglong' THEN total ELSE 0 END) as lagonglong")
            ->selectRaw("SUM(CASE WHEN branch_key='balingasag' THEN total ELSE 0 END) as balingasag")
            ->groupBy('ym')
            ->orderBy('ym')
            ->get();

        $monthlySales = $monthlyRows->map(function ($r) {
            $ym = (string) $r->ym;
            $month = $ym;
            try {
                $month = Carbon::createFromFormat('Y-m', $ym)->format('M');
            } catch (\Throwable $e) {
            }

            return [
                'month' => $month,
                'lagonglong' => (float) ($r->lagonglong ?? 0),
                'balingasag' => (float) ($r->balingasag ?? 0),
            ];
        })->values();

        return response()->json([
            'filters' => [
                'range' => $range,
                'from' => $from->toDateTimeString(),
                'to' => $to->toDateTimeString(),
                'prev_from' => $prevFrom->toDateTimeString(),
                'prev_to' => $prevTo->toDateTimeString(),
            ],
            'summary' => [
                'totalSales' => $totalRevenue,
                'totalDeliveries' => $totalDeliveries,
                'totalCustomers' => $totalCustomers,
                'avgDeliveryValue' => $avgDeliveryValueAll,
            ],
            'branches' => $salesByBranch,
            'monthlySales' => $monthlySales,
            'categoryComparison' => $categoryComparison,
            'topProducts' => $topProducts,
        ]);
    }

    private function resolveRange(string $range): array
    {
        $now = now();
        $to = $now->copy()->endOfDay();

        $from = match ($range) {
            '1month' => $now->copy()->subMonthNoOverflow()->startOfDay(),
            '3months' => $now->copy()->subMonthsNoOverflow(3)->startOfDay(),
            '1year' => $now->copy()->subYearNoOverflow()->startOfDay(),
            default => $now->copy()->subMonthsNoOverflow(6)->startOfDay(),
        };

        return [$from, $to];
    }

    private function previousWindow(string $range, $from, $to): array
    {
        $from = $from->copy();
        $to = $to->copy();

        if ($range === '1month') {
            return [$from->copy()->subMonthNoOverflow(), $to->copy()->subMonthNoOverflow()];
        }

        if ($range === '3months') {
            return [$from->copy()->subMonthsNoOverflow(3), $to->copy()->subMonthsNoOverflow(3)];
        }

        if ($range === '1year') {
            return [$from->copy()->subYearNoOverflow(), $to->copy()->subYearNoOverflow()];
        }

        return [$from->copy()->subMonthsNoOverflow(6), $to->copy()->subMonthsNoOverflow(6)];
    }
}
