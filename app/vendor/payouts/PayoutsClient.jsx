'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, Download } from 'lucide-react';

function money(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

export default function PayoutsClient() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/vendor/payouts').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = [...data.batches.map(b => ([b.periodStart, b.periodEnd, b.gross, b.commission, b.net, b.status, b.method, b.reference])),
      ...data.withdrawals.map(w => ([`${w.month}/${w.year}`, '', w.amount, w.commissionDeducted, w.netAmount, w.status, 'Withdrawal', '']))];
    const csv = 'Period,End,Gross,Commission,Net,Status,Method,Reference\n' + rows.map(r => r.map(x => `"${String(x ?? '').slice(0, 10).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'payout-statement.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <div style={{ color: 'var(--muted)', padding: '24px' }}>Loading statement…</div>;
  const k = data.kpis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Payouts &amp; Settlements</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Your earnings after {k.commissionPercent}% commission.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', fontWeight: 600, background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}><Download size={16} /> Statement</button>
          <Link href="/vendor/earnings" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', fontWeight: 600, textDecoration: 'none' }}><Wallet size={16} /> Request withdrawal</Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          ['Gross Booking Value', money(k.gross)],
          [`Commission (${k.commissionPercent}%)`, `− ${money(k.commission)}`],
          ['Net Earnings', money(k.net)],
          ['Payable Now', money(k.payable)],
        ].map(([label, value]) => (
          <div key={label} className="glass-morphism" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{value}</div>
          </div>
        ))}
      </div>

      <section className="glass-morphism" style={{ padding: '22px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Settlement history</h2>
        {data.batches.length === 0 && data.withdrawals.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No settlements yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                {['Period', 'Gross', 'Commission', 'Net', 'Status', 'Method', 'Reference'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.batches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px' }}>{new Date(b.periodStart).toLocaleDateString('en-IN')} – {new Date(b.periodEnd).toLocaleDateString('en-IN')}</td>
                    <td>{money(b.gross)}</td><td>{money(b.commission)}</td><td style={{ fontWeight: 700 }}>{money(b.net)}</td>
                    <td>{b.status}</td><td>{b.method}</td><td>{b.reference || '—'}</td>
                  </tr>
                ))}
                {data.withdrawals.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px' }}>{w.month}/{w.year}</td>
                    <td>{money(w.amount)}</td><td>{money(w.commissionDeducted)}</td><td style={{ fontWeight: 700 }}>{money(w.netAmount)}</td>
                    <td>{w.status}</td><td>Withdrawal</td><td>—</td>
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
