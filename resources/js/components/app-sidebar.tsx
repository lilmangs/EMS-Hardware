import { usePage } from '@inertiajs/react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import type { NavItem, User } from '@/types';
import { getNavItemsByRole } from '@/components/Sidebar/Menuconfig';
import { useBranchFilter } from '@/hooks/use-branch-filter';

// Role-specific navigation items
const getNavItemsForRole = (role: string) => {
    const items = getNavItemsByRole(role);

    if (items.length > 0) {
        return items;
    }

    return getNavItemsByRole('cashier');
};

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage().props as { auth: { user: User } };
    const userRole = auth?.user?.role || 'cashier';
    const mainNavItems = getNavItemsForRole(userRole);
    const { branch, setBranch } = useBranchFilter();

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="top-16 h-[calc(100svh-4rem)]"
        >
            <SidebarContent>
                <div className="flex justify-end px-2 pt-2">
                    <SidebarTrigger />
                </div>

                {userRole === 'owner' && (
                    <div className="px-3 pb-2">
                        <label className="mb-2 block text-xs font-medium text-muted-foreground">
                            Branch Filter
                        </label>
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value as any)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="all">All Branches</option>
                            <option value="lagonglong">Lagonglong Branch</option>
                            <option value="balingasag">Balingasag Branch</option>
                        </select>
                    </div>
                )}

                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
            </SidebarFooter>
        </Sidebar>
    );
}
