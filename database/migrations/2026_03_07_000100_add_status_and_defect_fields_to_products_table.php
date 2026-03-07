<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('status', 32)->default('active')->index()->after('restocking_level');
            $table->text('defect_reason')->nullable()->after('status');
            $table->timestamp('defective_at')->nullable()->index()->after('defect_reason');
            $table->unsignedBigInteger('defective_by')->nullable()->index()->after('defective_at');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['status', 'defect_reason', 'defective_at', 'defective_by']);
        });
    }
};
