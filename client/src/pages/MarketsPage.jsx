import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrices } from '../context/PricesContext';
import styles from './MarketsPage.module.css';

const SECTORS = ['All', 'Technology', 'Financial', 'Healthcare', 'Consumer Cyclical', 'Consumer Defensive', 'Energy', 'Communication', 'Industrials'];

export default function MarketsPage() {
  const { prices, connected } = usePrices();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');

  const stocks = useMemo(() => {
    let list = Object.values(prices);
    if (search) list = list.filter(s => s.symbol.includes(search.toUpperCase()) || s.name?.toLowerCase().includes(search.toLowerCase()));
    if (sector !== 'All') list = list.filter(s => s.sector === sector);
    list.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === 'symbol' || sortBy === 'name') { va = va || ''; vb = vb || ''; return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va); }
      return sortDir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });
    return list;
  }, [prices, search, sector, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ opacity: sortBy === col ? 1 : 0.3 }}>
      {sortBy === col && sortDir === 'asc'
        ? <polyline points="18 15 12 9 6 15"/>
        : <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );

  const gainers = Object.values(prices).sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const losers = Object.values(prices).sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Markets</h1>
          <div className={styles.subtitle}>
            <div className="live-dot" />
            <span>{connected ? 'Live prices' : 'Connecting...'} · {Object.keys(prices).length} stocks</span>
          </div>
        </div>
      </div>

      {/* Gainers / Losers */}
      <div className={styles.movesRow}>
        <div className={`card ${styles.movesCard}`}>
          <div className={styles.movesTitle}>📈 Top Gainers</div>
          {gainers.map(s => (
            <div key={s.symbol} className={styles.moveItem} onClick={() => navigate(`/trade/${s.symbol}`)}>
              <span className={styles.moveSym}>{s.symbol}</span>
              <span className="mono" style={{ fontSize: 13 }}>${s.price?.toFixed(2)}</span>
              <span className="badge badge-positive">+{s.changePercent?.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div className={`card ${styles.movesCard}`}>
          <div className={styles.movesTitle}>📉 Top Losers</div>
          {losers.map(s => (
            <div key={s.symbol} className={styles.moveItem} onClick={() => navigate(`/trade/${s.symbol}`)}>
              <span className={styles.moveSym}>{s.symbol}</span>
              <span className="mono" style={{ fontSize: 13 }}>${s.price?.toFixed(2)}</span>
              <span className="badge badge-negative">{s.changePercent?.toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div className={`card ${styles.movesCard}`}>
          <div className={styles.movesTitle}>🔥 Most Active</div>
          {Object.values(prices).sort((a,b) => b.volume - a.volume).slice(0,3).map(s => (
            <div key={s.symbol} className={styles.moveItem} onClick={() => navigate(`/trade/${s.symbol}`)}>
              <span className={styles.moveSym}>{s.symbol}</span>
              <span className="mono muted" style={{ fontSize: 12 }}>{(s.volume/1e6).toFixed(1)}M vol</span>
              <span className={`badge ${s.changePercent >= 0 ? 'badge-positive' : 'badge-negative'}`}>
                {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search by ticker or name..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <div className={styles.sectorTabs}>
          {SECTORS.map(s => (
            <button key={s} className={`${styles.sectorTab} ${sector === s ? styles.active : ''}`} onClick={() => setSector(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>
          <div className={styles.colSym} onClick={() => toggleSort('symbol')}>Symbol <SortIcon col="symbol"/></div>
          <div className={styles.colName} onClick={() => toggleSort('name')}>Company <SortIcon col="name"/></div>
          <div className={styles.colNum} onClick={() => toggleSort('price')}>Price <SortIcon col="price"/></div>
          <div className={styles.colNum} onClick={() => toggleSort('change')}>Change <SortIcon col="change"/></div>
          <div className={styles.colNum} onClick={() => toggleSort('changePercent')}>Change % <SortIcon col="changePercent"/></div>
          <div className={styles.colNum} onClick={() => toggleSort('high')}>High <SortIcon col="high"/></div>
          <div className={styles.colNum} onClick={() => toggleSort('low')}>Low <SortIcon col="low"/></div>
          <div className={styles.colNum} onClick={() => toggleSort('volume')}>Volume <SortIcon col="volume"/></div>
          <div className={styles.colSector}>Sector</div>
          <div className={styles.colAction}></div>
        </div>
        {stocks.map(stock => {
          const pos = stock.changePercent >= 0;
          return (
            <div key={stock.symbol} className={styles.tableRow} onClick={() => navigate(`/trade/${stock.symbol}`)}>
              <div className={styles.colSym}>
                <span className={styles.sym}>{stock.symbol}</span>
              </div>
              <div className={styles.colName}>
                <span className={styles.name}>{stock.name}</span>
              </div>
              <div className={`${styles.colNum} mono`}>${stock.price?.toFixed(2)}</div>
              <div className={`${styles.colNum} mono ${pos ? 'positive' : 'negative'}`}>
                {pos ? '+' : ''}{stock.change?.toFixed(2)}
              </div>
              <div className={`${styles.colNum}`}>
                <span className={`badge ${pos ? 'badge-positive' : 'badge-negative'}`}>
                  {pos ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                </span>
              </div>
              <div className={`${styles.colNum} mono muted`}>${stock.high?.toFixed(2)}</div>
              <div className={`${styles.colNum} mono muted`}>${stock.low?.toFixed(2)}</div>
              <div className={`${styles.colNum} mono muted`}>{(stock.volume / 1e6).toFixed(1)}M</div>
              <div className={styles.colSector}>
                <span className={styles.sectorBadge}>{stock.sector}</span>
              </div>
              <div className={styles.colAction}>
                <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={e => { e.stopPropagation(); navigate(`/trade/${stock.symbol}`); }}>
                  Trade
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
