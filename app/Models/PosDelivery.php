<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosDelivery extends Model
{
    protected $fillable = [
        'ref',
        'pos_sale_id',
        'branch_key',
        'status',
        'scheduled_for',
        'queue_order',
        'customer_name',
        'address',
        'delivery_fee',
        'notes',
        'assigned_to_user_id',
        'assigned_by_user_id',
        'assigned_at',
        'delivered_at',
        'proof_photo_path',
    ];

    protected $casts = [
        'delivery_fee' => 'decimal:2',
        'scheduled_for' => 'datetime',
        'assigned_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(PosSale::class, 'pos_sale_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }

    /**
     * Grand total the customer pays (items + delivery fee).
     * After cashier creates a delivery with a fee, {@see PosSale::$total} is increased by that fee;
     * do not add delivery_fee again on top of total.
     */
    public function orderGrandTotal(): float
    {
        $fee = (float) ($this->delivery_fee ?? 0);
        $sale = $this->sale;

        if (!$sale) {
            return round($fee, 2);
        }

        $saleTotal = (float) ($sale->total ?? 0);
        $subtotal = (float) ($sale->subtotal ?? 0);

        if ($fee > 0.00001 && abs($saleTotal - $subtotal) < 0.01) {
            return round($subtotal + $fee, 2);
        }

        return round($saleTotal, 2);
    }
}
