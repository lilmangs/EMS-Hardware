<?php

namespace App\Http\Controllers\OwnerController;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalesreportsController extends Controller
{
    public function index()
    {
        return Inertia::render('Owner/SalesReports');
    }
}
