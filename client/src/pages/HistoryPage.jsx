import React, { useEffect, useState } from 'react';
import api from '../services/api';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/trades/history?page=${page}&limit=15`),
      api.get('/trades/stats'),
    ]).then(([t, s]) => {
      setTrades(t.data.trades);
      setTotalPages(t.data.pages);
      setStats(s.data);
    }).finally(() => setLoading(false));
  }, [page]);

  const filtered = filter === 'ALL' ? trades : trades.filter(t => t.type === filter);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Trade History</h1>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className={styles.statsRow}>
          {[
            { label: 'Total Trades', value: stats.totalTrades, color: 'var(--text-primary)' },
            { label: 'Buy Orders', value: stats.buyTrades, color: 'var(--green)' },
            { label: 'Sell Orders', value: stats.sellTrades, color: 'var(--red)' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: 'var(--accent-blue)' },
            { label: 'Realized P&L', value: `${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL?.toFixed(2)}`, color: stats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(item => (
            <div key={item.label} className={`card ${styles.statCard}`}>
              <span className={styles.statLabel}>{item.label}</span>
              <span className={`mono ${styles.statValue}`} style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter + Table */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableControls}>
          <div className={styles.filterTabs}>
            {['ALL', 'BUY', 'SELL'].map(f => (
              <button key={f} className={`${styles.filterTab} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
                {f === 'ALL' ? 'All Trades' : f === 'BUY' ? '📈 Buys' : '📉 Sells'}
              </button>
            ))}
          </div>
          <span className={styles.count}>{filtered.length} trades</span>
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>
            {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            </svg>
            <p>No trades yet. Go make your first trade!</p>
          </div>
        ) : (
          <>
            <div className={styles.tableHead}>
              <div>Type</div><div>Symbol</div><div>Company</div>
              <div>Shares</div><div>Price</div><div>Total</div>
              <div>P&L</div><div>Date & Time</div><div>Status</div>
            </div>
            {filtered.map(trade => {
              const isPos = trade.pnl > 0;
              return (
                <div key={trade._id} className={styles.tableRow}>
                  <div>
                    <span className={`badge ${trade.type === 'BUY' ? 'badge-positive' : 'badge-negative'}`}>
                      {trade.type}
                    </span>
                  </div>
                  <div className={styles.sym}>{trade.symbol}</div>
                  <div className={styles.company}>{trade.companyName?.split(' ').slice(0,3).join(' ')}</div>
                  <div className="mono">{trade.shares}</div>
                  <div className="mono muted">${trade.price?.toFixed(2)}</div>
                  <div className="mono">${trade.total?.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                  <div className={`mono ${trade.pnl ? (isPos ? 'positive' : 'negative') : 'muted'}`}>
                    {trade.pnl ? `${isPos ? '+' : ''}$${trade.pnl?.toFixed(2)}` : '—'}
                  </div>
                  <div className={styles.date}>{formatDate(trade.createdAt)}</div>
                  <div>
                    <span className="badge badge-positive" style={{ background:'var(--green-dim)', color:'var(--green)' }}>
                      {trade.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding:'6px 12px', fontSize:13 }}>
              ← Prev
            </button>
            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding:'6px 12px', fontSize:13 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
