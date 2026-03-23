import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

// ── ECG Background Canvas ──────────────────────────────────────
function EcgCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function ecgShape(t) {
      const p = t % 1;
      if (p < 0.30) return 0;
      if (p < 0.36) return (p - 0.30) / 0.06 * 0.3;
      if (p < 0.42) return 0.3 - (p - 0.36) / 0.06 * 0.3;
      if (p < 0.46) return 0;
      if (p < 0.48) return -(p - 0.46) / 0.02 * 0.25;
      if (p < 0.52) return -0.25 + (p - 0.48) / 0.04 * 1.25;
      if (p < 0.55) return 1.0 - (p - 0.52) / 0.03 * 1.5;
      if (p < 0.58) return -0.5 + (p - 0.55) / 0.03 * 0.5;
      if (p < 0.62) return 0;
      if (p < 0.70) {
        const tp = (p - 0.62) / 0.08;
        return Math.sin(tp * Math.PI) * 0.35;
      }
      return 0;
    }

    const lanes = [
      { y: 0.18, speed: 0.00028, offset: 0,    alpha: 1.0,  width: 1.8, color: "124,108,216" },
      { y: 0.42, speed: 0.00022, offset: 0.35, alpha: 0.7,  width: 1.4, color: "155,140,232" },
      { y: 0.66, speed: 0.00032, offset: 0.65, alpha: 0.85, width: 1.6, color: "100,80,200"  },
      { y: 0.85, speed: 0.00018, offset: 0.15, alpha: 0.5,  width: 1.2, color: "180,160,248" },
    ];

    let W, H;
    const TRAIL = 320;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    let lastTs = null;
    let rafId;

    function draw(ts) {
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      time += dt;

      ctx.clearRect(0, 0, W, H);

      lanes.forEach((lane) => {
        const cy = H * lane.y;
        const amp = H * 0.055;
        const cycleWidth = W * 0.38;
        const progress = (time * lane.speed) % 1;
        const headX = progress * (W + cycleWidth);

        ctx.beginPath();
        let started = false;

        for (let px = headX - TRAIL; px <= headX; px += 1.5) {
          const t = ((px / cycleWidth) + lane.offset) % 1;
          const y = cy - ecgShape(t) * amp;
          if (!started) { ctx.moveTo(px, y); started = true; }
          else ctx.lineTo(px, y);
        }

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${lane.color}, ${lane.alpha * 0.45})`;
        ctx.lineWidth = lane.width + 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.shadowBlur = 16;
        ctx.shadowColor = `rgba(${lane.color}, 0.9)`;
        ctx.strokeStyle = `rgba(${lane.color}, ${lane.alpha})`;
        ctx.lineWidth = lane.width;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const headT = ((headX / cycleWidth) + lane.offset) % 1;
        const headY = cy - ecgShape(headT) * amp;

        ctx.beginPath();
        ctx.arc(headX - 1.5, headY, lane.width * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${lane.color}, ${lane.alpha})`;
        ctx.shadowBlur = 22;
        ctx.shadowColor = `rgba(${lane.color}, 1.0)`;
        ctx.fill();
        ctx.shadowBlur = 0;


      });

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas id="ecgCanvas" ref={canvasRef} />;
}

