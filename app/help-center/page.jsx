import Link from 'next/link';

export const metadata = {
  title: 'Help Center | Sportferry',
  description: 'Answers to common questions about booking, cancelling and hosting games on Sportferry.',
};

const sectionStyle = { padding: '24px', borderRadius: '18px' };
const headingStyle = { fontSize: '20px', fontWeight: 700, marginBottom: '10px' };
const bodyStyle = { color: 'var(--muted)', fontSize: '14px', lineHeight: '1.8' };
const linkStyle = { color: 'var(--primary)' };

export default function HelpCenterPage() {
  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.5px' }}>Help Center</h1>
      <p style={bodyStyle}>Find the answer you need, or reach our support team.</p>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Quick links</h2>
        <ul style={{ ...bodyStyle, paddingLeft: '20px' }}>
          <li><Link href="/instructions" style={linkStyle}>Platform guidelines for players and venue owners</Link></li>
          <li><Link href="/cancellation-policy" style={linkStyle}>Cancellation and refund tiers</Link></li>
          <li><Link href="/bookings" style={linkStyle}>Your bookings and e-tickets</Link></li>
          <li><Link href="/explore" style={linkStyle}>Find a venue</Link></li>
          <li><Link href="/list-your-ground" style={linkStyle}>List your ground</Link></li>
        </ul>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>How do I book a slot?</h2>
        <p style={bodyStyle}>
          Pick a venue, choose a date and slot, then select Solo, Team or Group. Slots confirm once the
          turf has enough players. Online bookings are charged through Razorpay; walk-in bookings are
          recorded by the venue owner.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>Where is my refund?</h2>
        <p style={bodyStyle}>
          Refund status appears on each booking in <Link href="/bookings" style={linkStyle}>My Bookings</Link>.
          Approved refunds go back to the original payment method within 5–7 business days.
        </p>
      </section>

      <section className="glass-morphism" style={sectionStyle}>
        <h2 style={headingStyle}>I still need help</h2>
        <p style={bodyStyle}>
          Email support@sportferry.com or call +91 98765 43210. Include your booking ID if the question
          is about a specific game.
        </p>
      </section>
    </div>
  );
}
