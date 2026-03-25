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
    Truck,
    Archive,
} from 'lucide-react';
import type { NavItem } from '@/types';



export interface MenuItem {
    label: string;
    href: string;
    icon?: LucideIcon;
}

export const sidebarMenus: Record<string, MenuItem[]> = {
    owner: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { label: 'Branch Comparison', href: '/BranchComparison', icon: GitCompare },
        { label: 'Sales Reports', href: '/SalesReports', icon: ChartColumn },
        { label: 'Staff Monitoring', href: '/owner/staff-monitoring', icon: Users2Icon },
        { label: 'Inventory Monitoring', href: '/inventory', icon: PackageSearch },
        { label: 'Refunds', href: '/owner/refunds', icon: TicketX },
        { label: 'Delivery Monitoring', href: '/owner/delivery-monitoring', icon: Truck },
        { label: 'User Management', href: '/owner/users', icon: Users },
        { label: 'Products', href: '/Products', icon: ShoppingCart },
        { label: 'Archive', href: '/owner/archive', icon: Archive },
        { label: 'Activity Log', href: '/ActivityLog', icon: FileText },
    ],

    cashier: [
        { label: 'Checkout', href: '/Checkout', icon: ArrowRightLeft },
        { label: 'Transaction', href: '/Transaction', icon: FileText },
        { label: 'Refund', href: '/Refund', icon: TicketX },
        { label: 'Products', href: '/Products', icon: PackageSearch },
        { label: 'Activity Log', href: '/cashier/activity-log', icon: FileText },

    ],

    staff: [
        { label: 'Dashboard', href: '/dashboard/staff', icon: LayoutGrid },
        { label: 'Inventory Management', href: '/inventory', icon: PackageSearch },
        { label: 'Products', href: '/Products', icon: ShoppingCart },
        { label: 'Archive', href: '/staff/archive', icon: Archive },
        { label: 'Activity Log', href: '/staff/activity-log', icon: FileText },

    ],

    delivery: [
        { label: 'Calendar', href: '/delivery/calendar', icon: Truck },
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
