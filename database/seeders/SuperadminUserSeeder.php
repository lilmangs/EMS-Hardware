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
                'name' => 'Superadmin',
                'password' => 'superadmin123',
                'role' => 'superadmin',
                'branch_key' => null,
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Superadmin user created successfully!');
        $this->command->info('Email: rieladmin@example.com');
        $this->command->info('Password: superadmin123');
    }
}
