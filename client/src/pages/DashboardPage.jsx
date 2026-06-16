import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { usePrices } from '../context/PricesContext';
import api from '../services/api';
import styles from './DashboardPage.module.css';

const StatCard = ({ label, value, sub, color, prefix = '' }) => (
  <div className={styles.statCard}>
    <span className={styles.statLabel}>{label}</span>
    <span className={styles.statValue} style={{ color: color || 'var(--text-primary)' }}>
      {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
    </span>
    {sub && <span className={styles.statSub}>{sub}</span>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{label}</div>
      <div className={styles.tooltipValue}>${payload[0].value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { prices } = usePrices();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [tradeStats, setTradeStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/portfolio'),
      api.get('/portfolio/performance'),
      api.get('/trades/stats'),
      api.get('/trades/history?limit=5'),
    ]).then(([p, perf, stats, trades]) => {
      setPortfolio(p.data);
      setPerformance(perf.data);
      setTradeStats(stats.data);
      setRecentTrades(trades.data.trades);
    }).finally(() => setLoading(false));
  }, []);

  const topMovers = Object.values(prices)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);

  if (loading) return (
    <div className={styles.loadingGrid}>
      {Array(6).fill(0).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonCard}`} />)}
    </div>
  );

  const summary = portfolio?.summary || {};
  const totalReturn = summary.totalReturn || 0;
  const isPositive = totalReturn >= 0;

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.greeting}>Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className={styles.greetingSub}>Here's your portfolio overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/trade')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Trade
        </button>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <StatCard label="Total Portfolio Value" value={summary.totalPortfolioValue} prefix="$" />
        <StatCard label="Stock Holdings" value={summary.stockValue} prefix="$" />
        <StatCard label="Cash Balance" value={summary.cashBalance} prefix="$" color="var(--green)" />
        <StatCard
          label="Total Return"
          value={`${isPositive ? '+' : ''}${totalReturn?.toFixed(2)}%`}
          prefix=""
          color={isPositive ? 'var(--green)' : 'var(--red)'}
          sub={`vs $${summary.initialCapital?.toLocaleString()} initial`}
        />
      </div>

      <div className={styles.mainGrid}>
        {/* Performance Chart */}
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Portfolio Performance</h3>
            <span className={`badge ${isPositive ? 'badge-positive' : 'badge-negative'}`}>
              {isPositive ? '+' : ''}{totalReturn?.toFixed(2)}% total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={performance} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? 'var(--green)' : 'var(--red)'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? 'var(--green)' : 'var(--red)'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke={isPositive ? 'var(--green)' : 'var(--red)'} strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Movers */}
        <div className={`card ${styles.moversCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Top Movers</h3>
            <div className="live-dot" />
          </div>
          <div className={styles.moversList}>
            {topMovers.map(stock => {
              const pos = stock.changePercent >= 0;
              return (
                <div key={stock.symbol} className={styles.moverItem} onClick={() => navigate(`/trade/${stock.symbol}`)}>
                  <div className={styles.moverLeft}>
                    <div className={styles.moverSym}>{stock.symbol}</div>
                    <div className={styles.moverName}>{stock.name?.split(' ').slice(0, 2).join(' ')}</div>
                  </div>
                  <div className={styles.moverRight}>
                    <div className={`mono ${styles.moverPrice}`}>${stock.price?.toFixed(2)}</div>
                    <div className={`badge ${pos ? 'badge-positive' : 'badge-negative'}`}>
                      {pos ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.bottomGrid}>
        {/* Holdings Summary */}
        <div className={`card ${styles.holdingsCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Current Holdings</h3>
            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => navigate('/portfolio')}>
              View all
            </button>
          </div>
          {portfolio?.holdings?.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <p>No holdings yet</p>
              <button className="btn btn-primary" onClick={() => navigate('/markets')}>Browse Markets</button>
            </div>
          ) : (
            <div className={styles.holdingsTable}>
              <div className={styles.tableHeader}>
                <span>Symbol</span><span>Shares</span><span>Avg Cost</span><span>Current</span><span>P&L</span>
              </div>
              {portfolio.holdings.slice(0, 5).map(h => {
                const pos = h.pnl >= 0;
                return (
                  <div key={h.symbol} className={styles.tableRow} onClick={() => navigate(`/trade/${h.symbol}`)}>
                    <span className={styles.holdSym}>{h.symbol}</span>
                    <span className="mono">{h.shares}</span>
                    <span className="mono">${h.avgCost?.toFixed(2)}</span>
                    <span className="mono">${h.currentPrice?.toFixed(2)}</span>
                    <span className={`mono ${pos ? 'positive' : 'negative'}`}>
                      {pos ? '+' : ''}${h.pnl?.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trade Stats */}
        <div className={`card ${styles.statsCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Trading Stats</h3>
          </div>
          {tradeStats && (
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statItemVal}>{tradeStats.totalTrades}</span>
                <span className={styles.statItemLabel}>Total Trades</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statItemVal} style={{ color: 'var(--green)' }}>{tradeStats.buyTrades}</span>
                <span className={styles.statItemLabel}>Buy Orders</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statItemVal} style={{ color: 'var(--red)' }}>{tradeStats.sellTrades}</span>
                <span className={styles.statItemLabel}>Sell Orders</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statItemVal} style={{ color: 'var(--accent-blue)' }}>{tradeStats.winRate}%</span>
                <span className={styles.statItemLabel}>Win Rate</span>
              </div>
              <div className={`${styles.statItem} ${styles.fullWidth}`}>
                <span className={styles.statItemVal} style={{ color: tradeStats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {tradeStats.totalPnL >= 0 ? '+' : ''}${tradeStats.totalPnL?.toFixed(2)}
                </span>
                <span className={styles.statItemLabel}>Realized P&L</span>
              </div>
            </div>
          )}

          <div className={styles.cardHeader} style={{ marginTop: 20 }}>
            <h3 className={styles.cardTitle}>Recent Activity</h3>
          </div>
          <div className={styles.recentTrades}>
            {recentTrades.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No trades yet</p>
            ) : recentTrades.map(t => (
              <div key={t._id} className={styles.recentItem}>
                <span className={`badge ${t.type === 'BUY' ? 'badge-positive' : 'badge-negative'}`}>{t.type}</span>
                <span className={styles.recentSym}>{t.symbol}</span>
                <span className="mono muted">{t.shares} @ ${t.price?.toFixed(2)}</span>
                <span className={`mono ${styles.recentTotal}`}>${t.total?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
