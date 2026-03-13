<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StaffMonitoringController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/StaffMonitoring');
    }

    public function data(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_key' => ['nullable', Rule::in(['all', 'lagonglong', 'balingasag'])],
            'range' => ['nullable', Rule::in(['today', 'yesterday', 'this_week', 'last_7_days'])],
        ]);

        $branchKey = $validated['branch_key'] ?? 'all';
        $range = $validated['range'] ?? 'today';

        [$from, $to] = $this->resolveRange($range);

        $staffQuery = User::query()
            ->select(['id', 'name', 'role', 'branch_key']);

        if ($branchKey !== 'all') {
            $staffQuery->where('branch_key', $branchKey);
        }

        $staff = $staffQuery
            ->whereIn('role', [User::ROLE_STAFF, User::ROLE_CASHIER, User::ROLE_DELIVERY])
            ->orderBy('name')
            ->get();

        $salesByUser = PosSale::query()
            ->whereBetween('created_at', [$from, $to])
            ->when($branchKey !== 'all', fn ($q) => $q->where('branch_key', $branchKey))
            ->groupBy('user_id')
            ->selectRaw('user_id, COALESCE(SUM(total),0) as total_sales')
            ->pluck('total_sales', 'user_id');

        $rows = $staff->map(function (User $u) use ($salesByUser, $from) {
            $totalSales = (float) ($salesByUser[$u->id] ?? 0);

            return [
                'id' => $u->id,
                'staffName' => $u->name,
                'role' => $u->role,
                'branch' => $u->branch_key,
                'shiftDateISO' => $from->toDateString(),
                'onShift' => $totalSales > 0,
                'totalSales' => $totalSales,
                'startTime' => '—',
                'endTime' => '—',
            ];
        })->values();

        $summary = [
            'staff_total' => $rows->count(),
            'on_duty' => $rows->where('onShift', true)->count(),
            'total_sales' => (float) $rows->sum('totalSales'),
        ];

        return response()->json([
            'filters' => [
                'branch_key' => $branchKey,
                'range' => $range,
                'from' => $from->toDateTimeString(),
                'to' => $to->toDateTimeString(),
            ],
            'summary' => $summary,
            'rows' => $rows,
        ]);
    }

    private function resolveRange(string $range): array
    {
        $now = now();

        if ($range === 'yesterday') {
            $from = $now->copy()->subDay()->startOfDay();
            $to = $now->copy()->subDay()->endOfDay();
            return [$from, $to];
        }

        if ($range === 'this_week') {
            $from = $now->copy()->startOfWeek()->startOfDay();
            $to = $now->copy()->endOfDay();
            return [$from, $to];
        }

        if ($range === 'last_7_days') {
            $from = $now->copy()->subDays(6)->startOfDay();
            $to = $now->copy()->endOfDay();
            return [$from, $to];
        }

        $from = $now->copy()->startOfDay();
        $to = $now->copy()->endOfDay();
        return [$from, $to];
    }
}
