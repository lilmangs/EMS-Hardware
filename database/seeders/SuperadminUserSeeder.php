<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperadminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'rieladmin@example.com'],
            [
                'name' => 'Owner Account',
                'password' => 'superadmin123',
                'role' => 'owner',
                'branch_key' => null,
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Owner user created successfully!');
        $this->command->info('Email: rieladmin@example.com');
        $this->command->info('Password: superadmin123');
    }
}
