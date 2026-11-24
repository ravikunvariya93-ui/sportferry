import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Sportferry',
  description: 'The rules for using Sportferry to book sports venues or list your ground.',
};

const sectionStyle = { padding: '24px', borderRadius: '18px' };
const headingStyle = { fontSize: '20px', fontWeight: 700, marginBottom: '10px' };
const bodyStyle = { color: 'var(--muted)', fontSize: '14px', lineHeight: '1.8' };

export default function TermsOfServicePage() {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.5px' }}>Terms of Service</h1>
      <p style={bodyStyle}>
        By using Sportferry you agree to these terms and to the platform guidelines shown on the{' '}
        <Link href="/instructions" style={{ color: 'var(--primary)' }}>Instructions</Link> page.
      </p>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Your account</h2>
        <p style={bodyStyle}>
          Provide accurate details and keep your credentials private. You are responsible for activity
          on your account. Accounts used for abuse, harassment or false bookings may be blocked.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Bookings and payments</h2>
        <p style={bodyStyle}>
          A slot is held once your booking is recorded and, for online bookings, payment is captured.
          Turfs confirm when enough players have joined the slot. Prices, amenities and availability
          are set by the venue owner; check the venue page before you book.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Cancellations and refunds</h2>
        <p style={bodyStyle}>
          Refunds follow the time-based tiers in the{' '}
          <Link href="/cancellation-policy" style={{ color: 'var(--primary)' }}>Cancellation &amp; Refund Policy</Link>.
          Missing a confirmed slot is treated as a late cancellation.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Venue owners</h2>
        <p style={bodyStyle}>
          Owners must honour confirmed bookings and may cancel only for valid reasons, with a full
          refund to the player. Sportferry charges a 12% commission on bookings and records payouts
          for settlement. Venue details and pricing must be kept accurate.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Contact</h2>
        <p style={bodyStyle}>
          For help with an order or an account, visit the{' '}
          <Link href="/help-center" style={{ color: 'var(--primary)' }}>Help Center</Link> or email
          support@sportferry.com.
        </p>
      </section>
    </div>
  );
}
