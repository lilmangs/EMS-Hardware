<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_refund_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pos_refund_id')
                ->constrained('pos_refunds')
                ->cascadeOnDelete();

            $table->foreignId('pos_sale_item_id')
                ->nullable()
                ->constrained('pos_sale_items')
                ->nullOnDelete();

            $table->foreignId('product_id')
                ->nullable()
                ->constrained('products')
                ->nullOnDelete();

            $table->string('name');
            $table->unsignedInteger('qty');
            $table->decimal('amount', 12, 2)->default(0);

            $table->timestamps();

            $table->index(['pos_refund_id', 'pos_sale_item_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_refund_items');
    }
};
