<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_refunds', function (Blueprint $table) {
            $table->id();

            $table->string('ref', 50)->unique();

            $table->foreignId('pos_sale_id')
                ->nullable()
                ->constrained('pos_sales')
                ->nullOnDelete();

            $table->enum('branch_key', ['lagonglong', 'balingasag']);

            $table->string('customer_name')->nullable();

            $table->decimal('amount', 12, 2)->default(0);

            $table->text('reason')->nullable();

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');

            $table->foreignId('processed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('processed_at')->nullable();

            $table->timestamps();

            $table->index(['branch_key', 'status', 'created_at']);
            $table->index(['pos_sale_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_refunds');
    }
};
