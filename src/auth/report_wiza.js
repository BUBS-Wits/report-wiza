import React, { useState } from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase_config';
import { useNavigate } from 'react-router-dom';
import './report_wiza.css';

// These tell Firebase which login provider to use
const google_provider = new GoogleAuthProvider();
const microsoft_provider = new OAuthProvider('microsoft.com');

function ReportWiza() {
  // Tracks which button is loading (google or microsoft)
  const [loading_provider, set_loading_provider] = useState(null);
  // Tracks if there is an error message to show
  const [error, set_error] = useState(null);
  // Lets us send the user to a different page after login
  const navigate = useNavigate();

  // This runs when the user clicks either sign in button
  const handle_sign_in = async (provider, provider_name) => {
    set_loading_provider(provider_name);
    set_error(null);

    try {
      // Opens the Google or Microsoft popup window
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Checks if this user already exists in our Firestore database
      const user_ref = doc(db, 'users', user.uid);
      const user_snap = await getDoc(user_ref);

      // If they are new, create their profile in Firestore
      if (!user_snap.exists()) {
        await setDoc(user_ref, {
          display_name: user.displayName,
          email: user.email,
          role: 'resident',
          is_blocked: false,
          created_at: serverTimestamp(),
        });
      }

      // Check their role and send them to the right page
      const role = user_snap.exists() ? user_snap.data().role : 'resident';

      if (role === 'admin') navigate('/admin');
      else if (role === 'worker') navigate('/worker');
      else navigate('/resident');

    } catch (err) {
      // If something goes wrong show an error message
      set_error('Sign-in failed. Please try again.');
      console.error(err);
    } finally {
      // Always stop the loading spinner when done
      set_loading_provider(null);
    }
  };

  return (
    // main wraps the whole page
    <main className="login_page">

      {/* Left navy panel — branding and stats */}
      <section className="login_left">
        <div className="login_left_inner">
          {/* App name */}
          <div className="login_logo">
            REPORT-<span>WIZA</span>
          </div>

          {/* Tagline */}
          <h2 className="login_tagline">
            Municipal Service<br />Delivery Portal
          </h2>

          {/* Description */}
          <p className="login_desc">
            Report issues in your ward. Track progress.<br />
            Hold your municipality accountable.
          </p>

          {/* Stats row — shows 3 numbers */}
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

        {/* Decorative animated map pins in the background */}
        <div className="login_map_overlay">
          <div className="login_map_pin pin_1" />
          <div className="login_map_pin pin_2" />
          <div className="login_map_pin pin_3" />
          <div className="login_map_pin pin_4" />
        </div>
      </section>

      {/* Right panel — the actual sign in card */}
      <section className="login_right">
        <article className="login_card">

          {/* Top of card — RW logo mark and title */}
          <header className="login_card_top">
            <div className="login_card_logo">RW</div>
            <div>
              <h1 className="login_card_title">Sign in</h1>
              <p className="login_card_sub">
                Use your institutional account to continue
              </p>
            </div>
          </header>

          {/* Only shows if there is an error */}
          {error && (
            <div className="login_error">
              <span className="login_error_icon">⚠</span>
              {error}
            </div>
          )}

          {/* Google sign in button */}
          <button
            className="login_btn login_btn_google"
            onClick={() => handle_sign_in(google_provider, 'google')}
            disabled={loading_provider !== null}
          >
            {/* Shows spinner while loading, Google icon otherwise */}
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

          {/* Microsoft sign in button */}
          <button
            className="login_btn login_btn_microsoft"
            onClick={() => handle_sign_in(microsoft_provider, 'microsoft')}
            disabled={loading_provider !== null}
          >
            {/* Shows spinner while loading, Microsoft icon otherwise */}
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

          {/* Divider line with text */}
          <div className="login_divider">
            <span>Wits University accounts supported</span>
          </div>

          {/* Small print notice */}
          <p className="login_notice">
            By signing in you agree to Report-Wiza's terms of use.
            Workers must be registered by an Admin before accessing
            the worker dashboard.
          </p>

        </article>

        {/* Bottom of right panel */}
        <footer className="login_footer">
          City of Johannesburg · COMS3009A 2026
        </footer>
      </section>

    </main>
  );
}

export default ReportWiza;