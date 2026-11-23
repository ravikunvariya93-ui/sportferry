import styles from './admin.module.css';

export default function ComingSoon({ title, subtitle, Icon }) {
  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {Icon && <Icon size={28} color="#22c55e" />}
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>
        </div>
      </div>
      <div className={styles.sectionCard} style={{ textAlign: 'center', padding: '64px 24px', color: '#64748b' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Coming soon</div>
        <p style={{ marginTop: '6px', fontSize: '13px' }}>This section is planned but not built yet.</p>
      </div>
    </div>
  );
}
