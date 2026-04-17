// src/components/Auth.tsx
// Requires: lucide-react, @supabase/supabase-js
// Optional: npm i @marsidev/react-turnstile  (see Turnstile section below)

import { useState, useRef, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sparkles,
  KeyRound,
  RotateCcw,
  Check,
  Hash,
  ArrowLeft,
  Timer,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type AuthMode     = "sign-in" | "sign-up";
type SignInMethod  = "password" | "otp";

// "otp-verify" is the new step: hides email/password and shows the 6-box grid.
// "email-sent" and "otp-sent" are kept as intermediate banners (shown briefly
// before the OTP verify view takes over via the transition effect).
type AuthStep = "form" | "otp-verify";

// Tells verifyOtp which Supabase flow produced the code:
//   sign-up  → type: "signup"   (email confirmation)
//   sign-in  → type: "email"    (magic-link / OTP login)
type OtpOrigin = "signup" | "signin";

const OTP_LENGTH       = 6;
const RESEND_COOLDOWN  = 60; // seconds before the user can request a new code

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD STRENGTH
// ─────────────────────────────────────────────────────────────────────────────

interface StrengthResult {
  score:       number;
  label:       string;
  color:       string;
  pct:         number;
  meetsMinLen: boolean;
}

const STRENGTH_RULES = [
  { label: "12+ characters",   test: (p: string) => p.length >= 12 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number",           test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character",test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pwd: string): StrengthResult {
  if (!pwd) return { score: 0, label: "", color: "#1e293b", pct: 0, meetsMinLen: false };
  const pass  = STRENGTH_RULES.filter(r => r.test(pwd)).length;
  const score = Math.min(pass + (pwd.length >= 16 ? 1 : 0), 5);
  const MAP: [string, string, number][] = [
    ["",           "#1e293b",  0],
    ["Too short",  "#ef4444", 20],
    ["Weak",       "#f97316", 40],
    ["Fair",       "#eab308", 60],
    ["Strong",     "#22c55e", 80],
    ["Excellent",  "#22d3ee",100],
  ];
  const [label, color, pct] = MAP[score];
  return { score, label, color, pct, meetsMinLen: pwd.length >= 12 };
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("email not confirmed"))
    return "Please confirm your email first. Enter the 6-digit code we sent you.";
  if (m.includes("token has expired") || m.includes("otp expired") ||
      m.includes("invalid otp")       || m.includes("token expired") ||
      m.includes("email link is invalid") || m.includes("otp") )
    return "That code is incorrect or has expired. Please try again or request a new one.";
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Incorrect email or password. Double-check and try again.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("email rate limit") || m.includes("rate limit") || m.includes("too many requests"))
    return "Too many attempts. Please wait a few minutes before trying again.";
  if (m.includes("password should be at least"))
    return "Password must be at least 12 characters long.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Please enter a valid email address.";
  if (m.includes("signup is disabled"))
    return "New account creation is temporarily disabled.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Check your connection and try again.";
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const FF   = "'Nunito', system-ui";
const MONO = "'Orbitron', monospace";

function css(s: CSSProperties): CSSProperties { return s; }

const gradientText: CSSProperties = {
  background:           "linear-gradient(135deg,#22d3ee,#a78bfa)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

// Keyframes injected once at module level
const AUTH_STYLES = `
  @keyframes auth-shake {
    0%,100%{ transform:translateX(0) }
    15%    { transform:translateX(-6px) }
    30%    { transform:translateX(6px) }
    45%    { transform:translateX(-4px) }
    60%    { transform:translateX(4px) }
    75%    { transform:translateX(-2px) }
    90%    { transform:translateX(2px) }
  }
  @keyframes auth-spin { to { transform:rotate(360deg) } }
  @keyframes auth-pop  {
    0%  { opacity:0; transform:scale(.5) }
    80% { transform:scale(1.1) }
    100%{ opacity:1; transform:scale(1) }
  }
  @keyframes auth-slide-up {
    from { opacity:0; transform:translateY(10px) }
    to   { opacity:1; transform:translateY(0) }
  }
  @keyframes auth-glow-pulse {
    0%,100%{ box-shadow: 0 0 0 0 #22d3ee00 }
    50%    { box-shadow: 0 0 18px 2px #22d3ee30 }
  }
  .auth-digit-box {
    caret-color: transparent;
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .auth-digit-box:focus {
    outline: none;
    border-color: #22d3ee !important;
    box-shadow: 0 0 0 3px #22d3ee22, 0 0 14px #22d3ee25;
    background: #0d1628 !important;
  }
  .auth-digit-box.filled {
    border-color: #a78bfa;
    background: #12102a !important;
  }
  .auth-digit-box.error-shake {
    animation: auth-shake .45s ease;
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px #ef444422 !important;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// FIELD WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={css({ display:"flex", alignItems:"center", gap:5,
        color:"#64748b", fontSize:11, fontWeight:700, fontFamily:MONO,
        letterSpacing:.8, marginBottom:7, textTransform:"uppercase" as const })}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT INPUT
// ─────────────────────────────────────────────────────────────────────────────

function TextInput({
  type, value, onChange, placeholder, disabled, autoComplete,
}: {
  type: string; value: string; onChange: (v: string) => void;
  placeholder: string; disabled?: boolean; autoComplete?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled} autoComplete={autoComplete}
      style={css({ width:"100%", background:"#0a0f1e", border:"1.5px solid #1e3a5f",
        borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontFamily:FF,
        fontSize:14, outline:"none", opacity:disabled ? .5 : 1, transition:"border-color .2s" })}
      onFocus={e => { e.currentTarget.style.borderColor = "#22d3ee"; }}
      onBlur={e  => { e.currentTarget.style.borderColor = "#1e3a5f"; }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD INPUT
// ─────────────────────────────────────────────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder = "Enter password", disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input
        type={show ? "text" : "password"} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} autoComplete="current-password"
        style={css({ width:"100%", background:"#0a0f1e", border:"1.5px solid #1e3a5f",
          borderRadius:10, padding:"11px 42px 11px 14px", color:"#e2e8f0", fontFamily:FF,
          fontSize:14, outline:"none", opacity:disabled ? .5 : 1, transition:"border-color .2s" })}
        onFocus={e => { e.currentTarget.style.borderColor = "#22d3ee"; }}
        onBlur={e  => { e.currentTarget.style.borderColor = "#1e3a5f"; }}
      />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide" : "Show"}
        style={css({ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
          background:"none", border:"none", cursor:"pointer", color:"#475569",
          padding:0, display:"flex", alignItems:"center" })}>
        {show ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD STRENGTH METER
// ─────────────────────────────────────────────────────────────────────────────

function PasswordStrengthMeter({ password }: { password: string }) {
  const s = getStrength(password);
  if (!password) return null;
  return (
    <div style={css({ marginTop:8 })}>
      <div style={css({ display:"flex", alignItems:"center", gap:8, marginBottom:6 })}>
        <div style={css({ flex:1, height:4, background:"#1e293b", borderRadius:2, overflow:"hidden" })}>
          <div style={css({ height:"100%", width:`${s.pct}%`, background:s.color,
            borderRadius:2, transition:"width .4s ease, background .4s ease" })}/>
        </div>
        {s.label && (
          <span style={{ fontSize:10, fontWeight:800, color:s.color, fontFamily:MONO,
            minWidth:56, textAlign:"right" as const }}>
            {s.label}
          </span>
        )}
      </div>
      <div style={css({ display:"flex", flexDirection:"column", gap:3 })}>
        {STRENGTH_RULES.map(rule => {
          const passed = rule.test(password);
          return (
            <div key={rule.label} style={css({ display:"flex", alignItems:"center", gap:5,
              fontSize:11, fontFamily:FF, color:passed ? "#22d3ee" : "#334155", transition:"color .2s" })}>
              {passed
                ? <Check size={11} color="#22d3ee"/>
                : <div style={{ width:11, height:11, borderRadius:"50%",
                    border:"1.5px solid #334155", flexShrink:0 }}/>
              }
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-DIGIT OTP INPUT GRID  (Req 2 + 3)
// ─────────────────────────────────────────────────────────────────────────────

interface OtpGridProps {
  digits:     string[];                    // controlled array of OTP_LENGTH strings
  onChange:   (digits: string[]) => void;  // called on every keystroke
  onComplete: () => void;                  // called when all boxes are filled
  disabled?:  boolean;
  shake?:     boolean;                     // trigger shake animation on error
  containerRef: React.RefObject<HTMLDivElement | null>; // lets parent control shake class
}

function OtpGrid({ digits, onChange, onComplete, disabled, shake, containerRef }: OtpGridProps) {
  // One ref per box stored in a stable mutable container (avoids calling useRef N times)
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  // Auto-focus box 0 when the grid mounts (Req 3 — initial focus)
  useEffect(() => {
    const firstEmpty = digits.findIndex(d => d === "");
    const target     = firstEmpty === -1 ? OTP_LENGTH - 1 : firstEmpty;
    inputRefs.current[target]?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  function focusBox(index: number) {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index] !== "") {
        // Clear the current box
        const next = [...digits];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        // Already empty — clear previous box and move back
        const next = [...digits];
        next[index - 1] = "";
        onChange(next);
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    } else if (e.key === "Enter") {
      // Allow submitting by pressing Enter on the last box
      const token = digits.join("");
      if (token.length === OTP_LENGTH) onComplete();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const raw   = e.target.value;
    // Accept only the last character typed (handles cases where browser appends to value)
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const next      = [...digits];
    next[index]     = digit;
    onChange(next);

    // Req 3 — auto-advance to next box
    if (index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    } else {
      // Last box filled — blur and trigger auto-submit
      inputRefs.current[index]?.blur();
      const token = next.join("");
      if (token.length === OTP_LENGTH) onComplete();
    }
  }

  // Handle paste across boxes — e.g. user pastes "482031" from clipboard
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = [...digits];
    let   lastFilled = startIndex;

    for (let i = 0; i < pasted.length; i++) {
      const boxIndex = startIndex + i;
      if (boxIndex >= OTP_LENGTH) break;
      next[boxIndex] = pasted[i];
      lastFilled     = boxIndex;
    }
    onChange(next);

    // Focus the box after the last pasted digit (or last box)
    const focusTarget = Math.min(lastFilled + 1, OTP_LENGTH - 1);
    focusBox(focusTarget);

    // Auto-submit if all boxes were filled by the paste
    const token = next.join("");
    if (token.length === OTP_LENGTH && !next.includes("")) {
      setTimeout(onComplete, 80); // small delay lets state settle
    }
  }

  return (
    <div
      ref={containerRef}
      style={css({ display:"flex", gap:10, justifyContent:"center" })}
    >
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}        // allow 2 so we can detect the new character in handleInput
          value={digits[i]}
          disabled={disabled}
          className={[
            "auth-digit-box",
            digits[i] ? "filled" : "",
            shake      ? "error-shake" : "",
          ].filter(Boolean).join(" ")}
          onChange={e  => handleInput(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={e   => handlePaste(e, i)}
          onFocus={e   => e.currentTarget.select()} // select so next digit replaces current
          aria-label={`Digit ${i + 1}`}
          style={css({
            width:        52,
            height:       58,
            textAlign:    "center",
            fontSize:     22,
            fontWeight:   800,
            fontFamily:   MONO,
            background:   "#0a0f1e",
            border:       `1.5px solid ${digits[i] ? "#a78bfa55" : "#1e3a5f"}`,
            borderRadius: 12,
            color:        "#e2e8f0",
            opacity:      disabled ? .5 : 1,
            flexShrink:   0,
          })}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEND COOLDOWN HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useResendCooldown(startImmediately = false) {
  const [seconds, setSeconds] = useState(startImmediately ? RESEND_COOLDOWN : 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setSeconds(RESEND_COOLDOWN);
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [seconds]);

  return { seconds, canResend: seconds === 0, startCooldown };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDFLARE TURNSTILE PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────
// To activate:
//   1. npm i @marsidev/react-turnstile
//   2. Add VITE_TURNSTILE_SITE_KEY=<your-site-key> to .env
//   3. Replace this component with:
//        import { Turnstile } from "@marsidev/react-turnstile"
//        <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken}/>
//      Then gate the submit handler on `!!turnstileToken`.

function TurnstilePlaceholder() {
  return (
    <div id="cf-turnstile-placeholder" style={css({
      minHeight:65, border:"1.5px dashed #1e3a5f", borderRadius:10,
      display:"flex", alignItems:"center", justifyContent:"center",
      gap:8, color:"#334155", fontSize:11, fontFamily:FF,
      fontWeight:700, background:"#0a0f1e" })}>
      <Shield size={14} color="#334155"/>
      Cloudflare Turnstile renders here
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BANNER
// ─────────────────────────────────────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={css({ background:"#ef444412", border:"1px solid #ef444440", borderRadius:10,
      padding:"10px 14px", display:"flex", alignItems:"flex-start", gap:8,
      color:"#fca5a5", fontSize:12, fontFamily:FF, lineHeight:1.6,
      animation:"auth-slide-up .3s ease" })}>
      <AlertCircle size={15} color="#f87171" style={{ flexShrink:0, marginTop:1 }}/>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function SubmitBtn({
  loading, disabled, children, onClick,
}: {
  loading: boolean; disabled?: boolean; children: React.ReactNode; onClick: () => void;
}) {
  const inactive = loading || disabled;
  return (
    <button type="button" onClick={onClick} disabled={inactive}
      style={css({ width:"100%", background: inactive
          ? "#1e293b"
          : "linear-gradient(135deg,#22d3ee,#a78bfa)",
        border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:800,
        color: inactive ? "#475569" : "#080c14", cursor: inactive ? "not-allowed" : "pointer",
        fontFamily:FF, display:"flex", alignItems:"center", justifyContent:"center",
        gap:8, transition:"all .25s" })}>
      {loading
        ? <><RotateCcw size={15} style={{ animation:"auth-spin 1s linear infinite" }}/> Processing…</>
        : children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUTH COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface AuthProps {
  onShowLanding?: () => void;
}

export function Auth({ onShowLanding }: AuthProps) {
  // ── Inject styles once ────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("auth-styles")) return;
    const el   = document.createElement("style");
    el.id      = "auth-styles";
    el.textContent = AUTH_STYLES;
    document.head.appendChild(el);
  }, []);

  // ── Mode / step / method ──────────────────────────────────────────────────
  const [mode,         setMode]         = useState<AuthMode>("sign-in");
  const [step,         setStep]         = useState<AuthStep>("form");
  const [signInMethod, setSignInMethod] = useState<SignInMethod>("password");

  // Req 1 — tracks which Supabase flow produced the OTP code
  const [otpOrigin, setOtpOrigin] = useState<OtpOrigin>("signup");

  // ── Form fields ───────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  // Req 2 — 6-digit OTP state (array keeps each box independent)
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));

  // ── OTP grid shake animation ──────────────────────────────────────────────
  const [shaking, setShaking]   = useState(false);
  const gridRef  = useRef<HTMLDivElement>(null);

  // ── Async ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Resend cooldown ───────────────────────────────────────────────────────
  const { seconds: cooldown, canResend, startCooldown } = useResendCooldown();

  // ── Derived ───────────────────────────────────────────────────────────────
  const strength        = getStrength(password);
  const canSubmitSignUp = email.trim().length > 0 && strength.meetsMinLen;
  const canSubmitSignIn = email.trim().length > 0 && (signInMethod === "otp" || password.length > 0);
  const otpToken        = otpDigits.join("");
  const otpComplete     = otpToken.length === OTP_LENGTH && !otpDigits.includes("");

  // ── Helpers ───────────────────────────────────────────────────────────────
  function switchMode(m: AuthMode) {
    setMode(m); setStep("form");
    setError(null); setPassword("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
  }

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  function resetOtpGrid() {
    setOtpDigits(Array(OTP_LENGTH).fill(""));
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  async function handleSignUp() {
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) { setError(friendlyError(err.message)); return; }

    // Req 1 — enter OTP mode; Supabase sent the 6-digit {{ .Token }} via Resend
    setOtpOrigin("signup");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    setStep("otp-verify");
    startCooldown();
  }

  // ── Sign In — password ────────────────────────────────────────────────────
  async function handlePasswordSignIn() {
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    setLoading(false);
    if (err) setError(friendlyError(err.message));
    // On success → onAuthStateChange in App.tsx handles routing automatically
  }

  // ── Sign In — OTP / Magic Link ────────────────────────────────────────────
  async function handleOtpSignIn() {
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) { setError(friendlyError(err.message)); return; }

    // Req 1 — enter OTP mode for sign-in code
    setOtpOrigin("signin");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    setStep("otp-verify");
    startCooldown();
  }

  // ── Verify OTP  (Req 4) ───────────────────────────────────────────────────
  async function handleVerifyOtp() {
    if (!otpComplete) return;
    setLoading(true); setError(null);

    // type: 'signup'  — for email confirmation after sign-up
    // type: 'email'   — for magic-link / OTP sign-in
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpToken,
      type:  otpOrigin === "signup" ? "signup" : "email",
    });

    setLoading(false);

    if (err) {
      setError(friendlyError(err.message));
      triggerShake();
      resetOtpGrid();
      // Re-focus first box after clearing so user can retype immediately
      return;
    }
    // On success → supabase.auth.onAuthStateChange fires in App.tsx → routes to game
  }

  // ── Resend code ───────────────────────────────────────────────────────────
  async function handleResend() {
    if (!canResend) return;
    setLoading(true); setError(null); resetOtpGrid();

    if (otpOrigin === "signup") {
      // Re-trigger the sign-up email (Supabase resends the confirmation OTP)
      await supabase.auth.resend({ type: "signup", email: email.trim() });
    } else {
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
    }

    setLoading(false);
    startCooldown();
  }

  // ── Form dispatch ─────────────────────────────────────────────────────────
  function handleFormSubmit() {
    if (mode === "sign-up")                            return handleSignUp();
    if (mode === "sign-in" && signInMethod === "otp")  return handleOtpSignIn();
    return handlePasswordSignIn();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={css({ minHeight:"100vh", background:"linear-gradient(160deg,#080c20,#0a0f1a)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"32px 16px", fontFamily:FF })}>

      {/* Grid background */}
      <div style={css({ position:"fixed", inset:0,
        backgroundImage:`linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px),
          linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px)`,
        backgroundSize:"52px 52px", zIndex:0, pointerEvents:"none" })}/>

      {/* Glow blobs */}
      <div style={css({ position:"fixed", top:"15%", right:"10%", width:380, height:380,
        borderRadius:"50%", background:"radial-gradient(circle,#a78bfa0c,transparent 70%)",
        zIndex:0, pointerEvents:"none" })}/>
      <div style={css({ position:"fixed", bottom:"15%", left:"8%", width:320, height:320,
        borderRadius:"50%", background:"radial-gradient(circle,#22d3ee0a,transparent 70%)",
        zIndex:0, pointerEvents:"none" })}/>

      {/* Card */}
      <div style={css({ position:"relative", zIndex:1, width:"100%", maxWidth:420,
        background:"#0a0f1e", border:"1px solid #1e293b", borderRadius:24,
        padding:"32px 28px", animation:"auth-slide-up .5s ease" })}>

        {/* Back to landing */}
        {onShowLanding && step === "form" && (
          <button onClick={onShowLanding}
            style={css({ background:"none", border:"none", cursor:"pointer", color:"#475569",
              fontSize:11, fontFamily:FF, fontWeight:700, display:"flex", alignItems:"center",
              gap:4, marginBottom:20, padding:0, transition:"color .2s" })}
            onMouseEnter={e=>(e.currentTarget.style.color="#22d3ee")}
            onMouseLeave={e=>(e.currentTarget.style.color="#475569")}>
            ← Back to home
          </button>
        )}

        {/* Logo */}
        <div style={css({ textAlign:"center", marginBottom:24 })}>
          <div style={{ fontSize:38, marginBottom:6, animation:"cp-float 3s ease-in-out infinite",
            display:"inline-block" }}>🐣</div>
          <h1 style={{ fontFamily:MONO, fontSize:18, fontWeight:900, margin:"0 0 4px", ...gradientText }}>
            CODE PET
          </h1>
          <p style={css({ color:"#475569", fontSize:12, margin:0 })}>
            {step === "otp-verify"
              ? `Code sent to ${email}`
              : mode === "sign-up" ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {/* ── OTP VERIFY VIEW  (Req 2) ──────────────────────────────────── */}
        {step === "otp-verify" && (
          <div style={css({ display:"flex", flexDirection:"column", gap:20,
            animation:"auth-slide-up .4s ease" })}>

            {/* Header row */}
            <div style={css({ textAlign:"center" })}>
              <div style={css({ display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:52, height:52, borderRadius:"50%",
                background:"linear-gradient(135deg,#22d3ee18,#a78bfa18)",
                border:"1px solid #22d3ee30", marginBottom:12 })}>
                <Hash size={22} color="#22d3ee"/>
              </div>
              <p style={css({ color:"#64748b", fontSize:13, margin:0, lineHeight:1.6, fontFamily:FF })}>
                Enter the <strong style={{ color:"#e2e8f0" }}>6-digit code</strong> we sent to your inbox.
                <br/>
                <span style={{ fontSize:11, color:"#475569" }}>Expires in 10 minutes. Check spam if missing.</span>
              </p>
            </div>

            {/* Req 2 + 3 — 6-box digit grid */}
            <OtpGrid
              digits={otpDigits}
              onChange={setOtpDigits}
              onComplete={handleVerifyOtp}
              disabled={loading}
              shake={shaking}
              containerRef={gridRef}
            />

            {/* Error banner */}
            {error && <ErrorBanner msg={error}/>}

            {/* Verify button */}
            <SubmitBtn
              loading={loading}
              disabled={!otpComplete}
              onClick={handleVerifyOtp}
            >
              <CheckCircle2 size={15}/> Verify Code
            </SubmitBtn>

            {/* Resend + back row */}
            <div style={css({ display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:8, flexWrap:"wrap" })}>

              {/* Back button */}
              <button type="button"
                onClick={() => { setStep("form"); setError(null); resetOtpGrid(); }}
                style={css({ background:"none", border:"none", cursor:"pointer", color:"#475569",
                  fontSize:11, fontFamily:FF, fontWeight:700, display:"flex", alignItems:"center",
                  gap:4, padding:0, transition:"color .2s" })}
                onMouseEnter={e=>(e.currentTarget.style.color="#22d3ee")}
                onMouseLeave={e=>(e.currentTarget.style.color="#475569")}>
                <ArrowLeft size={12}/> Change email
              </button>

              {/* Resend */}
              {canResend ? (
                <button type="button" onClick={handleResend} disabled={loading}
                  style={css({ background:"none", border:"none", cursor:loading?"not-allowed":"pointer",
                    color:loading?"#334155":"#22d3ee", fontSize:11, fontFamily:FF,
                    fontWeight:700, display:"flex", alignItems:"center", gap:4, padding:0,
                    transition:"color .2s", opacity:loading ? .5 : 1 })}>
                  <Sparkles size={12}/> Resend code
                </button>
              ) : (
                <div style={css({ display:"flex", alignItems:"center", gap:4,
                  color:"#334155", fontSize:11, fontFamily:FF, fontWeight:700 })}>
                  <Timer size={11}/>
                  Resend in {cooldown}s
                </div>
              )}
            </div>

            {/* Progress dots — visual indicator of filled boxes */}
            <div style={css({ display:"flex", justifyContent:"center", gap:5 })}>
              {Array.from({ length: OTP_LENGTH }, (_, i) => (
                <div key={i} style={css({
                  width:     6, height:6, borderRadius:"50%",
                  background: otpDigits[i] ? "#a78bfa" : "#1e293b",
                  transition: "background .2s",
                })}/>
              ))}
            </div>

          </div>
        )}

        {/* ── FORM VIEW ─────────────────────────────────────────────────── */}
        {step === "form" && (
          <>
            {/* Mode toggle */}
            <div style={css({ display:"flex", background:"#060a14", borderRadius:12,
              padding:4, marginBottom:24, border:"1px solid #1e293b" })}>
              {(["sign-in","sign-up"] as AuthMode[]).map(m => (
                <button key={m} type="button" onClick={() => switchMode(m)}
                  style={css({ flex:1,
                    background: mode===m ? "linear-gradient(135deg,#22d3ee20,#a78bfa20)" : "transparent",
                    border:`1px solid ${mode===m ? "#22d3ee40" : "transparent"}`,
                    borderRadius:9, padding:"9px 4px",
                    color: mode===m ? "#e2e8f0" : "#475569",
                    fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:FF, transition:"all .2s" })}>
                  {m === "sign-in" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <div style={css({ display:"flex", flexDirection:"column", gap:16 })}>

              {/* Sign-in method toggle */}
              {mode === "sign-in" && (
                <div style={css({ display:"flex", gap:8, marginBottom:2 })}>
                  {([
                    ["password", <Lock     size={12}/>, "Password"],
                    ["otp",      <Sparkles size={12}/>, "Magic Code"],
                  ] as [SignInMethod, React.ReactNode, string][]).map(([m, icon, label]) => (
                    <button key={m} type="button"
                      onClick={() => { setSignInMethod(m); setError(null); }}
                      style={css({ flex:1, display:"flex", alignItems:"center",
                        justifyContent:"center", gap:5,
                        background:   signInMethod===m ? "#22d3ee12" : "transparent",
                        border:       `1px solid ${signInMethod===m ? "#22d3ee50" : "#1e3a5f"}`,
                        borderRadius: 10, padding:"8px 4px",
                        color:        signInMethod===m ? "#22d3ee" : "#475569",
                        fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:FF, transition:"all .2s" })}>
                      {icon}{label}
                    </button>
                  ))}
                </div>
              )}

              {/* Email */}
              <Field label="Email Address" icon={<Mail size={11}/>}>
                <TextInput type="email" value={email} onChange={setEmail}
                  placeholder="you@example.com" disabled={loading} autoComplete="email"/>
              </Field>

              {/* Password (hidden for sign-in OTP) */}
              {(mode === "sign-up" || signInMethod === "password") && (
                <Field label="Password" icon={<Lock size={11}/>}>
                  <PasswordInput
                    value={password} onChange={setPassword}
                    placeholder={mode === "sign-up" ? "Min. 12 characters" : "Enter your password"}
                    disabled={loading}/>
                  {mode === "sign-up" && <PasswordStrengthMeter password={password}/>}
                </Field>
              )}

              {/* Security chips */}
              <div style={css({ display:"flex", gap:6, flexWrap:"wrap" })}>
                {([
                  [<Shield       size={10}/>, "End-to-end encrypted"],
                  [<KeyRound     size={10}/>, mode==="sign-up" ? "12-char minimum" : "Code expires in 10 min"],
                  [<CheckCircle2 size={10}/>, "No spam, ever"],
                ] as [React.ReactNode, string][]).map(([icon, text]) => (
                  <div key={text} style={css({ display:"flex", alignItems:"center", gap:4,
                    background:"#ffffff06", border:"1px solid #1e293b", borderRadius:8,
                    padding:"4px 9px", color:"#334155", fontSize:10, fontFamily:FF, fontWeight:700 })}>
                    <span style={{ color:"#22d3ee" }}>{icon}</span>{text}
                  </div>
                ))}
              </div>

              {/* Turnstile */}
              <TurnstilePlaceholder/>

              {/* Error */}
              {error && <ErrorBanner msg={error}/>}

              {/* Submit */}
              <SubmitBtn
                loading={loading}
                disabled={mode === "sign-up" ? !canSubmitSignUp : !canSubmitSignIn}
                onClick={handleFormSubmit}
              >
                {mode === "sign-up"
                  ? <><Zap       size={14}/> Create Account</>
                  : signInMethod === "otp"
                    ? <><Sparkles size={14}/> Send 6-Digit Code</>
                    : <><ArrowRight size={14}/> Sign In</>
                }
              </SubmitBtn>

              {/* Footer hint */}
              <p style={css({ textAlign:"center", fontSize:12, color:"#334155", margin:0, fontFamily:FF })}>
                {mode === "sign-up"
                  ? <>Already have an account?{" "}
                      <button type="button" onClick={() => switchMode("sign-in")}
                        style={css({ background:"none", border:"none", cursor:"pointer",
                          color:"#22d3ee", fontWeight:700, fontSize:12, fontFamily:FF, padding:0 })}>
                        Sign in
                      </button>
                    </>
                  : <>No account yet?{" "}
                      <button type="button" onClick={() => switchMode("sign-up")}
                        style={css({ background:"none", border:"none", cursor:"pointer",
                          color:"#22d3ee", fontWeight:700, fontSize:12, fontFamily:FF, padding:0 })}>
                        Create one
                      </button>
                    </>
                }
              </p>

            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;