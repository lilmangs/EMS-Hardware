<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSaleItem extends Model
{
    protected $fillable = [
        'pos_sale_id',
        'product_id',
        'name',
        'price',
        'purchase_cost',
        'qty',
        'line_total',
        'line_cost',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'purchase_cost' => 'decimal:2',
        'qty' => 'integer',
        'line_total' => 'decimal:2',
        'line_cost' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class, 'pos_sale_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
