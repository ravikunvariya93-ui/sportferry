import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { loadVendorData } from '@/lib/vendorData';

export const dynamic = 'force-dynamic';

export default async function VendorCustomersPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { customers } = await loadVendorData(session.user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>Customers</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Everyone who has booked one of your venues.</p>
      </header>

      <section className="glass-morphism" style={{ padding: '24px' }}>
        {customers.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: '24px', textAlign: 'center', background: 'var(--secondary)', borderRadius: '12px' }}>
            No customers yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Customer', 'Bookings', 'Spent'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                          {c.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <Link href={`/profile/${c.id}`} style={{ fontWeight: '500', color: 'inherit', textDecoration: 'none' }}>{c.name}</Link>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)' }}>{c.bookings}</td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>₹{c.spent.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
