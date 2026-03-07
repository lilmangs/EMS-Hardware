<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosRefund extends Model
{
    protected $fillable = [
        'ref',
        'pos_sale_id',
        'branch_key',
        'amount',
        'reason',
        'restock',
        'status',
        'processed_by_user_id',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'restock' => 'boolean',
        'processed_at' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class, 'pos_sale_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PosRefundItem::class, 'pos_refund_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }
}
