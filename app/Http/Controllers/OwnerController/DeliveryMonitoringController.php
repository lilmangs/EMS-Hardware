<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
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

        $today = Carbon::now()->toDateString();

        $deliveries = [
            [
                'id' => 'DLV-1001',
                'order_id' => 'TRX-1001',
                'branch_key' => 'lagonglong',
                'branch' => 'Lagonglong Main Branch',
                'status' => 'preparing',
                'customer' => 'Maria Santos',
                'address' => 'Purok 3, Lagonglong, Misamis Oriental',
                'items' => 5,
                'total' => 3590,
                'started_at' => $today . ' 09:12:00',
            ],
            [
                'id' => 'DLV-1002',
                'order_id' => 'TRX-1002',
                'branch_key' => 'balingasag',
                'branch' => 'Balingasag Branch',
                'status' => 'out_for_delivery',
                'customer' => 'Pedro Reyes',
                'address' => 'Zone 2, Balingasag, Misamis Oriental',
                'items' => 3,
                'total' => 2500,
                'started_at' => $today . ' 10:03:00',
            ],
            [
                'id' => 'DLV-1003',
                'order_id' => 'TRX-1003',
                'branch_key' => 'balingasag',
                'branch' => 'Balingasag Branch',
                'status' => 'delivered',
                'customer' => 'Ana Reyes',
                'address' => 'Brgy. 5, Balingasag, Misamis Oriental',
                'items' => 7,
                'total' => 6780,
                'started_at' => $today . ' 11:45:00',
            ],
            [
                'id' => 'DLV-1004',
                'order_id' => 'TRX-1004',
                'branch_key' => 'lagonglong',
                'branch' => 'Lagonglong Main Branch',
                'status' => 'delivered',
                'customer' => 'Chris Lim',
                'address' => 'National Highway, Lagonglong, Misamis Oriental',
                'items' => 4,
                'total' => 8450,
                'started_at' => $today . ' 14:15:00',
            ],
            [
                'id' => 'DLV-1005',
                'order_id' => 'TRX-1005',
                'branch_key' => 'lagonglong',
                'branch' => 'Lagonglong Main Branch',
                'status' => 'preparing',
                'customer' => 'Juan Dela Cruz',
                'address' => 'Purok 1, Lagonglong, Misamis Oriental',
                'items' => 2,
                'total' => 3700,
                'started_at' => $today . ' 15:30:00',
            ],
        ];

        if ($branchKey && $branchKey !== 'all') {
            $deliveries = array_values(array_filter($deliveries, fn ($d) => ($d['branch_key'] ?? null) === $branchKey));
        }

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
                'date' => $today,
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
