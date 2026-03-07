<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CheckUserRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-user-roles {--fix-owner : Fix the first user to have owner role}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and display current user roles, optionally fix owner role';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $users = User::select('id', 'email', 'role')->get();

        if ($users->isEmpty()) {
            $this->error('No users found in the database!');
            $this->info('You may need to create a user first or run migrations.');
            return;
        }

        $this->info('=== CURRENT USER ROLES ===');
        foreach ($users as $user) {
            $this->line("{$user->email}: {$user->role}");
        }

        // Check if any user has owner role
        $ownerExists = $users->contains('role', 'owner');
        if (!$ownerExists) {
            $this->warn('⚠️  No user has "owner" role!');
            $this->info('This explains why you cannot access BranchComparison and StaffManagement pages.');
            $this->info('Both pages require "role:owner" middleware.');
        } else {
            $this->info('✅ At least one user has "owner" role.');
        }

        // Fix owner role if requested
        if ($this->option('fix-owner')) {
            $firstUser = User::first();
            if ($firstUser) {
                $firstUser->update(['role' => 'owner']);
                $this->info("✅ Updated {$firstUser->email} to have 'owner' role");
                $this->warn('Remember to log out and log back in to refresh your session!');
            }
        }

        $this->info('');
        $this->info('To fix owner access:');
        $this->info('1. Run: php artisan app:check-user-roles --fix-owner');
        $this->info('2. Log out and log back in');
        $this->info('3. Try accessing BranchComparison and StaffManagement pages');
    }
}
