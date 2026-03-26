import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

type Props = {
    children: ReactNode;
    variant?: 'header' | 'sidebar';
};

export function AppShell({ children, variant = 'header' }: Props) {
    const page = usePage();
    const isOpen = (page.props as any).sidebarOpen;
    const role = (page.props as any)?.auth?.user?.role;
    const defaultOpen = role === 'cashier' ? false : true;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                {children}
                <Toaster position="top-center" />
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            {children}
            <Toaster position="top-center" />
        </SidebarProvider>
    );
}
