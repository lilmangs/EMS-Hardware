<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_refunds', function (Blueprint $table) {
            $table->boolean('restock')->default(true)->after('reason');
            $table->index(['restock']);
        });
    }

    public function down(): void
    {
        Schema::table('pos_refunds', function (Blueprint $table) {
            $table->dropIndex(['restock']);
            $table->dropColumn('restock');
        });
    }
};
