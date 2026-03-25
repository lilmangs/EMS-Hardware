<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sku',
        'barcode_value',
        'unit_of_measure',
        'brand',
        'color',
        'name',
        'description',
        'category',
        'price',
        'purchase_cost',
        'stock',
        'restocking_level',
        'status',
        'defect_reason',
        'defective_at',
        'defective_by',
        'image_path',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'purchase_cost' => 'decimal:2',
        'stock' => 'integer',
        'restocking_level' => 'integer',
        'defective_at' => 'datetime',
    ];

    public function stocks()
    {
        return $this->hasMany(ProductStock::class);
    }

    public function restocks()
    {
        return $this->hasMany(InventoryRestock::class);
    }

    public function adjustments()
    {
        return $this->hasMany(InventoryAdjustment::class);
    }
}
