'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera, CameraOff, Search, CheckCircle2, XCircle, AlertTriangle,
  Loader2, RotateCcw, ScanLine, Ticket,
} from 'lucide-react';

const VERDICT_STYLES = {
  VALID: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  CHECKED_IN: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  TOO_EARLY: { color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  NOT_CONFIRMED: { color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  NOT_TODAY: { color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  ALREADY_USED: { color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  NOT_YOURS: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  CANCELLED: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  UNPAID: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  EXPIRED: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  NOT_FOUND: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  INVALID: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  ERROR: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
};

function timeLabel(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
}

export default function ScanTicketClient() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scanningRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraMsg, setCameraMsg] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const verify = useCallback(async (code, action) => {
    setBusy(true);
    try {
      const res = await fetch('/api/vendor/verify-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, verdict: 'ERROR', message: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!scanningRef.current || !video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, w, h);
        const image = ctx.getImageData(0, 0, w, h);
        const decoded = jsQR(image.data, w, h, { inversionAttempts: 'dontInvert' });
        if (decoded?.data) {
          stopCamera();
          verify(decoded.data);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopCamera, verify]);

  const startCamera = useCallback(async () => {
    setCameraMsg('');
    setResult(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraMsg('Camera not available here. Use the code field below instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      setCameraOn(true);
      scanningRef.current = true;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      stopCamera();
      setCameraMsg('Could not access the camera. Allow camera access (needs HTTPS) or use the code field below.');
    }
  }, [stopCamera, tick]);

  const reset = () => {
    stopCamera();
    setResult(null);
    setManual('');
    setCameraMsg('');
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (!manual.trim()) return;
    setResult(null);
    verify(manual.trim());
  };

  const vstyle = (result && VERDICT_STYLES[result.verdict]) || VERDICT_STYLES.ERROR;
  const booking = result?.booking;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
      {/* Scanner */}
      <section className="glass-morphism" style={{ padding: '24px' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: '420px', margin: '0 auto', borderRadius: '18px', overflow: 'hidden', background: '#0f172a' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOn ? 'block' : 'none' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!cameraOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.75)', gap: '10px', padding: '24px', textAlign: 'center' }}>
              <ScanLine size={48} strokeWidth={1.5} />
              <div style={{ fontSize: '14px' }}>Camera off</div>
            </div>
          )}

          {cameraOn && (
            <div style={{ position: 'absolute', inset: '14%', border: '3px solid rgba(34,197,94,0.9)', borderRadius: '16px', boxShadow: '0 0 0 2000px rgba(15,23,42,0.35)' }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
          {cameraOn ? (
            <button onClick={stopCamera} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--secondary)', cursor: 'pointer', fontWeight: '600', color: 'var(--foreground)' }}>
              <CameraOff size={17} /> Stop Camera
            </button>
          ) : (
            <button onClick={startCamera} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
              <Camera size={17} /> Start Camera Scan
            </button>
          )}
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', fontWeight: '600', color: 'var(--muted)' }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        {cameraMsg && (
          <div style={{ marginTop: '14px', fontSize: '13px', color: '#d97706', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px', padding: '10px 12px' }}>
            {cameraMsg}
          </div>
        )}

        <form onSubmit={handleManual} style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Paste ticket link or booking code"
              style={{ width: '100%', padding: '12px 14px 12px 36px', borderRadius: '12px', border: '1.5px solid var(--glass-border)', background: 'var(--secondary)', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={busy || !manual.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '600', cursor: (busy || !manual.trim()) ? 'not-allowed' : 'pointer', opacity: (busy || !manual.trim()) ? 0.6 : 1 }}>
            {busy ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Search size={16} />} Verify
          </button>
        </form>
      </section>

      {/* Result */}
      <section className="glass-morphism" style={{ padding: '24px', minHeight: '200px' }}>
        {busy && !result ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)' }}>
            <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Checking ticket…
          </div>
        ) : !result ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 12px' }}>
            <Ticket size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <div style={{ fontSize: '14px' }}>Scan a ticket to see its status here.</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '14px', background: vstyle.bg, marginBottom: '18px' }}>
              {result.ok
                ? <CheckCircle2 size={26} color={vstyle.color} />
                : result.verdict === 'EXPIRED' || result.verdict === 'CANCELLED' || result.verdict === 'NOT_YOURS' || result.verdict === 'UNPAID' || result.verdict === 'NOT_FOUND' || result.verdict === 'INVALID' || result.verdict === 'ERROR'
                ? <XCircle size={26} color={vstyle.color} />
                : <AlertTriangle size={26} color={vstyle.color} />}
              <div>
                <div style={{ fontWeight: '800', fontSize: '17px', color: vstyle.color }}>{result.verdict.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{result.message}</div>
              </div>
            </div>

            {booking && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                  {[
                    { label: 'Customer', value: booking.customerName },
                    { label: 'Status', value: booking.status },
                    { label: 'Players', value: `${booking.playersCount} · ${booking.classification}` },
                    { label: 'Date', value: booking.dateISO },
                    { label: 'Slot', value: `${timeLabel(booking.startTime)} – ${timeLabel(booking.endTime)}` },
                    { label: 'Venue', value: booking.venue },
                    { label: 'Amount', value: `₹${booking.amount}` },
                  ].map((d) => (
                    <div key={d.label} style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{d.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', wordBreak: 'break-word' }}>{d.value}</div>
                    </div>
                  ))}
                </div>

                {booking.customerPhone && (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                    Contact: <a href={`tel:${booking.customerPhone}`} style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>{booking.customerPhone}</a>
                    {booking.customerEmail ? <> · <a href={`mailto:${booking.customerEmail}`} style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>{booking.customerEmail}</a></> : null}
                  </div>
                )}

                {result.verdict === 'VALID' && (
                  <button
                    onClick={() => verify(booking.id, 'checkin')}
                    disabled={busy}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle2 size={18} />} Mark Checked In
                  </button>
                )}

                {(result.verdict === 'CHECKED_IN' || result.verdict === 'ALREADY_USED') && booking.checkedInAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>
                    <CheckCircle2 size={16} /> Checked in at {new Date(booking.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
