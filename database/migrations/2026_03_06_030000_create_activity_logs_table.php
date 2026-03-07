<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('role', 30)->nullable();
            $table->enum('branch_key', ['lagonglong', 'balingasag'])->nullable();

            $table->string('method', 10);
            $table->string('path', 255);
            $table->string('route_name', 120)->nullable();

            $table->string('action', 255);
            $table->text('details')->nullable();
            $table->string('category', 50)->nullable();

            $table->string('status', 20)->default('success');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            $table->timestamps();

            $table->index(['created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['branch_key', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index(['route_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
