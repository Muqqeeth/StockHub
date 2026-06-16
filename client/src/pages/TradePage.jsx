import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePrices } from '../context/PricesContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import styles from './TradePage.module.css';

const TIME_RANGES = ['1D', '1W', '1M', '3M'];

export default function TradePage() {
  const { symbol: paramSymbol } = useParams();
  const { prices } = usePrices();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [symbol, setSymbol] = useState(paramSymbol?.toUpperCase() || 'AAPL');
  const [stockDetail, setStockDetail] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [orderType, setOrderType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [activeSLs, setActiveSLs] = useState([]);
  const [editingSL, setEditingSL] = useState(null);
  const [newSLValue, setNewSLValue] = useState('');

  const livePrice = prices[symbol];

  const fetchStockDetail = useCallback(async (sym) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/stocks/${sym}`);
      setStockDetail(res.data);
    } catch {}
    finally { setDetailLoading(false); }
  }, []);

  const fetchPortfolioAndSL = useCallback(async () => {
    try {
      const [pf, sl] = await Promise.all([api.get('/portfolio'), api.get('/trades/stoploss')]);
      setPortfolio(pf.data);
      setActiveSLs(sl.data);
    } catch {}
  }, []);

  useEffect(() => { if (symbol) fetchStockDetail(symbol); }, [symbol, fetchStockDetail]);
  useEffect(() => { fetchPortfolioAndSL(); }, [fetchPortfolioAndSL]);

  const getChartData = () => {
    if (!stockDetail) return [];
    if (timeRange === '1D') return stockDetail.intradayData?.map(d => ({
      t: new Date(d.time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      price: d.price
    })) || [];
    return stockDetail.chartData?.slice(timeRange === '1W' ? -7 : timeRange === '1M' ? -30 : -90)
      ?.map(d => ({ t: d.date.slice(5), price: d.close })) || [];
  };

  const chartData = getChartData();
  const chartColor = livePrice?.changePercent >= 0 ? 'var(--green)' : 'var(--red)';
  const holding = portfolio?.holdings?.find(h => h.symbol === symbol);
  const estimatedTotal = shares ? (parseFloat(shares) * (livePrice?.price || 0)).toFixed(2) : '0.00';

  // Stop loss as % below current price
  const slPercent = stopLoss && livePrice ? (((livePrice.price - parseFloat(stopLoss)) / livePrice.price) * 100).toFixed(1) : null;

  const handleTrade = async () => {
    if (!shares || parseFloat(shares) <= 0) return toast.error('Enter a valid number of shares');
    if (!Number.isInteger(parseFloat(shares))) return toast.error('Shares must be a whole number');

    if (stopLoss && parseFloat(stopLoss) >= (livePrice?.price || 0)) {
      return toast.error(`Stop loss must be below current price $${livePrice?.price?.toFixed(2)}`);
    }

    setLoading(true);
    try {
      const res = await api.post('/trades', {
        symbol,
        type: orderType,
        shares: parseInt(shares),
        stopLoss: orderType === 'BUY' && stopLoss ? parseFloat(stopLoss) : null,
      });
      toast.success(res.data.message);
      updateUser({ balance: res.data.balance });
      setShares('');
      setStopLoss('');
      await fetchPortfolioAndSL();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSL = async (sym) => {
    try {
      const res = await api.put(`/trades/stoploss/${sym}`, { stopLoss: newSLValue });
      toast.success(res.data.message);
      setEditingSL(null);
      setNewSLValue('');
      await fetchPortfolioAndSL();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stop loss');
    }
  };

  const handleRemoveSL = async (sym) => {
    try {
      const res = await api.put(`/trades/stoploss/${sym}`, { stopLoss: null });
      toast.success(res.data.message);
      await fetchPortfolioAndSL();
    } catch (err) {
      toast.error('Failed to remove stop loss');
    }
  };

  const setSharesFraction = (frac) => {
    if (orderType === 'BUY') {
      const maxShares = Math.floor((user.balance * frac) / (livePrice?.price || 1));
      setShares(String(maxShares));
    } else if (holding) {
      setShares(String(Math.floor(holding.shares * frac)));
    }
  };

  const setQuickSL = (pct) => {
    if (livePrice?.price) {
      setStopLoss((livePrice.price * (1 - pct / 100)).toFixed(2));
    }
  };

  return (
    <div className={styles.page}>
      {/* Left: Chart & Info */}
      <div className={styles.leftPanel}>
        {/* Stock Header */}
        <div className={`card ${styles.stockHeader}`}>
          {livePrice ? (
            <>
              <div className={styles.stockInfo}>
                <div className={styles.symBadge}>{symbol}</div>
                <div>
                  <div className={styles.stockName}>{livePrice.name}</div>
                  <div className={styles.stockSector}>
                    {livePrice.sector}
                    {livePrice.isReal && <span className={styles.realBadge}>● Live</span>}
                  </div>
                </div>
              </div>
              <div className={styles.priceBlock}>
                <div className={`mono ${styles.livePrice}`}>${livePrice.price?.toFixed(2)}</div>
                <div className={`badge ${livePrice.changePercent >= 0 ? 'badge-positive' : 'badge-negative'} ${styles.changeBadge}`}>
                  {livePrice.changePercent >= 0 ? '+' : ''}{livePrice.change?.toFixed(2)} ({livePrice.changePercent >= 0 ? '+' : ''}{livePrice.changePercent?.toFixed(2)}%)
                </div>
              </div>
              <div className={styles.ohlcRow}>
                <div className={styles.ohlcItem}><span className={styles.ohlcLabel}>Open</span><span className="mono">${livePrice.open?.toFixed(2)}</span></div>
                <div className={styles.ohlcItem}><span className={styles.ohlcLabel}>High</span><span className="mono positive">${livePrice.high?.toFixed(2)}</span></div>
                <div className={styles.ohlcItem}><span className={styles.ohlcLabel}>Low</span><span className="mono negative">${livePrice.low?.toFixed(2)}</span></div>
                <div className={styles.ohlcItem}><span className={styles.ohlcLabel}>Volume</span><span className="mono">{(livePrice.volume / 1e6).toFixed(1)}M</span></div>
              </div>
            </>
          ) : <div className="skeleton" style={{ height: 80 }} />}
        </div>

        {/* Chart */}
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.chartControls}>
            <div className={styles.chartTitle}>Price Chart</div>
            <div className={styles.timeRanges}>
              {TIME_RANGES.map(r => (
                <button key={r} className={`${styles.rangeBtn} ${timeRange === r ? styles.active : ''}`} onClick={() => setTimeRange(r)}>{r}</button>
              ))}
            </div>
          </div>
          {detailLoading ? <div className="skeleton" style={{ height: 280 }} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${v.toFixed(0)}`} width={60} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}
                  formatter={v => [`$${v?.toFixed(2)}`, 'Price']}
                />
                <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill="url(#cg)" dot={false} activeDot={{ r: 4, fill: chartColor }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active Stop Losses */}
        {activeSLs.length > 0 && (
          <div className={`card ${styles.slCard}`}>
            <div className={styles.slHeader}>
              <span className={styles.slTitle}>🛑 Active Stop Losses</span>
              <span className={styles.slCount}>{activeSLs.length} active</span>
            </div>
            {activeSLs.map(sl => {
              const isEditing = editingSL === sl.symbol;
              const atRisk = sl.currentPrice && sl.distancePercent < 3;
              return (
                <div key={sl._id} className={`${styles.slItem} ${atRisk ? styles.slAtRisk : ''}`}>
                  <div className={styles.slLeft}>
                    <span className={styles.slSym}>{sl.symbol}</span>
                    <span className={styles.slShares}>{sl.shares} shares</span>
                  </div>
                  <div className={styles.slMid}>
                    <span className={styles.slLabel}>Stop Loss</span>
                    <span className={`mono ${styles.slPrice}`}>${sl.stopLoss?.toFixed(2)}</span>
                    {sl.currentPrice && (
                      <span className={`${styles.slDist} ${atRisk ? 'negative' : 'muted'}`}>
                        {sl.distancePercent}% away
                      </span>
                    )}
                  </div>
                  <div className={styles.slActions}>
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          className={styles.slInput}
                          placeholder="New price"
                          value={newSLValue}
                          onChange={e => setNewSLValue(e.target.value)}
                        />
                        <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handleUpdateSL(sl.symbol)}>Save</button>
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setEditingSL(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => { setEditingSL(sl.symbol); setNewSLValue(sl.stopLoss?.toFixed(2)); }}>Edit</button>
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12, color: 'var(--red)' }}
                          onClick={() => handleRemoveSL(sl.symbol)}>Remove</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stock News */}
        <div className={`card ${styles.newsCard}`}>
          <div className={styles.newsTitle}>Latest News for {symbol}</div>
          <StockNewsFeed symbol={symbol} />
        </div>
      </div>

      {/* Right: Order Panel */}
      <div className={styles.rightPanel}>
        <div className={`card ${styles.searchCard}`}>
          <label className={styles.fieldLabel}>Stock Symbol</label>
          <input
            type="text"
            placeholder="Enter symbol (e.g. AAPL)"
            defaultValue={symbol}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = e.target.value.trim().toUpperCase();
                if (val) { setSymbol(val); navigate(`/trade/${val}`, { replace: true }); }
              }
            }}
            className={styles.symbolInput}
          />
          <p className={styles.hint}>Press Enter to load stock</p>
        </div>

        <div className={`card ${styles.orderCard}`}>
          <div className={styles.orderTabs}>
            {['BUY', 'SELL'].map(t => (
              <button key={t} className={`${styles.orderTab} ${orderType === t ? (t === 'BUY' ? styles.tabBuy : styles.tabSell) : ''}`}
                onClick={() => { setOrderType(t); setStopLoss(''); }}>
                {t}
              </button>
            ))}
          </div>

          <div className={styles.orderBody}>
            <div className={styles.orderField}>
              <label className={styles.fieldLabel}>Market Price</label>
              <div className={`mono ${styles.marketPrice}`}>${livePrice?.price?.toFixed(2) || '--'}</div>
            </div>

            <div className={styles.orderField}>
              <label className={styles.fieldLabel}>Number of Shares</label>
              <input type="number" min="1" value={shares} onChange={e => setShares(e.target.value)} placeholder="0" className={styles.sharesInput} />
              <div className={styles.fractionBtns}>
                {[['25%', 0.25], ['50%', 0.5], ['75%', 0.75], ['Max', 1]].map(([label, frac]) => (
                  <button key={label} className={styles.fracBtn} onClick={() => setSharesFraction(frac)}>{label}</button>
                ))}
              </div>
            </div>

            {/* Stop Loss — only for BUY orders */}
            {orderType === 'BUY' && (
              <div className={styles.orderField}>
                <label className={styles.fieldLabel}>
                  🛑 Stop Loss Price
                  <span className={styles.optional}> (optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={e => setStopLoss(e.target.value)}
                  placeholder={livePrice ? `Below $${livePrice.price?.toFixed(2)}` : 'Enter price'}
                  className={styles.sharesInput}
                />
                <div className={styles.fractionBtns}>
                  {[['−2%', 2], ['−5%', 5], ['−10%', 10], ['−15%', 15]].map(([label, pct]) => (
                    <button key={label} className={styles.fracBtn} onClick={() => setQuickSL(pct)}>{label}</button>
                  ))}
                </div>
                {stopLoss && slPercent && (
                  <div className={styles.slHint}>
                    <span className="negative">⚠ Auto-sell if price drops {slPercent}% to ${parseFloat(stopLoss).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.orderField}>
              <label className={styles.fieldLabel}>Estimated Total</label>
              <div className={`mono ${styles.totalPrice}`}>${parseFloat(estimatedTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>

            <div className={styles.balanceRow}>
              <span className={styles.fieldLabel}>Available Cash</span>
              <span className="mono positive">${user?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            {holding && (
              <div className={styles.holdingRow}>
                <span className={styles.fieldLabel}>Your Position</span>
                <div className={styles.holdingDetail}>
                  <span className="mono">{holding.shares} shares</span>
                  <span className={`mono ${holding.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {holding.pnl >= 0 ? '+' : ''}${holding.pnl?.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              className={`btn ${orderType === 'BUY' ? 'btn-green' : 'btn-red'} ${styles.executeBtn}`}
              onClick={handleTrade}
              disabled={loading || !shares}
            >
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : null}
              {loading ? 'Executing...' : `${orderType} ${shares || '0'} ${symbol}`}
            </button>

            <p className={styles.disclaimer}>
              Paper trading only. No real money involved.
              {stopLoss && orderType === 'BUY' ? ` Stop loss active at $${parseFloat(stopLoss).toFixed(2)}.` : ''}
            </p>
          </div>
        </div>

        {portfolio?.holdings?.length > 0 && (
          <div className={`card ${styles.portfolioCard}`}>
            <div className={styles.cardMiniTitle}>Your Positions</div>
            {portfolio.holdings.map(h => {
              const hasSL = activeSLs.find(s => s.symbol === h.symbol);
              return (
                <div key={h.symbol} className={`${styles.posItem} ${h.symbol === symbol ? styles.posActive : ''}`}
                  onClick={() => { setSymbol(h.symbol); navigate(`/trade/${h.symbol}`, { replace: true }); }}>
                  <span className={styles.posSym}>{h.symbol}</span>
                  {hasSL && <span className={styles.slDot} title={`Stop loss: $${hasSL.stopLoss?.toFixed(2)}`}>🛑</span>}
                  <span className="mono muted">{h.shares} sh</span>
                  <span className={`mono ${h.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {h.pnl >= 0 ? '+' : ''}${h.pnl?.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StockNewsFeed({ symbol }) {
  const [news, setNews] = useState([]);
  useEffect(() => {
    api.get(`/news/${symbol}`).then(r => setNews(r.data.articles)).catch(() => {});
  }, [symbol]);

  if (!news.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No news available</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {news.slice(0, 3).map(article => (
        <div key={article.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{article.title}</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{article.source}</span>
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
              <span className={`badge ${article.sentiment === 'positive' ? 'badge-positive' : article.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral'}`}>
                {article.sentiment}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}