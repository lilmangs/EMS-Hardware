<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'administrator')
            ->update(['role' => 'owner']);

        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery') NOT NULL DEFAULT 'cashier'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery','administrator') NOT NULL DEFAULT 'cashier'");
    }
};
