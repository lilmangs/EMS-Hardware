<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sale_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pos_sale_id')
                ->constrained('pos_sales')
                ->cascadeOnDelete();

            $table->foreignId('product_id')
                ->nullable()
                ->constrained('products')
                ->nullOnDelete();

            // Snapshot fields
            $table->string('name');
            $table->decimal('price', 12, 2)->default(0);
            $table->unsignedInteger('qty');
            $table->decimal('line_total', 12, 2)->default(0);

            $table->timestamps();

            $table->index(['pos_sale_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sale_items');
    }
};
