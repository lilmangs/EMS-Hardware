<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class StaffMonitoringController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/StaffMonitoring');
    }
}
