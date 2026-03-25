<?php

namespace App\Http\Controllers\CashierController;
use App\Http\Controllers\Controller;
use App\Models\InventoryAdjustment;
use App\Models\PosCart;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CheckoutController extends Controller
{
  public function index()
  {
    $user = request()->user();
    $branchKey = $user?->branch_key;

    if (!is_string($branchKey) || trim($branchKey) === '') {
      return Inertia::render('Cashier/Checkout', [
        'branch_key' => null,
        'products' => [],
        'cart' => [
          'items' => [],
          'received' => 0,
        ],
      ]);
    }

    $cart = PosCart::query()->firstOrCreate(
      ['user_id' => $user->id, 'branch_key' => $branchKey],
      ['items' => [], 'received' => 0]
    );

    $stocks = ProductStock::query()
      ->where('branch_key', $branchKey)
      ->with(['product:id,sku,barcode_value,name,price,purchase_cost,image_path'])
      ->get();

    $products = $stocks
      ->map(function (ProductStock $ps) {
        $sellable = max(0, ((int) $ps->stock) - ((int) ($ps->defective_qty ?? 0)));
        return [
          'id' => $ps->product_id,
          'sku' => $ps->product?->sku,
          'barcode_value' => $ps->product?->barcode_value,
          'name' => $ps->product?->name,
          'price' => $ps->product?->price,
          'purchase_cost' => $ps->product?->purchase_cost,
          'image_path' => $ps->product?->image_path,
          'stock' => $sellable,
        ];
      })
      ->filter(fn ($p) => !empty($p['name']))
      ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
      ->values();

    return Inertia::render('Cashier/Checkout', [
      'branch_key' => $branchKey,
      'products' => $products,
      'cart' => [
        'items' => is_array($cart->items) ? $cart->items : [],
        'received' => (float) $cart->received,
      ],
    ]);
  }

  public function saveCart(Request $request): JsonResponse
  {
    $user = $request->user();
    $branchKey = $user?->branch_key;

    if (!is_string($branchKey) || trim($branchKey) === '') {
      return response()->json(['ok' => false, 'message' => 'No assigned branch.'], 422);
    }

    $validated = $request->validate([
      'received' => ['nullable', 'numeric', 'min:0'],
      'items' => ['nullable', 'array'],
      'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
      'items.*.qty' => ['required', 'integer', 'min:1'],
    ]);

    $items = collect($validated['items'] ?? [])
      ->map(fn ($it) => ['product_id' => (int) $it['product_id'], 'qty' => (int) $it['qty']])
      ->values()
      ->all();

    $received = array_key_exists('received', $validated) ? (float) $validated['received'] : 0;

    // If cart is cleared, remove the draft row entirely.
    if (count($items) === 0 && $received <= 0) {
      PosCart::query()
        ->where('user_id', $user->id)
        ->where('branch_key', $branchKey)
        ->delete();

      return response()->json([
        'ok' => true,
        'cart' => [
          'items' => [],
          'received' => 0,
        ],
      ]);
    }

    $cart = PosCart::query()->updateOrCreate(
      ['user_id' => $user->id, 'branch_key' => $branchKey],
      ['items' => $items, 'received' => $received]
    );

    return response()->json([
      'ok' => true,
      'cart' => [
        'items' => is_array($cart->items) ? $cart->items : [],
        'received' => (float) $cart->received,
      ],
    ]);
  }

  public function complete(Request $request): JsonResponse
  {
    $user = $request->user();
    $branchKey = $user?->branch_key;

    if (!is_string($branchKey) || trim($branchKey) === '') {
      return response()->json(['ok' => false, 'message' => 'No assigned branch.'], 422);
    }

    $validated = $request->validate([
      'received' => ['required', 'numeric', 'min:0'],
      'items' => ['required', 'array', 'min:1'],
      'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
      'items.*.qty' => ['required', 'integer', 'min:1'],
    ]);

    $received = (float) $validated['received'];
    $items = $validated['items'];

    $productIds = collect($items)->pluck('product_id')->unique()->values();
    $products = Product::query()->whereIn('id', $productIds)->get()->keyBy('id');

    $subtotal = 0.0;
    foreach ($items as $it) {
      $product = $products->get($it['product_id']);
      if (!$product) {
        return response()->json(['ok' => false, 'message' => 'Product not found.'], 422);
      }
      $subtotal += ((float) $product->price) * ((int) $it['qty']);
    }

    $total = $subtotal;
    if ($received < $total) {
      return response()->json(['ok' => false, 'message' => 'Insufficient amount received.'], 422);
    }

    $now = now();
    $ref = sprintf(
      'S-%s-%s',
      $now->format('Ymd'),
      substr(str_replace('.', '', (string) microtime(true)), -6)
    );

    $saleId = null;

    DB::transaction(function () use ($items, $branchKey, $user, $products, $total, $received, $ref, &$saleId) {
      $sale = PosSale::create([
        'ref' => $ref,
        'user_id' => $user->id,
        'branch_key' => $branchKey,
        'subtotal' => $total,
        'total' => $total,
        'received' => $received,
        'change' => max(0, $received - $total),
      ]);

      $saleId = $sale->id;

      foreach ($items as $it) {
        $productId = (int) $it['product_id'];
        $qty = (int) $it['qty'];

        $stock = ProductStock::query()
          ->where('product_id', $productId)
          ->where('branch_key', $branchKey)
          ->lockForUpdate()
          ->first();

        if (!$stock) {
          abort(422, 'Product is not available in this branch inventory.');
        }

        $before = (int) $stock->stock;
        $defectiveQty = (int) ($stock->defective_qty ?? 0);
        $sellableBefore = max(0, $before - $defectiveQty);
        if ($sellableBefore < $qty) {
          abort(422, 'Insufficient stock for one or more items.');
        }

        $after = $before - $qty;
        $stock->update(['stock' => $after]);

        $product = $products->get($productId);

        PosSaleItem::create([
          'pos_sale_id' => $sale->id,
          'product_id' => $productId,
          'name' => $product?->name ?? ('Product #' . $productId),
          'price' => (float) ($product?->price ?? 0),
          'purchase_cost' => (float) ($product?->purchase_cost ?? 0),
          'qty' => $qty,
          'line_total' => ((float) ($product?->price ?? 0)) * $qty,
          'line_cost' => ((float) ($product?->purchase_cost ?? 0)) * $qty,
        ]);

        InventoryAdjustment::create([
          'product_id' => $productId,
          'branch_key' => $branchKey,
          'type' => 'sale',
          'qty_change' => -$qty,
          'stock_before' => $before,
          'stock_after' => $after,
          'reference_id' => null,
          'reference_type' => null,
          'performed_by' => $user?->id,
          'note' => null,
        ]);

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

      PosCart::query()
        ->where('user_id', $user->id)
        ->where('branch_key', $branchKey)
        ->delete();
    });

    $change = max(0, $received - $total);

    return response()->json([
      'ok' => true,
      'sale_id' => $saleId,
      'ref' => $ref,
      'total' => $total,
      'change' => $change,
    ]);
  }
}
