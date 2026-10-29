import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Image,
  Search,
  Package,
  MoreHorizontal,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';

const BOTTOM_NAV = [
  { to: '/', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Home', end: true },
  { to: '/photos', icon: <Image className="w-5 h-5" />, label: 'Photos' },
  { to: '/search', icon: <Search className="w-5 h-5" />, label: 'Search' },
  { to: '/products', icon: <Package className="w-5 h-5" />, label: 'Products' },
  { to: '/stock', icon: <BarChart3 className="w-5 h-5" />, label: 'Stock' },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
      <div className="flex items-center justify-around px-2 h-16">
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1',
                'text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-400 dark:text-gray-500',
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function TopBar({ onMenuOpen }: { onMenuOpen?: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">SmartVault</span>
        </div>
        <div className="flex-1" />
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            aria-label="Open menu"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
