<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_deliveries', function (Blueprint $table) {
            $table->string('proof_photo_path')->nullable()->after('delivered_at');
            $table->index(['status', 'proof_photo_path']);
        });
    }

    public function down(): void
    {
        Schema::table('pos_deliveries', function (Blueprint $table) {
            $table->dropIndex(['status', 'proof_photo_path']);
            $table->dropColumn('proof_photo_path');
        });
    }
};
