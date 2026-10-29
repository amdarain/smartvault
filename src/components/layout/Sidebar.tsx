import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Image,
  Search,
  Package,
  Tag,
  BarChart3,
  ArrowLeftRight,
  Heart,
  Clock,
  Trash2,
  FileBarChart,
  Upload,
  Settings,
  HelpCircle,
  Vault,
  ChevronLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', end: true },
  { to: '/photos', icon: <Image className="w-5 h-5" />, label: 'All Photos' },
  { to: '/search', icon: <Search className="w-5 h-5" />, label: 'Smart Search' },
  { to: '/products', icon: <Package className="w-5 h-5" />, label: 'Products' },
  { to: '/categories', icon: <Tag className="w-5 h-5" />, label: 'Categories' },
  { to: '/stock', icon: <BarChart3 className="w-5 h-5" />, label: 'Stock Management' },
  { to: '/transactions', icon: <ArrowLeftRight className="w-5 h-5" />, label: 'Transactions' },
];

const LIBRARY_ITEMS: NavItem[] = [
  { to: '/favorites', icon: <Heart className="w-5 h-5" />, label: 'Favorites' },
  { to: '/recent', icon: <Clock className="w-5 h-5" />, label: 'Recently Added' },
  { to: '/trash', icon: <Trash2 className="w-5 h-5" />, label: 'Trash' },
];

const TOOLS_ITEMS: NavItem[] = [
  { to: '/reports', icon: <FileBarChart className="w-5 h-5" />, label: 'Reports' },
  { to: '/backup', icon: <Upload className="w-5 h-5" />, label: 'Import & Backup' },
  { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  { to: '/help', icon: <HelpCircle className="w-5 h-5" />, label: 'Help & Status' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
          isActive
            ? 'bg-emerald-700 text-white shadow-sm'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-100',
          collapsed && 'justify-center',
        )
      }
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-widest">
          {title}
        </p>
      )}
      {collapsed && <div className="border-t border-gray-700 my-2" />}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavItemRow key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const isOnline = useNetworkStatus();

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-full bg-gray-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center px-4 py-4 border-b border-gray-700 flex-shrink-0',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Vault className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-lg text-white">SmartVault</span>
          </div>
        )}
        {collapsed && <Vault className="w-6 h-6 text-emerald-400" />}
        <button
          onClick={onToggle}
          className={clsx(
            'p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={clsx('w-4 h-4 transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        <NavSection title="Main" items={NAV_ITEMS} collapsed={collapsed} />
        <NavSection title="Library" items={LIBRARY_ITEMS} collapsed={collapsed} />
        <NavSection title="Tools" items={TOOLS_ITEMS} collapsed={collapsed} />
      </div>

      {/* Footer — Network status */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-gray-700">
        <div
          className={clsx(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs',
            isOnline ? 'text-emerald-400' : 'text-amber-400',
            collapsed && 'justify-center',
          )}
        >
          <span
            className={clsx(
              'w-2 h-2 rounded-full flex-shrink-0',
              isOnline ? 'bg-emerald-400' : 'bg-amber-400',
            )}
          />
          {!collapsed && (isOnline ? 'Online' : 'Offline')}
        </div>
      </div>
    </aside>
  );
}
