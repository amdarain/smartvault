import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import { useSettingsStore } from './store/settingsStore';

// All 14 Pages
import Dashboard from './pages/Dashboard';
import Photos from './pages/Photos';
import SmartSearch from './pages/SmartSearch';
import Products from './pages/Products';
import Categories from './pages/Categories';
import StockManagement from './pages/StockManagement';
import StockTransactions from './pages/StockTransactions';
import Favorites from './pages/Favorites';
import RecentlyAdded from './pages/RecentlyAdded';
import Trash from './pages/Trash';
import Reports from './pages/Reports';
import ImportBackup from './pages/ImportBackup';
import Settings from './pages/Settings';
import Help from './pages/Help';

export function App() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="photos" element={<Photos />} />
            <Route path="search" element={<SmartSearch />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="transactions" element={<StockTransactions />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="recent" element={<RecentlyAdded />} />
            <Route path="trash" element={<Trash />} />
            <Route path="reports" element={<Reports />} />
            <Route path="backup" element={<ImportBackup />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
