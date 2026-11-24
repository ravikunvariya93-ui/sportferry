'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, Download, Search } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import StatusPill from '@/components/ui/StatusPill';

function money(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}`; }

export default function CustomersClient({ customers }) {
  const [search, setSearch] = useState('');
  const rows = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  const exportCsv = () => {
    const csv = 'Customer,Bookings,Spent,Last booking,Type\n' + rows.map(c => [c.name, c.bookings, c.totalSpend, c.lastBookingAt ? new Date(c.lastBookingAt).toISOString().slice(0, 10) : '', c.bookings > 1 ? 'Repeat' : 'New'].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>Customers</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Player directory and repeat guests.</p>
        </div>
        <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', fontWeight: 600, background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', cursor: 'pointer' }}><Download size={16} /> Export</button>
      </header>

      <section className="glass-morphism" style={{ padding: '22px' }}>
        <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." style={{ width: '100%', padding: '11px 14px 11px 34px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '13px' }} />
        </div>

        <DataTable
          rows={rows}
          empty="No customers found."
          columns={[
            {
              key: 'name', label: 'Customer',
              render: c => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{c.name?.charAt(0)?.toUpperCase() || '?'}</div>
                  <Link href={`/profile/${c.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{c.name}</Link>
                </div>
              ),
            },
            { key: 'bookings', label: 'Bookings' },
            { key: 'totalSpend', label: 'Total spend', render: c => <strong>{money(c.totalSpend)}</strong> },
            { key: 'lastBookingAt', label: 'Last booking', render: c => <span style={{ color: 'var(--muted)' }}>{c.lastBookingAt ? new Date(c.lastBookingAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span> },
            {
              key: 'type', label: 'Type',
              render: c => c.bookings > 1
                ? <StatusPill status="REPEAT" label="Repeat" overrides={{ bg: 'rgba(22,163,74,0.12)', color: 'var(--primary)' }} />
                : <StatusPill status="NEW" label="New" overrides={{ bg: 'var(--glass-bg)', color: 'var(--muted)' }} />,
            },
          ]}
        />
      </section>
    </div>
  );
}
