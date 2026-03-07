import type { LucideIcon } from 'lucide-react';
import {
    ClipboardCheck,
    FileText,
    LayoutGrid,
    ShoppingCart,
    Users2Icon,
    ArrowRightLeft,
    ChartColumn,
    GitCompare,
    PackageSearch,
    TicketX,
    Users,
    ClipboardList,
    Truck,
    Archive,
} from 'lucide-react';
import type { NavItem } from '@/types';
import {
    Checkout,
    Products,
    Refund,
    branchcomparison,
    inventory,
    salesreports,
    activitylog,
} from '@/routes';
import superadmin from '@/routes/superadmin';



export interface MenuItem {
    label: string;
    href: string;
    icon?: LucideIcon;
}

export const sidebarMenus: Record<string, MenuItem[]> = {
    owner: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { label: 'Products', href: Products().url, icon: ShoppingCart },
        { label: 'Inventory', href: inventory().url, icon: PackageSearch },
        { label: 'Sales Reports', href: salesreports().url, icon: ChartColumn },
        { label: 'Refunds', href: '/owner/refunds', icon: TicketX },
        { label: 'Delivery Monitoring', href: '/owner/delivery-monitoring', icon: Truck },
        { label: 'Staff Monitoring', href: '/owner/staff-monitoring', icon: Users2Icon },
        { label: 'Branch Comparison', href: branchcomparison().url, icon: GitCompare },
        { label: 'Archive', href: '/owner/archive', icon: Archive },
        { label: 'Activity Log', href: activitylog().url, icon: FileText },
    ],

    cashier: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { label: 'Checkout', href: Checkout().url, icon: ArrowRightLeft },
        { label: 'Transaction', href: '/Transaction', icon: FileText },
        { label: 'Products', href: Products().url, icon: PackageSearch },
        { label: 'Refund', href: Refund().url, icon: TicketX },
        { label: 'Activity Log', href: '/cashier/activity-log', icon: FileText },

    ],

    superadmin: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { label: 'User Management', href: '/Superadmin/Users', icon: Users },
        { label: 'Activity Log', href: superadmin.activitylog().url, icon: ClipboardList },
    ],
    staff: [
        { label: 'Dashboard', href: '/dashboard/staff', icon: LayoutGrid },
        { label: 'Products', href: Products().url, icon: ShoppingCart },
        { label: 'Inventory', href: inventory().url, icon: PackageSearch },
        { label: 'Archive', href: '/staff/archive', icon: Archive },
        { label: 'Activity Log', href: '/staff/activity-log', icon: FileText },

    ],

};

// Get menu items by role
export const getMenusByRole = (role: string): MenuItem[] => {
    return sidebarMenus[role] || [];
};

export const getNavItemsByRole = (role: string): NavItem[] => {
    return getMenusByRole(role).map((item) => ({
        title: item.label,
        href: item.href,
        icon: item.icon ?? null,
    }));
};

// Get all unique routes from all menus
export const getAllRoutes = (): string[] => {
    const routes = new Set<string>();
    Object.values(sidebarMenus).forEach((menu) => {
        menu.forEach((item) => {
            routes.add(item.href);
        });
    });
    return Array.from(routes);
};
