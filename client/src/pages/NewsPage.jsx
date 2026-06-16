import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './NewsPage.module.css';

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/news?category=${category}&limit=20`)
      .then(r => { setArticles(r.data.articles); setCategories(r.data.categories); })
      .finally(() => setLoading(false));
  }, [category]);

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Market News</h1>
        <p className={styles.sub}>Stay ahead with the latest financial intelligence</p>
      </div>

      <div className={styles.tabs}>
        {categories.map(cat => (
          <button key={cat} className={`${styles.tab} ${category === cat ? styles.active : ''}`} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.skeleton}>
          {Array(6).fill(0).map((_, i) => <div key={i} className={`skeleton ${styles.skCard}`} />)}
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Featured */}
          {featured && (
            <div className={`card ${styles.featured}`}>
              <div className={styles.featuredMeta}>
                <span className={styles.source}>{featured.source}</span>
                <span className={styles.category}>{featured.category}</span>
                <span className={`badge ${featured.sentiment === 'positive' ? 'badge-positive' : featured.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral'}`}>
                  {featured.sentiment}
                </span>
              </div>
              <h2 className={styles.featuredTitle}>{featured.title}</h2>
              <p className={styles.featuredSummary}>{featured.summary}</p>
              <div className={styles.featuredFooter}>
                <span className={styles.time}>{timeAgo(featured.publishedAt)}</span>
                <span className={styles.readTime}>{featured.readTime} min read</span>
              </div>
            </div>
          )}

          {/* Grid */}
          <div className={styles.grid}>
            {rest.map(article => (
              <div key={article.id} className={`card ${styles.articleCard}`}>
                <div className={styles.articleMeta}>
                  <span className={styles.source}>{article.source}</span>
                  {article.symbol && <span className={styles.stockTag}>{article.symbol}</span>}
                  <span className={`badge ${article.sentiment === 'positive' ? 'badge-positive' : article.sentiment === 'negative' ? 'badge-negative' : 'badge-neutral'}`}>
                    {article.sentiment}
                  </span>
                </div>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                <p className={styles.articleSummary}>{article.summary?.substring(0, 100)}...</p>
                <div className={styles.articleFooter}>
                  <span className={styles.time}>{timeAgo(article.publishedAt)}</span>
                  <span className={styles.catTag}>{article.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
