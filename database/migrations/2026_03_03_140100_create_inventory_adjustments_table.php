<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * inventory_adjustments — a full stock movement ledger.
     * Every change to stock (sale, restock, correction, write-off, transfer)
     * gets a row here. qty_change is signed: positive = stock added,
     * negative = stock removed.
     */
    public function up(): void
    {
        Schema::create('inventory_adjustments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();

            $table->enum('branch_key', ['lagonglong', 'balingasag']);

            // Type of movement
            $table->enum('type', [
                'restock',      // stock added via restock
                'sale',         // stock removed by a sale
                'correction',   // manual quantity correction
                'transfer_in',  // stock received from another branch
                'transfer_out', // stock sent to another branch
                'write_off',    // damaged / expired / lost
                'return',       // customer return re-added to stock
            ]);

            // Signed quantity change (+add / -remove)
            $table->integer('qty_change');

            // Snapshot of stock level before and after this adjustment
            $table->unsignedInteger('stock_before');
            $table->unsignedInteger('stock_after');

            // Optional reference id (e.g. restock_id, sale/transaction id)
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type', 100)->nullable(); // morphable model name

            // Who triggered this adjustment
            $table->foreignId('performed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Human-readable note
            $table->string('note', 500)->nullable();

            $table->timestamps();

            // Indexes for reporting and audit queries
            $table->index(['product_id', 'branch_key', 'type']);
            $table->index(['product_id', 'branch_key', 'created_at']);
            $table->index('performed_by');
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_adjustments');
    }
};
