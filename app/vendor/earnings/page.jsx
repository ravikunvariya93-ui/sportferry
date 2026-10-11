import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
import { loadVendorData } from '@/lib/vendorData';
import RequestWithdrawalButton from './RequestWithdrawalButton';

export const dynamic = 'force-dynamic';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_STYLES = {
  PENDING: { bg: 'rgba(251,191,36,0.12)', color: '#d97706' },
  PROCESSING: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  COMPLETED: { bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  REJECTED: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
};

function StatBox({ label, value, color }) {
  return (
    <div className="glass-morphism" style={{ padding: '22px' }}>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color, letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  );
}

export default async function VendorEarningsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { earnings } = await loadVendorData(session.user.id);

  await dbConnect();
  const withdrawals = await Withdrawal.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean();

  const alreadyWithdrawn = withdrawals
    .filter(w => ['COMPLETED', 'PROCESSING', 'PENDING'].includes(w.status))
    .reduce((s, w) => s + (w.netAmount || 0), 0);
  const available = Math.max(0, earnings.net - alreadyWithdrawn);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.5px' }}>Earnings</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Your share from confirmed bookings, after the {earnings.commissionPercent}% platform commission.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        <StatBox label="Gross (confirmed)" value={`₹${earnings.gross.toLocaleString('en-IN')}`} color="var(--foreground)" />
        <StatBox label={`Commission (${earnings.commissionPercent}%)`} value={`−₹${earnings.commission.toLocaleString('en-IN')}`} color="#dc2626" />
        <StatBox label="Net earnings" value={`₹${earnings.net.toLocaleString('en-IN')}`} color="var(--primary)" />
        <StatBox label="Available to withdraw" value={`₹${available.toLocaleString('en-IN')}`} color="#10b981" />
      </div>

      <section className="glass-morphism" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Withdrawals</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>You can request one withdrawal per month. An admin processes it.</p>
        </div>
        <RequestWithdrawalButton disabled={available <= 0} />

        {withdrawals.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {['Period', 'Gross', 'Commission', 'Net', 'Status', 'Requested'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => {
                  const s = STATUS_STYLES[w.status] || STATUS_STYLES.PENDING;
                  return (
                    <tr key={w._id.toString()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px' }}>{MONTHS[w.month]} {w.year}</td>
                      <td style={{ padding: '12px' }}>₹{(w.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', color: '#dc2626' }}>₹{(w.commissionDeducted || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>₹{(w.netAmount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color }}>{w.status}</span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(w.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
