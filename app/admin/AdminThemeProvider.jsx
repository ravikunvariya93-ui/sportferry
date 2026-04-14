'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const AdminThemeContext = createContext();

export const useAdminTheme = () => {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
};

export default function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark'); // Default to dark as per original design
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('admin-theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Prevent flash by not rendering children until mounted if we want to be strict,
  // but for a dashboard, a wrapper with the class is better.
  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`admin-theme-wrapper ${theme}-theme`}>
        {children}
      </div>
      <style jsx global>{`
        .admin-theme-wrapper {
          min-height: 100vh;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* Dark Theme Variables */
        .dark-theme {
          --admin-bg: #0f1117;
          --admin-sidebar: #13161e;
          --admin-surface: #13161e;
          --admin-table-row: #13161e;
          --admin-text-main: #e2e8f0;
          --admin-text-sub: #94a3b8;
          --admin-text-muted: #64748b;
          --admin-border: rgba(255, 255, 255, 0.07);
          --admin-border-sub: rgba(255, 255, 255, 0.04);
          --admin-nav-hover: rgba(255, 255, 255, 0.06);
          --admin-nav-active: rgba(34, 197, 94, 0.12);
          --admin-input-bg: rgba(255, 255, 255, 0.05);
          --admin-input-border: rgba(255, 255, 255, 0.08);
          --admin-card-hover: rgba(34, 197, 94, 0.2);
        }

        /* Light Theme Variables */
        .light-theme {
          --admin-bg: #f8fafc;
          --admin-sidebar: #ffffff;
          --admin-surface: #ffffff;
          --admin-table-row: #ffffff;
          --admin-text-main: #0f172a;
          --admin-text-sub: #475569;
          --admin-text-muted: #64748b;
          --admin-border: #e2e8f0;
          --admin-border-sub: #f1f5f9;
          --admin-nav-hover: #f1f5f9;
          --admin-nav-active: rgba(34, 197, 94, 0.1);
          --admin-input-bg: #ffffff;
          --admin-input-border: #e2e8f0;
          --admin-card-hover: rgba(34, 197, 94, 0.1);
        }
      `}</style>
    </AdminThemeContext.Provider>
  );
}
