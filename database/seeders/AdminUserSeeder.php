<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'rielmangubat-it@srcb.edu.ph'],
            [
                'name' => 'Admin',
                'password' => 'password123',
                'role' => 'owner',
                'branch_key' => null,
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Admin user created successfully!');
        $this->command->info('Email: rielmangubat-it@srcb.edu.ph');
        $this->command->info('Password: password123');
    }
}
