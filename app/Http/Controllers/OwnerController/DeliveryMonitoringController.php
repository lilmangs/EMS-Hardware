<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\PosDelivery;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DeliveryMonitoringController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/DeliveryMonitoring');
    }

    public function data(Request $request)
    {
        $branchKey = $request->query('branch_key');
        if (!in_array($branchKey, ['all', 'lagonglong', 'balingasag', null], true)) {
            $branchKey = 'all';
        }

        $date = $request->query('date');
        if (!in_array($date, ['all', null, ''], true)) {
            try {
                $date = Carbon::parse((string) $date)->toDateString();
            } catch (\Throwable $e) {
                $date = 'all';
            }
        } else {
            $date = 'all';
        }

        $query = PosDelivery::query()
            ->with(['sale:id,ref,branch_key,subtotal,total,created_at'])
            ->latest();

        if ($date !== 'all') {
            $query->whereDate('created_at', $date);
        }

        if ($branchKey && $branchKey !== 'all') {
            $query->where('branch_key', $branchKey);
        }

        $deliveries = $query
            ->limit(500)
            ->get()
            ->map(function (PosDelivery $d) {
                $bk = $d->branch_key;
                $branchLabel = $bk === 'lagonglong' ? 'Lagonglong Main Branch' : 'Balingasag Branch';
                $saleId = $d->pos_sale_id;
                $itemsCount = DB::table('pos_sale_items')
                    ->where('pos_sale_id', $saleId)
                    ->selectRaw('COALESCE(SUM(qty),0) as items')
                    ->value('items');

                return [
                    'id' => (string) ($d->ref ?? $d->id),
                    'order_id' => (string) ($d->sale?->ref ?? ''),
                    'branch_key' => $bk,
                    'branch' => $branchLabel,
                    'status' => $d->status,
                    'customer' => $d->customer_name,
                    'address' => $d->address,
                    'items' => (int) ($itemsCount ?? 0),
                    'total' => $d->orderGrandTotal(),
                    'started_at' => optional($d->created_at)->toDateTimeString(),
                    'proof_photo_url' => $d->proof_photo_path ? Storage::disk('public')->url($d->proof_photo_path) : null,
                ];
            })
            ->values()
            ->all();

        $statusCounts = [
            'preparing' => 0,
            'out_for_delivery' => 0,
            'delivered' => 0,
        ];

        $branchCounts = [
            'lagonglong' => 0,
            'balingasag' => 0,
        ];

        foreach ($deliveries as $d) {
            $status = $d['status'] ?? null;
            if (isset($statusCounts[$status])) {
                $statusCounts[$status]++;
            }

            $bk = $d['branch_key'] ?? null;
            if (isset($branchCounts[$bk])) {
                $branchCounts[$bk]++;
            }
        }

        return response()->json([
            'filters' => [
                'branch_key' => $branchKey ?? 'all',
                'date' => $date,
            ],
            'summary' => [
                'total_today' => count($deliveries),
                'preparing' => $statusCounts['preparing'],
                'out_for_delivery' => $statusCounts['out_for_delivery'],
                'delivered' => $statusCounts['delivered'],
            ],
            'by_branch' => [
                [
                    'branch_key' => 'lagonglong',
                    'branch' => 'Lagonglong Main Branch',
                    'count' => $branchCounts['lagonglong'],
                ],
                [
                    'branch_key' => 'balingasag',
                    'branch' => 'Balingasag Branch',
                    'count' => $branchCounts['balingasag'],
                ],
            ],
            'deliveries' => $deliveries,
        ]);
    }
}
