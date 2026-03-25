<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('purchase_cost', 12, 2)->default(0)->after('price');
        });

        Schema::table('pos_sale_items', function (Blueprint $table) {
            $table->decimal('purchase_cost', 12, 2)->default(0)->after('price');
            $table->decimal('line_cost', 12, 2)->default(0)->after('line_total');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pos_sale_items', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropColumn(['purchase_cost', 'line_cost']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('purchase_cost');
        });
    }
};
