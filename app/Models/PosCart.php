<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosCart extends Model
{
    protected $table = 'pos_carts';

    protected $fillable = [
        'user_id',
        'branch_key',
        'items',
        'received',
    ];

    protected $casts = [
        'items' => 'array',
        'received' => 'decimal:2',
    ];
}
