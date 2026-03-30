import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../services/api.js';
import { useAdmin } from '../AdminContext.jsx';
import styles from '../admin.module.css';

export default function LoginPage() {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin({ password });
      login(res.data.token);
      navigate('/admin/events');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.loginShell}>
        <div className={styles.loginCard}>
          <section className={styles.loginBrandPanel}>
            <p className={styles.loginEyebrow}>PlotCast Control Room</p>
            <h1 className={styles.loginHeroTitle}>Run every story beat with confidence.</h1>
            <p className={styles.loginHeroText}>
              Sign in to manage events, control live progression, and monitor audience decisions in real time.
            </p>
            <div className={styles.loginStatRow}>
              <span className={styles.loginStat}>Live events</span>
              <span className={styles.loginDot} />
              <span className={styles.loginStat}>Secure admin access</span>
            </div>
          </section>

          <section className={styles.loginFormPanel}>
            <div className={styles.logo}>PlotCast</div>
            <h2 className={styles.loginTitle}>Admin Login</h2>
            <p className={styles.loginSubtitle}>Enter your admin password to continue.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label} htmlFor="admin-password">Admin Password</label>
              <input
                id="admin-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                required
              />

              {error && <p className={styles.error}>{error}</p>}

              <button className={`${styles.btnPrimary} ${styles.loginBtn}`} type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
