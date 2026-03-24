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
        ctx.strokeStyle = `rgba(${lane.color}, ${lane.alpha * 0.3})`;
        ctx.lineWidth = lane.width + 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${lane.color}, 0.6)`;
        ctx.strokeStyle = `rgba(${lane.color}, ${lane.alpha})`;
        ctx.lineWidth = lane.width;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const headT = ((headX / cycleWidth) + lane.offset) % 1;
        const headY = cy - ecgShape(headT) * amp;

        ctx.beginPath();
        ctx.arc(headX - 1.5, headY, lane.width * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${lane.color}, ${lane.alpha * 0.9})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `rgba(${lane.color}, 0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        const fadeGrad = ctx.createLinearGradient(headX - TRAIL - 40, 0, headX - TRAIL + 60, 0);
        fadeGrad.addColorStop(0, "rgba(237,233,251, 1)");
        fadeGrad.addColorStop(1, "rgba(237,233,251, 0)");
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(headX - TRAIL - 40, cy - amp * 2, 100, amp * 4);
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

// ── Eye Icon ──────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Signup Form ────────────────────────────────────────────────
function SignupForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwVis, setPwVis] = useState(false);
  const [confirmPwVis, setConfirmPwVis] = useState(false);
  const [nameErr, setNameErr] = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [pwErr, setPwErr] = useState(false);
  const [confirmPwErr, setConfirmPwErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  async function doSignup() {
    let ok = true;
    setNameErr(false); setEmailErr(false); setPwErr(false); setConfirmPwErr(false); setErrorMsg("");
    if (!name.trim()) { setNameErr(true); ok = false; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setEmailErr(true); ok = false; }
    if (!password || password.length < 6) { setPwErr(true); ok = false; }
    if (password !== confirmPassword) { setConfirmPwErr(true); ok = false; }
    if (!ok) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (!response.ok) { setErrorMsg(data.error || 'Signup failed'); setLoading(false); return; }
      setShowSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      setErrorMsg('Unable to connect to server');
      setLoading(false);
    }
  }

  function handleKey(e) { if (e.key === "Enter") doSignup(); }

  return (
    <div className="form-col">
      <div className="form-card">
        <div className="fh">
          <div className="fh-avatar">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.7C5.5 17.5 2 13.5 2 9.5A5.5 5.5 0 0112 6a5.5 5.5 0 0110 3.5c0 4-3.5 8-10 12.2z" fill="white" opacity=".95" />
            </svg>
          </div>
          <div className="fh-title">Create <em>Account</em></div>
          <div className="fh-sub">Join the clinical workspace</div>
        </div>

        <div className="fields">
          <div className="f-wrap">
            <span className="f-ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              className={`inp${nameErr ? " err" : ""}`}
              type="text" placeholder="Full name"
              autoComplete="name" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={handleKey}
            />
            {nameErr && <div className="f-err on">Name is required.</div>}
          </div>

          <div className="f-wrap">
            <span className="f-ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <polyline points="22,6 12,12 2,6" />
              </svg>
            </span>
            <input
              className={`inp${emailErr ? " err" : ""}`}
              type="email" placeholder="Provider email"
              autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
            />
            {emailErr && <div className="f-err on">Enter a valid email.</div>}
          </div>

          <div className="f-wrap">
            <span className="f-ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </span>
            <input
              className={`inp${pwErr ? " err" : ""}`}
              type={pwVis ? "text" : "password"} placeholder="Password (min 6 characters)"
              autoComplete="new-password" style={{ paddingRight: 44 }}
              value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
            />
            <button className="eye" onClick={() => setPwVis(v => !v)} type="button">
              <EyeIcon visible={pwVis} />
            </button>
            {pwErr && <div className="f-err on">Password must be at least 6 characters.</div>}
          </div>

          <div className="f-wrap">
            <span className="f-ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </span>
            <input
              className={`inp${confirmPwErr ? " err" : ""}`}
              type={confirmPwVis ? "text" : "password"} placeholder="Confirm password"
              autoComplete="new-password" style={{ paddingRight: 44 }}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={handleKey}
            />
            <button className="eye" onClick={() => setConfirmPwVis(v => !v)} type="button">
              <EyeIcon visible={confirmPwVis} />
            </button>
            {confirmPwErr && <div className="f-err on">Passwords do not match.</div>}
          </div>
        </div>

        <div className="sp-md" />

        <button className={`cta-btn${loading ? " loading" : ""}`} onClick={doSignup}>
          <span className="c-txt">Create Account →</span>
          <div className="spin" />
        </button>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <div className="sp-md" />
        <div className="f-footer">
          Already have an account? <a href="/login">Sign in</a>
        </div>
      </div>

      {showSuccess && (
        <div className="toast-notification">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Account created! Redirecting to login...
        </div>
      )}
    </div>
  );
}

// ── Root Component ─────────────────────────────────────────────
export default function Signup() {
  return (
    <>
      <div className="bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <EcgCanvas />
      <div className="page page--centered">
        <SignupForm />
      </div>
    </>
  );
}
