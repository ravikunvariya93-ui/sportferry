import './globals.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import MobileNav from '@/components/MobileNav/MobileNav';
import MobileHeader from '@/components/Header/MobileHeader';
import AuthProvider from '@/components/AuthProvider';
import { auth } from '@/lib/auth';
import LocationModal from '@/components/LocationModal/LocationModal';
import Footer from '@/components/Footer/Footer';

export const metadata = {
  title: 'Sportferry | Find & Book Sports Near You',
  description: 'Book the best box cricket venues in your city. Perfectly mapped out for your next game.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sportferry',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#16a34a',
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthProvider session={session}>
          <LocationModal />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <MobileHeader />
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <main className="main-content">
                {children}
                <Footer />
              </main>
              <MobileNav />
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
