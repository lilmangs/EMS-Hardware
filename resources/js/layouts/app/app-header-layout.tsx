import { AppContent } from '@/components/app-content';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    return (
        <AppShell>
            <AppSidebarHeader breadcrumbs={breadcrumbs} />
            <AppContent className="flex min-h-[calc(100vh-4rem)] w-full flex-1 flex-col gap-4 pt-16">
                {children}
            </AppContent>
        </AppShell>
    );
}
