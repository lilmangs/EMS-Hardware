<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_deliveries', function (Blueprint $table) {
            $table->id();

            $table->string('ref', 50)->unique();

            $table->foreignId('pos_sale_id')
                ->constrained('pos_sales')
                ->cascadeOnDelete();

            $table->enum('branch_key', ['lagonglong', 'balingasag']);

            $table->enum('status', ['preparing', 'out_for_delivery', 'delivered'])->default('preparing');

            $table->string('customer_name', 120);
            $table->text('address');
            $table->text('notes')->nullable();

            $table->foreignId('assigned_to_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('assigned_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->timestamps();

            $table->unique(['pos_sale_id']);
            $table->index(['branch_key', 'status', 'created_at']);
            $table->index(['assigned_to_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_deliveries');
    }
};
