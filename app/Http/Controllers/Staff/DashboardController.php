<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\InventoryAdjustment;
use App\Models\InventoryRestock;
use App\Models\ProductStock;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return Inertia::render('Staff/Dashboard', [
                'branch_key' => null,
                'stats' => [
                    'total_products' => 0,
                    'total_units' => 0,
                    'low_stock_count' => 0,
                    'out_of_stock_count' => 0,
                ],
                'low_stock_items' => [],
                'recent_restocks' => [],
                'recent_adjustments' => [],
            ]);
        }

        $stocksQuery = ProductStock::query()
            ->where('branch_key', $branchKey)
            ->with([
                'product:id,sku,name,category,price,image_path',
            ]);

        $totalProducts = (clone $stocksQuery)->count();
        $totalUnits = (clone $stocksQuery)->sum('stock');

        $lowStockCount = (clone $stocksQuery)
            ->where('reorder_level', '>', 0)
            ->where('stock', '>', 0)
            ->whereColumn('stock', '<=', 'reorder_level')
            ->count();

        $outOfStockCount = (clone $stocksQuery)
            ->where('stock', '=', 0)
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
            ->limit(10)
            ->get()
            ->map(function (ProductStock $ps) {
                return [
                    'product_id' => $ps->product_id,
                    'sku' => $ps->product?->sku,
                    'name' => $ps->product?->name,
                    'category' => $ps->product?->category,
                    'price' => $ps->product?->price,
                    'image_path' => $ps->product?->image_path,
                    'stock' => $ps->stock,
                    'reorder_level' => (int) ($ps->reorder_level ?? 0),
                ];
            })
            ->values();

        $recentRestocks = InventoryRestock::query()
            ->where('branch_key', $branchKey)
            ->with([
                'product:id,sku,name',
                'performer:id,name',
            ])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function (InventoryRestock $r) {
                return [
                    'id' => $r->id,
                    'created_at' => $r->created_at,
                    'qty' => $r->qty,
                    'note' => $r->note,
                    'product' => [
                        'id' => $r->product?->id,
                        'sku' => $r->product?->sku,
                        'name' => $r->product?->name,
                    ],
                    'performed_by' => $r->performer?->name,
                ];
            })
            ->values();

        $recentAdjustments = InventoryAdjustment::query()
            ->where('branch_key', $branchKey)
            ->with([
                'product:id,sku,name',
                'performer:id,name',
            ])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function (InventoryAdjustment $a) {
                return [
                    'id' => $a->id,
                    'created_at' => $a->created_at,
                    'type' => $a->type,
                    'qty_change' => $a->qty_change,
                    'note' => $a->note,
                    'product' => [
                        'id' => $a->product?->id,
                        'sku' => $a->product?->sku,
                        'name' => $a->product?->name,
                    ],
                    'performed_by' => $a->performer?->name,
                ];
            })
            ->values();

        return Inertia::render('Staff/Dashboard', [
            'branch_key' => $branchKey,
            'stats' => [
                'total_products' => $totalProducts,
                'total_units' => (int) $totalUnits,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
            ],
            'low_stock_items' => $lowStockItems,
            'recent_restocks' => $recentRestocks,
            'recent_adjustments' => $recentAdjustments,
        ]);
    }
}
