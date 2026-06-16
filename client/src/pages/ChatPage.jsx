import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { usePrices } from '../context/PricesContext';
import { useAuth } from '../context/AuthContext';
import styles from './ChatPage.module.css';

const SUGGESTED = [
  'What stocks should I watch today?',
  'Explain dollar-cost averaging',
  'What is a P/E ratio?',
  'How do I diversify my portfolio?',
  'What are the risks of day trading?',
  'Explain stop-loss orders',
  'What is market capitalization?',
  'How does inflation affect stocks?',
];

export default function ChatPage() {
  const { prices } = usePrices();
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `Hello ${user?.name?.split(' ')[0]}! 👋 I'm **TradeAI**, your personal financial advisor .\n\nI can help you with:\n- **Market analysis** — understanding price movements and trends\n- **Portfolio strategy** — how to diversify and manage risk\n- **Trading education** — learn about technical & fundamental analysis\n- **Stock research** — discuss any of the stocks on your watchlist\n\nRemember: This is a paper trading platform, so everything is risk-free. Ask me anything about the markets!`,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/chat', { message: msg, history });
      const aiMsg = { id: Date.now() + 1, role: 'assistant', content: res.data.response, timestamp: res.data.timestamp };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please check that your  API key is configured in the server `.env` file.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Live market sidebar data
  const topStocks = Object.values(prices).slice(0, 8);

  return (
    <div className={styles.page}>
      {/* Chat Panel */}
      <div className={styles.chatPanel}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.aiAvatar}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="var(--purple)"/>
              <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className={styles.aiName}>TradeAI</div>
            <div className={styles.aiStatus}>
              <div className="live-dot" />
            
            </div>
          </div>
          <button className={`btn btn-ghost ${styles.clearBtn}`} onClick={() => setMessages([messages[0]])}>
            Clear chat
          </button>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map(msg => (
            <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.userRow : styles.aiRow}`}>
              {msg.role === 'assistant' && (
                <div className={styles.msgAvatar}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="var(--purple)"/>
                    <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                <MessageContent content={msg.content} />
                <div className={styles.msgTime}>{formatTime(msg.timestamp)}</div>
              </div>
              {msg.role === 'user' && (
                <div className={styles.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
              )}
            </div>
          ))}

          {loading && (
            <div className={`${styles.msgRow} ${styles.aiRow}`}>
              <div className={styles.msgAvatar}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="var(--purple)"/>
                  <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className={`${styles.bubble} ${styles.aiBubble}`}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 2 && (
          <div className={styles.suggestions}>
            <p className={styles.suggestLabel}>Suggested questions</p>
            <div className={styles.suggestGrid}>
              {SUGGESTED.map(s => (
                <button key={s} className={styles.suggestBtn} onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={styles.inputArea}>
          <textarea
            ref={inputRef}
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about stocks, strategies, market news..."
            rows={2}
            disabled={loading}
          />
          <button
            className={`btn btn-primary ${styles.sendBtn}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar: Market data */}
      <div className={styles.sidebar}>
        <div className={`card ${styles.marketCard}`}>
          <div className={styles.sideTitle}>
            <span>Live Market</span>
            <div className="live-dot" />
          </div>
          {topStocks.map(s => {
            const pos = s.changePercent >= 0;
            return (
              <div key={s.symbol} className={styles.sideStock}>
                <div className={styles.sideSym}>{s.symbol}</div>
                <div className="mono" style={{ fontSize:13 }}>${s.price?.toFixed(2)}</div>
                <div className={`mono ${pos ? 'positive' : 'negative'}`} style={{ fontSize:12 }}>
                  {pos ? '+' : ''}{s.changePercent?.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>

        <div className={`card ${styles.tipsCard}`}>
          <div className={styles.sideTitle}>Trading Tips</div>
          {[
            { icon: '🎯', tip: 'Never risk more than 2% of your portfolio on a single trade' },
            { icon: '📊', tip: 'Diversify across sectors to reduce concentration risk' },
            { icon: '⏱️', tip: 'Time in the market beats timing the market' },
            { icon: '🧠', tip: 'Keep emotions out of trading decisions' },
          ].map(({ icon, tip }) => (
            <div key={tip} className={styles.tipItem}>
              <span className={styles.tipIcon}>{icon}</span>
              <p className={styles.tipText}>{tip}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MessageContent({ content }) {
  // Simple markdown-like rendering
  const formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  return <div className={styles.msgText} dangerouslySetInnerHTML={{ __html: formatted }} />;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
