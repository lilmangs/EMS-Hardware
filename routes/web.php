<?php
use App\Http\Controllers\OwnerController\StaffManagementController;
use App\Http\Controllers\CashierController\ProductsController;
use App\Http\Controllers\CashierController\TransactionController;
use App\Http\Controllers\OwnerController\InventoryController;
use App\Http\Controllers\CashierController\RefundController;
use App\Http\Controllers\CashierController\CheckoutController;
use App\Http\Controllers\CashierController\ActivityLogController as CashierActivityLogController;
use App\Http\Controllers\CashierController\DeliveryController as CashierDeliveryController;
use App\Http\Controllers\OwnerController\SalesreportsController;
use App\Http\Controllers\OwnerController\BranchComparisonController;
use App\Http\Controllers\OwnerController\ActivityLogController;
use App\Http\Controllers\OwnerController\DeliveryMonitoringController;
use App\Http\Controllers\OwnerController\StaffMonitoringController;
use App\Http\Controllers\OwnerController\DashboardDataController;
use App\Http\Controllers\OwnerController\ArchiveController;
use App\Http\Controllers\OwnerController\RefundsController;
use App\Http\Controllers\Admin\SuperadminController;
use App\Http\Controllers\Admin\AdminActivityLogController;  
use App\Http\Controllers\Staff\DashboardController as StaffDashboardController;
use App\Http\Controllers\Staff\ArchiveController as StaffArchiveController;
use App\Http\Controllers\Staff\ActivityLogController as StaffActivityLogController;
use App\Http\Controllers\Delivery\CalendarController as DeliveryCalendarController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('/Superadmin', function () {
    return Inertia::render('Admin/Superadmin');
})->middleware(['auth', 'verified', 'role:superadmin'])->name('superadmin');

