<?php

namespace App\Http\Controllers\CashierController;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductsController extends Controller
{
    public function index()
    {
        $query = Product::query();

        $status = request('status', 'active');
        if (!is_string($status) || trim($status) === '') {
            $status = 'active';
        }

        $allowedStatuses = ['active', 'defective', 'out_of_stock', 'reserved'];
        if (!in_array($status, $allowedStatuses, true)) {
            $status = 'active';
        }

        $query->where('status', $status);

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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'restocking_level' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'defective', 'out_of_stock', 'reserved'])],
            'defect_reason' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        if (!array_key_exists('status', $validated) || $validated['status'] === null || trim((string) $validated['status']) === '') {
            $validated['status'] = 'active';
        }

        if ($validated['status'] === 'defective') {
            if (!array_key_exists('defect_reason', $validated) || $validated['defect_reason'] === null || trim((string) $validated['defect_reason']) === '') {
                abort(422, 'Defect reason is required when marking a product as defective.');
            }
            $validated['defective_at'] = now();
            $validated['defective_by'] = $request->user()?->id;
        } else {
            $validated['defect_reason'] = null;
            $validated['defective_at'] = null;
            $validated['defective_by'] = null;
        }

        if (!array_key_exists('restocking_level', $validated) || $validated['restocking_level'] === null) {
            $validated['restocking_level'] = 0;
        }

        if (!isset($validated['barcode_value']) || $validated['barcode_value'] === null || trim((string) $validated['barcode_value']) === '') {
            $validated['barcode_value'] = $validated['sku'];
        }

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        Product::create($validated);

        return back();
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode_value' => ['nullable', 'string', 'max:255', Rule::unique('products', 'barcode_value')->ignore($product->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'restocking_level' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'defective', 'out_of_stock', 'reserved'])],
            'defect_reason' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        if (!array_key_exists('stock', $validated) || $validated['stock'] === null) {
            $validated['stock'] = $product->stock;
        }

        if (!array_key_exists('restocking_level', $validated) || $validated['restocking_level'] === null) {
            $validated['restocking_level'] = $product->restocking_level ?? 0;
        }

        if (!array_key_exists('status', $validated) || $validated['status'] === null || trim((string) $validated['status']) === '') {
            $validated['status'] = $product->status ?? 'active';
        }

        if ($validated['status'] === 'defective') {
            if (!array_key_exists('defect_reason', $validated) || $validated['defect_reason'] === null || trim((string) $validated['defect_reason']) === '') {
                abort(422, 'Defect reason is required when marking a product as defective.');
            }

            if (($product->status ?? 'active') !== 'defective') {
                $validated['defective_at'] = now();
                $validated['defective_by'] = $request->user()?->id;
            }
        } else {
            $validated['defect_reason'] = null;
            $validated['defective_at'] = null;
            $validated['defective_by'] = null;
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

        if ($request->hasFile('image')) {
            if (is_string($product->image_path) && $product->image_path !== '') {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product->update($validated);

        return back();
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return back();
    }
}
