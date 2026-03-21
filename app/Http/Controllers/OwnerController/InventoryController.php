<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\InventoryAdjustment;
use App\Models\InventoryRestock;
use App\Models\Product;
use App\Models\ProductStock;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/Inventory');
    }

    public function items(Request $request)
    {
        $user = $request->user();
        $userBranchKey = $user?->branch_key;
        $isBranchRestrictedUser = $user && in_array($user->role, ['staff', 'cashier', 'delivery'], true) && !empty($userBranchKey);

        $validated = $request->validate([
            'branch_key' => ['nullable', Rule::in(['lagonglong', 'balingasag'])],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $branchKey = $validated['branch_key'] ?? null;
        if ($isBranchRestrictedUser) {
            $branchKey = $userBranchKey;
        }

        $branches = is_string($branchKey) && $branchKey !== ''
            ? [$branchKey]
            : ['lagonglong', 'balingasag'];

        $productQuery = Product::query()
            ->with(['stocks' => function ($q) use ($branches) {
                $q->whereIn('branch_key', $branches);
            }])
            ->select(['id', 'sku', 'barcode_value', 'name', 'category', 'price', 'image_path'])
            ->orderBy('name');

        if (count($branches) === 1) {
            $onlyBranch = $branches[0];
            $productQuery->whereHas('stocks', function ($q) use ($onlyBranch) {
                $q->where('branch_key', $onlyBranch);
            });
        }

        $search = $validated['search'] ?? null;
        if (is_string($search) && trim($search) !== '') {
            $s = trim($search);
            $productQuery->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('sku', 'like', "%{$s}%")
                    ->orWhere('category', 'like', "%{$s}%")
                    ->orWhere('barcode_value', 'like', "%{$s}%");
            });
        }

        $products = $productQuery->get();

        $items = $products->flatMap(function (Product $p) use ($branches) {
            return collect($branches)->map(function (string $bk) use ($p) {
                $ps = $p->stocks->firstWhere('branch_key', $bk);

                if ($ps === null && $p->stocks->count() > 0) {
                    return null;
                }

                $baseStock = $ps?->stock;
                if ($baseStock === null) {
                    $baseStock = count($p->stocks) > 0 ? 0 : (int) ($p->stock ?? 0);
                }

                return [
                    'product_id' => $p->id,
                    'sku' => $p->sku,
                    'barcode_value' => $p->barcode_value,
                    'name' => $p->name,
                    'category' => $p->category,
                    'price' => $p->price,
                    'image_path' => $p->image_path,
                    'branch_key' => $bk,
                    'stock' => (int) $baseStock,
                    'defective_qty' => $ps?->defective_qty ?? 0,
                    'sellable_qty' => max(0, (int) $baseStock - (int) ($ps?->defective_qty ?? 0)),
                    'reorder_level' => $ps?->reorder_level ?? 0,
                    'min_stock' => $ps?->min_stock ?? 0,
                    'max_stock' => $ps?->max_stock ?? 0,
                    'updated_at' => $ps?->updated_at,
                ];
            })->filter();
        })->values();

        return response()->json([
            'items' => $items,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $userBranchKey = $user?->branch_key;
        $isBranchRestrictedUser = $user && in_array($user->role, ['staff', 'cashier', 'delivery'], true) && !empty($userBranchKey);

        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'branch_key' => ['required', Rule::in(['lagonglong', 'balingasag'])],
            'stock' => ['required', 'integer', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'max_stock' => ['nullable', 'integer', 'min:0'],
        ]);

        if ($isBranchRestrictedUser && $validated['branch_key'] !== $userBranchKey) {
            abort(403, 'You are not allowed to access this branch inventory.');
        }

        $product = Product::updateOrCreate(
            ['sku' => $validated['sku']],
            [
                'name' => $validated['name'],
                'category' => $validated['category'] ?? null,
                'price' => $validated['price'] ?? 0,
            ]
        );

        ProductStock::updateOrCreate(
            ['product_id' => $product->id, 'branch_key' => $validated['branch_key']],
            [
                'stock' => $validated['stock'],
                'reorder_level' => $validated['reorder_level'] ?? 0,
                'min_stock' => $validated['min_stock'] ?? 0,
                'max_stock' => $validated['max_stock'] ?? 0,
            ]
        );

        $this->syncProductTotalStock($product);

        return response()->json(['ok' => true]);
    }

    public function update(Request $request, Product $product)
    {
        $user = $request->user();
        $userBranchKey = $user?->branch_key;
        $isBranchRestrictedUser = $user && in_array($user->role, ['staff', 'cashier', 'delivery'], true) && !empty($userBranchKey);

        $validated = $request->validate([
            'branch_key' => ['required', Rule::in(['lagonglong', 'balingasag'])],
            'stock' => ['nullable', 'integer', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'max_stock' => ['nullable', 'integer', 'min:0'],
        ]);

        if ($isBranchRestrictedUser && $validated['branch_key'] !== $userBranchKey) {
            abort(403, 'You are not allowed to access this branch inventory.');
        }

        $stock = ProductStock::firstOrCreate(
            ['product_id' => $product->id, 'branch_key' => $validated['branch_key']],
            ['stock' => 0, 'reorder_level' => 0, 'min_stock' => 0, 'max_stock' => 0]
        );

        $update = [];
        foreach (['stock', 'reorder_level', 'min_stock', 'max_stock'] as $k) {
            if (array_key_exists($k, $validated) && $validated[$k] !== null) {
                $update[$k] = $validated[$k];
            }
        }

        if (!empty($update)) {
            $stock->update($update);
        }

        $this->syncProductTotalStock($product);

        return response()->json(['ok' => true]);
    }

    public function restock(Request $request, Product $product)
    {
        $user = $request->user();
        $userBranchKey = $user?->branch_key;
        $isBranchRestrictedUser = $user && in_array($user->role, ['staff', 'cashier', 'delivery'], true) && !empty($userBranchKey);

        $validated = $request->validate([
            'branch_key' => ['required', Rule::in(['lagonglong', 'balingasag'])],
            'qty'        => ['required', 'integer', 'min:1'],
            'unit_cost'  => ['nullable', 'numeric', 'min:0'],
            'note'       => ['nullable', 'string', 'max:500'],
        ]);

        if ($isBranchRestrictedUser && $validated['branch_key'] !== $userBranchKey) {
            abort(403, 'You are not allowed to access this branch inventory.');
        }

        $stock = ProductStock::firstOrCreate(
            ['product_id' => $product->id, 'branch_key' => $validated['branch_key']],
            ['stock' => 0, 'reorder_level' => 0, 'min_stock' => 0, 'max_stock' => 0]
        );

        $stockBefore = (int) $stock->stock;
        $qty         = (int) $validated['qty'];
        $stockAfter  = $stockBefore + $qty;

        $stock->update(['stock' => $stockAfter]);

        $this->syncProductTotalStock($product);

        // --- Audit log ---
        $restockLog = InventoryRestock::create([
            'product_id'   => $product->id,
            'branch_key'   => $validated['branch_key'],
            'qty'          => $qty,
            'stock_before' => $stockBefore,
            'stock_after'  => $stockAfter,
            'unit_cost'    => $validated['unit_cost'] ?? null,
            'performed_by' => $user?->id,
            'note'         => $validated['note'] ?? null,
        ]);

        InventoryAdjustment::create([
            'product_id'     => $product->id,
            'branch_key'     => $validated['branch_key'],
            'type'           => 'restock',
            'qty_change'     => $qty,
            'stock_before'   => $stockBefore,
            'stock_after'    => $stockAfter,
            'reference_id'   => $restockLog->id,
            'reference_type' => 'inventory_restock',
            'performed_by'   => $user?->id,
            'note'           => $validated['note'] ?? null,
        ]);

        return response()->json(['ok' => true, 'stock_after' => $stockAfter]);
    }

    protected function syncProductTotalStock(Product $product): void
    {
        $total = (int) ProductStock::query()
            ->where('product_id', $product->id)
            ->sum('stock');

        $nextStatus = $product->status;
        if ($product->status !== 'defective') {
            $nextStatus = $total > 0 ? 'reserved' : 'out_of_stock';
        }

        $product->update([
            'stock' => $total,
            'status' => $nextStatus,
        ]);
    }


}
