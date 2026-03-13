import { usePage } from '@inertiajs/react';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps } from '@/types';
import type { User } from '@/types/auth';

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    const { auth } = usePage().props as { auth: { user: User } };
    const role = auth?.user?.role;
    const Layout = role === 'delivery' ? AppHeaderLayout : AppSidebarLayout;

    return (
        <Layout breadcrumbs={breadcrumbs} {...props}>
            {children}
        </Layout>
    );
};
