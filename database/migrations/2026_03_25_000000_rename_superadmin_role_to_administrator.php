<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Renames the 'superadmin' role to 'administrator' in the users table ENUM.
     */
    public function up(): void
    {
        // Expand ENUM first so record updates to "administrator" are valid.
        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery','superadmin','administrator') NOT NULL DEFAULT 'cashier'");

        // Then convert existing records from legacy value.
        DB::table('users')
            ->where('role', 'superadmin')
            ->update(['role' => 'administrator']);

        // Finally, drop the legacy enum option.
        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery','administrator') NOT NULL DEFAULT 'cashier'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Expand ENUM first so record updates to "superadmin" are valid.
        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery','administrator','superadmin') NOT NULL DEFAULT 'cashier'");

        // Revert records back
        DB::table('users')
            ->where('role', 'administrator')
            ->update(['role' => 'superadmin']);

        // Restore original ENUM
        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('admin','owner','staff','cashier','delivery','superadmin') NOT NULL DEFAULT 'cashier'");
    }
};
