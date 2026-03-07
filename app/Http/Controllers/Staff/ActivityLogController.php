<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $branchKey = $user?->branch_key;

        $logs = ActivityLog::query()
            ->when($branchKey, fn ($q) => $q->where('branch_key', $branchKey))
            ->with(['user:id,name,email,role,branch_key'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(function (ActivityLog $l) {
                return [
                    'id' => $l->id,
                    'user' => $l->user?->name ?? '—',
                    'email' => $l->user?->email ?? null,
                    'role' => $l->role,
                    'branch_key' => $l->branch_key,
                    'method' => $l->method,
                    'path' => $l->path,
                    'route_name' => $l->route_name,
                    'action' => $l->action,
                    'details' => $l->details,
                    'category' => $l->category,
                    'status' => $l->status,
                    'ip_address' => $l->ip_address,
                    'created_at' => $l->created_at,
                ];
            })
            ->values();

        return Inertia::render('Staff/ActivityLog', [
            'logs' => $logs,
        ]);
    }
}
