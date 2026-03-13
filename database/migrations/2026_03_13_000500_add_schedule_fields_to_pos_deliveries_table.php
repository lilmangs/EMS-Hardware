<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_deliveries', function (Blueprint $table) {
            $table->dateTime('scheduled_for')->nullable()->after('status');
            $table->unsignedInteger('queue_order')->nullable()->after('scheduled_for');

            $table->index(['assigned_to_user_id', 'scheduled_for']);
            $table->index(['branch_key', 'scheduled_for']);
        });
    }

    public function down(): void
    {
        Schema::table('pos_deliveries', function (Blueprint $table) {
            $table->dropIndex(['assigned_to_user_id', 'scheduled_for']);
            $table->dropIndex(['branch_key', 'scheduled_for']);
            $table->dropColumn(['scheduled_for', 'queue_order']);
        });
    }
};