// Superadmin user management routes
Route::get('/Superadmin/Users', [SuperadminController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:superadmin'])
    ->name('superadmin.users');

Route::post('/Superadmin/Users', [SuperadminController::class, 'store'])
    ->middleware(['auth', 'verified', 'role:superadmin'])
    ->name('superadmin.users.store');

Route::put('/Superadmin/Users/{user}', [SuperadminController::class, 'update'])
    ->middleware(['auth', 'verified', 'role:superadmin'])
    ->name('superadmin.users.update');

Route::delete('/Superadmin/Users/{user}', [SuperadminController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'role:superadmin'])
    ->name('superadmin.users.destroy');

Route::get('/Superadmin/ActivityLog', [AdminActivityLogController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:superadmin'])
    ->name('superadmin.activitylog');

   
// Other routes that might need role restrictions
Route::get('/inventory', [InventoryController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('inventory');

Route::get('/inventory/items', [InventoryController::class, 'items'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('inventory.items');

Route::post('/inventory/items', [InventoryController::class, 'store'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('inventory.items.store');

Route::put('/inventory/items/{product}', [InventoryController::class, 'update'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('inventory.items.update');

Route::post('/inventory/items/{product}/restock', [InventoryController::class, 'restock'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('inventory.items.restock');

Route::get('/SalesReports', [SalesreportsController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('salesreports');

Route::get('/owner/sales-reports/data', [SalesreportsController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.salesreports.data');

Route::get('/BranchComparison', [BranchComparisonController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('branchcomparison');

Route::get('/BranchComparison/data', [BranchComparisonController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('branchcomparison.data');

    Route::get('/ActivityLog', [ActivityLogController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('activitylog');

Route::get('/owner/delivery-monitoring', [DeliveryMonitoringController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.delivery-monitoring');

Route::get('/owner/delivery-monitoring/data', [DeliveryMonitoringController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.delivery-monitoring.data');

Route::get('/owner/dashboard/data', DashboardDataController::class)
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.dashboard.data');

Route::get('/owner/staff-monitoring', [StaffMonitoringController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.staff-monitoring');

Route::get('/owner/staff-monitoring/data', [StaffMonitoringController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.staff-monitoring.data');

Route::get('/owner/archive', [ArchiveController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.archive');

Route::get('/owner/refunds', [RefundsController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.refunds');

Route::get('/owner/refunds/data', [RefundsController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.refunds.data');

Route::post('/owner/archive/{product}/restore', [ArchiveController::class, 'restore'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.archive.restore');

Route::delete('/owner/archive/{product}', [ArchiveController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'role:owner'])
    ->name('owner.archive.destroy');

Route::get('/owner/StaffMonitoring', function () {
    return redirect('/owner/staff-monitoring');
})->middleware(['auth', 'verified', 'role:owner']);

Route::get('/Owner/Archive', function () {
    return redirect('/owner/archive');
})->middleware(['auth', 'verified', 'role:owner']);



    //cashier   
    Route::get('/Products', [ProductsController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('Products');

    Route::post('/Products', [ProductsController::class, 'store'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('Products.store');

    Route::put('/Products/{product}', [ProductsController::class, 'update'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('Products.update');

    Route::delete('/Products/{product}', [ProductsController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'role:owner,staff,cashier'])
    ->name('Products.destroy');

    Route::get('/Checkout', [CheckoutController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Checkout');

    Route::post('/Checkout/cart', [CheckoutController::class, 'saveCart'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Checkout.cart');

    Route::post('/Checkout/complete', [CheckoutController::class, 'complete'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Checkout.complete');

    Route::get('/Refund', [RefundController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Refund');

    Route::get('/Refund/sale', [RefundController::class, 'sale'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Refund.sale');

    Route::post('/Refund/create', [RefundController::class, 'create'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Refund.create');

    Route::get('/Transaction', [TransactionController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('Transaction');

    Route::get('/cashier/activity-log', [CashierActivityLogController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.activity-log');

    Route::get('/cashier/deliveries', [CashierDeliveryController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.deliveries');

    Route::get('/cashier/deliveries/data', [CashierDeliveryController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.deliveries.data');

    Route::get('/cashier/deliveries/staff', [CashierDeliveryController::class, 'staff'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.deliveries.staff');

    Route::post('/cashier/deliveries/create', [CashierDeliveryController::class, 'create'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.deliveries.create');

    Route::post('/cashier/deliveries/assign', [CashierDeliveryController::class, 'assign'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.deliveries.assign');

    Route::post('/cashier/deliveries/status', [CashierDeliveryController::class, 'status'])
    ->middleware(['auth', 'verified', 'role:cashier'])
    ->name('cashier.deliveries.status');

Route::get('/dashboard/staff', StaffDashboardController::class)
    ->middleware(['auth', 'verified', 'role:staff'])
    ->name('staff.dashboard');

Route::get('/staff/archive', [StaffArchiveController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:staff'])
    ->name('staff.archive');

Route::post('/staff/archive/{product}/restore', [StaffArchiveController::class, 'restore'])
    ->middleware(['auth', 'verified', 'role:staff'])
    ->name('staff.archive.restore');

Route::delete('/staff/archive/{product}', [StaffArchiveController::class, 'destroy'])
    ->middleware(['auth', 'verified', 'role:staff'])
    ->name('staff.archive.destroy');

Route::get('/staff/activity-log', [StaffActivityLogController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:staff'])
    ->name('staff.activity-log');

Route::get('/delivery/calendar', [DeliveryCalendarController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:delivery'])
    ->name('delivery.calendar');

Route::get('/delivery/calendar/data', [DeliveryCalendarController::class, 'data'])
    ->middleware(['auth', 'verified', 'role:delivery'])
    ->name('delivery.calendar.data');

Route::post('/delivery/calendar/schedule', [DeliveryCalendarController::class, 'schedule'])
    ->middleware(['auth', 'verified', 'role:delivery'])
    ->name('delivery.calendar.schedule');

Route::post('/delivery/calendar/queue', [DeliveryCalendarController::class, 'queue'])
    ->middleware(['auth', 'verified', 'role:delivery'])
    ->name('delivery.calendar.queue');

Route::post('/delivery/calendar/status', [DeliveryCalendarController::class, 'status'])
    ->middleware(['auth', 'verified', 'role:delivery'])
    ->name('delivery.calendar.status');

// Keep the general dashboard for backward compatibility
Route::get('dashboard', function () {
    $user = request()->user();

    return match ($user?->role) {
        'owner' => Inertia::render('Owner/Dashboard'),
        'staff' => redirect()->route('staff.dashboard'),
        'cashier' => Inertia::render('Cashier/Dashboard'),
        'delivery' => redirect()->route('delivery.calendar'),
        'superadmin' => Inertia::render('Admin/Superadmin'),
            default => redirect('/'),
    };
})->middleware(['auth', 'verified'])->name('dashboard');


if (app()->environment('local')) {
    Route::get('/debug-roles', function () {
        $users = \App\Models\User::select('id', 'email', 'role')->get();
        return response()->json([
            'users' => $users,
            'message' => 'Check your user role. If it\'s not "owner", you need to update it.'
        ]);
    });

    Route::get('/fix-owner-role/{email}', function ($email) {
        $user = \App\Models\User::where('email', $email)->first();
        if ($user) {
            $user->update(['role' => 'owner']);
            return response()->json(['message' => 'User role updated to owner']);
        }
        return response()->json(['message' => 'User not found'], 404);
    });
}

require __DIR__.'/settings.php';
