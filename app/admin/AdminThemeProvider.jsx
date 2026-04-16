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
  const theme = 'light';

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme: () => {} }}>
      <div className={`admin-theme-wrapper ${theme}-theme`}>
        {children}
      </div>
      <style jsx global>{`
        .admin-theme-wrapper {
          min-height: 100vh;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* Light Theme Variables (Default) */
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

