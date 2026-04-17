// src/App.tsx
// Code Pet — Vite + React + TypeScript
// Requires: lucide-react, @supabase/supabase-js

import { useState, useEffect } from "react";
import type { ReactNode, CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Settings,
  Flame,
  Zap,
  Clock,
  GitCommit,
  Code2,
  BookOpen,
  Bug,
  Eye,
  Rocket,
  RefreshCw,
  Trophy,
  BarChart2,
  CheckSquare,
  Inbox,
  Code2 as Github,
  User as Linkedin,
  Menu,
  X,
  Star,
  TrendingUp,
  Cpu,
  ShieldCheck,
  ChevronRight,
  ArrowDown,
  Layers,
  Target,
  LogOut,        // ← new: sign-out icon in game header
  UserCircle2,   // ← new: user avatar chip
} from "lucide-react";

// ── new imports ───────────────────────────────────────────────────────────────
import { supabase }  from "./lib/supabaseClient";
import { Auth }      from "./components/Auth";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────

function useGlobalStyles(): void {
  useEffect(() => {
    if (document.getElementById("cp-styles")) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Nunito:wght@400;600;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.id = "cp-styles";
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html { scroll-behavior: smooth; }

      @keyframes cp-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes cp-breathe { 0%,100%{transform:scale(1)}      50%{transform:scale(1.07)} }
      @keyframes cp-twinkle {
        0%,100%{opacity:0;transform:translate(-50%,-50%) scale(0)}
        50%    {opacity:1;transform:translate(-50%,-50%) scale(1)}
      }
      @keyframes cp-slideUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes cp-slideIn  { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
      @keyframes cp-popIn    { 0%{opacity:0;transform:scale(0.4)} 80%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
      @keyframes cp-xpFly    { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-44px)} }
      @keyframes cp-pulse    { 0%,100%{box-shadow:0 0 22px #22d3ee40} 50%{box-shadow:0 0 38px #22d3ee70} }
      @keyframes cp-gridFade { from{opacity:0} to{opacity:1} }
      @keyframes cp-shimmer  {
        0%  { background-position: -200% center; }
        100%{ background-position:  200% center; }
      }
      @keyframes cp-spin { to { transform: rotate(360deg); } }

      ::-webkit-scrollbar           { width:4px; }
      ::-webkit-scrollbar-track     { background:#080c14; }
      ::-webkit-scrollbar-thumb     { background:#1e3a5f; border-radius:2px; }
      input[type=number]::-webkit-inner-spin-button { opacity:.3; }

      .cp-nav-link {
        color:#94a3b8; font-size:13px; font-weight:700;
        text-decoration:none; transition:color .2s;
        font-family:'Nunito',system-ui;
        background:none; border:none; cursor:pointer; padding:0;
        display:inline-flex; align-items:center; gap:5px;
      }
      .cp-nav-link:hover { color:#22d3ee; }

      .cp-feat-card { transition: transform .25s, box-shadow .25s, border-color .25s; }
      .cp-feat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 0 28px #22d3ee18;
        border-color: #22d3ee55 !important;
      }

      .cp-stage-row { transition: all .25s; cursor:default; }
      .cp-stage-row:hover { background: var(--stage-bg) !important; border-color: var(--stage-border) !important; }

      .cp-cta-btn {
        background: linear-gradient(135deg,#22d3ee,#a78bfa);
        border: none; border-radius: 14px; padding: 15px 38px;
        font-size: 15px; font-weight: 800; color: #080c14;
        cursor: pointer; font-family:'Nunito',system-ui;
        display: inline-flex; align-items: center; gap: 8px;
        animation: cp-pulse 2.4s ease-in-out infinite;
        transition: transform .15s; white-space: nowrap;
      }
      .cp-cta-btn:hover  { transform: scale(1.04); }
      .cp-cta-btn:active { transform: scale(.97);  }

      .cp-ghost-btn {
        background: transparent;
        border: 1px solid #1e3a5f; border-radius: 14px;
        padding: 14px 28px; font-size: 14px; font-weight: 700;
        color: #94a3b8; cursor: pointer; font-family:'Nunito',system-ui;
        display: inline-flex; align-items: center; gap: 8px;
        transition: border-color .2s, color .2s; white-space: nowrap;
      }
      .cp-ghost-btn:hover { border-color:#22d3ee55; color:#22d3ee; }
    `;
    document.head.appendChild(style);
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TYPESCRIPT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

type PetCategory    = "Domestic" | "Wild" | "Bird" | "Marine" | "Mythical";
type FilterCategory = "All" | PetCategory;
type MoodKey        = "excited" | "happy" | "sleepy" | "sad" | "tired";
type TabKey         = "habits" | "session" | "history";

// ── "auth" added alongside "landing" ─────────────────────────────────────────
type ScreenKey = "loading" | "landing" | "auth" | "welcome" | "select" | "game";

interface Pet {
  id:       string;
  name:     string;
  emoji:    string;
  category: PetCategory;
  color:    string;
}
interface Stage {
  id:    number;
  name:  string;
  icon:  string;
  xpMin: number;
  glow:  string;
}
interface Habit {
  id:    string;
  label: string;
  icon:  ReactNode;
  xp:    number;
}
interface HabitLog {
  date:      string;
  hours:     number;
  commits:   number;
  checklist: string[];
}
interface MoodState {
  emoji: string;
  label: string;
  color: string;
  desc:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PETS: Pet[] = [
  { id:"cat",      name:"Cat",          emoji:"🐱", category:"Domestic", color:"#f97316" },
  { id:"dog",      name:"Dog",          emoji:"🐶", category:"Domestic", color:"#d97706" },
  { id:"rabbit",   name:"Rabbit",       emoji:"🐰", category:"Domestic", color:"#ec4899" },
  { id:"hamster",  name:"Hamster",      emoji:"🐹", category:"Domestic", color:"#f59e0b" },
  { id:"wolf",     name:"Wolf",         emoji:"🐺", category:"Wild",     color:"#6b7280" },
  { id:"fox",      name:"Fox",          emoji:"🦊", category:"Wild",     color:"#ea580c" },
  { id:"tiger",    name:"Tiger",        emoji:"🐯", category:"Wild",     color:"#ca8a04" },
  { id:"lion",     name:"Lion",         emoji:"🦁", category:"Wild",     color:"#b45309" },
  { id:"panda",    name:"Panda",        emoji:"🐼", category:"Wild",     color:"#64748b" },
  { id:"bear",     name:"Bear",         emoji:"🐻", category:"Wild",     color:"#92400e" },
  { id:"leopard",  name:"Snow Leopard", emoji:"🐆", category:"Wild",     color:"#94a3b8" },
  { id:"raccoon",  name:"Raccoon",      emoji:"🦝", category:"Wild",     color:"#475569" },
  { id:"capybara", name:"Capybara",     emoji:"🦫", category:"Wild",     color:"#a16207" },
  { id:"deer",     name:"Deer",         emoji:"🦌", category:"Wild",     color:"#92400e" },
  { id:"dragon",   name:"Dragon",       emoji:"🐉", category:"Mythical", color:"#7c3aed" },
  { id:"phoenix",  name:"Phoenix",      emoji:"🔥", category:"Mythical", color:"#dc2626" },
  { id:"owl",      name:"Owl",          emoji:"🦉", category:"Bird",     color:"#78350f" },
  { id:"parrot",   name:"Parrot",       emoji:"🦜", category:"Bird",     color:"#16a34a" },
  { id:"eagle",    name:"Eagle",        emoji:"🦅", category:"Bird",     color:"#92400e" },
  { id:"octopus",  name:"Octopus",      emoji:"🐙", category:"Marine",   color:"#8b5cf6" },
  { id:"shark",    name:"Shark",        emoji:"🦈", category:"Marine",   color:"#0891b2" },
  { id:"otter",    name:"Otter",        emoji:"🦦", category:"Marine",   color:"#b45309" },
];

const STAGES: Stage[] = [
  { id:0, name:"Egg",       icon:"🥚", xpMin:0,    glow:"#64748b" },
  { id:1, name:"Baby",      icon:"🌱", xpMin:100,  glow:"#22c55e" },
  { id:2, name:"Juvenile",  icon:"⚡", xpMin:300,  glow:"#3b82f6" },
  { id:3, name:"Adult",     icon:"💪", xpMin:600,  glow:"#a78bfa" },
  { id:4, name:"Legendary", icon:"✨", xpMin:1000, glow:"#fbbf24" },
];

const HABITS: Habit[] = [
  { id:"coded",    label:"Wrote code today",         icon:<Code2     size={15}/>, xp:15 },
  { id:"commits",  label:"Pushed commits",            icon:<GitCommit size={15}/>, xp:15 },
  { id:"learned",  label:"Learned something new",     icon:<BookOpen  size={15}/>, xp:15 },
  { id:"bug",      label:"Fixed a bug",               icon:<Bug       size={15}/>, xp:10 },
  { id:"reviewed", label:"Reviewed or read code",     icon:<Eye       size={15}/>, xp:10 },
  { id:"shipped",  label:"Built or shipped something", icon:<Rocket    size={15}/>, xp:20 },
];

const MOODS: Record<MoodKey, MoodState> = {
  excited:{ emoji:"🤩", label:"Pumped Up!",   color:"#f59e0b", desc:"You're absolutely crushing it!" },
  happy:  { emoji:"😊", label:"Happy",        color:"#22c55e", desc:"Looking great, keep it up!" },
  sleepy: { emoji:"😴", label:"Sleepy…",      color:"#94a3b8", desc:"No code today yet — wake me up!" },
  sad:    { emoji:"😢", label:"Missing you…", color:"#60a5fa", desc:"It's been too long. Come back!" },
  tired:  { emoji:"😓", label:"Overworked",   color:"#f87171", desc:"Whoa, take a breather!" },
};

const PET_CATEGORIES: FilterCategory[] = ["All","Domestic","Wild","Bird","Marine","Mythical"];

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPABASE DATA LAYER
//    All localStorage code replaced. Supabase manages its own session storage
//    automatically — you don't need to call localStorage yourself.
// ─────────────────────────────────────────────────────────────────────────────

/** Runtime type-guard for HabitLog — used when validating JSONB from Supabase. */
function isHabitLog(v: unknown): v is HabitLog {
  if (typeof v !== "object" || v === null) return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.date    === "string"  &&
    typeof x.hours   === "number"  && Number.isFinite(x.hours)   && x.hours   >= 0 &&
    typeof x.commits === "number"  && Number.isFinite(x.commits) && x.commits >= 0 &&
    Array.isArray(x.checklist)     &&
    (x.checklist as unknown[]).every(i => typeof i === "string")
  );
}

/** Fetch pet row from Supabase for a given user.
 *  Returns null if no row exists (first-time user after sign-up). */
async function fetchPetFromSupabase(
  userId: string
): Promise<{ petId: string; petName: string; logs: HabitLog[] } | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("pet_id, pet_name, logs")
    .eq("user_id", userId)
    .maybeSingle();   // returns null (not an error) when no row found

  if (error) {
    console.error("[CodePet] fetchPet error:", error.message);
    return null;
  }
  if (!data) return null;

  // Validate the JSONB logs array to guard against schema drift.
  const logs: HabitLog[] = Array.isArray(data.logs)
    ? (data.logs as unknown[]).filter(isHabitLog)
    : [];

  return { petId: data.pet_id as string, petName: data.pet_name as string, logs };
}

/** Upsert (create-or-update) the pet row for a user.
 *  Fire-and-forget — call without await when you want optimistic local updates. */
async function savePetToSupabase(
  userId:  string,
  petId:   string,
  petName: string,
  logs:    HabitLog[]
): Promise<void> {
  const { error } = await supabase
    .from("pets")
    .upsert(
      { user_id: userId, pet_id: petId, pet_name: petName, logs },
      { onConflict: "user_id" }   // matches the UNIQUE constraint on user_id
    );
  if (error) console.error("[CodePet] savePet error:", error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getStage(xp: number): Stage {
  for (let i = STAGES.length-1; i >= 0; i--)
    if (xp >= STAGES[i].xpMin) return STAGES[i];
  return STAGES[0];
}
function getMoodKey(logs: HabitLog[]): MoodKey {
  const today      = new Date().toDateString();
  const yesterday  = new Date(Date.now()-86_400_000).toDateString();
  const twoDaysAgo = new Date(Date.now()-172_800_000).toDateString();
  const tl = logs.find(l => l.date === today);
  const rl = logs.find(l => l.date === yesterday || l.date === twoDaysAgo);
  if (!tl && !rl && logs.length > 0) return "sad";
  if (!tl) return "sleepy";
  if (tl.hours >= 7) return "tired";
  if (tl.hours >= 3 || tl.commits >= 5 || tl.checklist.length >= 5) return "excited";
  return "happy";
}
function calcLogXP(log: HabitLog): number {
  const cXP = log.checklist.reduce((s,id) => s+(HABITS.find(h=>h.id===id)?.xp??0), 0);
  return cXP + Math.min(log.hours,8)*20 + Math.min(log.commits,20)*8;
}
function calcTotalXP(logs: HabitLog[]): number { return logs.reduce((s,l)=>s+calcLogXP(l),0); }
function getStreak(logs: HabitLog[]): number {
  let s = 0;
  for (let i=0; i<120; i++) {
    const d = new Date(Date.now()-i*86_400_000).toDateString();
    if (logs.some(l=>l.date===d)) s++;
    else if (i>0) break;
  }
  return s;
}
function getTodayLog(logs: HabitLog[]): HabitLog {
  return logs.find(l=>l.date===new Date().toDateString())
    ?? { date:new Date().toDateString(), hours:0, commits:0, checklist:[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LANDING PAGE
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div style={css({ display:"inline-flex", alignItems:"center", gap:6,
      background:"#22d3ee0e", border:"1px solid #22d3ee25", borderRadius:20, padding:"4px 14px" })}>
      <span style={{ color:"#22d3ee" }}>{icon}</span>
      <span style={{ fontSize:10, fontFamily:MONO, fontWeight:700, color:"#22d3ee", letterSpacing:1.5 }}>{text}</span>
    </div>
  );
}

interface NavProps { onStart:()=>void; scrolled:boolean; menuOpen:boolean; setMenuOpen:(v:boolean)=>void; }

function LandingNav({ onStart, scrolled, menuOpen, setMenuOpen }: NavProps) {
  function scrollTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
  }
  return (
    <nav style={css({
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      background: scrolled ? "rgba(8,12,20,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: `1px solid ${scrolled ? "#ffffff0a" : "transparent"}`,
      transition:"background .3s, border-color .3s",
      padding:"0 24px",
    })}>
      <div style={css({ maxWidth:1100, margin:"0 auto", height:64,
        display:"flex", alignItems:"center", justifyContent:"space-between" })}>
        <div style={css({ display:"flex", alignItems:"center", gap:10 })}>
          <span style={{ fontSize:22 }}>🐣</span>
          <span style={{ fontFamily:MONO, fontSize:14, fontWeight:900, ...gradientText }}>CODE PET</span>
        </div>
        <div style={css({ display:"flex", alignItems:"center", gap:26 })}>
          <button className="cp-nav-link" onClick={()=>scrollTo("how-it-works")}>How it works</button>
          <button className="cp-nav-link" onClick={()=>scrollTo("features")}>Features</button>
          <button className="cp-nav-link" onClick={()=>scrollTo("evolution")}>Evolution</button>
          <div style={css({ width:1, height:16, background:"#1e3a5f" })} />
          <a href="https://github.com"   target="_blank" rel="noopener noreferrer" className="cp-nav-link"><Github   size={13}/> GitHub</a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="cp-nav-link"><Linkedin size={13}/> LinkedIn</a>
          {/* "Start Journey" now routes to the Auth screen */}
          <button onClick={onStart} style={css({
            background:"linear-gradient(135deg,#22d3ee,#a78bfa)",
            border:"none", borderRadius:10, padding:"8px 18px",
            fontSize:12, fontWeight:800, color:"#080c14",
            cursor:"pointer", fontFamily:FF, whiteSpace:"nowrap",
          })}>
            Sign In / Sign Up →
          </button>
        </div>
        <button onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu"
          style={css({ background:"transparent", border:"1px solid #1e3a5f", borderRadius:8,
            padding:"6px 8px", color:"#94a3b8", cursor:"pointer", display:"none" })}>
          {menuOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>
      {menuOpen && (
        <div style={css({ background:"rgba(8,12,20,0.97)", borderTop:"1px solid #1e3a5f",
          padding:"16px 24px 20px", display:"flex", flexDirection:"column", gap:14 })}>
          {([ ["How it works","how-it-works"], ["Features","features"], ["Evolution","evolution"] ] as [string,string][]).map(
            ([label,id]) => <button key={id} className="cp-nav-link" onClick={()=>scrollTo(id)} style={{ textAlign:"left" }}>{label}</button>
          )}
          <a href="https://github.com"  target="_blank" rel="noopener noreferrer" className="cp-nav-link"><Github   size={13}/> GitHub</a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="cp-nav-link"><Linkedin size={13}/> LinkedIn</a>
          <button onClick={onStart} style={css({ background:"linear-gradient(135deg,#22d3ee,#a78bfa)", border:"none", borderRadius:10, padding:"10px 18px", fontSize:13, fontWeight:800, color:"#080c14", cursor:"pointer", fontFamily:FF })}>
            Sign In / Sign Up →
          </button>
        </div>
      )}
    </nav>
  );
}

function HeroSection({ onStart }: { onStart:()=>void }) {
  const floaters = ["🐉","🦊","🐼","🦅","🐙","🦁","🦊","🐯"];
  return (
    <section style={css({ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", position:"relative",
      overflow:"hidden", padding:"120px 24px 80px" })}>
      <div style={css({ position:"absolute", inset:0,
        backgroundImage:`linear-gradient(rgba(34,211,238,0.035) 1px,transparent 1px),
          linear-gradient(90deg,rgba(34,211,238,0.035) 1px,transparent 1px)`,
        backgroundSize:"52px 52px",
        animation:"cp-gridFade 1.4s ease forwards", zIndex:0 })} />
      <div style={css({ position:"absolute", top:"12%", left:"6%", width:440, height:440,
        borderRadius:"50%", background:"radial-gradient(circle,#22d3ee10 0%,transparent 70%)", zIndex:0 })} />
      <div style={css({ position:"absolute", bottom:"18%", right:"5%", width:500, height:500,
        borderRadius:"50%", background:"radial-gradient(circle,#a78bfa0c 0%,transparent 70%)", zIndex:0 })} />
      {floaters.map((e,i) => (
        <div key={i} style={css({ position:"absolute",
          top:`${15 + (i%3)*28}%`, left:`${6 + i*11}%`,
          fontSize:22+i*2, opacity:0.12,
          animation:`cp-float ${3.2+i*0.35}s ease-in-out ${i*0.28}s infinite`,
          zIndex:1, userSelect:"none", filter:"blur(0.4px)" })}>
          {e}
        </div>
      ))}
      <div style={css({ position:"relative", zIndex:2, textAlign:"center", maxWidth:740 })}>
        <div style={css({ display:"inline-flex", alignItems:"center", gap:6,
          background:"#22d3ee12", border:"1px solid #22d3ee30", borderRadius:20,
          padding:"5px 14px", marginBottom:28, animation:"cp-slideIn .6s ease" })}>
          <Star size={11} color="#22d3ee"/>
          <span style={{ fontSize:10, color:"#22d3ee", fontWeight:700, fontFamily:MONO, letterSpacing:1 }}>v1.0 — NOW LIVE</span>
        </div>
        <h1 style={css({ fontFamily:MONO, fontSize:"clamp(40px,8vw,76px)", fontWeight:900,
          lineHeight:1.06, margin:"0 0 10px", letterSpacing:"-1px",
          animation:"cp-slideIn .7s ease .05s both", color:"#e2e8f0" })}>
          CODE<br/><span style={gradientText}>PET</span>
        </h1>
        <p style={css({ fontSize:"clamp(14px,2.2vw,19px)", color:"#64748b", maxWidth:500,
          margin:"0 auto 18px", lineHeight:1.75, fontFamily:FF,
          animation:"cp-slideIn .7s ease .12s both" })}>
          Your code builds more than apps.<br/>
          <span style={{ color:"#94a3b8" }}>Raise a digital companion that <em>evolves</em> with every commit, every hour, every habit.</span>
        </p>
        <div style={css({ fontSize:11, fontFamily:MONO, fontWeight:700, letterSpacing:3, marginBottom:40,
          backgroundImage:"linear-gradient(90deg,#475569 0%,#22d3ee 40%,#a78bfa 60%,#475569 100%)",
          backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          animation:"cp-shimmer 3.5s linear infinite, cp-slideIn .7s ease .18s both" })}>
          22 ANIMALS · 5 EVOLUTION STAGES · REAL-TIME MOODS
        </div>
        <div style={css({ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap",
          animation:"cp-slideIn .7s ease .24s both" })}>
          <button className="cp-cta-btn" onClick={onStart}>
            Start Your Journey <ChevronRight size={17}/>
          </button>
          <a href="#how-it-works" style={{ textDecoration:"none" }}>
            <button className="cp-ghost-btn"><ArrowDown size={15}/> See how it works</button>
          </a>
        </div>
        <div style={css({ display:"flex", alignItems:"center", justifyContent:"center",
          gap:22, marginTop:48, flexWrap:"wrap", animation:"cp-slideIn .7s ease .30s both" })}>
          {([
            [<Flame      size={12} color="#f97316"/>, "Daily streaks"],
            [<TrendingUp size={12} color="#22d3ee"/>, "XP tracking"],
            [<ShieldCheck size={12} color="#22c55e"/>, "Saves to cloud"],
          ] as [ReactNode,string][]).map(([icon,text]) => (
            <div key={text} style={css({ display:"flex", alignItems:"center", gap:5,
              color:"#475569", fontSize:11, fontFamily:FF, fontWeight:700 })}>
              {icon} {text}
            </div>
          ))}
        </div>
      </div>
      <div style={css({ position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)",
        color:"#1e3a5f", animation:"cp-float 2s ease-in-out infinite", zIndex:2 })}>
        <ArrowDown size={18}/>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps: { icon:ReactNode; title:string; body:string; accent:string }[] = [
    { icon:<span style={{ fontSize:30 }}>🐾</span>, title:"1. Create your account",
      body:"Sign up with email and password. Confirm your email, then sign in. Your pet and progress are saved to your account.", accent:"#22d3ee" },
    { icon:<Code2 size={28} color="#a78bfa"/>, title:"2. Code every day",
      body:"Tick your daily habit checklist or log raw hours and commits. Every action earns XP.", accent:"#a78bfa" },
    { icon:<TrendingUp size={28} color="#22c55e"/>, title:"3. Watch it evolve",
      body:"Earn enough XP and your pet transforms visually — from a tiny Egg to a Legendary creature.", accent:"#22c55e" },
    { icon:<span style={{ fontSize:30 }}>🎭</span>, title:"4. Keep it happy",
      body:"Your pet reacts to your real behaviour. Miss a day — it gets sad. Grind too hard — it burns out.", accent:"#f59e0b" },
  ];
  return (
    <section id="how-it-works" style={css({ padding:"96px 24px", position:"relative" })}>
      <div style={css({ maxWidth:1100, margin:"0 auto" })}>
        <div style={css({ textAlign:"center", marginBottom:56 })}>
          <SectionLabel icon={<Layers size={12}/>} text="THE LOOP"/>
          <h2 style={css({ fontFamily:MONO, fontSize:"clamp(22px,4vw,38px)", fontWeight:900, color:"#e2e8f0", margin:"12px 0 12px" })}>How it works</h2>
          <p style={css({ color:"#64748b", fontSize:14, maxWidth:440, margin:"0 auto", lineHeight:1.7, fontFamily:FF })}>A simple loop that makes showing up every day feel worthwhile.</p>
        </div>
        <div style={css({ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:18 })}>
          {steps.map(step => (
            <div key={step.title} className="cp-feat-card"
              style={css({ background:"#0a0f1e", border:"1px solid #1e293b", borderRadius:18, padding:"26px 22px", display:"flex", flexDirection:"column", gap:12 })}>
              <div style={css({ width:52, height:52, borderRadius:14, background:`${step.accent}14`, border:`1px solid ${step.accent}30`, display:"flex", alignItems:"center", justifyContent:"center" })}>
                {step.icon}
              </div>
              <div style={css({ fontSize:14, fontWeight:800, color:"#e2e8f0", fontFamily:FF })}>{step.title}</div>
              <div style={css({ fontSize:13, color:"#64748b", lineHeight:1.65, fontFamily:FF })}>{step.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ onStart }: { onStart:()=>void }) {
  const features: { icon:ReactNode; title:string; body:string; accent:string; badge?:string }[] = [
    { icon:<Zap size={20} color="#fbbf24"/>, title:"XP System",
      body:"Habits: 10–20 XP. Hours coded: +20 XP/hr (max 8h). Commits: +8 XP each (max 20). XP compounds across your entire history.",
      accent:"#fbbf24", badge:"Core mechanic" },
    { icon:<CheckSquare size={20} color="#22d3ee"/>, title:"Daily Habit Checklist",
      body:"Six habits reset at midnight: writing code, pushing commits, learning, fixing bugs, reviewing, and shipping.", accent:"#22d3ee" },
    { icon:<Clock size={20} color="#a78bfa"/>, title:"Manual Session Log",
      body:"Enter raw hours and commit counts to earn XP directly. A live preview shows your gain before you confirm.", accent:"#a78bfa" },
    { icon:<span style={{ fontSize:18 }}>🎭</span>, title:"5 Dynamic Moods",
      body:"Sleepy (no code today), Happy (steady day), Excited (big session), Tired (overworked), Sad (absent 2+ days).", accent:"#f59e0b" },
    { icon:<Flame size={20} color="#f97316"/>, title:"Streak Tracking",
      body:"Log activity on consecutive days to build your streak. A long streak means an excited, thriving companion.", accent:"#f97316" },
    { icon:<ShieldCheck size={20} color="#22c55e"/>, title:"Cloud Save",
      body:"Sign in once — your pet and all history are stored in Supabase, synced across devices, and protected by row-level security.", accent:"#22c55e", badge:"Powered by Supabase" },
  ];
  return (
    <section id="features" style={css({ padding:"96px 24px", background:"#060a14" })}>
      <div style={css({ maxWidth:1100, margin:"0 auto" })}>
        <div style={css({ textAlign:"center", marginBottom:56 })}>
          <SectionLabel icon={<Target size={12}/>} text="FEATURES"/>
          <h2 style={css({ fontFamily:MONO, fontSize:"clamp(22px,4vw,38px)", fontWeight:900, color:"#e2e8f0", margin:"12px 0 12px" })}>Built around your habits</h2>
          <p style={css({ color:"#64748b", fontSize:14, maxWidth:460, margin:"0 auto", lineHeight:1.7, fontFamily:FF })}>Every feature rewards consistency without adding friction to your routine.</p>
        </div>
        <div style={css({ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:14 })}>
          {features.map(f => (
            <div key={f.title} className="cp-feat-card"
              style={css({ background:"#0a0f1e", border:"1px solid #1e293b", borderRadius:18, padding:"22px 20px" })}>
              <div style={css({ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 })}>
                <div style={css({ width:44, height:44, borderRadius:12, background:`${f.accent}14`, border:`1px solid ${f.accent}30`, display:"flex", alignItems:"center", justifyContent:"center" })}>{f.icon}</div>
                {f.badge && <span style={css({ fontSize:9, fontWeight:800, fontFamily:MONO, color:f.accent, background:`${f.accent}15`, border:`1px solid ${f.accent}30`, borderRadius:6, padding:"3px 8px", letterSpacing:.5 })}>{f.badge}</span>}
              </div>
              <div style={css({ fontSize:14, fontWeight:800, color:"#e2e8f0", fontFamily:FF, marginBottom:7 })}>{f.title}</div>
              <div style={css({ fontSize:13, color:"#64748b", lineHeight:1.7, fontFamily:FF })}>{f.body}</div>
            </div>
          ))}
        </div>
        <div style={css({ textAlign:"center", marginTop:52 })}>
          <button className="cp-cta-btn" onClick={onStart}>Pick your pet <ChevronRight size={16}/></button>
        </div>
      </div>
    </section>
  );
}

function EvolutionSection({ onStart }: { onStart:()=>void }) {
  const [hovered, setHovered] = useState<number|null>(null);
  const descs = [
    "Every legend starts here. Your egg is waiting for its first commit.",
    "Your pet hatches! Small but full of energy. Keep the streak alive.",
    "Growing fast. Your consistency is showing — the pet is visibly stronger.",
    "A fully grown companion. The orb glows purple. Your habits are solid.",
    "Crown, golden glow, orbiting particles. A true coding legend.",
  ];
  const barW = [8,28,54,76,100];
  return (
    <section id="evolution" style={css({ padding:"96px 24px", position:"relative" })}>
      <div style={css({ position:"absolute", top:"35%", left:"50%", transform:"translateX(-50%)", width:560,
        height:280, borderRadius:"50%", background:"radial-gradient(circle,#a78bfa07 0%,transparent 70%)", pointerEvents:"none" })} />
      <div style={css({ maxWidth:860, margin:"0 auto", position:"relative", zIndex:1 })}>
        <div style={css({ textAlign:"center", marginBottom:56 })}>
          <SectionLabel icon={<Cpu size={12}/>} text="EVOLUTION"/>
          <h2 style={css({ fontFamily:MONO, fontSize:"clamp(22px,4vw,38px)", fontWeight:900, color:"#e2e8f0", margin:"12px 0 12px" })}>5 stages of growth</h2>
          <p style={css({ color:"#64748b", fontSize:14, maxWidth:440, margin:"0 auto", lineHeight:1.7, fontFamily:FF })}>Your pet transforms visually as your XP grows. Hover each stage to see what unlocks.</p>
        </div>
        <div style={css({ display:"flex", flexDirection:"column", gap:12 })}>
          {STAGES.map((stage,i) => {
            const hov = hovered === stage.id;
            return (
              <div key={stage.id} className="cp-stage-row"
                style={{
                  "--stage-bg":     `${stage.glow}0e`,
                  "--stage-border": `${stage.glow}55`,
                  background:   hov ? `${stage.glow}0e` : "#0a0f1e",
                  border:       `1px solid ${hov ? stage.glow+"55" : "#1e293b"}`,
                  borderRadius: 16,
                  padding:      "16px 20px",
                  display:      "grid",
                  gridTemplateColumns: "52px 1fr auto",
                  alignItems:   "center",
                  gap:          16,
                } as CSSProperties}
                onMouseEnter={()=>setHovered(stage.id)}
                onMouseLeave={()=>setHovered(null)}>
                <div style={css({ width:48, height:48, borderRadius:"50%",
                  background:`radial-gradient(circle at 35% 30%,${stage.glow}40,${stage.glow}08)`,
                  border:`1.5px solid ${stage.glow}50`,
                  boxShadow: hov ? `0 0 18px ${stage.glow}50` : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:24, transition:"box-shadow .25s" })}>
                  {stage.icon}
                </div>
                <div>
                  <div style={css({ display:"flex", alignItems:"baseline", gap:8, marginBottom:5 })}>
                    <span style={{ fontFamily:MONO, fontSize:12, fontWeight:900, color:stage.glow }}>{stage.name}</span>
                    <span style={css({ fontSize:10, color:"#475569", fontFamily:FF })}>{stage.xpMin === 0 ? "0 XP" : `${stage.xpMin}+ XP`}</span>
                  </div>
                  <div style={css({ height:4, background:"#1e293b", borderRadius:2, marginBottom:5, overflow:"hidden" })}>
                    <div style={css({ height:"100%", width:`${barW[i]}%`, background:`linear-gradient(90deg,#22d3ee,${stage.glow})`, borderRadius:2, transition:"width .6s ease" })} />
                  </div>
                  <div style={css({ fontSize:11, color: hov ? "#94a3b8" : "transparent", lineHeight:1.6, fontFamily:FF, transition:"color .2s", maxHeight: hov ? 40 : 0, overflow:"hidden" })}>
                    {descs[i]}
                  </div>
                </div>
                <div style={css({ fontSize:9, fontFamily:MONO, fontWeight:700, color:stage.glow, background:`${stage.glow}15`, border:`1px solid ${stage.glow}30`, borderRadius:8, padding:"4px 10px", whiteSpace:"nowrap" })}>
                  {stage.xpMin === 0 ? "Start" : `${stage.xpMin} XP`}
                </div>
              </div>
            );
          })}
        </div>
        <div style={css({ textAlign:"center", marginTop:48 })}>
          <button className="cp-cta-btn" onClick={onStart}>Begin your evolution <ChevronRight size={16}/></button>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ onStart }: { onStart:()=>void }) {
  return (
    <footer style={css({ background:"#060a14", borderTop:"1px solid #0f172a", padding:"56px 24px 36px" })}>
      <div style={css({ maxWidth:1100, margin:"0 auto" })}>
        <div style={css({ textAlign:"center", padding:"48px 24px", background:"#0a0f1e",
          border:"1px solid #1e293b", borderRadius:24, marginBottom:44, position:"relative", overflow:"hidden" })}>
          <div style={css({ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:480, height:200,
            borderRadius:"50%", background:"radial-gradient(circle,#22d3ee07 0%,transparent 70%)", pointerEvents:"none" })} />
          <div style={{ fontSize:38, marginBottom:10, animation:"cp-float 3s ease-in-out infinite" }}>🐣</div>
          <h3 style={{ fontFamily:MONO, fontSize:"clamp(17px,3vw,26px)", fontWeight:900, color:"#e2e8f0", margin:"0 0 8px" }}>Your egg is waiting.</h3>
          <p style={css({ color:"#64748b", fontSize:13, margin:"0 0 26px", fontFamily:FF })}>Start coding. Start growing. Sign up in 30 seconds.</p>
          <button className="cp-cta-btn" onClick={onStart}>Start Your Journey <ChevronRight size={16}/></button>
        </div>
        <div style={css({ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14 })}>
          <div style={css({ display:"flex", alignItems:"center", gap:8 })}>
            <span style={{ fontSize:18 }}>🐣</span>
            <span style={{ fontFamily:MONO, fontSize:12, fontWeight:900, ...gradientText }}>CODE PET</span>
          </div>
          <div style={css({ color:"#2d3a4a", fontSize:11, fontFamily:FF })}>Built with React + TypeScript + Supabase</div>
          <div style={css({ display:"flex", gap:16 })}>
            <a href="https://github.com"   target="_blank" rel="noopener noreferrer" className="cp-nav-link"><Github   size={13}/> GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="cp-nav-link"><Linkedin size={13}/> LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ onStart }: { onStart:()=>void }) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div style={css({ background:"#080c14", color:"#e2e8f0", fontFamily:FF, overflowX:"hidden" })}>
      <LandingNav onStart={onStart} scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <HeroSection       onStart={onStart}/>
      <HowItWorksSection/>
      <FeaturesSection   onStart={onStart}/>
      <EvolutionSection  onStart={onStart}/>
      <LandingFooter     onStart={onStart}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SELECT SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function SelectScreen({ onSelect }: { onSelect:(pet:Pet,name:string)=>void }) {
  const [category, setCategory] = useState<FilterCategory>("All");
  const [chosen,   setChosen]   = useState<Pet|null>(null);
  const [name,     setName]     = useState("");
  const [hovered,  setHovered]  = useState<string|null>(null);
  const filtered = category === "All" ? PETS : PETS.filter(p => p.category === category);
  const canAdopt = chosen !== null && name.trim().length > 0;
  function handleAdopt() { if (canAdopt) onSelect(chosen!, name.trim()); }

  return (
    <div style={css({ minHeight:"100vh", background:"linear-gradient(160deg,#080c20,#0a0f1a)",
      padding:"20px 14px 48px", fontFamily:FF, color:"#e2e8f0" })}>
      <div style={css({ maxWidth:520, margin:"0 auto" })}>
        <div style={css({ textAlign:"center", marginBottom:16 })}>
          <h2 style={{ fontFamily:MONO, fontSize:16, fontWeight:900, color:"#22d3ee", margin:"0 0 4px" }}>Choose Your Companion</h2>
          <p style={css({ color:"#64748b", fontSize:12, margin:0 })}>Pick the creature that matches your coding spirit</p>
        </div>
        <div style={css({ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:14 })}>
          {PET_CATEGORIES.map(cat => (
            <button key={cat} onClick={()=>setCategory(cat)} style={css({
              background: category===cat ? "#22d3ee18" : "transparent",
              border:`1px solid ${category===cat ? "#22d3ee" : "#1e3a5f"}`,
              borderRadius:20, padding:"5px 12px", color:category===cat ? "#22d3ee" : "#64748b",
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF, transition:"all .2s" })}>
              {cat}
            </button>
          ))}
        </div>
        <div style={css({ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7, marginBottom:16 })}>
          {filtered.map(pet => {
            const sel = chosen?.id === pet.id, hov = hovered === pet.id;
            return (
              <button key={pet.id} onClick={()=>setChosen(pet)}
                onMouseEnter={()=>setHovered(pet.id)} onMouseLeave={()=>setHovered(null)}
                style={css({ background:sel?`${pet.color}22`:"#ffffff06",
                  border:`1.5px solid ${sel?pet.color:hov?"#334155":"transparent"}`,
                  borderRadius:12, padding:"10px 4px", textAlign:"center", cursor:"pointer",
                  transition:"all .2s", transform:sel?"scale(1.06)":"scale(1)",
                  boxShadow:sel?`0 0 16px ${pet.color}45`:"none", fontFamily:FF })}>
                <div style={{ fontSize:24, lineHeight:1, marginBottom:3 }}>{pet.emoji}</div>
                <div style={css({ fontSize:10, fontWeight:700, color:"#e2e8f0" })}>{pet.name}</div>
                <div style={css({ fontSize:9, color:"#475569" })}>{pet.category}</div>
              </button>
            );
          })}
        </div>
        {chosen && (
          <div style={css({ animation:"cp-slideUp .3s ease", marginBottom:14 })}>
            <div style={css({ textAlign:"center", marginBottom:8, fontSize:13, color:"#e2e8f0", fontWeight:600 })}>
              <span style={{ fontSize:22 }}>{chosen.emoji}</span>{"  "}Name your {chosen.name}:
            </div>
            <input type="text" value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleAdopt()} maxLength={18}
              placeholder={`e.g. "Byte", "Debugger", "Pixel"…`}
              style={css({ width:"100%", background:"#ffffff08", border:"1.5px solid #1e3a5f",
                borderRadius:10, padding:"10px 14px", color:"#e2e8f0", fontFamily:FF, fontSize:14, outline:"none" })}
              onFocus={e=>(e.currentTarget.style.borderColor="#22d3ee")}
              onBlur={e=>(e.currentTarget.style.borderColor="#1e3a5f")}
            />
          </div>
        )}
        <button onClick={handleAdopt} disabled={!canAdopt} style={css({
          width:"100%", background:canAdopt?"linear-gradient(135deg,#22d3ee,#a78bfa)":"#1e293b",
          border:"none", borderRadius:12, padding:12, fontSize:14, fontWeight:800,
          color:canAdopt?"#080c14":"#475569", cursor:canAdopt?"pointer":"not-allowed",
          fontFamily:FF, transition:"all .3s" })}>
          {canAdopt ? `Adopt ${name} the ${chosen!.name} →` : "Select a pet and give it a name"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. GAME SCREEN  — now receives onSignOut and shows user email in settings
// ─────────────────────────────────────────────────────────────────────────────

interface GameScreenProps {
  pet:          Pet;
  petName:      string;
  logs:         HabitLog[];
  userEmail:    string;          // ← new: display in header/modal
  onUpdateLogs: (logs:HabitLog[])=>void;
  onChangePet:  ()=>void;
  onSignOut:    ()=>void;        // ← new: sign-out handler
}

function GameScreen({ pet, petName, logs, userEmail, onUpdateLogs, onChangePet, onSignOut }: GameScreenProps) {
  const today        = new Date().toDateString();
  const xp           = calcTotalXP(logs);
  const stage        = getStage(xp);
  const mood         = MOODS[getMoodKey(logs)];
  const streak       = getStreak(logs);
  const totalHours   = logs.reduce((s,l)=>s+l.hours,0);
  const totalCommits = logs.reduce((s,l)=>s+l.commits,0);
  const todayLog     = getTodayLog(logs);
  const nextStage    = STAGES[stage.id+1] ?? null;
  const stagePct     = nextStage
    ? Math.min(100, ((xp-stage.xpMin)/(nextStage.xpMin-stage.xpMin))*100) : 100;

  const [tab,       setTab]       = useState<TabKey>("habits");
  const [hours,     setHours]     = useState("");
  const [cmts,      setCmts]      = useState("");
  const [toast,     setToast]     = useState<string|null>(null);
  const [showReset, setShowReset] = useState(false);

  const petEmojiFontSize = ([52,64,78,92,106] as const)[stage.id];

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(null),1_600); }
  function upsertLog(nl:HabitLog) { onUpdateLogs([...logs.filter(l=>l.date!==today), nl]); }
  function toggleHabit(id:string) {
    const chk = todayLog.checklist.includes(id);
    const nl  = chk ? todayLog.checklist.filter(x=>x!==id) : [...todayLog.checklist,id];
    upsertLog({ ...todayLog, checklist:nl });
    if (!chk) showToast(`+${HABITS.find(h=>h.id===id)?.xp??0} XP ✨`);
  }
  function submitSession() {
    const h = Math.min(parseFloat(hours)||0, 16), c = Math.min(parseInt(cmts)||0, 50);
    if (!h && !c) return;
    showToast(`+${Math.round(Math.min(h,8)*20+Math.min(c,20)*8)} XP ✨`);
    upsertLog({ ...todayLog, hours:todayLog.hours+h, commits:todayLog.commits+c });
    setHours(""); setCmts("");
  }
  const previewXP = (hours||cmts)
    ? Math.round(Math.min(parseFloat(hours)||0,8)*20 + Math.min(parseInt(cmts)||0,20)*8)
    : null;

  return (
    <div id="cp-root" style={css({ minHeight:"100vh",
      background:"linear-gradient(160deg,#080c20,#0a0f1a)", color:"#e2e8f0", fontFamily:FF })}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={css({ background:"#00000040", borderBottom:"1px solid #ffffff10",
        padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" })}>
        <span style={{ fontFamily:MONO, fontSize:13, fontWeight:900, color:"#22d3ee" }}>CODE PET</span>
        <div style={css({ display:"flex", alignItems:"center", gap:16 })}>
          {/* User email chip */}
          <div style={css({ display:"flex", alignItems:"center", gap:5,
            background:"#ffffff07", border:"1px solid #1e293b",
            borderRadius:20, padding:"3px 10px" })}>
            <UserCircle2 size={11} color="#475569"/>
            <span style={{ fontSize:10, color:"#475569", fontFamily:FF, maxWidth:120,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {userEmail}
            </span>
          </div>
          <div style={css({ textAlign:"center" })}>
            <Flame size={14} color="#f97316"/>
            <div style={css({ fontSize:9, color:"#f97316", fontWeight:700 })}>{streak}d streak</div>
          </div>
          <div style={css({ textAlign:"center" })}>
            <div style={css({ fontSize:14, fontWeight:800, color:"#fbbf24", display:"flex", alignItems:"center", gap:3 })}>
              <Zap size={12} color="#fbbf24"/>{xp}
            </div>
            <div style={css({ fontSize:9, color:"#64748b" })}>total XP</div>
          </div>
          <button onClick={()=>setShowReset(true)}
            style={css({ background:"transparent", border:"1px solid #1e3a5f", borderRadius:7,
              padding:"4px 9px", color:"#475569", cursor:"pointer", display:"flex", alignItems:"center" })}>
            <Settings size={13}/>
          </button>
        </div>
      </header>

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={css({ position:"fixed", top:62, right:14, zIndex:999,
          background:"#0a2a1a", border:"1px solid #22d3ee", borderRadius:20,
          padding:"7px 16px", color:"#22d3ee", fontSize:13, fontWeight:800,
          animation:"cp-popIn .3s ease, cp-xpFly 1.4s ease .2s forwards", pointerEvents:"none" })}>
          {toast}
        </div>
      )}

      {/* ── Settings Modal ─────────────────────────────────────────────── */}
      {showReset && (
        <div style={css({ position:"fixed", inset:0, background:"#00000088", zIndex:998,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 })}>
          <div style={css({ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:18,
            padding:24, maxWidth:300, width:"100%", textAlign:"center" })}>
            <Settings size={26} color="#64748b" style={{ margin:"0 auto 8px", display:"block" }}/>
            <div style={css({ fontWeight:800, fontSize:15, marginBottom:4 })}>Account</div>
            {/* User email */}
            <div style={css({ fontSize:11, color:"#475569", marginBottom:18, fontFamily:FF })}>
              Signed in as <strong style={{ color:"#64748b" }}>{userEmail}</strong>
            </div>
            <div style={css({ display:"flex", flexDirection:"column", gap:8 })}>
              <button onClick={()=>setShowReset(false)}
                style={css({ background:"transparent", border:"1px solid #334155",
                  borderRadius:10, padding:"9px", color:"#94a3b8", cursor:"pointer",
                  fontSize:13, fontFamily:FF, fontWeight:700, display:"flex",
                  alignItems:"center", justifyContent:"center", gap:6 })}>
                <RefreshCw size={13}/> Change Pet
              </button>
              {/* ← The "Change Pet" button now actually triggers onChangePet: */}
              <button onClick={()=>{ setShowReset(false); onChangePet(); }}
                style={css({ background:"#a78bfa12", border:"1px solid #a78bfa40",
                  borderRadius:10, padding:"9px", color:"#c4b5fd", cursor:"pointer",
                  fontSize:13, fontFamily:FF, fontWeight:700, display:"flex",
                  alignItems:"center", justifyContent:"center", gap:6 })}>
                <RefreshCw size={13}/> Reset & Choose New Pet
              </button>
              {/* Sign out */}
              <button onClick={()=>{ setShowReset(false); onSignOut(); }}
                style={css({ background:"#dc262612", border:"1px solid #dc262640",
                  borderRadius:10, padding:"9px", color:"#f87171", cursor:"pointer",
                  fontSize:13, fontFamily:FF, fontWeight:700, display:"flex",
                  alignItems:"center", justifyContent:"center", gap:6 })}>
                <LogOut size={13}/> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={css({ maxWidth:460, margin:"0 auto", padding:"0 14px" })}>

        {/* Pet orb */}
        <div style={css({ display:"flex", flexDirection:"column", alignItems:"center", padding:"18px 0 14px" })}>
          {stage.id===4 && <div style={{ fontSize:22, marginBottom:4, animation:"cp-float 2.2s ease-in-out infinite" }}>👑</div>}
          <div style={css({ width:170, height:170, borderRadius:"50%",
            border:`2px solid ${stage.glow}55`,
            background:`radial-gradient(circle at 38% 32%,${pet.color}30,#050810e8)`,
            boxShadow: stage.id===4
              ? `0 0 40px ${stage.glow}70,0 0 80px ${stage.glow}30`
              : `0 0 20px ${pet.color}55,0 0 40px ${pet.color}22`,
            display:"flex", alignItems:"center", justifyContent:"center",
            position:"relative", animation:"cp-float 3.2s ease-in-out infinite" })}>
            {stage.id===4 && Array.from({length:10},(_,i)=>{
              const a=(i/10)*Math.PI*2;
              return <div key={i} style={css({ position:"absolute", width:7, height:7, borderRadius:"50%",
                background:stage.glow, top:`${50-50*Math.cos(a)}%`, left:`${50+50*Math.sin(a)}%`,
                transform:"translate(-50%,-50%)",
                animation:`cp-twinkle 1.9s ease-in-out ${(i*.19).toFixed(2)}s infinite` })}/>;
            })}
            <span style={css({ fontSize:stage.id===0?72:petEmojiFontSize, display:"block", lineHeight:1,
              animation:"cp-breathe 4s ease-in-out infinite",
              filter:stage.id===4?`drop-shadow(0 0 9px ${stage.glow})`:"none" })}>
              {stage.id===0?"🥚":pet.emoji}
            </span>
            <div style={css({ position:"absolute", top:10, right:-10, background:"#080c14",
              border:`1px solid ${mood.color}55`, borderRadius:20, padding:"3px 9px", fontSize:15 })}>
              {mood.emoji}
            </div>
          </div>
          <div style={css({ marginTop:12, textAlign:"center" })}>
            <div style={css({ fontSize:19, fontWeight:800 })}>{petName}</div>
            <div style={css({ fontSize:12, color:stage.glow, fontWeight:700 })}>{stage.icon} {stage.name} {pet.name}</div>
            <div style={css({ fontSize:11, color:mood.color, marginTop:2 })}>{mood.desc}</div>
          </div>
          <div style={css({ width:"100%", marginTop:12 })}>
            <div style={css({ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:10, color:"#64748b" })}>
              <span>{stage.name}</span>
              {nextStage
                ? <span>{xp}/{nextStage.xpMin} XP → {nextStage.name}</span>
                : <span style={{ color:"#fbbf24", fontWeight:700 }}>✨ MAX LEVEL</span>}
            </div>
            <div style={css({ height:7, background:"#ffffff10", borderRadius:4, overflow:"hidden" })}>
              <div style={css({ height:"100%", width:`${stagePct}%`,
                background:`linear-gradient(90deg,#22d3ee,${stage.glow})`,
                borderRadius:4, transition:"width 1s ease" })}/>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={css({ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 })}>
          {([
            ["⏱️", totalHours.toFixed(1), "Hours"],
            ["📤", String(totalCommits),   "Commits"],
            ["🔥", String(streak),         "Streak"],
          ] satisfies [string,string,string][]).map(([ic,v,l]) => (
            <div key={l} style={css({ background:"#ffffff07", border:"1px solid #ffffff0e",
              borderRadius:10, padding:"10px 6px", textAlign:"center" })}>
              <div style={{ fontSize:15, marginBottom:1 }}>{ic}</div>
              <div style={css({ fontSize:17, fontWeight:800 })}>{v}</div>
              <div style={css({ fontSize:9, color:"#64748b" })}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={css({ display:"flex", background:"#ffffff07", borderRadius:10, padding:3, marginBottom:12 })}>
          {([
            ["habits",  <CheckSquare size={11}/>, "Daily Habits"],
            ["session", <Clock       size={11}/>, "Log Session"],
            ["history", <BarChart2   size={11}/>, "History"],
          ] satisfies [TabKey,ReactNode,string][]).map(([t,icon,label]) => (
            <button key={t} onClick={()=>setTab(t)}
              style={css({ flex:1, background:tab===t?"#1e3a5f":"transparent", border:"none",
                borderRadius:7, padding:"7px 2px", color:tab===t?"#22d3ee":"#64748b",
                fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:FF,
                display:"flex", alignItems:"center", justifyContent:"center", gap:4 })}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* HABITS */}
        {tab==="habits" && (
          <div style={css({ animation:"cp-slideUp .3s ease" })}>
            <p style={css({ color:"#475569", fontSize:11, marginBottom:10 })}>Check off what you accomplished today — resets at midnight.</p>
            <div style={css({ display:"flex", flexDirection:"column", gap:6 })}>
              {HABITS.map(h => {
                const chk = todayLog.checklist.includes(h.id);
                return (
                  <button key={h.id} onClick={()=>toggleHabit(h.id)}
                    style={css({ display:"flex", alignItems:"center", gap:10,
                      background:chk?"#22d3ee10":"#ffffff05",
                      border:`1.5px solid ${chk?"#22d3ee":"#ffffff0e"}`,
                      borderRadius:10, padding:"10px 12px", textAlign:"left", cursor:"pointer",
                      boxShadow:chk?"0 0 10px #22d3ee12":"none", transition:"all .2s",
                      fontFamily:FF, width:"100%" })}>
                    <div style={css({ width:20, height:20, borderRadius:5,
                      border:`2px solid ${chk?"#22d3ee":"#475569"}`,
                      background:chk?"#22d3ee":"transparent", display:"flex",
                      alignItems:"center", justifyContent:"center", flexShrink:0,
                      fontSize:11, color:"#080c14", fontWeight:900, lineHeight:1 })}>
                      {chk?"✓":""}
                    </div>
                    <span style={css({ color:chk?"#22d3ee":"#94a3b8", display:"flex", alignItems:"center" })}>{h.icon}</span>
                    <span style={css({ flex:1, color:chk?"#22d3ee":"#e2e8f0", fontSize:12, fontWeight:600 })}>{h.label}</span>
                    <span style={css({ fontSize:10, color:"#22d3ee", background:"#22d3ee15", borderRadius:6, padding:"2px 7px", fontWeight:700, flexShrink:0 })}>+{h.xp} XP</span>
                  </button>
                );
              })}
            </div>
            {todayLog.checklist.length===HABITS.length && (
              <div style={css({ marginTop:12, textAlign:"center", color:"#fbbf24", fontSize:12,
                fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center",
                gap:6, animation:"cp-popIn .5s ease" })}>
                <Trophy size={14} color="#fbbf24"/> All habits done! Your pet is thriving!
              </div>
            )}
          </div>
        )}

        {/* SESSION */}
        {tab==="session" && (
          <div style={css({ animation:"cp-slideUp .3s ease" })}>
            <p style={css({ color:"#475569", fontSize:11, marginBottom:12 })}>Log your session manually — XP stacks on top of your checklist.</p>
            <div style={css({ display:"flex", flexDirection:"column", gap:10 })}>
              {([
                { id:"h", labelIcon:<Clock size={12}/>, labelText:"Hours coded",    hint:"e.g. 2.5  (+20 XP/hr, max 8h)", value:hours, setter:setHours, step:"0.5", max:16  },
                { id:"c", labelIcon:<GitCommit size={12}/>, labelText:"Commits pushed", hint:"e.g. 8  (+8 XP each, max 20)", value:cmts, setter:setCmts, step:"1", max:100 },
              ]).map(f => (
                <div key={f.id}>
                  <label style={css({ display:"flex", alignItems:"center", gap:4, color:"#94a3b8", fontSize:11, fontWeight:700, marginBottom:4 })}>{f.labelIcon} {f.labelText}</label>
                  <input type="number" min="0" max={f.max} step={f.step} value={f.value}
                    onChange={e=>f.setter(e.target.value)} placeholder={f.hint}
                    style={css({ width:"100%", background:"#ffffff08", border:"1.5px solid #1e3a5f",
                      borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontFamily:FF, fontSize:13, outline:"none" })}
                    onFocus={e=>(e.currentTarget.style.borderColor="#22d3ee")}
                    onBlur={e=>(e.currentTarget.style.borderColor="#1e3a5f")}/>
                </div>
              ))}
              {previewXP!==null && (
                <div style={css({ background:"#22d3ee0e", border:"1px solid #22d3ee2a", borderRadius:8,
                  padding:"9px 12px", color:"#22d3ee", fontSize:12, display:"flex", justifyContent:"space-between" })}>
                  <span>Preview XP</span><span style={{ fontWeight:800 }}>+{previewXP}</span>
                </div>
              )}
              <button onClick={submitSession}
                style={css({ background:"linear-gradient(135deg,#22d3ee,#a78bfa)", border:"none",
                  borderRadius:10, padding:11, fontSize:14, fontWeight:800, color:"#080c14",
                  cursor:"pointer", fontFamily:FF })}>
                Log Session +XP
              </button>
              {(todayLog.hours>0||todayLog.commits>0) && (
                <p style={css({ textAlign:"center", color:"#475569", fontSize:11, margin:0 })}>
                  Today so far: {todayLog.hours}h coded, {todayLog.commits} commits
                </p>
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab==="history" && (
          <div style={css({ animation:"cp-slideUp .3s ease" })}>
            {logs.length===0
              ? <div style={css({ textAlign:"center", color:"#475569", padding:"36px 0" })}>
                  <Inbox size={36} color="#1e3a5f" style={{ margin:"0 auto 8px", display:"block" }}/>
                  <div style={css({ fontSize:13 })}>No history yet. Start coding!</div>
                </div>
              : <div style={css({ display:"flex", flexDirection:"column", gap:6 })}>
                  {[...logs].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
                    .slice(0,14).map(log => {
                      const earned  = calcLogXP(log);
                      const label   = new Date(log.date).toLocaleDateString("en",{ weekday:"short", month:"short", day:"numeric" });
                      const summary = ([
                        log.hours>0?`${log.hours}h`:false,
                        log.commits>0?`${log.commits} commits`:false,
                        log.checklist.length>0?`${log.checklist.length} habits`:false,
                      ] as (string|false)[]).filter((x):x is string=>Boolean(x)).join("  ");
                      return (
                        <div key={log.date} style={css({ background:"#ffffff06", border:"1px solid #ffffff0e",
                          borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" })}>
                          <div>
                            <div style={css({ fontSize:12, fontWeight:700 })}>{label}</div>
                            <div style={css({ fontSize:10, color:"#64748b", marginTop:1 })}>{summary}</div>
                          </div>
                          <div style={css({ color:"#22d3ee", fontWeight:800, fontSize:13 })}>+{earned} XP</div>
                        </div>
                      );
                    })}
                </div>
            }
          </div>
        )}

        {/* XP guide */}
        <div style={css({ margin:"14px 0", background:"#ffffff05", border:"1px solid #ffffff0a", borderRadius:12, padding:"12px 14px" })}>
          <div style={css({ fontSize:10, color:"#475569", fontWeight:700, marginBottom:7 })}>📖 HOW XP IS EARNED</div>
          <div style={css({ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 12px", fontSize:10, color:"#64748b" })}>
            <span>✅ Each habit</span>      <span style={{ color:"#22d3ee", fontWeight:700 }}>+10–20 XP</span>
            <span>⏱️ Each hour coded</span> <span style={{ color:"#22d3ee", fontWeight:700 }}>+20 XP (max 8h)</span>
            <span>📤 Each commit</span>     <span style={{ color:"#22d3ee", fontWeight:700 }}>+8 XP (max 20)</span>
          </div>
          <div style={css({ marginTop:8, display:"flex", gap:5, flexWrap:"wrap" })}>
            {STAGES.map(s => (
              <div key={s.id} style={css({ fontSize:9, color:s.glow, background:`${s.glow}15`, borderRadius:6, padding:"2px 7px", fontWeight:700 })}>
                {s.icon} {s.name}: {s.xpMin}+ XP
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ROOT APP — Supabase auth, user state, pet fetching
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  useGlobalStyles();

  // ── Auth state ────────────────────────────────────────────────────────────
  const [user,    setUser]    = useState<User | null>(null);
  const [screen,  setScreen]  = useState<ScreenKey>("loading");

  // ── Pet state ─────────────────────────────────────────────────────────────
  const [petId,   setPetId]   = useState<string | null>(null);
  const [petName, setPetName] = useState<string>("");
  const [logs,    setLogs]    = useState<HabitLog[]>([]);

  // ── Single auth listener — fires on mount AND on every session change ─────
  //    This replaces the old localStorage useEffect pair.
  //    Covers: initial page load, sign-in, sign-out, magic-link redirect,
  //    token refresh, and tab focus (Supabase v2 behaviour).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);

          // Fetch the user's pet from Supabase
          const petData = await fetchPetFromSupabase(session.user.id);
          if (petData) {
            setPetId(petData.petId);
            setPetName(petData.petName);
            setLogs(petData.logs);
            setScreen("game");
          } else {
            // Authenticated but no pet yet (new sign-up after email confirm)
            setPetId(null); setPetName(""); setLogs([]);
            setScreen("select");
          }
        } else {
          // No session — clear everything and show landing
          setUser(null);
          setPetId(null); setPetName(""); setLogs([]);
          // INITIAL_SESSION with no user means first visit — show landing.
          // SIGNED_OUT means the user just clicked "Sign Out" — also landing.
          setScreen("landing");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // empty deps — runs exactly once, listener manages its own lifecycle

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Called when the user picks a pet from SelectScreen. Saves to Supabase. */
  async function handleSelect(pet: Pet, name: string) {
    setPetId(pet.id);
    setPetName(name);
    setLogs([]);
    setScreen("game");
    // Fire-and-forget upsert — local state is already updated optimistically
    if (user) {
      await savePetToSupabase(user.id, pet.id, name, []);
    }
  }

  /** Called on every habit tick or session log. Optimistic local update +
   *  fire-and-forget Supabase save so the UI is never blocked. */
  function handleUpdateLogs(newLogs: HabitLog[]) {
    setLogs(newLogs);
    if (user && petId && petName) {
      savePetToSupabase(user.id, petId, petName, newLogs).catch(console.error);
    }
  }

  /** Delete the pet row and navigate to SelectScreen so the user can choose
   *  a new companion. Their account stays active. */
  async function handleChangePet() {
    if (user) {
      // Remove the old pet row — the user will create a new one via handleSelect
      await supabase.from("pets").delete().eq("user_id", user.id);
    }
    setPetId(null); setPetName(""); setLogs([]);
    setScreen("select");
  }

  /** Signs out of Supabase. The onAuthStateChange listener above fires
   *  automatically, clears state, and redirects to "landing". */
  async function handleSignOut() {
    await supabase.auth.signOut();
    // State reset happens inside onAuthStateChange — no need to do it here.
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === "loading") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#080c14", color:"#22d3ee", fontFamily:MONO, fontSize:13, letterSpacing:2 }}>
        LOADING…
      </div>
    );
  }

  const activePet = PETS.find(p => p.id === petId) ?? null;

  // Edge-case: user is logged in but petId doesn't match any known pet
  if (screen === "game" && !activePet) {
    return <SelectScreen onSelect={handleSelect}/>;
  }

  return (
    <>
      {/* New visitors → landing page */}
      {screen === "landing" && (
        <LandingPage onStart={() => setScreen("auth")}/>
      )}

      {/* Auth screen — handles sign-in, sign-up, OTP, email confirm states.
          On success supabase.auth.onAuthStateChange fires and routes automatically. */}
      {screen === "auth" && (
        <Auth onShowLanding={() => setScreen("landing")}/>
      )}

      {/* "welcome" screen kept for legacy — not reached in normal Supabase flow */}
      {screen === "welcome" && (
        <SelectScreen onSelect={handleSelect}/>
      )}

      {screen === "select" && (
        <SelectScreen onSelect={handleSelect}/>
      )}

      {screen === "game" && activePet && user && (
        <GameScreen
          pet={activePet}
          petName={petName}
          logs={logs}
          userEmail={user.email ?? ""}
          onUpdateLogs={handleUpdateLogs}
          onChangePet={handleChangePet}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const FF   = "'Nunito', system-ui";
const MONO = "'Orbitron', monospace";

function css(styles: CSSProperties): CSSProperties { return styles; }

const gradientText: CSSProperties = {
  background:           "linear-gradient(135deg,#22d3ee,#a78bfa)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  letterSpacing:        2,
};