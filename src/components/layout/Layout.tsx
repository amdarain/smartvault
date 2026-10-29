import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav, TopBar } from './MobileNav';
import { usePWA } from '../../hooks/usePWA';
import { Button } from '../ui/Button';
import { RefreshCw, Download } from 'lucide-react';
import { clsx } from 'clsx';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { needsUpdate, canInstall, install, update } = usePWA();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <TopBar />

        {/* Update / Install banner */}
        {needsUpdate && (
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-700 text-white text-sm">
            <span>A new version of SmartVault is available.</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={update}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Update now
            </Button>
          </div>
        )}

        {canInstall && !needsUpdate && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white text-sm">
            <span>Install SmartVault as an app for offline access.</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={install}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Install
            </Button>
          </div>
        )}

        {/* Page content */}
        <main
          className={clsx(
            'flex-1 overflow-y-auto',
            'pb-20 lg:pb-0', // Padding for mobile bottom nav
          )}
        >
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <MobileNav />
      </div>
    </div>
  );
}
