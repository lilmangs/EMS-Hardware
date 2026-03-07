<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_stocks', function (Blueprint $table) {
            $table->unsignedInteger('defective_qty')->default(0)->after('stock');
        });

        // Backfill: if legacy product.status was 'defective', treat all units in all branches as defective.
        DB::table('product_stocks')
            ->join('products', 'products.id', '=', 'product_stocks.product_id')
            ->where('products.status', 'defective')
            ->update([
                'product_stocks.defective_qty' => DB::raw('product_stocks.stock'),
            ]);

        // Reset legacy defective flags on products (defects are now quantity-based per branch).
        DB::table('products')
            ->where('status', 'defective')
            ->update([
                'status' => 'active',
                'defect_reason' => null,
                'defective_at' => null,
                'defective_by' => null,
            ]);
    }

    public function down(): void
    {
        Schema::table('product_stocks', function (Blueprint $table) {
            $table->dropColumn('defective_qty');
        });
    }
};
