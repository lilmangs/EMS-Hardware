import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, LogIn, ArrowLeft } from 'lucide-react';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({
    status,
    canResetPassword,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/login', {
            onFinish: () => form.reset('password'),
            onSuccess: () => {
                window.location.href = '/dashboard';
            },
        });
    };

    return (
        <>
            <Head title="Login" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 relative overflow-hidden">
                {/* Background Pattern */}
                <div 
                    className="absolute inset-0 opacity-20" 
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f97316' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`
                    }}
                />
                
                <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 opacity-20 blur-2xl" />
                <div className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 opacity-20 blur-2xl" />

                <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                    <div className="w-full max-w-5xl">
                        {/* Main Card */}
                        <div className="bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/60 overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-900">
                            {/* Back Button - positioned inside the card, top-left */}
                            <Link
                                href="/"
                                className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white hover:text-orange-500 transition-colors group"
                            >
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm font-medium"></span>
                            </Link>

                            <div className="flex flex-col lg:flex-row">
                                {/* Left Side - Branding with centered logo */}
                                <div className="lg:w-1/2 relative overflow-hidden">
                                    <div className="absolute inset-0">
                                       
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-700/70 via-orange-500/60 to-black/50" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
                                    </div>
                                    
                                    <div className="relative z-10 flex flex-col justify-center h-full p-8 lg:p-12 text-white">
                                        <div className="max-w-md mx-auto text-center">
                                            {/* Centered logo - desktop & mobile */}
                                            <img
                                                src="/ems-logo.png"
                                                alt="EM's Hardware Logo"
                                                className="h-24 lg:h-40 w-auto object-contain mx-auto mb-6 lg:mb-8 drop-shadow-2xl"
                                            />

                                            <h1 className="text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
                                                Welcome Back!
                                            </h1>

                                            <p className="text-xl lg:text-2xl font-medium opacity-90">
                                                Centralized POS & Monitoring System
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Right Side - Login Form */}
                                <div className="lg:w-1/2 p-8 lg:p-12 bg-background/80 pt-16 lg:pt-12">
                                    <div className="max-w-sm mx-auto">
                                        <div className="text-center mb-8">
                                            {/* Mobile logo fallback - already centered */}
                                            <div className="flex lg:hidden justify-center mb-4">
                                                <img
                                                    src="/ems-logo.png"
                                                    alt="EM's Hardware Logo"
                                                    className="h-16 w-auto object-contain"
                                                />
                                            </div>

                                            <h2 className="text-3xl font-bold text-foreground">Sign In</h2>
                                            <p className="text-muted-foreground mt-2">Access your centralized system</p>
                                        </div>

                                        {status && (
                                            <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
                                                <AlertDescription>{status}</AlertDescription>
                                            </Alert>
                                        )}

                                        {form.errors.email && (
                                            <Alert variant="destructive" className="mb-6">
                                                <AlertDescription>{form.errors.email}</AlertDescription>
                                            </Alert>
                                        )}

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="Enter your email"
                                                        className="pl-11 h-12 border-input rounded-lg focus:border-orange-500 focus:ring-orange-500/20"
                                                        value={form.data.email}
                                                        onChange={(e) => form.setData('email', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Enter your password"
                                                        className="pl-11 pr-11 h-12 border-input rounded-lg focus:border-orange-500 focus:ring-orange-500/20"
                                                        value={form.data.password}
                                                        onChange={(e) => form.setData('password', e.target.value)}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Checkbox
                                                        id="remember"
                                                        checked={form.data.remember}
                                                        onCheckedChange={(checked) => form.setData('remember', checked as boolean)}
                                                        className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                                    />
                                                    <Label htmlFor="remember" className="ml-2 text-sm text-muted-foreground">
                                                        Remember me
                                                    </Label>
                                                </div>

                                                {canResetPassword && (
                                                    <Link
                                                        href="/forgot-password"
                                                        className="text-sm text-orange-600 hover:text-orange-500 font-medium hover:underline"
                                                    >
                                                        Forgot password?
                                                    </Link>
                                                )}
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-medium rounded-lg shadow-lg shadow-orange-500/25 transition-all"
                                                disabled={form.processing}
                                            >
                                                <LogIn className="mr-2 h-5 w-5" />
                                                {form.processing ? 'Signing in...' : 'Sign in'}
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-xs text-muted-foreground">
                                {new Date().getFullYear()} EM's Hardware - Centralized POS & Monitoring System
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}