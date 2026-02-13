import * as Icons from 'lucide-react';

/**
 * Icon mapping for navigation menu items
 * Maps icon names from backend to actual Lucide React components
 */
export const iconMap: Record<string, any> = {
    'LayoutDashboard': Icons.LayoutDashboard,
    'Bell': Icons.Bell,
    'BarChart3': Icons.BarChart3,
    'Package': Icons.Package,
    'ChefHat': Icons.ChefHat,
    'Package2': Icons.Package2,
    'PackageOpen': Icons.PackageOpen,
    'MenuSquare': Icons.MenuSquare,
    'TrendingUp': Icons.TrendingUp,
    'ShoppingCart': Icons.ShoppingCart,
    'Calculator': Icons.Calculator,
    'FileText': Icons.FileText,
    'Warehouse': Icons.Warehouse,
    'PieChart': Icons.PieChart,
    'Building2': Icons.Building2,
    'CreditCard': Icons.CreditCard,
    'Users': Icons.Users,
};

/**
 * Get icon component by name
 * @param iconName - Name of the icon (e.g., 'LayoutDashboard')
 * @returns Icon component or fallback Circle icon
 */
export function getIcon(iconName: string) {
    return iconMap[iconName] || Icons.Circle;
}
