<?php

namespace App\Http\Controllers\CashierController;

use App\Http\Controllers\Controller;
use App\Models\PosDelivery;
use App\Models\PosSale;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DeliveryController extends Controller
{
    public function index()
    {
        $user = request()->user();
        $branchKey = $user?->branch_key;

        return Inertia::render('Cashier/Delivery', [
            'branch_key' => $branchKey,
        ]);
    }

    public function staff(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json([
                'staff' => [],
            ]);
        }

        $staff = User::query()
            ->where('role', User::ROLE_DELIVERY)
            ->where('branch_key', $branchKey)
            ->orderBy('name')
            ->get(['id', 'name', 'branch_key']);

        return response()->json([
            'staff' => $staff,
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json([
                'deliveries' => [],
            ]);
        }

        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['all', 'preparing', 'out_for_delivery', 'delivered'])],
            'assigned' => ['nullable', Rule::in(['all', 'assigned', 'unassigned'])],
        ]);

        $status = $validated['status'] ?? 'all';
        $assigned = $validated['assigned'] ?? 'all';

        $query = PosDelivery::query()
            ->where('branch_key', $branchKey)
            ->with([
                'sale:id,ref,branch_key,total,created_at',
                'assignedTo:id,name',
            ])
            ->latest();

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($assigned === 'assigned') {
            $query->whereNotNull('assigned_to_user_id');
        } elseif ($assigned === 'unassigned') {
            $query->whereNull('assigned_to_user_id');
        }

        $deliveries = $query
            ->limit(150)
            ->get()
            ->map(function (PosDelivery $d) {
                $saleId = $d->pos_sale_id;

                $itemsCount = DB::table('pos_sale_items')
                    ->where('pos_sale_id', $saleId)
                    ->selectRaw('COALESCE(SUM(qty),0) as items')
                    ->value('items');

                return [
                    'id' => $d->id,
                    'ref' => $d->ref,
                    'status' => $d->status,
                    'scheduled_for' => optional($d->scheduled_for)->toDateTimeString(),
                    'customer_name' => $d->customer_name,
                    'address' => $d->address,
                    'delivery_fee' => $d->delivery_fee,
                    'notes' => $d->notes,
                    'assigned_to' => $d->assignedTo ? [
                        'id' => $d->assignedTo->id,
                        'name' => $d->assignedTo->name,
                    ] : null,
                    'assigned_at' => $d->assigned_at,
                    'delivered_at' => $d->delivered_at,
                    'created_at' => $d->created_at,
                    'sale' => $d->sale ? [
                        'id' => $d->sale->id,
                        'ref' => $d->sale->ref,
                        'total' => $d->sale->total,
                        'created_at' => $d->sale->created_at,
                    ] : null,
                    'delivery_total' => (float) ((float) ($d->sale?->total ?? 0) + (float) ($d->delivery_fee ?? 0)),
                    'items' => (int) ($itemsCount ?? 0),
                ];
            })
            ->values();

        return response()->json([
            'filters' => [
                'status' => $status,
                'assigned' => $assigned,
            ],
            'deliveries' => $deliveries,
        ]);
    }

    public function create(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json([
                'message' => 'No assigned branch.',
            ], 422);
        }

        $validated = $request->validate([
            'sale_ref' => ['required', 'string', 'max:50'],
            'customer_name' => ['required', 'string', 'max:120'],
            'address' => ['required', 'string', 'max:1000'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'assigned_to_user_id' => ['nullable', 'integer'],
            'scheduled_for' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $saleRef = trim($validated['sale_ref']);

        $sale = PosSale::query()
            ->where('ref', $saleRef)
            ->where('branch_key', $branchKey)
            ->first();

        if (!$sale) {
            return response()->json([
                'message' => 'Sale not found for your branch.',
            ], 404);
        }

        $exists = PosDelivery::query()->where('pos_sale_id', $sale->id)->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Delivery already created for this sale.',
            ], 422);
        }

        $ref = null;
        for ($i = 0; $i < 3; $i++) {
            $refCandidate = 'DLV-' . Carbon::now()->format('YmdHis') . '-' . Str::upper(Str::random(4));
            if (!PosDelivery::query()->where('ref', $refCandidate)->exists()) {
                $ref = $refCandidate;
                break;
            }
        }

        if (!$ref) {
            return response()->json([
                'message' => 'Failed to generate delivery reference.',
            ], 500);
        }

        $assignedToUserId = $validated['assigned_to_user_id'] ?? null;
        if ($assignedToUserId) {
            $staff = User::query()
                ->where('id', $assignedToUserId)
                ->where('role', User::ROLE_DELIVERY)
                ->where('branch_key', $branchKey)
                ->first();

            if (!$staff) {
                return response()->json([
                    'message' => 'Invalid delivery staff selection.',
                ], 422);
            }
        }

        $scheduledFor = isset($validated['scheduled_for']) ? Carbon::parse($validated['scheduled_for']) : null;
        if ($scheduledFor) {
            $scheduledFor = $scheduledFor->seconds(0);
        }

        $queueOrder = null;
        if ($scheduledFor && $assignedToUserId) {
            $max = PosDelivery::query()
                ->where('assigned_to_user_id', $assignedToUserId)
                ->whereDate('scheduled_for', $scheduledFor->toDateString())
                ->max('queue_order');
            $queueOrder = ((int) ($max ?? 0)) + 1;
        }

        $delivery = PosDelivery::create([
            'ref' => $ref,
            'pos_sale_id' => $sale->id,
            'branch_key' => $branchKey,
            'status' => 'preparing',
            'scheduled_for' => $scheduledFor,
            'queue_order' => $queueOrder,
            'customer_name' => trim($validated['customer_name']),
            'address' => trim($validated['address']),
            'delivery_fee' => isset($validated['delivery_fee']) ? (float) $validated['delivery_fee'] : 0,
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) : null,
            'assigned_to_user_id' => $assignedToUserId ?: null,
            'assigned_by_user_id' => $user?->id,
            'assigned_at' => $assignedToUserId ? now() : null,
        ]);

        return response()->json([
            'ok' => true,
            'delivery_id' => $delivery->id,
            'ref' => $delivery->ref,
        ]);
    }

    public function assign(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json([
                'message' => 'No assigned branch.',
            ], 422);
        }

        $validated = $request->validate([
            'delivery_id' => ['required', 'integer'],
            'assigned_to_user_id' => ['nullable', 'integer'],
        ]);

        $delivery = PosDelivery::query()
            ->where('id', $validated['delivery_id'])
            ->where('branch_key', $branchKey)
            ->first();

        if (!$delivery) {
            return response()->json([
                'message' => 'Delivery not found.',
            ], 404);
        }

        $assignedToUserId = $validated['assigned_to_user_id'] ?? null;

        if ($assignedToUserId) {
            $staff = User::query()
                ->where('id', $assignedToUserId)
                ->where('role', User::ROLE_DELIVERY)
                ->where('branch_key', $branchKey)
                ->first();

            if (!$staff) {
                return response()->json([
                    'message' => 'Invalid delivery staff selection.',
                ], 422);
            }

            $delivery->assigned_to_user_id = $staff->id;
            $delivery->assigned_by_user_id = $user?->id;
            $delivery->assigned_at = now();
        } else {
            $delivery->assigned_to_user_id = null;
            $delivery->assigned_by_user_id = $user?->id;
            $delivery->assigned_at = null;
        }

        $delivery->save();

        return response()->json([
            'ok' => true,
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Cashier cannot update delivery status.',
        ], 403);
    }
}
