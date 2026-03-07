<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * inventory_restocks — tracks every restock event.
     * Each row = one "add stock" action on a specific product+branch.
     */
    public function up(): void
    {
        Schema::create('inventory_restocks', function (Blueprint $table) {
            $table->id();

            // Which product was restocked
            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();

            // Which branch received the stock
            $table->enum('branch_key', ['lagonglong', 'balingasag']);

            // Quantity added
            $table->unsignedInteger('qty');

            // Stock level before and after (snapshot at time of restock)
            $table->unsignedInteger('stock_before')->default(0);
            $table->unsignedInteger('stock_after')->default(0);

            // Optional: cost per unit at time of restock (for COGS tracking)
            $table->decimal('unit_cost', 12, 2)->nullable();

            // Who performed the restock (null = system/automated)
            $table->foreignId('performed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Optional free-text note / supplier reference
            $table->string('note', 500)->nullable();

            $table->timestamps();

            // Indexes for common queries
            $table->index(['product_id', 'branch_key']);
            $table->index('performed_by');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_restocks');
    }
};
