<?php

namespace App\Http\Controllers\CashierController;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductStock;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductsController extends Controller
{
    public function index()
    {
        $query = Product::query();

        $user = request()->user();
        $userBranchKey = $user?->branch_key;
        $isBranchRestrictedUser = $user && in_array($user->role, ['staff', 'cashier', 'delivery'], true) && !empty($userBranchKey);

        $branchKey = request('branch_key');
        if ($isBranchRestrictedUser) {
            $branchKey = $userBranchKey;
        }

        if (!is_string($branchKey) || trim($branchKey) === '') {
            $branchKey = null;
        }

        if (is_string($branchKey) && $branchKey !== '') {
            $query->whereHas('stocks', function ($q) use ($branchKey) {
                $q->where('branch_key', $branchKey);
            });
        }

        $status = request('status', 'reserved');
        if (!is_string($status) || trim($status) === '') {
            $status = 'reserved';
        }

        $allowedStatuses = ['defective', 'out_of_stock', 'reserved', 'low_stock'];
        if (!in_array($status, $allowedStatuses, true)) {
            $status = 'reserved';
        }

        if ($status === 'low_stock') {
            // Align with Cashier Products UI: badge uses product.restocking_level when branch
            // reorder_level is unset; use COALESCE so per-row reorder_level falls back to products.restocking_level.
            $query->whereHas('stocks', function ($q) use ($branchKey) {
                if (is_string($branchKey) && $branchKey !== '') {
                    $q->where('product_stocks.branch_key', $branchKey);
                }

                $sellable = '(product_stocks.stock - COALESCE(product_stocks.defective_qty, 0))';
                $effectiveReorder = 'COALESCE(NULLIF(product_stocks.reorder_level, 0), (SELECT restocking_level FROM products WHERE products.id = product_stocks.product_id))';

                $q->whereRaw("{$sellable} > 0")
                    ->whereRaw("{$effectiveReorder} > 0")
                    ->whereRaw("{$sellable} <= {$effectiveReorder}");
            });
        } elseif ($status === 'defective') {
            $query->whereHas('stocks', function ($q) use ($branchKey) {
                if (is_string($branchKey) && $branchKey !== '') {
                    $q->where('branch_key', $branchKey);
                }
                $q->where('defective_qty', '>', 0);
            });
        } elseif ($status === 'out_of_stock') {
            if (is_string($branchKey) && $branchKey !== '') {
                $query->whereHas('stocks', function ($q) use ($branchKey) {
                    $q->where('branch_key', $branchKey)
                        ->whereRaw('(stock - COALESCE(defective_qty, 0)) <= 0');
                });
            } else {
                $query->where('stock', '<=', 0);
            }
        } elseif ($status === 'reserved') {
            if (is_string($branchKey) && $branchKey !== '') {
                $query->whereHas('stocks', function ($q) use ($branchKey) {
                    $q->where('branch_key', $branchKey)
                        ->whereRaw('(stock - COALESCE(defective_qty, 0)) > 0');
                });
            } else {
                $query->where('stock', '>', 0);
            }
        } else {
            $query->where('status', $status);
        }

        $search = request('search');
        if (is_string($search) && trim($search) !== '') {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('sku', 'like', "%{$s}%")
                    ->orWhere('category', 'like', "%{$s}%")
                    ->orWhere('description', 'like', "%{$s}%");
            });
        }

        $sort = request('sort', 'name');
        $direction = request('direction', 'asc');
        $direction = in_array($direction, ['asc', 'desc'], true) ? $direction : 'asc';

        $sortColumn = match ($sort) {
            'price' => 'price',
            'stock' => 'stock',
            'created_at' => 'created_at',
            default => 'name',
        };

        $products = $query
            ->orderBy($sortColumn, $direction)
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Cashier/Products', [
            'products' => $products,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'branch_key' => $branchKey,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:255', 'unique:products,sku'],
            'barcode_value' => ['nullable', 'string', 'max:255', 'unique:products,barcode_value'],
            'unit_of_measure' => ['nullable', 'string', 'max:50'],
            'brand' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'restocking_level' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['out_of_stock', 'reserved'])],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        // Always default new products to reserved. Stock state will still be reflected via stock qty.
        $validated['status'] = 'reserved';

        if (!array_key_exists('restocking_level', $validated) || $validated['restocking_level'] === null) {
            $validated['restocking_level'] = 0;
        }

        if (!isset($validated['barcode_value']) || $validated['barcode_value'] === null || trim((string) $validated['barcode_value']) === '') {
            $validated['barcode_value'] = $validated['sku'];
        }

        if (!array_key_exists('unit_of_measure', $validated) || $validated['unit_of_measure'] === null || trim((string) $validated['unit_of_measure']) === '') {
            $validated['unit_of_measure'] = 'pc';
        }

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($validated);

        $branchKey = $request->user()?->branch_key;
        if (is_string($branchKey) && trim($branchKey) !== '') {
            ProductStock::updateOrCreate(
                ['product_id' => $product->id, 'branch_key' => $branchKey],
                [
                    'stock' => (int) $validated['stock'],
                    'defective_qty' => 0,
                    'reorder_level' => (int) ($validated['restocking_level'] ?? 0),
                ]
            );
        }

        return back();
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode_value' => ['nullable', 'string', 'max:255', Rule::unique('products', 'barcode_value')->ignore($product->id)],
            'unit_of_measure' => ['nullable', 'string', 'max:50'],
            'brand' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'restocking_level' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['out_of_stock', 'reserved'])],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        if (!array_key_exists('stock', $validated) || $validated['stock'] === null) {
            $validated['stock'] = $product->stock;
        }

        if (!array_key_exists('restocking_level', $validated) || $validated['restocking_level'] === null) {
            $validated['restocking_level'] = $product->restocking_level ?? 0;
        }

        $stockQty = (int) ($validated['stock'] ?? $product->stock ?? 0);

        if (!array_key_exists('status', $validated) || $validated['status'] === null || trim((string) $validated['status']) === '') {
            $validated['status'] = $product->status;

            if (!is_string($validated['status']) || trim($validated['status']) === '') {
                $validated['status'] = $stockQty > 0 ? 'reserved' : 'out_of_stock';
            }
        }

        if ($validated['status'] === 'reserved' && $stockQty <= 0) {
            $validated['status'] = 'out_of_stock';
        }

        if ($validated['status'] === 'out_of_stock' && $stockQty > 0) {
            $validated['status'] = 'reserved';
        }

        // If barcode_value not provided, keep existing unless it was just mirroring the old SKU.
        if (!array_key_exists('barcode_value', $validated) || $validated['barcode_value'] === null || trim((string) $validated['barcode_value']) === '') {
            $validated['barcode_value'] = $product->barcode_value;

            if (
                array_key_exists('sku', $validated)
                && $product->barcode_value === $product->sku
                && $validated['sku'] !== $product->sku
            ) {
                $validated['barcode_value'] = $validated['sku'];
            }
        }

        if (!array_key_exists('unit_of_measure', $validated) || $validated['unit_of_measure'] === null || trim((string) $validated['unit_of_measure']) === '') {
            $validated['unit_of_measure'] = $product->unit_of_measure ?? 'pc';
        }

        if ($request->hasFile('image')) {
            if (is_string($product->image_path) && $product->image_path !== '') {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product->update($validated);

        $branchKey = $request->user()?->branch_key;
        if (is_string($branchKey) && trim($branchKey) !== '') {
            ProductStock::updateOrCreate(
                ['product_id' => $product->id, 'branch_key' => $branchKey],
                ['reorder_level' => (int) ($validated['restocking_level'] ?? 0)]
            );
        }

        return back();
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return back();
    }
}
