<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SalesreportsController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/SalesReports');
    }

    public function show(Request $request, PosSale $sale): JsonResponse
    {
        $sale->load([
            'items:id,pos_sale_id,name,price,qty,line_total',
            'delivery:id,pos_sale_id,delivery_fee',
        ]);

        return response()->json([
            'sale' => [
                'id' => $sale->id,
                'ref' => $sale->ref,
                'branch_key' => $sale->branch_key,
                'created_at' => $sale->created_at?->toISOString(),
                'subtotal' => (float) ($sale->subtotal ?? 0),
                'delivery_fee' => $sale->delivery ? (float) ($sale->delivery->delivery_fee ?? 0) : 0.0,
                'total' => (float) ($sale->total ?? 0),
                'items' => $sale->items->map(function ($it) {
                    return [
                        'name' => $it->name,
                        'price' => (float) ($it->price ?? 0),
                        'qty' => (int) ($it->qty ?? 0),
                        'line_total' => (float) ($it->line_total ?? 0),
                    ];
                })->values(),
            ],
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_key' => ['nullable', Rule::in(['all', 'lagonglong', 'balingasag'])],
            'range' => ['nullable', Rule::in(['today', 'week', 'month'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $branchKey = $validated['branch_key'] ?? 'all';
        $range = $validated['range'] ?? 'week';
        $perPage = (int) ($validated['per_page'] ?? 10);

        $now = now();
        $from = match ($range) {
            'today' => $now->copy()->startOfDay(),
            'month' => $now->copy()->startOfMonth(),
            default => $now->copy()->startOfWeek(),
        };
        $to = $now->copy()->endOfDay();

        $query = PosSale::query()->with(['items:id,pos_sale_id,qty', 'delivery:id,pos_sale_id,delivery_fee']);

        if ($branchKey !== 'all') {
            $query->where('branch_key', $branchKey);
        }

        $query->whereBetween('created_at', [$from, $to]);

        $driver = DB::connection()->getDriverName();
        $groupExpr = match ($range) {
            'today' => $driver === 'pgsql'
                ? "to_char(created_at, 'HH24:00')"
                : "DATE_FORMAT(created_at, '%H:00')",
            default => $driver === 'pgsql'
                ? "to_char(created_at, 'YYYY-MM-DD')"
                : "DATE(created_at)",
        };

        $trendRows = (clone $query)
            ->selectRaw("{$groupExpr} as bucket, COALESCE(SUM(total),0) as revenue")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get();

        $trend = $trendRows
            ->map(fn ($r) => [
                'label' => (string) ($r->bucket ?? ''),
                'revenue' => (float) ($r->revenue ?? 0),
            ])
            ->values();

        $totals = (clone $query)
            ->selectRaw('COUNT(*) as orders, COALESCE(SUM(total),0) as revenue, COALESCE(SUM(subtotal),0) as subtotal')
            ->first();

        $paginator = (clone $query)
            ->latest()
            ->paginate($perPage)
            ->appends($request->query());

        $salesForPage = collect($paginator->items());
        $itemsSoldQuery = DB::table('pos_sales')
            ->join('pos_sale_items', 'pos_sales.id', '=', 'pos_sale_items.pos_sale_id')
            ->whereBetween('pos_sales.created_at', [$from, $to]);

        if ($branchKey !== 'all') {
            $itemsSoldQuery->where('pos_sales.branch_key', $branchKey);
        }

        $itemsSold = $itemsSoldQuery
            ->selectRaw('COALESCE(SUM(pos_sale_items.qty),0) as items')
            ->value('items');
        $orders = (int) ($totals?->orders ?? 0);
        $revenue = (float) ($totals?->revenue ?? 0);
        $subtotal = (float) ($totals?->subtotal ?? 0);

        return response()->json([
            'filters' => [
                'branch_key' => $branchKey,
                'range' => $range,
                'from' => $from->toDateTimeString(),
                'to' => $to->toDateTimeString(),
            ],
            'trend' => $trend,
            'summary' => [
                'revenue' => $revenue,
                'subtotal' => $subtotal,
                'orders' => $orders,
                'items' => (int) $itemsSold,
                'avg_order_value' => $orders > 0 ? round($revenue / $orders, 2) : 0,
            ],
            'transactions' => [
                'data' => $salesForPage->map(function (PosSale $s) {
                    return [
                        'id' => $s->id,
                        'ref' => $s->ref,
                        'branch_key' => $s->branch_key,
                        'items' => (int) $s->items->sum('qty'),
                        'delivery_fee' => $s->delivery ? (float) $s->delivery->delivery_fee : 0.0,
                        'total' => (float) $s->total,
                        'subtotal' => (float) $s->subtotal,
                        'created_at' => $s->created_at?->toISOString(),
                    ];
                })->values(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'last_page' => $paginator->lastPage(),
                    'total' => $paginator->total(),
                ],
            ],
        ]);
    }
}
