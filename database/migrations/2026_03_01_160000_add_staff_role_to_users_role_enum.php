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
            ->whereNotIn('role', ['admin', 'owner', 'staff', 'cashier', 'delivery', 'superadmin'])
            ->update(['role' => 'cashier']);

        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery','superadmin') NOT NULL DEFAULT 'cashier'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')
            ->where('role', 'staff')
            ->update(['role' => 'cashier']);

        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','cashier','delivery','superadmin') NOT NULL DEFAULT 'cashier'");
    }
};
