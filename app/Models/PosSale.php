<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosSale extends Model
{
    protected $fillable = [
        'ref',
        'user_id',
        'branch_key',
        'subtotal',
        'total',
        'received',
        'change',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'received' => 'decimal:2',
        'change' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PosSaleItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
