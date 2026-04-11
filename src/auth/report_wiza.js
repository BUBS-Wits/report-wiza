import React, { useState } from 'react';
import './report_wiza.css';

function ReportWiza() {
  const [loading_provider, set_loading_provider] = useState(null);
  const [error, set_error] = useState(null);

  const handle_sign_in = (provider_name) => {
    set_loading_provider(provider_name);
    set_error(null);
    // Firebase logic will be added here later
    setTimeout(() => set_loading_provider(null), 2000);
  };

  return (
    <div className="login_page">

      {/* Left panel */}
      <div className="login_left">
        <div className="login_left_inner">
          <div className="login_logo">
            REPORT-<span>WIZA</span>
          </div>
          <h2 className="login_tagline">
            Municipal Service<br />Delivery Portal
          </h2>
          <p className="login_desc">
            Report issues in your ward. Track progress.<br />
            Hold your municipality accountable.
          </p>
          <div className="login_stats">
            <div className="login_stat">
              <span className="login_stat_val">2,841</span>
              <span className="login_stat_label">Requests resolved</span>
            </div>
            <div className="login_stat_divider" />
            <div className="login_stat">
              <span className="login_stat_val">48</span>
              <span className="login_stat_label">Wards covered</span>
            </div>
            <div className="login_stat_divider" />
            <div className="login_stat">
              <span className="login_stat_val">4.1h</span>
              <span className="login_stat_label">Avg. response</span>
            </div>
          </div>
        </div>

        {/* Decorative animated map pins */}
        <div className="login_map_overlay">
          <div className="login_map_pin pin_1" />
          <div className="login_map_pin pin_2" />
          <div className="login_map_pin pin_3" />
          <div className="login_map_pin pin_4" />
        </div>
      </div>

      {/* Right panel */}
      <div className="login_right">
        <div className="login_card">
          <div className="login_card_top">
            <div className="login_card_logo">RW</div>
            <div>
              <h1 className="login_card_title">Sign in</h1>
              <p className="login_card_sub">
                Use your institutional account to continue
              </p>
            </div>
          </div>

          {error && (
            <div className="login_error">
              <span className="login_error_icon">⚠</span>
              {error}
            </div>
          )}

          <button
            className="login_btn login_btn_google"
            onClick={() => handle_sign_in('google')}
            disabled={loading_provider !== null}
          >
            {loading_provider === 'google' ? (
              <span className="login_spinner" />
            ) : (
              <svg className="login_btn_icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Sign in with Google
          </button>

          <button
            className="login_btn login_btn_microsoft"
            onClick={() => handle_sign_in('microsoft')}
            disabled={loading_provider !== null}
          >
            {loading_provider === 'microsoft' ? (
              <span className="login_spinner login_spinner_dark" />
            ) : (
              <svg className="login_btn_icon" viewBox="0 0 24 24">
                <path d="M11.4 2H2v9.4h9.4V2z" fill="#f25022"/>
                <path d="M22 2h-9.4v9.4H22V2z" fill="#7fba00"/>
                <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00a4ef"/>
                <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#ffb900"/>
              </svg>
            )}
            Sign in with Microsoft
          </button>

          <div className="login_divider">
            <span>Wits University accounts supported</span>
          </div>

          <p className="login_notice">
            By signing in you agree to Report-Wiza's terms of use.
            Workers must be registered by an Admin before accessing
            the worker dashboard.
          </p>
        </div>

        <p className="login_footer">
          City of Johannesburg · COMS3009A 2026
        </p>
      </div>
    </div>
  );
}

export default ReportWiza;