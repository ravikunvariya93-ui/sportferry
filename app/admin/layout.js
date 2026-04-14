import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AuthProvider from '@/components/AuthProvider';
import AdminSidebar from './AdminSidebar';
import AdminThemeProvider from './AdminThemeProvider';
import styles from './admin.module.css';

export const metadata = {
  title: 'Admin Panel | Sportferry',
  description: 'Sportferry platform administration dashboard',
};

export default async function AdminLayout({ children }) {
  const session = await auth();

  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <AuthProvider>
      <AdminThemeProvider>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--admin-bg)',
            color: 'var(--admin-text-main)',
            fontFamily: "'Outfit', sans-serif",
            zIndex: 9000,
            overflowY: 'auto',
          }}
        >
          <div className={styles.adminRoot}>
            <AdminSidebar adminName={session.user.name} />
            <main className={styles.adminMain}>
              {children}
            </main>
          </div>
        </div>
      </AdminThemeProvider>
    </AuthProvider>
  );
}
