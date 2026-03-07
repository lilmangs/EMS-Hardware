<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode_value')->nullable()->unique()->after('sku');
        });

        DB::table('products')
            ->whereNull('barcode_value')
            ->update(['barcode_value' => DB::raw('sku')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['barcode_value']);
            $table->dropColumn('barcode_value');
        });
    }
};
