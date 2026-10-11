'use client';

import React, { useState } from 'react';
import { ArrowDownCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RequestWithdrawalButton({ disabled }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text }

  const handleClick = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/vendor/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: data.message || 'Withdrawal requested.' });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: data.message || 'Request failed.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className="btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', opacity: loading || disabled ? 0.6 : 1, cursor: loading || disabled ? 'not-allowed' : 'pointer' }}
      >
        <ArrowDownCircle size={18} /> {loading ? 'Requesting…' : 'Request Withdrawal'}
      </button>
      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: msg.type === 'success' ? 'var(--primary)' : '#dc2626' }}>
          {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}
        </div>
      )}
    </div>
  );
}
