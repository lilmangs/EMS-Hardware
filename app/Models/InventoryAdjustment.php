<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class InventoryAdjustment extends Model
{
    protected $fillable = [
        'product_id',
        'branch_key',
        'type',
        'qty_change',
        'stock_before',
        'stock_after',
        'reference_id',
        'reference_type',
        'performed_by',
        'note',
    ];

    protected $casts = [
        'qty_change'   => 'integer',
        'stock_before' => 'integer',
        'stock_after'  => 'integer',
        'reference_id' => 'integer',
    ];

    // All valid movement types
    public const TYPES = [
        'restock',
        'sale',
        'correction',
        'transfer_in',
        'transfer_out',
        'write_off',
        'return',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo('reference');
    }
}
