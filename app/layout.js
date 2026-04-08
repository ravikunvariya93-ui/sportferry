import './globals.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: 'Sportferry | Find & Book Sports Near You',
  description: 'Book box cricket, tennis ball cricket, football turf and more in your city.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div style={{ display: 'flex' }}>
            <Sidebar />
          <main style={{ 
            marginLeft: 'var(--sidebar-width)', 
            flex: 1, 
            minHeight: '100vh',
            padding: '40px'
          }}>
            {children}
          </main>
        </div>
        </AuthProvider>
      </body>
    </html>
  );
}
