import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../services/api';
import { usePrices } from '../context/PricesContext';
import styles from './PortfolioPage.module.css';

const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:8, padding:'10px 14px' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700 }}>${payload[0].value?.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
    </div>
  );
};

export default function PortfolioPage() {
  const { prices } = usePrices();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/portfolio'), api.get('/portfolio/performance')])
      .then(([p, perf]) => { setPortfolio(p.data); setPerformance(perf.data); })
      .finally(() => setLoading(false));
  }, []);

  // Refresh live prices every 5s
  useEffect(() => {
    if (!portfolio) return;
    const enriched = portfolio.holdings.map(h => {
      const live = prices[h.symbol];
      if (!live) return h;
      const currentValue = live.price * h.shares;
      const pnl = currentValue - h.totalCost;
      return { ...h, currentPrice: live.price, currentValue, pnl, pnlPercent: (pnl/h.totalCost)*100, changePercent: live.changePercent };
    });
    setPortfolio(p => ({ ...p, holdings: enriched }));
  // eslint-disable-next-line
  }, [prices]);

  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
      {Array(6).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:120, borderRadius:14 }} />)}
    </div>
  );

  const summary = portfolio?.summary || {};
  const holdings = portfolio?.holdings || [];
  const sectorData = buildSectorData(holdings);
  const allocationData = holdings.map(h => ({ name: h.symbol, value: parseFloat((h.currentValue||0).toFixed(2)) }));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Portfolio</h1>
        <button className="btn btn-primary" onClick={() => navigate('/trade')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Position
        </button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {[
          { label: 'Total Portfolio', value: summary.totalPortfolioValue, prefix: '$', color: 'var(--text-primary)' },
          { label: 'Stock Holdings', value: summary.stockValue, prefix: '$', color: 'var(--accent-blue)' },
          { label: 'Cash Balance', value: summary.cashBalance, prefix: '$', color: 'var(--green)' },
          { label: 'Unrealized P&L', value: summary.totalPnL, prefix: summary.totalPnL >= 0 ? '+$' : '-$', color: summary.totalPnL >= 0 ? 'var(--green)' : 'var(--red)', absVal: true },
          { label: 'Total Return', value: `${summary.totalReturn >= 0 ? '+' : ''}${summary.totalReturn?.toFixed(2)}%`, prefix: '', color: summary.totalReturn >= 0 ? 'var(--green)' : 'var(--red)', isStr: true },
          { label: 'Positions', value: holdings.length, prefix: '', isStr: true, color: 'var(--purple)' },
        ].map((item, i) => (
          <div key={i} className={`card ${styles.summaryCard}`}>
            <span className={styles.summaryLabel}>{item.label}</span>
            <span className={styles.summaryValue} style={{ color: item.color }}>
              {item.isStr ? item.value : `${item.prefix}${item.absVal ? Math.abs(item.value)?.toLocaleString('en-US',{minimumFractionDigits:2}) : item.value?.toLocaleString('en-US',{minimumFractionDigits:2})}`}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        {/* Performance Chart */}
        <div className={`card ${styles.perfCard}`}>
          <h3 className={styles.cardTitle}>Portfolio Value Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={performance} margin={{ top:10, right:10, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="var(--accent-blue)" strokeWidth={2} fill="url(#pg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Pie */}
        <div className={`card ${styles.pieCard}`}>
          <h3 className={styles.cardTitle}>Allocation</h3>
          {allocationData.length === 0 ? (
            <div className={styles.empty}>No positions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [`$${v?.toLocaleString('en-US',{minimumFractionDigits:2})}`, 'Value']} contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:8, fontSize:13 }} />
                <Legend formatter={v => <span style={{ color:'var(--text-secondary)', fontSize:12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Sector Breakdown */}
      {sectorData.length > 0 && (
        <div className={`card ${styles.sectorCard}`}>
          <h3 className={styles.cardTitle}>Sector Exposure</h3>
          <div className={styles.sectorList}>
            {sectorData.map((s, i) => (
              <div key={s.sector} className={styles.sectorItem}>
                <div className={styles.sectorTop}>
                  <span className={styles.sectorName}>{s.sector}</span>
                  <span className="mono" style={{ fontSize:13 }}>${s.value?.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                  <span className={styles.sectorPct}>{s.pct}%</span>
                </div>
                <div className={styles.sectorBar}>
                  <div className={styles.sectorFill} style={{ width:`${s.pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className={`card ${styles.holdingsCard}`}>
        <div className={styles.holdingsHeader}>
          <h3 className={styles.cardTitle}>Holdings ({holdings.length})</h3>
        </div>
        {holdings.length === 0 ? (
          <div className={styles.empty}>
            <p>No positions yet. Start trading to build your portfolio.</p>
            <button className="btn btn-primary" onClick={() => navigate('/markets')}>Browse Markets</button>
          </div>
        ) : (
          <>
            <div className={styles.tableHead}>
              <div>Symbol</div><div>Company</div><div>Shares</div>
              <div>Avg Cost</div><div>Current</div><div>Value</div>
              <div>P&L</div><div>P&L %</div><div>Day %</div><div></div>
            </div>
            {holdings.map(h => {
              const pos = h.pnl >= 0;
              const dayPos = h.changePercent >= 0;
              return (
                <div key={h.symbol} className={styles.tableRow}>
                  <div className={styles.symCell}>
                    <span className={styles.sym}>{h.symbol}</span>
                  </div>
                  <div className={styles.nameCell}>{h.companyName?.split(' ').slice(0,3).join(' ')}</div>
                  <div className="mono">{h.shares}</div>
                  <div className="mono muted">${h.avgCost?.toFixed(2)}</div>
                  <div className="mono">${h.currentPrice?.toFixed(2)}</div>
                  <div className="mono">${h.currentValue?.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                  <div className={`mono ${pos ? 'positive' : 'negative'}`}>
                    {pos ? '+' : ''}${h.pnl?.toFixed(2)}
                  </div>
                  <div>
                    <span className={`badge ${pos ? 'badge-positive' : 'badge-negative'}`}>
                      {pos ? '+' : ''}{h.pnlPercent?.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className={`badge ${dayPos ? 'badge-positive' : 'badge-negative'}`}>
                      {dayPos ? '+' : ''}{h.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:12 }}
                      onClick={() => navigate(`/trade/${h.symbol}`)}>Trade</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function buildSectorData(holdings) {
  const map = {};
  let total = 0;
  holdings.forEach(h => {
    const v = h.currentValue || 0;
    map[h.sector] = (map[h.sector] || 0) + v;
    total += v;
  });
  return Object.entries(map)
    .map(([sector, value]) => ({ sector, value: parseFloat(value.toFixed(2)), pct: total > 0 ? parseFloat(((value/total)*100).toFixed(1)) : 0 }))
    .sort((a, b) => b.value - a.value);
}
