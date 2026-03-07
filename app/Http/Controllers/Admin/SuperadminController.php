<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SuperadminController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'branch_key', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => ['required', Rule::in(['owner', 'staff', 'cashier', 'delivery', 'superadmin'])],
            'branch_key' => ['nullable', Rule::in(['lagonglong', 'balingasag'])],
        ]);

        if (in_array($validated['role'], ['cashier', 'delivery', 'staff'], true) && empty($validated['branch_key'])) {
            return redirect()->back()->withErrors([
                'branch_key' => 'Branch is required for this role.',
            ])->withInput();
        }

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'branch_key' => $validated['role'] === 'owner' ? null : ($validated['branch_key'] ?? null),
        ]);

        return redirect()->route('superadmin.users');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'role' => ['required', Rule::in(['owner', 'staff', 'cashier', 'delivery', 'superadmin'])],
            'branch_key' => ['nullable', Rule::in(['lagonglong', 'balingasag'])],
        ]);

        if (in_array($validated['role'], ['cashier', 'delivery', 'staff'], true) && empty($validated['branch_key'])) {
            return redirect()->back()->withErrors([
                'branch_key' => 'Branch is required for this role.',
            ])->withInput();
        }

        // Superadmin role is fixed: if a user is already superadmin, do not allow changing it.
        if ($user->role === 'superadmin' && $validated['role'] !== 'superadmin') {
            return redirect()->back()->withErrors([
                'role' => 'You can\'t change a Superadmin account role.',
            ]);
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'branch_key' => $validated['role'] === 'owner' ? null : ($validated['branch_key'] ?? null),
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = $validated['password'];
        }

        $user->update($updateData);

        return redirect()->route('superadmin.users');
    }

    public function destroy(User $user)
    {
        // Prevent deleting superadmin accounts
        if ($user->role === 'superadmin') {
            return redirect()->back()->withErrors([
                'delete' => 'You can\'t delete Superadmin accounts.',
            ]);
        }

        $user->delete();

        return redirect()->route('superadmin.users');
    }
}
