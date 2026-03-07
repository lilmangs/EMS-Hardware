<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductStock extends Model
{
    protected $fillable = [
        'product_id',
        'branch_key',
        'stock',
        'reorder_level',
        'min_stock',
        'max_stock',
    ];

    protected $casts = [
        'stock' => 'integer',
        'reorder_level' => 'integer',
        'min_stock' => 'integer',
        'max_stock' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
