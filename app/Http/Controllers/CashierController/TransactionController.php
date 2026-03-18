<?php

namespace App\Http\Controllers\CashierController;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index()
    {
        $user = request()->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return Inertia::render('Cashier/Transaction', [
                'branch_key' => null,
                'recent_sales' => [],
            ]);
        }

        $search = request('search');
        $search = is_string($search) ? trim($search) : '';

        $query = PosSale::query()
            ->where('user_id', $user->id)
            ->where('branch_key', $branchKey)
            ->with([
                'items:id,pos_sale_id,name,price,qty,line_total',
                'delivery:id,pos_sale_id,ref,status,scheduled_for,delivery_fee',
            ])
            ->latest();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('ref', 'like', "%{$search}%")
                    ->orWhereHas('items', function ($items) use ($search) {
                        $items->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('delivery', function ($delivery) use ($search) {
                        $delivery->where('ref', 'like', "%{$search}%");
                    });
            });
        }

        $recentSales = $query
            ->limit(50)
            ->get()
            ->map(function (PosSale $s) {
                return [
                    'id' => $s->id,
                    'ref' => $s->ref,
                    'created_at' => $s->created_at,
                    'subtotal' => $s->subtotal,
                    'total' => $s->total,
                    'received' => $s->received,
                    'change' => $s->change,
                    'delivery' => $s->delivery ? [
                        'ref' => $s->delivery->ref,
                        'status' => $s->delivery->status,
                        'scheduled_for' => $s->delivery->scheduled_for,
                        'delivery_fee' => $s->delivery->delivery_fee,
                    ] : null,
                    'items' => $s->items->map(fn ($it) => [
                        'name' => $it->name,
                        'qty' => (int) $it->qty,
                        'price' => $it->price,
                        'line_total' => $it->line_total,
                    ])->values(),
                ];
            })
            ->values();

        return Inertia::render('Cashier/Transaction', [
            'branch_key' => $branchKey,
            'filters' => [
                'search' => $search,
            ],
            'recent_sales' => $recentSales,
        ]);
    }
}
