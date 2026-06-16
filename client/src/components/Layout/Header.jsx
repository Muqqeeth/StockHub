import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrices } from '../../context/PricesContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import styles from './Header.module.css';

export default function Header() {
  const { prices } = usePrices();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const tickerStocks = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN', 'JPM', 'NFLX', 'V', 'BRK', 'LLY', 'XOM', 'WMT', 'MA'];

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 1) {
        try {
          const res = await api.get(`/stocks/search?q=${query}`);
          setResults(res.data.slice(0, 6));
          setShowResults(true);
        } catch {}
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (!searchRef.current?.contains(e.target)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol) => {
    navigate(`/trade/${symbol}`);
    setQuery('');
    setShowResults(false);
  };

  return (
    <header className={styles.header}>
      {/* Ticker Tape */}
      <div className={styles.tickerWrapper}>
        <div className={styles.ticker}>
          {[...tickerStocks, ...tickerStocks].map((sym, i) => {
            const s = prices[sym];
            if (!s) return null;
            const pos = s.changePercent >= 0;
            return (
              <span key={i} className={styles.tickerItem} onClick={() => navigate(`/trade/${sym}`)}>
                <span className={styles.tickerSym}>{sym}</span>
                <span className={`${styles.tickerPrice} mono`}>${s.price?.toFixed(2)}</span>
                <span className={pos ? styles.tickerPos : styles.tickerNeg}>
                  {pos ? '+' : ''}{s.changePercent?.toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Search + Actions */}
      <div className={styles.controls}>
        <div className={styles.searchWrap} ref={searchRef}>
          <div className={styles.searchIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search stocks... (AAPL, Tesla...)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => query && setShowResults(true)}
          />
          {showResults && results.length > 0 && (
            <div className={styles.dropdown}>
              {results.map(stock => (
                <div key={stock.symbol} className={styles.dropdownItem} onClick={() => handleSelect(stock.symbol)}>
                  <div className={styles.dropSym}>{stock.symbol}</div>
                  <div className={styles.dropName}>{stock.name}</div>
                  <div className={`${styles.dropPrice} mono`}>${stock.price?.toFixed(2)}</div>
                  <div className={stock.changePercent >= 0 ? styles.tickerPos : styles.tickerNeg}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.balancePill}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className={`${styles.balanceAmt} mono`}>${user?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </header>
  );
}
