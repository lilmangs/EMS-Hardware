<?php

namespace App\Http\Controllers\Delivery;

use App\Http\Controllers\Controller;
use App\Models\PosDelivery;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CalendarController extends Controller
{
    public function index()
    {
        return Inertia::render('Delivery/Calendar');
    }

    public function data(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user?->id;
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json([
                'message' => 'No assigned branch.',
            ], 422);
        }

        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
        ]);

        $start = isset($validated['start']) ? Carbon::parse($validated['start'])->startOfDay() : Carbon::now()->startOfMonth()->startOfDay();
        $end = isset($validated['end']) ? Carbon::parse($validated['end'])->endOfDay() : Carbon::now()->endOfMonth()->endOfDay();

        $base = PosDelivery::query()
            ->where('branch_key', $branchKey)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to_user_id', $userId)
                    ->orWhereNull('assigned_to_user_id');
            })
            ->with(['sale:id,ref,subtotal,total,created_at'])
            ->latest();

        $scheduled = (clone $base)
            ->whereNotNull('scheduled_for')
            ->whereBetween('scheduled_for', [$start, $end])
            ->get();

        $unscheduled = (clone $base)
            ->whereNull('scheduled_for')
            ->limit(50)
            ->get();

        $toRow = function (PosDelivery $d) {
            $itemsCount = DB::table('pos_sale_items')
                ->where('pos_sale_id', $d->pos_sale_id)
                ->selectRaw('COALESCE(SUM(qty),0) as items')
                ->value('items');

            return [
                'id' => $d->id,
                'ref' => $d->ref,
                'status' => $d->status,
                'scheduled_for' => optional($d->scheduled_for)->toDateTimeString(),
                'queue_order' => $d->queue_order,
                'customer_name' => $d->customer_name,
                'address' => $d->address,
                'delivery_fee' => $d->delivery_fee,
                'delivery_total' => $d->orderGrandTotal(),
                'items' => (int) ($itemsCount ?? 0),
                'sale' => $d->sale ? [
                    'ref' => $d->sale->ref,
                    'total' => $d->sale->total,
                    'created_at' => $d->sale->created_at,
                ] : null,
            ];
        };

        return response()->json([
            'range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'scheduled' => $scheduled->map($toRow)->values(),
            'unscheduled' => $unscheduled->map($toRow)->values(),
        ]);
    }

    public function schedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user?->id;
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json(['message' => 'No assigned branch.'], 422);
        }

        $validated = $request->validate([
            'delivery_id' => ['required', 'integer'],
            'scheduled_for' => ['required', 'date'],
        ]);

        $delivery = PosDelivery::query()
            ->where('id', $validated['delivery_id'])
            ->where('branch_key', $branchKey)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to_user_id', $userId)
                    ->orWhereNull('assigned_to_user_id');
            })
            ->first();

        if (!$delivery) {
            return response()->json(['message' => 'Delivery not found.'], 404);
        }

        if ($delivery->assigned_to_user_id === null) {
            $delivery->assigned_to_user_id = $userId;
            $delivery->assigned_at = now();
        }

        $dt = Carbon::parse($validated['scheduled_for']);
        $delivery->scheduled_for = $dt;

        if ($delivery->queue_order === null) {
            $max = PosDelivery::query()
                ->where('assigned_to_user_id', $userId)
                ->whereDate('scheduled_for', $dt->toDateString())
                ->max('queue_order');
            $delivery->queue_order = ($max ?? 0) + 1;
        }

        $delivery->save();

        return response()->json(['ok' => true]);
    }

    public function queue(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user?->id;
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json(['message' => 'No assigned branch.'], 422);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.delivery_id' => ['required', 'integer'],
            'items.*.queue_order' => ['required', 'integer', 'min:1', 'max:9999'],
        ]);

        $day = Carbon::parse($validated['date'])->toDateString();
        $items = $validated['items'];

        $ids = collect($items)->pluck('delivery_id')->unique()->values()->all();

        $deliveries = PosDelivery::query()
            ->where('branch_key', $branchKey)
            ->whereIn('id', $ids)
            ->whereDate('scheduled_for', $day)
            ->get(['id']);

        if ($deliveries->count() !== count($ids)) {
            return response()->json(['message' => 'Invalid deliveries for this day.'], 422);
        }

        DB::transaction(function () use ($items, $userId, $branchKey, $day) {
            foreach ($items as $it) {
                PosDelivery::query()
                    ->where('branch_key', $branchKey)
                    ->where('id', $it['delivery_id'])
                    ->whereDate('scheduled_for', $day)
                    ->update([
                        'queue_order' => (int) $it['queue_order'],
                        'assigned_to_user_id' => $userId,
                        'assigned_at' => now(),
                    ]);
            }
        });

        return response()->json(['ok' => true]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user?->id;
        $branchKey = $user?->branch_key;

        if (!is_string($branchKey) || trim($branchKey) === '') {
            return response()->json(['message' => 'No assigned branch.'], 422);
        }

        $validated = $request->validate([
            'delivery_id' => ['required', 'integer'],
            'status' => ['required', Rule::in(['preparing', 'out_for_delivery', 'delivered'])],
            'proof_photo' => ['nullable', 'file', 'image', 'max:8192'],
        ]);

        $delivery = PosDelivery::query()
            ->where('id', $validated['delivery_id'])
            ->where('branch_key', $branchKey)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to_user_id', $userId)
                    ->orWhereNull('assigned_to_user_id');
            })
            ->first();

        if (!$delivery) {
            return response()->json(['message' => 'Delivery not found.'], 404);
        }

        if ($delivery->assigned_to_user_id === null) {
            $delivery->assigned_to_user_id = $userId;
            $delivery->assigned_at = now();
        }

        $nextStatus = $validated['status'];
        $delivery->status = $nextStatus;
        if ($nextStatus === 'delivered') {
            if (!$request->hasFile('proof_photo')) {
                return response()->json(['message' => 'Proof photo is required to mark as delivered.'], 422);
            }

            $file = $request->file('proof_photo');
            if (!$file || !$file->isValid()) {
                return response()->json(['message' => 'Invalid proof photo upload.'], 422);
            }

            $path = $file->store('proof-of-delivery', 'public');
            $delivery->proof_photo_path = $path;
            $delivery->delivered_at = now();
        }
        $delivery->save();

        return response()->json(['ok' => true]);
    }
}
