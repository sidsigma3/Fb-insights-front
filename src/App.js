import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const APP_ID = process.env.REACT_APP_FB_ID;
const BASE_URL = process.env.REACT_APP_API_URL;

const cardLabels = {
  page_followers: 'Total Followers',
  page_post_engagements: 'Total Engagement',
  page_views_total: 'Total Impressions',
  page_engaged_users: 'Total Reactions'
};

const icons = {
  page_fans: '👥',
  page_post_engagements: '💬',
  page_impressions: '👁️',
  page_engaged_users: '❤️'
};

export default function App() {
  const [user, setUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [insights, setInsights] = useState([]);
  const [since, setSince] = useState('2025-01-01');
  const [until, setUntil] = useState('2025-03-31');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: true, version: 'v19.0' });
    };
    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleLogin = () => {
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          const token = response.authResponse.accessToken;
          window.FB.api('/me', { fields: 'name,picture' }, (userData) => {
            setUser({ ...userData, accessToken: token });
            loadPages(token);
          });
        } else {
          setError('Login cancelled or failed. Please try again.');
        }
      },
      { scope: 'public_profile,pages_show_list,pages_read_engagement,read_insights' }
    );
  };

  const loadPages = async (token) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/pages`, { params: { accessToken: token } });
      setPages(data.data || []);
    } catch {
      setError('Failed to fetch pages.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPage) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${BASE_URL}/api/insights`, {
        params: { pageId: selectedPage.id, pageToken: selectedPage.access_token, since, until }
      });
      setInsights(data.data || []);
    } catch {
      setError('Failed to fetch insights. Try adjusting the date range.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.FB) window.FB.logout();
    setUser(null);
    setPages([]);
    setSelectedPage(null);
    setInsights([]);
    setError(null);
  };

  const getDisplayValue = (metric) => {
    if (!metric.values?.length) return '0';
    const raw = metric.values[metric.values.length - 1]?.value;
    if (typeof raw === 'number') return raw.toLocaleString();
    if (typeof raw === 'object' && raw !== null) {
      return Object.values(raw)
        .reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0)
        .toLocaleString();
    }
    if (typeof raw === 'string' && raw !== 'N/A') return raw;
    return '0';
  };

  return (
    <div className="fb-app">
      <div className="fb-container">
        <div className="fb-header">
          <div className="fb-logo-mark">f</div>
          <div className="fb-header-text">
            <h1>Page Insights</h1>
            <p>Analytics Dashboard</p>
          </div>
        </div>

        {error && (
          <div className="fb-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {!user ? (
          <div className="fb-login-card">
            <div className="fb-login-icon">f</div>
            <h2 className="fb-login-title">Connect your Pages</h2>
            <p className="fb-login-sub">
              Sign in with Facebook to access your<br />page analytics and engagement insights.
            </p>
            <button className="fb-login-btn" onClick={handleLogin}>
              <span>f</span>
              Continue with Facebook
            </button>
          </div>
        ) : (
          <div className="fb-dashboard">
            <div className="fb-profile-bar">
              <img
                src={user.picture?.data?.url}
                alt="profile"
                className="fb-avatar"
              />
              <div className="fb-profile-info">
                <div className="fb-profile-name">{user.name}</div>
                <div className="fb-profile-status">
                  <span className="fb-status-dot" />
                  Connected
                </div>
              </div>
              <button className="fb-disconnect-btn" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>

            <div className="fb-controls-card">
              <div className="fb-section-label">Configure Report</div>
              <div className="fb-divider" />
              <div className="fb-controls-grid">
                <div className="fb-field" style={{ gridColumn: '1 / -2' }}>
                  <label>Page</label>
                  <select
                    className="fb-select"
                    onChange={e => {
                      const page = pages.find(p => p.id === e.target.value);
                      setSelectedPage(page || null);
                      setInsights([]);
                    }}
                  >
                    <option value="">Select a page…</option>
                    {pages.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="fb-field">
                  <label>From</label>
                  <input
                    type="date"
                    className="fb-date-input"
                    value={since}
                    onChange={e => setSince(e.target.value)}
                  />
                </div>

                <div className="fb-field">
                  <label>To</label>
                  <input
                    type="date"
                    className="fb-date-input"
                    value={until}
                    onChange={e => setUntil(e.target.value)}
                  />
                </div>

                <button
                  className="fb-submit-btn"
                  onClick={handleSubmit}
                  disabled={!selectedPage || loading}
                >
                  {loading ? (
                    <>
                      <span className="fb-spinner" />
                      Loading
                    </>
                  ) : (
                    <>
                      <span>↗</span>
                      Fetch
                    </>
                  )}
                </button>
              </div>
            </div>

            {insights.length > 0 && (
              <div>
                <div className="fb-section-label" style={{ marginBottom: '1rem' }}>
                  Metrics Overview
                </div>
                <div className="fb-metrics-grid">
                  {insights.map(metric => (
                    <div key={metric.name} className="fb-metric-card">
                      <span className="fb-metric-icon">
                        {icons[metric.name] || '📊'}
                      </span>
                      <div className="fb-metric-label">
                        {cardLabels[metric.name] || metric.name}
                      </div>
                      <div className="fb-metric-value">
                        {getDisplayValue(metric)}
                      </div>
                      <div className="fb-metric-accent" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}