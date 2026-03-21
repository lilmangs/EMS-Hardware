<?php

namespace App\Http\Controllers\CashierController;
use App\Http\Controllers\Controller;
use App\Models\InventoryAdjustment;
use App\Models\PosRefund;
use App\Models\PosRefundItem;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RefundController extends Controller
{
    public function index()
    {
        $user = request()->user();
        $branchKey = $user?->branch_key;

        $recentRefunds = [];
        if (is_string($branchKey) && trim($branchKey) !== '') {
            $recentRefunds = PosRefund::query()
                ->where('branch_key', $branchKey)
                ->where('processed_by_user_id', $user?->id)
                ->whereIn('status', ['approved', 'rejected'])
                ->with(['items:id,pos_refund_id,name,qty,amount', 'sale:id,ref'])
                ->latest()
                ->limit(20)
                ->get()
                ->map(function (PosRefund $r) {
                    return [
                        'id' => $r->id,
                        'ref' => $r->ref,
                        'sale_ref' => $r->sale?->ref,
                        'status' => $r->status,
                        'amount' => $r->amount,
                        'reason' => $r->reason,
                        'restock' => (bool) $r->restock,
                        'created_at' => $r->created_at,
                        'items' => $r->items->map(fn ($it) => [
                            'name' => $it->name,
                            'qty' => (int) $it->qty,
                            'amount' => $it->amount,
                        ])->values(),
                    ];
                })
                ->values();
        }

        return Inertia::render('Cashier/Refund', [
            'branch_key' => is_string($branchKey) ? $branchKey : null,
            'recent_refunds' => $recentRefunds,
        ]);
    }

    public function sale(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json(['ok' => false, 'message' => 'No assigned branch.'], 422);
        }

        $validated = $request->validate([
            'ref' => ['required', 'string', 'max:50'],
        ]);

        $ref = trim((string) $validated['ref']);

        $sale = PosSale::query()
            ->where('ref', $ref)
            ->where('branch_key', $branchKey)
            ->with(['items:id,pos_sale_id,product_id,name,price,qty,line_total'])
            ->first();

        if (!$sale) {
            return response()->json(['ok' => false, 'message' => 'Sale not found in this branch.'], 404);
        }

        $refundedBySaleItemId = PosRefundItem::query()
            ->whereHas('refund', function ($q) use ($sale) {
                $q->where('pos_sale_id', $sale->id);
            })
            ->selectRaw('pos_sale_item_id, SUM(qty) as refunded_qty')
            ->groupBy('pos_sale_item_id')
            ->pluck('refunded_qty', 'pos_sale_item_id');

        $items = $sale->items
            ->map(function (PosSaleItem $it) use ($refundedBySaleItemId) {
                $refundedQty = (int) ($refundedBySaleItemId[$it->id] ?? 0);
                $purchasedQty = (int) $it->qty;
                $remainingQty = max(0, $purchasedQty - $refundedQty);

                return [
                    'id' => $it->id,
                    'product_id' => $it->product_id,
                    'name' => $it->name,
                    'price' => (float) $it->price,
                    'purchased_qty' => $purchasedQty,
                    'refunded_qty' => $refundedQty,
                    'remaining_qty' => $remainingQty,
                ];
            })
            ->values();

        return response()->json([
            'ok' => true,
            'sale' => [
                'id' => $sale->id,
                'ref' => $sale->ref,
                'branch_key' => $sale->branch_key,
                'created_at' => $sale->created_at,
                'total' => (float) $sale->total,
                'items' => $items,
            ],
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json(['ok' => false, 'message' => 'No assigned branch.'], 422);
        }

        $validated = $request->validate([
            'sale_ref' => ['required', 'string', 'max:50'],
            'condition' => ['nullable', Rule::in(['resellable', 'defective'])],
            'reason' => ['required', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.pos_sale_item_id' => ['required', 'integer', 'exists:pos_sale_items,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ]);

        $saleRef = trim((string) $validated['sale_ref']);

        $sale = PosSale::query()
            ->where('ref', $saleRef)
            ->where('branch_key', $branchKey)
            ->with(['items:id,pos_sale_id,product_id,name,price,qty,line_total'])
            ->first();

        if (!$sale) {
            return response()->json(['ok' => false, 'message' => 'Sale not found in this branch.'], 404);
        }

        $requested = collect($validated['items'] ?? [])
            ->map(fn ($it) => [
                'pos_sale_item_id' => (int) $it['pos_sale_item_id'],
                'qty' => (int) $it['qty'],
            ])
            ->filter(fn ($it) => $it['pos_sale_item_id'] > 0 && $it['qty'] > 0)
            ->values();

        if ($requested->isEmpty()) {
            return response()->json(['ok' => false, 'message' => 'No refund items selected.'], 422);
        }

        $saleItemsById = $sale->items->keyBy('id');
        foreach ($requested as $it) {
            if (!$saleItemsById->has($it['pos_sale_item_id'])) {
                return response()->json(['ok' => false, 'message' => 'One or more items do not belong to this sale.'], 422);
            }
        }

        $saleItemIds = $requested->pluck('pos_sale_item_id')->unique()->values()->all();
        $alreadyRefunded = PosRefundItem::query()
            ->whereIn('pos_sale_item_id', $saleItemIds)
            ->whereHas('refund', function ($q) use ($sale) {
                $q->where('pos_sale_id', $sale->id);
            })
            ->selectRaw('pos_sale_item_id, SUM(qty) as refunded_qty')
            ->groupBy('pos_sale_item_id')
            ->pluck('refunded_qty', 'pos_sale_item_id');

        $now = now();
        $refundRef = sprintf(
            'R-%s-%s',
            $now->format('Ymd'),
            substr(str_replace('.', '', (string) microtime(true)), -6)
        );

        $condition = $validated['condition'] ?? 'resellable';
        if (!is_string($condition) || trim($condition) === '') {
            $condition = 'resellable';
        }

        $restock = $condition === 'resellable';

        $refundId = null;

        DB::transaction(function () use ($requested, $saleItemsById, $alreadyRefunded, $branchKey, $user, $sale, $validated, $refundRef, $restock, $condition, &$refundId) {
            $amount = 0.0;

            foreach ($requested as $req) {
                /** @var PosSaleItem $saleItem */
                $saleItem = $saleItemsById->get($req['pos_sale_item_id']);

                $purchasedQty = (int) $saleItem->qty;
                $refundedQty = (int) ($alreadyRefunded[$saleItem->id] ?? 0);
                $remainingQty = max(0, $purchasedQty - $refundedQty);
                $qty = (int) $req['qty'];

                if ($qty <= 0 || $qty > $remainingQty) {
                    abort(422, 'Refund quantity exceeds remaining refundable quantity.');
                }

                $lineAmount = ((float) $saleItem->price) * $qty;
                $amount += $lineAmount;
            }

            $refund = PosRefund::create([
                'ref' => $refundRef,
                'pos_sale_id' => $sale->id,
                'branch_key' => $branchKey,
                'customer_name' => null,
                'amount' => $amount,
                'reason' => $validated['reason'],
                'restock' => $restock,
                'status' => 'approved',
                'processed_by_user_id' => $user?->id,
                'processed_at' => now(),
            ]);

            $refundId = $refund->id;

            foreach ($requested as $req) {
                /** @var PosSaleItem $saleItem */
                $saleItem = $saleItemsById->get($req['pos_sale_item_id']);
                $qty = (int) $req['qty'];

                $productId = $saleItem->product_id ? (int) $saleItem->product_id : null;
                $lineAmount = ((float) $saleItem->price) * $qty;

                PosRefundItem::create([
                    'pos_refund_id' => $refund->id,
                    'pos_sale_item_id' => $saleItem->id,
                    'product_id' => $productId,
                    'name' => $saleItem->name,
                    'qty' => $qty,
                    'amount' => $lineAmount,
                ]);
            }

            // Always return items to branch stock totals.
            // If condition is defective, we return them as defective units (not sellable).

            $alreadyAdjusted = InventoryAdjustment::query()
                ->where('reference_id', $refund->id)
                ->where('reference_type', PosRefund::class)
                ->where('type', 'return')
                ->exists();

            if ($alreadyAdjusted) {
                return;
            }

            $refundItems = PosRefundItem::query()
                ->where('pos_refund_id', $refund->id)
                ->get(['product_id', 'qty']);

            foreach ($refundItems as $it) {
                $productId = $it->product_id ? (int) $it->product_id : null;
                if (!$productId) continue;

                $qty = (int) $it->qty;
                if ($qty <= 0) continue;

                $stock = ProductStock::query()
                    ->where('product_id', $productId)
                    ->where('branch_key', $branchKey)
                    ->lockForUpdate()
                    ->first();

                if (!$stock) {
                    $stock = ProductStock::create([
                        'product_id' => $productId,
                        'branch_key' => $branchKey,
                        'stock' => 0,
                    ]);
                }

                $before = (int) $stock->stock;
                $after = $before + $qty;

                $update = ['stock' => $after];
                if ($condition === 'defective') {
                    $defectiveBefore = (int) ($stock->defective_qty ?? 0);
                    $update['defective_qty'] = $defectiveBefore + $qty;
                }

                $stock->update($update);

                InventoryAdjustment::create([
                    'product_id' => $productId,
                    'branch_key' => $branchKey,
                    'type' => 'return',
                    'qty_change' => $qty,
                    'stock_before' => $before,
                    'stock_after' => $after,
                    'reference_id' => $refund->id,
                    'reference_type' => PosRefund::class,
                    'performed_by' => $user?->id,
                    'note' => 'Refund processed: ' . $refund->ref,
                ]);

                $product = Product::query()->find($productId);
                if ($product) {
                    $totalStock = (int) ProductStock::query()->where('product_id', $productId)->sum('stock');

                    $nextStatus = $product->status;
                    if ($product->status !== 'defective') {
                        $nextStatus = $totalStock > 0 ? 'reserved' : 'out_of_stock';
                    }

                    $product->update([
                        'stock' => $totalStock,
                        'status' => $nextStatus,
                    ]);
                }
            }
        });

        return response()->json([
            'ok' => true,
            'refund_id' => $refundId,
            'ref' => $refundRef,
        ]);
    }
}
