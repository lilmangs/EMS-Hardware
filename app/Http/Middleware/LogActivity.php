<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    /**
     * Handle an incoming request.
     *
     * Logs authenticated, non-GET requests to the activity_logs table.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $method = strtoupper((string) $request->method());
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $response;
        }

        $user = $request->user();
        if (!$user) {
            return $response;
        }

        try {
            $status = $response->getStatusCode() >= 400 ? 'error' : 'success';

            $route = $request->route();
            $routeName = $route?->getName();

            if (is_string($routeName) && $routeName === 'Checkout.cart') {
                return $response;
            }

            $path = $request->path();
            $action = $this->makeAction($method, $routeName, $path);
            $category = $this->makeCategory($path, $routeName);

            ActivityLog::create([
                'user_id' => $user->id,
                'role' => $user->role,
                'branch_key' => $user->branch_key,
                'method' => $method,
                'path' => substr($path, 0, 255),
                'route_name' => is_string($routeName) ? substr($routeName, 0, 120) : null,
                'action' => substr($action, 0, 255),
                'details' => null,
                'category' => $category,
                'status' => $status,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);
        } catch (\Throwable $e) {
            // Swallow logging errors to avoid breaking requests.
        }

        return $response;
    }

    private function makeAction(string $method, ?string $routeName, string $path): string
    {
        if (is_string($routeName) && $routeName !== '') {
            return $method . ' ' . $routeName;
        }

        return $method . ' /' . ltrim($path, '/');
    }

    private function makeCategory(string $path, ?string $routeName): ?string
    {
        $haystack = strtolower(($routeName ?? '') . ' ' . $path);

        if (str_contains($haystack, 'refund')) return 'sales';
        if (str_contains($haystack, 'checkout') || str_contains($haystack, 'transaction') || str_contains($haystack, 'sale')) return 'sales';
        if (str_contains($haystack, 'inventory') || str_contains($haystack, 'restock') || str_contains($haystack, 'stock')) return 'inventory';
        if (str_contains($haystack, 'product')) return 'inventory';
        if (str_contains($haystack, 'delivery')) return 'delivery';
        if (str_contains($haystack, 'user') || str_contains($haystack, 'staff')) return 'users';

        return 'system';
    }
}
