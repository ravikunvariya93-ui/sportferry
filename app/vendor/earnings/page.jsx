import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
import PayoutBatch from '@/models/PayoutBatch';
import { settledAmountForVendor } from '@/lib/payouts';
import { loadVendorData } from '@/lib/vendorData';
import RequestWithdrawalButton from './RequestWithdrawalButton';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusPill from '@/components/ui/StatusPill';

export const dynamic = 'force-dynamic';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function VendorEarningsPage() {
  const session = await auth();
  if (!session || session.user?.role !== 'VENDOR') redirect('/login');

  const { earnings } = await loadVendorData(session.user.id);

  await dbConnect();
  const [withdrawals, batches] = await Promise.all([
    Withdrawal.find({ vendor: session.user.id }).sort({ createdAt: -1 }).lean(),
    PayoutBatch.find({ vendor: session.user.id }).lean(),
  ]);

  const settled = settledAmountForVendor({ withdrawals, batches });
  const available = Math.max(0, earnings.net - settled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Earnings"
        description={`Your share from confirmed bookings, after the ${earnings.commissionPercent}% platform commission.`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard label="Gross (confirmed)" value={`₹${earnings.gross.toLocaleString('en-IN')}`} />
        <StatCard label={`Commission (${earnings.commissionPercent}%)`} value={`−₹${earnings.commission.toLocaleString('en-IN')}`} color="#dc2626" />
        <StatCard label="Net earnings" value={`₹${earnings.net.toLocaleString('en-IN')}`} color="var(--primary)" />
        <StatCard label="Available to withdraw" value={`₹${available.toLocaleString('en-IN')}`} color="#10b981" />
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
                {withdrawals.map(w => (
                  <tr key={w._id.toString()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px' }}>{MONTHS[w.month]} {w.year}</td>
                    <td style={{ padding: '12px' }}>₹{(w.amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px', color: '#dc2626' }}>₹{(w.commissionDeducted || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>₹{(w.netAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}><StatusPill status={w.status} /></td>
                    <td style={{ padding: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(w.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
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
