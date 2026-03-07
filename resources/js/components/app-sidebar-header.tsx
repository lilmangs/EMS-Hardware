import { usePage, router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { User } from '@/types/auth';

export function AppSidebarHeader() {
    const { auth } = usePage().props as { auth: { user: User } };
    const userRole = auth?.user?.role;
    const branchKey = auth?.user?.branch_key;
    const cleanup = useMobileNavigation();
    const getInitials = useInitials();
    const now = new Date();
    const formattedDate = now.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    const formattedRole = (auth?.user?.role ?? 'user')
        .toString()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const formattedBranch =
        branchKey === 'lagonglong'
            ? 'Lagonglong Branch'
            : branchKey === 'balingasag'
                ? 'Balingasag Branch'
                : '';

    const roleLine = formattedRole;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex shrink-0 flex-col border-b border-sidebar-border/50 bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-auto">
            <div className="flex h-16 items-center gap-2 px-6 md:px-4">
                <div className="flex items-center md:hidden">
                    <SidebarTrigger />
                </div>
                <div className="ml-2 flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-transparent">
                            <img
                                src="/ems-logo.png"
                                alt="EM's Hardware"
                                className="h-9 w-9 object-contain"
                            />
                        </div>
                        <div className="leading-tight">
                            <div className="text-lg font-semibold text-orange-600">
                                EM&apos;s Hardware
                                <span className="-mt-0.5 block text-sm font-normal text-gray-600">
                                    {formattedBranch}
                                </span>
                                   
                            </div>
                        </div>
                        <div className="ml-20 hidden flex-col gap-1 text-xs md:flex">
                            <div className="text-muted-foreground">
                                {formattedDate} ({formattedTime})
                            </div>
                            {userRole === 'cashier' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">SHIFT:</span>
                                    <span className="font-medium text-green-600">Active</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="group inline-flex items-center gap-3 rounded-xl border border-transparent bg-transparent p-1.5 transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                                    <div className="hidden text-right leading-tight sm:block">
                                        <div className="max-w-40 truncate text-sm font-semibold text-foreground">
                                            {auth?.user?.name}
                                        </div>
                                        <div className="max-w-40 truncate text-xs text-muted-foreground">
                                            {roleLine}
                                        </div>
                                    </div>
                                    <Avatar className="h-9 w-9 border border-orange-500/10 bg-orange-50 dark:bg-orange-500/10">
                                        <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.name} />
                                        <AvatarFallback className="rounded-full bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200">
                                            {getInitials(auth?.user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 rounded-xl p-2 shadow-lg" align="end" sideOffset={8}>
                                <UserMenuContent user={auth?.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

        </header>
    );
}
