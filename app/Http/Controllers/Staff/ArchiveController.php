<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::onlyTrashed()
            ->select(['id', 'sku', 'barcode_value', 'name', 'category', 'price', 'stock', 'restocking_level', 'image_path', 'deleted_at'])
            ->orderByDesc('deleted_at')
            ->get();

        return Inertia::render('Staff/Archive', [
            'products' => $products,
        ]);
    }

    public function restore(int $productId): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($productId);
        $product->restore();

        return back();
    }

    public function destroy(int $productId): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($productId);

        if (is_string($product->image_path) && $product->image_path !== '') {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->forceDelete();

        return back();
    }
}
