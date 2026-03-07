<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use App\Models\PosRefund;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RefundsController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/Refunds');
    }

    public function data(Request $request)
    {
        $validated = $request->validate([
            'branch_key' => ['nullable', Rule::in(['all', 'lagonglong', 'balingasag'])],
            'search' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'sort' => ['nullable', Rule::in(['created_at', 'amount', 'branch_key'])],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $branchKey = $validated['branch_key'] ?? 'all';
        $search = $validated['search'] ?? '';

        $dateFrom = isset($validated['date_from']) ? Carbon::parse($validated['date_from'])->startOfDay() : null;
        $dateTo = isset($validated['date_to']) ? Carbon::parse($validated['date_to'])->endOfDay() : null;

        $sort = $validated['sort'] ?? 'created_at';
        $dir = $validated['dir'] ?? 'desc';
        $perPage = $validated['per_page'] ?? 10;

        $query = PosRefund::query()
            ->with([
                'items:id,pos_refund_id,name,qty,amount',
                'sale:id,ref',
                'processedBy:id,name',
            ]);

        if ($branchKey !== 'all') {
            $query->where('branch_key', $branchKey);
        }

        $query->whereIn('status', ['approved', 'rejected']);

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo);
        }

        if (is_string($search) && trim($search) !== '') {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('ref', 'like', "%{$s}%")
                    ->orWhere('customer_name', 'like', "%{$s}%")
                    ->orWhere('reason', 'like', "%{$s}%")
                    ->orWhereHas('sale', function ($sq) use ($s) {
                        $sq->where('ref', 'like', "%{$s}%");
                    })
                    ->orWhereHas('items', function ($iq) use ($s) {
                        $iq->where('name', 'like', "%{$s}%");
                    });
            });
        }

        $query->orderBy($sort, $dir);

        $p = $query->paginate($perPage)->withQueryString();

        $todayStart = Carbon::now()->startOfDay();
        $todayEnd = Carbon::now()->endOfDay();

        $summaryBase = PosRefund::query()->whereIn('status', ['approved', 'rejected']);
        if ($branchKey !== 'all') {
            $summaryBase->where('branch_key', $branchKey);
        }

        $todayQuery = (clone $summaryBase)->whereBetween('created_at', [$todayStart, $todayEnd]);

        $totalRefundsToday = (clone $todayQuery)->count();
        $totalRefundAmountToday = (clone $todayQuery)->sum('amount');

        $approvedCount = (clone $summaryBase)->where('status', 'approved')->count();
        $rejectedCount = (clone $summaryBase)->where('status', 'rejected')->count();

        return response()->json([
            'filters' => [
                'branch_key' => $branchKey,
                'search' => $search,
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'page' => $p->currentPage(),
            ],
            'summary' => [
                'total_refunds_today' => $totalRefundsToday,
                'total_refund_amount_today' => (float) $totalRefundAmountToday,
                'approved' => $approvedCount,
                'rejected' => $rejectedCount,
            ],
            'refunds' => $p,
        ]);
    }
}
