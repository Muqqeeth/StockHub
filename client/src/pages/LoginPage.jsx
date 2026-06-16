import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M7 16l4-5 4 3 4-6" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.brandName}>StockHub</h1>
        </div>
        <h2 className={styles.title}>Sign in to your account</h2>
        <p className={styles.sub}>Paper trading with real market data</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className={styles.spinner}/> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className={styles.demo}>
          <span className={styles.demoLabel}>Demo account</span>
          <button
            className={`btn btn-ghost ${styles.demoBtn}`}
            onClick={() => setForm({ email: 'demo@stockhub.com', password: 'demo123' })}
          >
            Use demo credentials
          </button>
        </div>

        <p className={styles.switchText}>
          Don't have an account? <Link to="/register" className={styles.link}>Create one free</Link>
        </p>

        <div className={styles.features}>
          {['$100,000 paper money', 'Real-time prices', 'AI advisor'].map(f => (
            <span key={f} className={styles.featureTag}>✓ {f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
