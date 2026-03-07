<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryRestock extends Model
{
    protected $fillable = [
        'product_id',
        'branch_key',
        'qty',
        'stock_before',
        'stock_after',
        'unit_cost',
        'performed_by',
        'note',
    ];

    protected $casts = [
        'qty'          => 'integer',
        'stock_before' => 'integer',
        'stock_after'  => 'integer',
        'unit_cost'    => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