// ── Heart SVG Art ──────────────────────────────────────────────
function HeartSvgArt() {
  return (
    <svg className="heart-svg-art" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="95" rx="28" ry="6" fill="rgba(0,0,0,0.3)" />
      <path d="M60 100 C35 80 10 62 10 40 C10 25 22 14 35 14 C44 14 52 19 60 26 C68 19 76 14 85 14 C98 14 110 25 110 40 C110 62 85 80 60 100Z" fill="#3d1a6e" />
      <path d="M60 95 C38 77 15 60 15 40 C15 27 26 17 38 17 C46 17 54 22 60 28 C66 22 74 17 82 17 C94 17 105 27 105 40 C105 60 82 77 60 95Z" fill="#5a2d9e" />
      <path d="M60 88 C42 72 20 57 20 40 C20 29 30 20 41 20 C48 20 55 24 60 30 C65 24 72 20 79 20 C90 20 100 29 100 40 C100 57 78 72 60 88Z" fill="#7c50c8" />
      <path d="M38 18 C30 22 22 30 20 40 C30 28 40 22 50 20 C46 18 42 17 38 18Z" fill="#b090e8" opacity=".7" />
      <ellipse cx="42" cy="28" rx="10" ry="6" fill="rgba(220,200,255,0.45)" transform="rotate(-20,42,28)" />
      <ellipse cx="38" cy="22" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-25,38,22)" />
      <rect x="53" y="8" width="14" height="20" rx="7" fill="#6040b0" />
      <rect x="55" y="8" width="10" height="18" rx="5" fill="#8060c8" />
      <rect x="57" y="8" width="4" height="8" rx="2" fill="rgba(200,180,255,.5)" />
      <path d="M72 16 Q82 10 85 18" stroke="#7050be" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M72 16 Q82 10 85 18" stroke="#9070d0" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M48 16 Q36 8 32 18" stroke="#5030a0" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M48 16 Q36 8 32 18" stroke="#7050b8" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60 88 C42 72 20 57 20 40 C20 29 30 20 41 20" stroke="rgba(200,140,255,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="95" y1="38" x2="108" y2="30" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="75" y1="72" x2="92" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="25" y1="48" x2="12" y2="52" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  );
}

// ── Login Form ─────────────────────────────────────────────────
function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [pwVis, setPwVis]       = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [pwErr, setPwErr]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function doLogin() {
    let ok = true;
    setEmailErr(false); setPwErr(false); setErrorMsg("");
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setEmailErr(true); ok = false; }
    if (!password) { setPwErr(true); ok = false; }
    if (!ok) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg('Unable to connect to server');
      setLoading(false);
    }
  }

  function handleKey(e) { if (e.key === "Enter") doLogin(); }

  return (
    <div className="form-col">
      <div className="form-card">
        <div id="loginView">
          <div className="fh">
            <div className="fh-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 21.7C5.5 17.5 2 13.5 2 9.5A5.5 5.5 0 0112 6a5.5 5.5 0 0110 3.5c0 4-3.5 8-10 12.2z" fill="white" opacity=".95" />
              </svg>
            </div>
            <div className="fh-title">Welcome <em>back</em></div>
            <div className="fh-sub">Sign in to your clinical workspace</div>
          </div>

          <div className="fields">
            {/* Email */}
            <div className="f-wrap">
              <span className="f-ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  <polyline points="22,6 12,12 2,6" />
                </svg>
              </span>
              <input
                className={`inp${emailErr ? " err" : ""}`}
                type="email"
                placeholder="Provider email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKey}
              />
              {emailErr && <div className="f-err on">Enter a valid email.</div>}
            </div>

            {/* Password */}
            <div className="f-wrap">
              <span className="f-ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <input
                className={`inp${pwErr ? " err" : ""}`}
                type={pwVis ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
              />
              <button className="eye" onClick={() => setPwVis(v => !v)} type="button">
                {pwVis ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              {pwErr && <div className="f-err on">Password cannot be empty.</div>}
            </div>
          </div>

          <div className="sp-sm" />
          <div className="row-opts">
            <label className="chk-lbl">
              <input type="checkbox" className="chk" /> Remember me
            </label>
          </div>
          <div className="sp-md" />

          <button className={`cta-btn${loading ? " loading" : ""}`} onClick={doLogin}>
            <span className="c-txt">Sign in →</span>
            <div className="spin" />
          </button>

          {errorMsg && (
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              {errorMsg}
            </div>
          )}

          <div className="sp-md" />
          <div className="f-footer">
            Don't have an account? <a href="/signup">Sign up</a>
          </div>

        </div>
      </div>
      
      {showSuccess && (
        <div className="toast-notification">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Login successful
        </div>
      )}
    </div>
  );
}

// ── Root App Component ─────────────────────────────────────────
export default function HeartBlooms() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300&family=Instrument+Serif:ital@0;1&display=swap"
        rel="stylesheet"
      />
      <div className="bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <EcgCanvas />
      <div className="page page--centered">
        <LoginForm />
      </div>
    </>
  );
}