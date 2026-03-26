import { useState, useEffect, useMemo, createContext, useContext, useCallback, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { supabase } from "./lib/supabase"
import { T, flagColor, flagLabel } from "./lib/tokens"
import * as db from "./lib/db"

// ── Contexts ──
const AuthContext = createContext(null)
function useAuth() { return useContext(AuthContext) }
const DataContext = createContext(null)
function useData() { return useContext(DataContext) }

// ── Responsive hook ──
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])
  return mobile
}

// ── Browser history for SPA navigation ──
function useAppHistory(defaultPage) {
  const [page, setPageState] = useState(() => {
    const hash = window.location.hash.replace("#", "")
    return hash || defaultPage
  })

  function setPage(p) {
    window.history.pushState({ page: p }, "", `#${p}`)
    setPageState(p)
  }

  useEffect(() => {
    function onPop(e) {
      const hash = window.location.hash.replace("#", "")
      setPageState(hash || defaultPage)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [defaultPage])

  return [page, setPage]
}

// ── Use mock data when Supabase isn't configured ──
// TODO: flip back to false once Supabase auth passwords are reset
const USE_MOCK = true

// ── Mock Data ──
// Login by first name (case-insensitive) + shared password "AHF"
const MOCK_USERS = {
  "damir": { id: "u1", email: "damir@activehealthchicago.com", role: "owner", name: "Dr. Simunac" },
  "kristin": { id: "u2", email: "kristin@activehealthchicago.com", role: "trainer", name: "Kristin" },
  "575": { id: "u3", email: "client575@ahf.local", role: "client", name: "#575", clientId: "client-575" },
}
const USER_PASSWORDS = {
  "damir": "AHSS",
  "kristin": "AHF",
  "575": "AHF",
}

// Map first names to emails for Supabase auth (production)
const NAME_TO_EMAIL = {
  "damir": "damir@activehealthchicago.com",
  "kristin": "kristin@activehealthchicago.com",
  // Client emails will be looked up from profiles table
}

const MOCK_CLIENTS = [
  {
    id: "client-575", name: "#575", email: "client575@ahf.local",
    startDate: "2025-08-15", plan: "2x/week, Tue/Thu", status: "active",
    nextSession: "Thu, Mar 27",
    pack: { price: 850, total: 10, used: 8, purchaseDate: "2026-01-29", tier: "Standard" },
    goals: [],
    notes: [],
    packages: [
      { purchaseDate: "2025-08-15", price: 850, total: 10, used: 10 },
      { purchaseDate: "2025-10-20", price: 850, total: 10, used: 10 },
      { purchaseDate: "2025-12-22", price: 850, total: 10, used: 10 },
      { purchaseDate: "2026-01-29", price: 850, total: 10, used: 8 },
    ],
    sessionHistory: [
      { date: "2025-08-26", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-08-28", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-02", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-04", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-09", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-11", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-23", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-25", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-09-30", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-10-09", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-10-13", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-10-16", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-10-21", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-10-23", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-10-30", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-11-04", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-11-06", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-11-11", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-11-13", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-11-18", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-11-25", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-12-04", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-12-09", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-12-16", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-12-18", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2025-12-23", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-08", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-13", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-15", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-20", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-22", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-27", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-01-29", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-02-05", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-02-10", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-02-12", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-02-24", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-02-26", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-03-05", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-03-10", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-03-17", type: "PT SESSION", note: "Personal Training 60 min" },
      { date: "2026-03-24", type: "PT SESSION", note: "Personal Training 60 min" },
    ],
    financials: {
      totalPurchased: 40,
      totalUsed: 42,
      totalSpent: 3400,
      balance: -2,
      packages: [
        { date: "2025-08-15", sessions: 10, amount: 850 },
        { date: "2025-10-20", sessions: 10, amount: 850 },
        { date: "2025-12-22", sessions: 10, amount: 850 },
        { date: "2026-01-29", sessions: 10, amount: 850 },
      ]
    },
    programming: {
      weekLabel: "Week 32", phase: "Active",
      days: [],
      attachments: []
    },
    assessments: [],
    progress: [],
    trainingLog: [
      { week: "W28", sessions: 2, volume: 0 },
      { week: "W29", sessions: 2, volume: 0 },
      { week: "W30", sessions: 2, volume: 0 },
      { week: "W31", sessions: 2, volume: 0 },
      { week: "W32", sessions: 2, volume: 0 },
    ],
  },
]


// ══════════════════════════════════════════
// SHARED UI — warmer, with shadows and life
// ══════════════════════════════════════════

function Card({ children, style = {}, onClick, accent }) {
  return (
    <div onClick={onClick} style={{
      backgroundColor: T.white,
      border: accent ? `1px solid ${T.accent}30` : `1px solid ${T.mist}`,
      borderRadius: T.r.md,
      padding: 20,
      boxShadow: T.shadow.sm,
      transition: "box-shadow 0.2s, transform 0.15s",
      animation: "fadeIn 0.3s ease",
      ...(onClick ? { cursor: "pointer" } : {}),
      ...style,
    }}
    onMouseEnter={onClick ? (e) => { e.currentTarget.style.boxShadow = T.shadow.md; e.currentTarget.style.transform = "translateY(-1px)" } : undefined}
    onMouseLeave={onClick ? (e) => { e.currentTarget.style.boxShadow = T.shadow.sm; e.currentTarget.style.transform = "none" } : undefined}
    >{children}</div>
  )
}

function Label({ children, color = T.accent }) {
  return <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>{children}</div>
}

function Btn({ children, active, onClick, color = T.accent, small }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `linear-gradient(135deg, ${color}, ${color}dd)` : "transparent",
      color: active ? T.white : "#6B7280",
      border: `1px solid ${active ? color : T.mist}`,
      padding: small ? "5px 12px" : "9px 18px",
      borderRadius: T.r.sm, fontSize: small ? 11 : 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
      boxShadow: active ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
      transition: "all 0.15s ease",
    }}>{children}</button>
  )
}

function Input({ value, onChange, placeholder, style = {}, type = "text" }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
    padding: "11px 14px", border: `1px solid ${T.mist}`, borderRadius: T.r.sm, fontSize: 14, fontFamily: T.sans,
    outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s",
    ...style
  }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.mist} />
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{
    padding: "11px 14px", border: `1px solid ${T.mist}`, borderRadius: T.r.sm, fontSize: 14, fontFamily: T.sans,
    outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", transition: "border-color 0.2s",
  }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.mist} />
}

function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map(n => n[0]).join("")
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `linear-gradient(135deg, ${T.accent}, ${T.accentDeep})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: T.white, flexShrink: 0,
      boxShadow: "0 2px 6px rgba(15,118,110,0.25)",
    }}>{initials}</div>
  )
}

function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}><div style={{ width: 32, height: 32, border: `3px solid ${T.mist}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>
}

// Responsive grid helper
function Grid({ cols = 3, mobileCols = 1, gap = 12, children, style = {} }) {
  const mobile = useIsMobile()
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${mobile ? mobileCols : cols}, 1fr)`,
      gap,
      ...style,
    }}>{children}</div>
  )
}

// ═══════════════════════════════════════════
// LOGIN SCREEN — mobile-first
// ═══════════════════════════════════════════

function LoginScreen({ onMockLogin }) {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [logging, setLogging] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError("")
    const firstName = name.trim().toLowerCase()
    if (!firstName) { setError("Enter your first name."); return }
    const expectedPw = USER_PASSWORDS[firstName]
    if (!expectedPw || password !== expectedPw) { setError("Wrong password."); return }

    if (USE_MOCK) {
      const user = MOCK_USERS[firstName]
      if (user) { onMockLogin(user); return }
      setError("Name not recognized. Try: Damir, Kristin, or 575")
      return
    }

    // Production: look up email from name, sign in with password
    setLogging(true)
    try {
      // Try known staff names first
      let email = NAME_TO_EMAIL[firstName]
      if (!email) {
        // For clients, look up by first name in profiles
        const { data } = await supabase
          .from("profiles")
          .select("email")
          .ilike("full_name", `${firstName}%`)
          .limit(1)
          .single()
        if (data) email = data.email
      }
      if (!email) { setError("Name not found. Contact Dr. Simunac for access."); setLogging(false); return }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); setLogging(false); return }
    } catch (err) { setError("Login failed. Try again."); setLogging(false) }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: T.warmBg, padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 400, animation: "slideUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDeep})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 4px 14px rgba(15,118,110,0.25)",
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.white }}>F</span>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ACTIVE HEALTH FIT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Sign in to your dashboard</h1>
        </div>

        <form onSubmit={handleLogin}>
          <Card style={{ boxShadow: T.shadow.md }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>FIRST NAME</label>
              <Input value={name} onChange={setName} placeholder="" type="text" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PASSWORD</label>
              <Input value={password} onChange={setPassword} placeholder="" type="password" />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 12, padding: "8px 12px", backgroundColor: "#FEF2F2", borderRadius: T.r.sm }}>{error}</div>}
            <button type="submit" disabled={logging} style={{
              width: "100%", padding: "13px 0",
              background: logging ? T.mist : `linear-gradient(135deg, ${T.accent}, ${T.accentDeep})`,
              color: T.white, border: "none", borderRadius: T.r.sm,
              fontSize: 15, fontWeight: 600, cursor: logging ? "wait" : "pointer", fontFamily: T.sans,
              boxShadow: "0 3px 10px rgba(15,118,110,0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseDown={e => { if (!logging) e.currentTarget.style.transform = "scale(0.98)" }}
            onMouseUp={e => { e.currentTarget.style.transform = "none" }}
            >
              {logging ? "Signing in..." : "Sign In"}
            </button>
          </Card>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// NAV — responsive, scrollable on mobile
// ═══════════════════════════════════════════

function NavBar({ active, onNav, name, label, labelColor, tabs, onLogout }) {
  const mobile = useIsMobile()
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `linear-gradient(135deg, ${T.ink}, #252830)`,
      padding: mobile ? "0 12px" : "0 24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        height: mobile ? 52 : 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 20, minWidth: 0, flex: 1 }}>
          <span style={{
            fontFamily: T.mono, fontSize: mobile ? 9 : 11, color: labelColor || T.accent,
            fontWeight: 700, letterSpacing: 1.5, whiteSpace: "nowrap", flexShrink: 0,
          }}>{label || "ACTIVE HEALTH FIT"}</span>
          <div style={{ display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => onNav(t.toLowerCase())} style={{
                background: active === t.toLowerCase() ? `linear-gradient(135deg, ${T.accentDeep}, ${T.accent})` : "transparent",
                color: active === t.toLowerCase() ? T.white : "#9CA3AF",
                border: "none", padding: mobile ? "5px 10px" : "6px 14px", borderRadius: T.r.sm,
                fontSize: mobile ? 11 : 13, fontWeight: active === t.toLowerCase() ? 600 : 400,
                cursor: "pointer", fontFamily: T.sans, whiteSpace: "nowrap",
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 10, flexShrink: 0 }}>
          <Avatar name={name} size={mobile ? 26 : 30} />
          {!mobile && <span style={{ fontSize: 13, color: "#9CA3AF" }}>{name.split(" ")[0]}</span>}
          <button onClick={onLogout} style={{ background: "none", border: "none", fontSize: 11, color: "#6B7280", cursor: "pointer", fontFamily: T.sans, marginLeft: mobile ? 4 : 8 }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// CLIENT VIEW
// ═══════════════════════════════════════════

function ClientHome({ client, onNav }) {
  const mobile = useIsMobile()
  const prog = client.programming
  const weeksSinceStart = Math.round((new Date() - new Date(client.startDate)) / (7 * 24 * 60 * 60 * 1000))
  const sessionsThisWeek = prog.days.filter(d => d.completed).length
  const nextDay = prog.days.find(d => !d.completed)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slideUp 0.3s ease" }}>
      <div style={{ padding: "24px 0 4px" }}>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight: 700, color: T.ink, margin: 0 }}>Hey {client.name.split(" ")[0]}.</h1>
      </div>
      <Grid cols={3} mobileCols={1} gap={12}>
        <Card><Label color="#6B7280">Training Week</Label><div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{parseInt(prog.weekLabel.match(/\d+/)?.[0] || "1")}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{weeksSinceStart} weeks total</div></Card>
        <Card><Label color="#6B7280">This Week</Label><div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{sessionsThisWeek} / {prog.days.length}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>sessions done</div></Card>
        <Card><Label color="#6B7280">Next Session</Label><div style={{ fontSize: 14, fontWeight: 600, color: T.accent }}>{client.nextSession ? client.nextSession.split(",")[0] : "TBD"}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{client.nextSession ? client.nextSession.split(",").slice(1).join(",").trim() : ""}</div></Card>
      </Grid>
      {nextDay && (
        <Card accent onClick={() => onNav("programming")}>
          <Label>Up Next</Label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{nextDay.day}, {nextDay.date}</div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>{nextDay.focus}</div>
            </div>
            <span style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>View full workout →</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(nextDay.blocks.find(b => b.label === "Main Lifts") || nextDay.blocks[0])?.exercises.map((ex, i) => (
              <span key={i} style={{ fontSize: 11, color: T.ink, backgroundColor: T.accentLight, padding: "4px 10px", borderRadius: 20 }}>{ex.name}</span>
            ))}
          </div>
        </Card>
      )}
      <Card><Label>Your Goals</Label>{client.goals.map((g, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent, flexShrink: 0 }} /><span style={{ fontSize: 14, color: T.ink }}>{g}</span></div>
      ))}</Card>
      {client.notes.length > 0 && (
        <Card><Label>Recent Notes</Label>{client.notes.map((n, i) => (
          <div key={i} style={{ borderBottom: i < client.notes.length - 1 ? `1px solid ${T.mist}` : "none", paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{n.from}</span><span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF" }}>{n.date}</span></div>
            <p style={{ fontSize: 13, color: "#4B5563", margin: 0, lineHeight: 1.5 }}>{n.text}</p>
          </div>
        ))}</Card>
      )}
    </div>
  )
}

function ProgramView({ client, editable = false }) {
  const mobile = useIsMobile()
  const [expandedDay, setExpandedDay] = useState(0)
  const prog = client.programming
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h1 style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: T.ink, margin: 0 }}>{prog.weekLabel}</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{prog.phase}</div></div>
          {editable && <div style={{ display: "flex", gap: 8 }}><Btn active onClick={() => {}} color={T.accent}>+ Add Day</Btn><Btn onClick={() => {}}>Upload PDF</Btn></div>}
        </div>
      </div>
      {prog.days.map((day, di) => (
        <Card key={di} style={{ border: expandedDay === di ? `1px solid ${T.accent}60` : undefined }} onClick={() => setExpandedDay(expandedDay === di ? -1 : di)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{day.day}</span><span style={{ fontSize: 12, color: "#6B7280" }}>{day.date}</span>
                {day.completed && <span style={{ fontSize: 9, fontWeight: 700, color: T.white, background: `linear-gradient(135deg, ${T.green}, #16A34A)`, padding: "2px 8px", borderRadius: 10 }}>DONE</span>}
              </div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{day.focus}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {editable && !day.completed && <Btn small active onClick={(e) => { e.stopPropagation() }} color={T.green}>Mark Done</Btn>}
              <span style={{ fontSize: 18, color: "#9CA3AF", transform: expandedDay === di ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
            </div>
          </div>
          {expandedDay === di && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.mist}`, paddingTop: 16 }}>
              {day.blocks.map((block, bi) => (
                <div key={bi} style={{ marginBottom: bi < day.blocks.length - 1 ? 20 : 0 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: block.label === "Main Lifts" ? T.accent : block.label === "Warm-Up" ? T.amber : "#6B7280", marginBottom: 10 }}>{block.label.toUpperCase()}</div>
                  {block.exercises.map((ex, ei) => (
                    <div key={ei} style={{
                      display: "grid",
                      gridTemplateColumns: mobile
                        ? (editable ? "1fr 30px" : "1fr")
                        : (editable ? "1fr 70px 80px 30px" : "1fr 70px 80px"),
                      gap: 8, alignItems: "center", padding: "10px 12px",
                      backgroundColor: ei % 2 === 0 ? T.warmBg : T.white, borderRadius: 6,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{ex.name}</div>
                        {mobile && <div style={{ fontSize: 11, color: T.accent, fontFamily: T.mono, marginTop: 2 }}>{ex.sets} x {ex.reps} · {ex.load}</div>}
                        {ex.note && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{ex.note}</div>}
                      </div>
                      {!mobile && <div style={{ fontFamily: T.mono, fontSize: 12, color: "#6B7280", textAlign: "center" }}>{ex.sets} x {ex.reps}</div>}
                      {!mobile && <div style={{ fontFamily: T.mono, fontSize: 12, color: T.ink, fontWeight: 500, textAlign: "center" }}>{ex.load}</div>}
                      {editable && <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", cursor: "pointer" }}>✏</span>}
                    </div>
                  ))}
                  {editable && <button style={{ marginTop: 6, background: "none", border: `1px dashed ${T.mist}`, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#9CA3AF", cursor: "pointer", width: "100%", fontFamily: T.sans }}>+ Add exercise</button>}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
      {prog.attachments && prog.attachments.length > 0 && (
        <Card><Label>Attachments</Label>
          {prog.attachments.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: T.warmBg, borderRadius: T.r.sm, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: a.type === "pdf" ? T.red : T.purple, backgroundColor: a.type === "pdf" ? "#FEF2F2" : "#F3E8FF", padding: "2px 6px", borderRadius: 3 }}>{a.type.toUpperCase()}</span>
                <span style={{ fontSize: 13, color: T.ink }}>{a.name}</span>
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF" }}>{a.size}</span>
            </div>
          ))}
          {editable && <button style={{ marginTop: 8, background: "none", border: `1px dashed ${T.mist}`, borderRadius: 6, padding: "8px 14px", fontSize: 12, color: "#9CA3AF", cursor: "pointer", fontFamily: T.sans }}>+ Upload file</button>}
        </Card>
      )}
    </div>
  )
}

function AssessmentView({ client }) {
  const mobile = useIsMobile()
  const [sel, setSel] = useState(0)
  if (!client.assessments.length) return <div style={{ padding: "60px 0", textAlign: "center" }}><div style={{ fontSize: 16, color: "#6B7280" }}>No assessments yet.</div><div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Your first assessment with Dr. Simunac will appear here.</div></div>
  const a = client.assessments[sel]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: T.ink, margin: 0 }}>Assessments</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Measurement history with Dr. Simunac</div></div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>{client.assessments.map((ass, i) => <Btn key={i} active={sel === i} onClick={() => setSel(i)} color={T.ink}>{ass.date}</Btn>)}</div>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{a.type}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 12 }}>Assessed by {a.assessor}, {a.date}</div>
        <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.6, margin: "0 0 20px" }}>{a.summary}</p>
        {mobile ? (
          // Mobile: card layout for metrics
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {a.metrics.map((m, i) => (
              <div key={i} style={{ padding: 12, backgroundColor: i % 2 === 0 ? T.warmBg : T.white, borderRadius: T.r.sm }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{m.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: flagColor(m.flag) === "#D1D5DB" ? "#6B7280" : flagColor(m.flag), backgroundColor: `${flagColor(m.flag)}20`, padding: "2px 8px", borderRadius: 10 }}>{flagLabel(m.flag)}</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div><div style={{ fontFamily: T.mono, fontSize: 9, color: "#9CA3AF" }}>PREV</div><div style={{ fontFamily: T.mono, fontSize: 13, color: "#6B7280" }}>{m.prev !== null ? `${m.prev} ${m.unit}` : "\u2014"}</div></div>
                  <div><div style={{ fontFamily: T.mono, fontSize: 9, color: "#9CA3AF" }}>NOW</div><div style={{ fontFamily: T.mono, fontSize: 13, color: T.ink, fontWeight: 600 }}>{m.now} {m.unit}</div></div>
                  <div><div style={{ fontFamily: T.mono, fontSize: 9, color: "#9CA3AF" }}>CHANGE</div><div style={{ fontFamily: T.mono, fontSize: 13, color: m.flag === "improved" ? T.green : m.flag === "declined" ? T.red : "#6B7280", fontWeight: 600 }}>{m.change}</div></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop: table layout
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 80px 110px", gap: 8, padding: "8px 12px", backgroundColor: T.warmCloud, borderRadius: "6px 6px 0 0" }}>
              {["MEASURE", "PREV", "NOW", "CHANGE", "STATUS"].map((h, i) => <span key={h} style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>{h}</span>)}
            </div>
            {a.metrics.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 80px 110px", gap: 8, padding: "10px 12px", alignItems: "center", backgroundColor: i % 2 === 0 ? T.white : T.warmBg }}>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{m.name}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>{m.prev !== null ? `${m.prev} ${m.unit}` : "\u2014"}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.ink, fontWeight: 600, textAlign: "center" }}>{m.now} {m.unit}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: m.flag === "improved" ? T.green : m.flag === "declined" ? T.red : "#6B7280", fontWeight: 600, textAlign: "center" }}>{m.change}</span>
                <div style={{ textAlign: "right" }}><span style={{ fontSize: 9, fontWeight: 700, color: flagColor(m.flag) === "#D1D5DB" ? "#6B7280" : flagColor(m.flag), backgroundColor: `${flagColor(m.flag)}20`, padding: "2px 8px", borderRadius: 10 }}>{flagLabel(m.flag)}</span></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card style={{ backgroundColor: T.warmCloud, border: "none" }}>
        <Label color="#6B7280">How To Read This</Label>
        <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: T.ink }}>REAL CHANGE</strong> means the improvement exceeds measurement error (strength: over 20%, ROM: over 10 degrees).{" "}
          <strong style={{ color: T.ink }}>TRENDING</strong> means positive movement in the gray zone.{" "}
          <strong style={{ color: T.ink }}>WITHIN NOISE</strong> means the change is too small to distinguish from test-retest variation.
        </p>
      </Card>
    </div>
  )
}

function ProgressView({ client }) {
  const [metric, setMetric] = useState("glute")
  const opts = [{ id: "glute", label: "Glute Med", lKey: "lGluteMed", rKey: "rGluteMed", unit: "lbs" }, { id: "grip", label: "Grip", lKey: "lGrip", rKey: "rGrip", unit: "lbs" }]
  const act = opts.find(m => m.id === metric)
  if (!client.progress.length) return <div style={{ padding: "60px 0", textAlign: "center" }}><div style={{ fontSize: 16, color: "#6B7280" }}>Progress data will appear after your first assessment.</div></div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Progress</h1></div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <Label>Strength Trends</Label>
          <div style={{ display: "flex", gap: 4 }}>{opts.map(m => <Btn key={m.id} small active={metric === m.id} onClick={() => setMetric(m.id)}>{m.label}</Btn>)}</div>
        </div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={client.progress}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.mist} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} domain={["dataMin - 5", "dataMax + 5"]} width={55} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, boxShadow: T.shadow.md }} formatter={(v, n) => [`${v} ${act.unit}`, n === act.lKey ? "Left" : "Right"]} />
              <Line type="monotone" dataKey={act.lKey} stroke={T.accent} strokeWidth={2} dot={{ fill: T.accent, r: 4 }} />
              <Line type="monotone" dataKey={act.rKey} stroke={T.ink} strokeWidth={2} dot={{ fill: T.ink, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 3, backgroundColor: T.accent, borderRadius: 2 }} /><span style={{ fontSize: 11, color: "#6B7280" }}>Left</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 3, backgroundColor: T.ink, borderRadius: 2 }} /><span style={{ fontSize: 11, color: "#6B7280" }}>Right</span></div>
        </div>
      </Card>
      {client.trainingLog.length > 0 && (
        <Card><Label>Weekly Training Volume</Label><div style={{ width: "100%", height: 180 }}><ResponsiveContainer>
          <BarChart data={client.trainingLog}><CartesianGrid strokeDasharray="3 3" stroke={T.mist} /><XAxis dataKey="week" tick={{ fontSize: 11, fill: "#6B7280" }} /><YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={50} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v.toLocaleString()} lbs`, "Volume"]} /><Bar dataKey="volume" fill={T.accent} radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer></div></Card>
      )}
    </div>
  )
}


function ClientView({ client, onLogout }) {
  const mobile = useIsMobile()
  const [page, setPage] = useAppHistory("home")
  return (
    <div style={{ fontFamily: T.sans, backgroundColor: T.warmBg, minHeight: "100vh" }}>
      <NavBar active={page} onNav={setPage} name={client.name} tabs={["Home", "Programming", "Assessments", "Progress"]} onLogout={onLogout} />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: mobile ? "0 16px 60px" : "0 24px 60px" }}>
        {page === "home" && <ClientHome client={client} onNav={setPage} />}
        {page === "programming" && <ProgramView client={client} />}
        {page === "assessments" && <AssessmentView client={client} />}
        {page === "progress" && <ProgressView client={client} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// STAFF VIEWS
// ═══════════════════════════════════════════

function Roster({ clients, onSelect }) {
  const mobile = useIsMobile()
  const active = clients.filter(c => c.status === "active")
  const totalSessions = active.reduce((s, c) => s + c.programming.days.length, 0)
  const done = active.reduce((s, c) => s + c.programming.days.filter(d => d.completed).length, 0)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Clients</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{active.length} active, {totalSessions} sessions this week ({done} done)</div></div>
      <Grid cols={3} mobileCols={1} gap={12}>
        <Card><Label color="#6B7280">Active Clients</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{active.length}</div></Card>
        <Card><Label color="#6B7280">Sessions This Week</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{done}/{totalSessions}</div></Card>
        <Card><Label color="#6B7280">Kinstretch Thu 9 AM</Label><div style={{ fontSize: 16, fontWeight: 600, color: T.accent }}>{clients.filter(c => c.programming.days.some(d => d.focus.includes("Kinstretch"))).length} enrolled</div></Card>
      </Grid>
      {active.map(c => {
        const nextDay = c.programming.days.find(d => !d.completed)
        return (
          <Card key={c.id} onClick={() => onSelect(c.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={c.name} size={40} />
                <div><div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{c.name}</div><div style={{ fontSize: 12, color: "#6B7280" }}>{c.plan}, {c.programming.phase}</div></div>
              </div>
              {!mobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280" }}>THIS WEEK</div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.programming.days.filter(d => d.completed).length}/{c.programming.days.length}</div></div>
                  {nextDay && <div style={{ textAlign: "right" }}><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280" }}>NEXT</div><div style={{ fontSize: 12, color: T.accent, fontWeight: 500 }}>{nextDay.day}, {nextDay.date}</div></div>}
                  <span style={{ fontSize: 16, color: "#9CA3AF" }}>→</span>
                </div>
              )}
            </div>
            {c.notes.length > 0 && <div style={{ marginTop: 12, padding: "8px 12px", backgroundColor: T.warmBg, borderRadius: T.r.sm }}><span style={{ fontSize: 11, color: "#6B7280" }}>Last note ({c.notes[0].date}): </span><span style={{ fontSize: 11, color: T.ink }}>{c.notes[0].text.length > 100 ? c.notes[0].text.slice(0, 100) + "..." : c.notes[0].text}</span></div>}
          </Card>
        )
      })}
    </div>
  )
}

function ClientDetail({ client, onBack, userName, onRefresh, role = "owner" }) {
  const mobile = useIsMobile()
  const [tab, setTab] = useState("sessions")
  const [newNote, setNewNote] = useState("")
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSaveNote() {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      if (!USE_MOCK) {
        await db.addNote(client.id, userName, newNote)
        if (onRefresh) await onRefresh()
      }
      setNewNote("")
      setShowNoteForm(false)
    } catch (err) { console.error("Failed to save note:", err) }
    setSaving(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slideUp 0.3s ease" }}>
      <div style={{ padding: "20px 0 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.accent, fontWeight: 500, padding: 0, fontFamily: T.sans, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>← Back to roster</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={client.name} size={48} />
          <div><h1 style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: T.ink, margin: 0 }}>{client.name}</h1><div style={{ fontSize: 13, color: "#6B7280" }}>{client.plan}, Started {client.startDate}, {client.programming.phase}</div></div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>{client.goals.map((g, i) => <span key={i} style={{ fontSize: 11, color: T.ink, backgroundColor: T.accentLight, padding: "4px 10px", borderRadius: 20 }}>{g}</span>)}</div>
      </div>
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.mist}`, paddingBottom: 8, overflowX: "auto" }}>
        {(role === "owner" ? ["sessions", "financials", "program", "assessments", "notes"] : ["sessions", "program", "assessments", "notes"]).map(t => <Btn key={t} active={tab === t} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</Btn>)}
      </div>
      {tab === "sessions" && <SessionHistoryView client={client} />}
      {tab === "financials" && <FinancialsView client={client} />}
      {tab === "program" && <ProgramView client={client} editable />}
      {tab === "assessments" && <AssessmentView client={client} />}
      {tab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Label>Session Notes</Label><Btn active onClick={() => setShowNoteForm(!showNoteForm)} color={T.accent}>+ Add Note</Btn></div>
          {showNoteForm && (
            <Card accent>
              <Textarea value={newNote} onChange={setNewNote} placeholder="Session notes... (what you worked on, what to watch for, load changes)" />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn active onClick={handleSaveNote} color={T.accent}>{saving ? "Saving..." : "Save Note"}</Btn>
                <Btn onClick={() => { setNewNote(""); setShowNoteForm(false) }}>Cancel</Btn>
              </div>
            </Card>
          )}
          {client.notes.map((n, i) => (
            <Card key={i}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{n.from}</span><span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF" }}>{n.date}</span></div><p style={{ fontSize: 13, color: "#4B5563", margin: 0, lineHeight: 1.5 }}>{n.text}</p></Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionHistoryView({ client }) {
  const mobile = useIsMobile()
  const sessions = client.sessionHistory || []
  if (!sessions.length) return <div style={{ padding: "60px 0", textAlign: "center" }}><div style={{ fontSize: 16, color: "#6B7280" }}>No session history.</div></div>

  const grouped = {}
  sessions.forEach(s => {
    const d = new Date(s.date + "T12:00:00")
    const key = d.toLocaleDateString("en-US", { year: "numeric", month: "long" })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  const months = Object.keys(grouped).reverse()
  const totalSessions = sessions.length
  const firstDate = new Date(sessions[0].date + "T12:00:00")
  const lastDate = new Date(sessions[sessions.length - 1].date + "T12:00:00")
  const totalWeeks = Math.max(1, Math.round((lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000)))
  const avgPerWeek = (totalSessions / totalWeeks).toFixed(1)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: T.ink, margin: 0 }}>Session History</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{totalSessions} total sessions since {firstDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div></div>
      <Grid cols={3} mobileCols={1} gap={12}>
        <Card><Label color="#6B7280">Total Sessions</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{totalSessions}</div></Card>
        <Card><Label color="#6B7280">Avg / Week</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.accent }}>{avgPerWeek}</div></Card>
        <Card><Label color="#6B7280">Active Since</Label><div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div></Card>
      </Grid>
      {months.map(month => (
        <Card key={month}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Label>{month}</Label>
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.accent }}>{grouped[month].length} sessions</span>
          </div>
          {grouped[month].reverse().map((s, i) => {
            const d = new Date(s.date + "T12:00:00")
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: i % 2 === 0 ? T.warmBg : T.white, borderRadius: T.r.sm }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: "#6B7280", minWidth: 80 }}>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span style={{ fontSize: 13, color: T.ink }}>{s.note}</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.accent, backgroundColor: `${T.accent}18`, padding: "3px 8px", borderRadius: 10, fontFamily: T.mono }}>{s.type}</span>
              </div>
            )
          })}
        </Card>
      ))}
    </div>
  )
}

function FinancialsView({ client }) {
  const mobile = useIsMobile()
  const fin = client.financials
  if (!fin) return <div style={{ padding: "60px 0", textAlign: "center" }}><div style={{ fontSize: 16, color: "#6B7280" }}>No financial data.</div></div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color: T.ink, margin: 0 }}>Financials</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Package purchases and session balance</div></div>
      <Grid cols={4} mobileCols={2} gap={12}>
        <Card><Label color="#6B7280">Lifetime Revenue</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>${fin.totalSpent.toLocaleString()}</div></Card>
        <Card><Label color="#6B7280">Sessions Purchased</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{fin.totalPurchased}</div></Card>
        <Card><Label color="#6B7280">Sessions Used</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.accent }}>{fin.totalUsed}</div></Card>
        <Card><Label color="#6B7280">Balance</Label><div style={{ fontSize: 28, fontWeight: 700, color: fin.balance < 0 ? T.red : T.green }}>{fin.balance}</div>{fin.balance < 0 && <div style={{ fontSize: 11, color: T.red, marginTop: 2 }}>Needs new pack</div>}</Card>
      </Grid>
      <Card>
        <Label>Package History</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {!mobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px", gap: 8, padding: "8px 12px", backgroundColor: T.warmCloud, borderRadius: "6px 6px 0 0" }}>
              {["DATE", "SESSIONS", "AMOUNT", "STATUS"].map(h => <span key={h} style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5 }}>{h}</span>)}
            </div>
          )}
          {fin.packages.map((p, i) => {
            const d = new Date(p.date + "T12:00:00")
            const isLatest = i === fin.packages.length - 1
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 100px 100px 100px", gap: 8, padding: "10px 12px", backgroundColor: i % 2 === 0 ? T.white : T.warmBg, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <span style={{ fontFamily: T.mono, fontSize: 13, color: "#6B7280" }}>{p.sessions} sessions</span>
                {!mobile && <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.ink }}>${p.amount}</span>}
                {!mobile && <span style={{ fontSize: 9, fontWeight: 700, color: isLatest ? T.amber : T.green, backgroundColor: isLatest ? `${T.amber}18` : `${T.green}18`, padding: "3px 8px", borderRadius: 10, fontFamily: T.mono, textAlign: "center" }}>{isLatest ? "ACTIVE" : "USED"}</span>}
              </div>
            )
          })}
        </div>
      </Card>
      <Card style={{ backgroundColor: T.warmCloud, border: "none" }}>
        <Label color="#6B7280">Per Session Cost</Label>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>${(fin.totalSpent / fin.totalUsed).toFixed(0)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6B7280" }}>avg per session</span></div>
      </Card>
    </div>
  )
}

function ScheduleView({ clients }) {
  const mobile = useIsMobile()
  const dayMap = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" }
  const schedule = ["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
    const sessions = []
    clients.forEach(c => c.programming.days.forEach(day => { if (day.day === dayMap[d]) sessions.push({ client: c.name, focus: day.focus, completed: day.completed }) }))
    if (d === "Thu") {
      const kin = clients.filter(c => c.programming.days.some(day => day.focus.includes("Kinstretch")))
      if (kin.length) sessions.unshift({ client: `Kinstretch (${kin.length})`, focus: "9:00 AM Group", isClass: true })
    }
    return { day: d, sessions }
  })

  if (mobile) {
    // Mobile: vertical list
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease" }}>
        <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>This Week</h1></div>
        {schedule.filter(s => s.sessions.length > 0).map(s => (
          <Card key={s.day}>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 0.5, marginBottom: 10 }}>{s.day}</div>
            {s.sessions.map((sess, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < s.sessions.length - 1 ? `1px solid ${T.mist}` : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{sess.client}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{sess.focus}</div>
                {!sess.isClass && <span style={{ fontSize: 9, fontWeight: 700, color: sess.completed ? T.green : T.amber }}>{sess.completed ? "DONE" : "UPCOMING"}</span>}
              </div>
            ))}
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>This Week</h1></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {schedule.map(s => (
          <div key={s.day}>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.ink, marginBottom: 8, letterSpacing: 0.5, textAlign: "center", padding: "8px 0", backgroundColor: T.warmCloud, borderRadius: T.r.sm }}>{s.day}</div>
            {!s.sessions.length && <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", padding: 16 }}>No sessions</div>}
            {s.sessions.map((sess, i) => (
              <div key={i} style={{ backgroundColor: sess.isClass ? `${T.purple}10` : T.white, border: `1px solid ${sess.isClass ? T.purple + "30" : T.mist}`, borderRadius: T.r.sm, padding: 10, marginBottom: 6, boxShadow: T.shadow.sm }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{sess.client}</div>
                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{sess.focus}</div>
                {!sess.isClass && <div style={{ marginTop: 4 }}><span style={{ fontSize: 9, fontWeight: 700, color: sess.completed ? T.green : T.amber }}>{sess.completed ? "DONE" : "UPCOMING"}</span></div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// HOURS TRACKER (shared component)
// ═══════════════════════════════════════════

// Mock hours data for demo mode
const MOCK_HOURS = [
  { id: "h1", date: "2026-03-24", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h2", date: "2026-03-17", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h3", date: "2026-03-10", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h4", date: "2026-03-05", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h5", date: "2026-02-26", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h6", date: "2026-02-24", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h7", date: "2026-02-12", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
  { id: "h8", date: "2026-02-10", clientName: "#575", clientId: "client-575", type: "training", hours: 1, note: "Personal Training 60 min" },
]

const ENTRY_TYPES = [
  { value: "training", label: "Training", color: T.accent },
  { value: "programming", label: "Programming", color: T.purple },
  { value: "kinstretch", label: "Kinstretch", color: T.amber },
  { value: "admin", label: "Admin", color: "#6B7280" },
]

function HoursLogForm({ clients, onSave, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [clientId, setClientId] = useState("")
  const [entryType, setEntryType] = useState("training")
  const [hours, setHours] = useState("1")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hours || parseFloat(hours) <= 0) return
    setSaving(true)
    await onSave({ date, clientId: clientId || null, entryType, hours: parseFloat(hours), note })
    setSaving(false)
    setNote("")
    setHours("1")
  }

  return (
    <Card accent style={{ animation: "slideUp 0.3s ease" }}>
      <Label>Log Hours</Label>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>DATE</label>
            <Input value={date} onChange={setDate} type="date" />
          </div>
          <div>
            <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>HOURS</label>
            <Input value={hours} onChange={setHours} type="number" placeholder="1" style={{ textAlign: "center" }} />
          </div>
        </div>
        <div>
          <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>TYPE</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ENTRY_TYPES.map(t => (
              <Btn key={t.value} small active={entryType === t.value} onClick={() => setEntryType(t.value)} color={t.color}>{t.label}</Btn>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>CLIENT (optional)</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} style={{
            width: "100%", padding: "11px 14px", border: `1px solid ${T.mist}`, borderRadius: T.r.sm,
            fontSize: 14, fontFamily: T.sans, outline: "none", backgroundColor: T.white, appearance: "auto",
          }}>
            <option value="">General / No specific client</option>
            {clients.filter(c => c.status === "active").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>NOTE</label>
          <Input value={note} onChange={setNote} placeholder="What did you work on?" />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button type="submit" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accentDeep})`, color: T.white, border: "none", padding: "10px 20px", borderRadius: T.r.sm, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.sans, boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
            {saving ? "Saving..." : "Log Hours"}
          </button>
          {onCancel && <Btn onClick={onCancel}>Cancel</Btn>}
        </div>
      </form>
    </Card>
  )
}

function HoursTable({ entries, showDelete, onDelete }) {
  const mobile = useIsMobile()
  if (!entries.length) return <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF" }}>No hours logged yet.</div>

  // Group by date
  const grouped = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Object.entries(grouped).map(([date, items]) => {
        const dayTotal = items.reduce((s, e) => s + e.hours, 0)
        const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        return (
          <div key={date}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", marginBottom: 4 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.ink, letterSpacing: 0.5 }}>{dateLabel}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.accent }}>{dayTotal}h</span>
            </div>
            {items.map(e => {
              const typeInfo = ENTRY_TYPES.find(t => t.value === e.type) || ENTRY_TYPES[0]
              return (
                <div key={e.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", backgroundColor: T.warmBg, borderRadius: T.r.sm, marginBottom: 4,
                  flexWrap: "wrap", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: typeInfo.color,
                      backgroundColor: `${typeInfo.color}18`, padding: "3px 8px", borderRadius: 10,
                      fontFamily: T.mono, letterSpacing: 0.5, whiteSpace: "nowrap",
                    }}>{typeInfo.label.toUpperCase()}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{e.clientName}</div>
                      {e.note && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.note}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.ink }}>{e.hours}h</span>
                    {showDelete && <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", fontSize: 13, color: "#D1D5DB", cursor: "pointer", padding: 0 }} title="Delete">×</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function exportHoursCSV(entries, filename) {
  const header = "Date,Client,Type,Hours,Note"
  const rows = entries.map(e =>
    `${e.date},"${e.clientName}",${e.type},${e.hours},"${(e.note || "").replace(/"/g, '""')}"`
  )
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename || `kristin-hours-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Trainer's hours view — log and see own hours
function TrainerHoursView({ clients }) {
  const [hours, setHours] = useState(MOCK_HOURS)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!USE_MOCK) {
      setLoading(true)
      db.getHoursLog().then(setHours).catch(console.error).finally(() => setLoading(false))
    }
  }, [])

  async function handleLog(entry) {
    if (USE_MOCK) {
      const newEntry = {
        id: `h${Date.now()}`, date: entry.date,
        clientName: entry.clientId ? (clients.find(c => c.id === entry.clientId)?.name || "General") : "General",
        clientId: entry.clientId, type: entry.entryType, hours: entry.hours, note: entry.note,
      }
      setHours(prev => [newEntry, ...prev])
    } else {
      await db.logHours(entry)
      const updated = await db.getHoursLog()
      setHours(updated)
    }
    setShowForm(false)
  }

  const weekTotal = hours.filter(h => {
    const d = new Date(h.date + "T12:00:00")
    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
    return d >= weekAgo
  }).reduce((s, h) => s + h.hours, 0)

  const trainingHrs = hours.filter(h => h.type === "training").reduce((s, h) => s + h.hours, 0)
  const progHrs = hours.filter(h => h.type === "programming").reduce((s, h) => s + h.hours, 0)

  if (loading) return <Spinner />

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>My Hours</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Track your training and programming time</div></div>
        <Btn active onClick={() => setShowForm(!showForm)} color={T.accent}>{showForm ? "Cancel" : "+ Log Hours"}</Btn>
      </div>

      <Grid cols={3} mobileCols={1} gap={12}>
        <Card><Label color="#6B7280">This Week</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{weekTotal}h</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>of 10h cap</div><div style={{ width: "100%", height: 4, backgroundColor: T.mist, borderRadius: 2, marginTop: 6 }}><div style={{ width: `${Math.min((weekTotal / 10) * 100, 100)}%`, height: 4, backgroundColor: weekTotal > 10 ? T.red : T.accent, borderRadius: 2, transition: "width 0.5s ease" }} /></div></Card>
        <Card><Label color="#6B7280">Training Total</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.accent }}>{trainingHrs}h</div></Card>
        <Card><Label color="#6B7280">Programming Total</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.purple }}>{progHrs}h</div></Card>
      </Grid>

      {showForm && <HoursLogForm clients={clients} onSave={handleLog} onCancel={() => setShowForm(false)} />}

      <Card>
        <Label>Recent Hours</Label>
        <HoursTable entries={hours} />
      </Card>
    </div>
  )
}

// Owner's hours view — see all hours with CSV export
function OwnerHoursView({ clients }) {
  const mobile = useIsMobile()
  const [hours, setHours] = useState(MOCK_HOURS)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState("all")

  useEffect(() => {
    if (!USE_MOCK) {
      setLoading(true)
      db.getHoursLog().then(setHours).catch(console.error).finally(() => setLoading(false))
    }
  }, [])

  async function handleDelete(id) {
    if (USE_MOCK) {
      setHours(prev => prev.filter(h => h.id !== id))
    } else {
      await db.deleteHoursEntry(id)
      const updated = await db.getHoursLog()
      setHours(updated)
    }
  }

  // Filtered entries
  const filtered = useMemo(() => {
    if (dateRange === "all") return hours
    const now = new Date()
    const cutoff = new Date(now)
    if (dateRange === "week") cutoff.setDate(now.getDate() - 7)
    if (dateRange === "month") cutoff.setMonth(now.getMonth() - 1)
    return hours.filter(h => new Date(h.date + "T12:00:00") >= cutoff)
  }, [hours, dateRange])

  const totalHrs = filtered.reduce((s, h) => s + h.hours, 0)
  const trainingHrs = filtered.filter(h => h.type === "training").reduce((s, h) => s + h.hours, 0)
  const progHrs = filtered.filter(h => h.type === "programming").reduce((s, h) => s + h.hours, 0)
  const kinHrs = filtered.filter(h => h.type === "kinstretch").reduce((s, h) => s + h.hours, 0)
  const adminHrs = filtered.filter(h => h.type === "admin").reduce((s, h) => s + h.hours, 0)

  // Pay calculation
  const trainingPay = trainingHrs * 40
  const progPay = progHrs * 25
  const kinPay = kinHrs * 40
  const totalPay = trainingPay + progPay + kinPay

  if (loading) return <Spinner />

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "24px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Kristin Hours</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Time tracking and payroll</div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "all", label: "All" }].map(r => (
              <Btn key={r.id} small active={dateRange === r.id} onClick={() => setDateRange(r.id)}>{r.label}</Btn>
            ))}
          </div>
          <Btn active onClick={() => exportHoursCSV(filtered)} color={T.ink}>Export CSV</Btn>
        </div>
      </div>

      <Grid cols={4} mobileCols={2} gap={12}>
        <Card><Label color="#6B7280">Total Hours</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{totalHrs}h</div></Card>
        <Card><Label color={T.accent}>Training</Label><div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{trainingHrs}h</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>${trainingPay} @ $40/hr</div></Card>
        <Card><Label color={T.purple}>Programming</Label><div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{progHrs}h</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>${progPay} @ $25/hr</div></Card>
        <Card style={{ background: `linear-gradient(135deg, ${T.warmCloud}, #CCFBF120)` }}><Label color={T.accent}>Total Pay</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.green }}>${totalPay}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{kinHrs > 0 ? `+ ${kinHrs}h kinstretch ($${kinPay})` : ""}{adminHrs > 0 ? ` · ${adminHrs}h admin` : ""}</div></Card>
      </Grid>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Label>Hours Log</Label>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: "#6B7280" }}>{filtered.length} entries</span>
        </div>
        <HoursTable entries={filtered} showDelete onDelete={handleDelete} />
      </Card>
    </div>
  )
}

function TrainerView({ onLogout, allClients, onRefresh }) {
  const mobile = useIsMobile()
  const [page, setPage] = useAppHistory("roster")
  const [selectedClient, setSelectedClient] = useState(null)
  const client = selectedClient ? allClients.find(c => c.id === selectedClient) : null
  return (
    <div style={{ fontFamily: T.sans, backgroundColor: T.warmBg, minHeight: "100vh" }}>
      <NavBar active={selectedClient ? "roster" : page} onNav={p => { setPage(p); setSelectedClient(null) }} name="Kristin" label="AH FIT TRAINER" labelColor={T.amber} tabs={["Roster", "Schedule", "Hours"]} onLogout={onLogout} />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: mobile ? "0 16px 60px" : "0 24px 60px" }}>
        {page === "roster" && !selectedClient && <Roster clients={allClients} onSelect={setSelectedClient} />}
        {page === "roster" && client && <ClientDetail client={client} onBack={() => setSelectedClient(null)} userName="Kristin" onRefresh={onRefresh} role="trainer" />}
        {page === "schedule" && <ScheduleView clients={allClients} />}
        {page === "hours" && <TrainerHoursView clients={allClients} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// OWNER VIEW
// ═══════════════════════════════════════════

function OwnerOverview({ clients, onNav, onSelectClient }) {
  const mobile = useIsMobile()
  const active = clients.filter(c => c.status === "active")
  const totalSessions = active.reduce((s, c) => s + c.programming.days.length, 0)
  const done = active.reduce((s, c) => s + c.programming.days.filter(d => d.completed).length, 0)
  const assessed = active.filter(c => c.assessments.length > 0).length
  const revenue = active.filter(c => c.pack).reduce((s, c) => s + c.pack.price, 0)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slideUp 0.3s ease" }}>
      <div style={{ padding: "24px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Active Health Fit Overview</h1></div>
      <Grid cols={4} mobileCols={2} gap={12}>
        <Card><Label color="#6B7280">Active Clients</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{active.length}</div></Card>
        <Card><Label color="#6B7280">Weekly Sessions</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{done}/{totalSessions}</div><div style={{ width: "100%", height: 4, backgroundColor: T.mist, borderRadius: 2, marginTop: 8 }}><div style={{ width: `${totalSessions ? (done / totalSessions) * 100 : 0}%`, height: 4, backgroundColor: T.accent, borderRadius: 2, transition: "width 0.5s ease" }} /></div></Card>
        <Card><Label color="#6B7280">Assessed</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{assessed}/{active.length}</div></Card>
        <Card><Label color="#6B7280">Pack Revenue</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.green }}>${revenue.toLocaleString()}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{active.filter(c => c.pack).length} active packs</div></Card>
      </Grid>
      <Card>
        <Label>Kristin Hours Tracker</Label>
        <Grid cols={3} mobileCols={1} gap={16}>
          <div><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", marginBottom: 4 }}>THIS WEEK</div><div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{totalSessions} hrs</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>of 10 hr cap</div><div style={{ width: "100%", height: 4, backgroundColor: T.mist, borderRadius: 2, marginTop: 6 }}><div style={{ width: `${Math.min((totalSessions / 10) * 100, 100)}%`, height: 4, backgroundColor: totalSessions > 10 ? T.red : T.accent, borderRadius: 2, transition: "width 0.5s ease" }} /></div></div>
          <div><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", marginBottom: 4 }}>TRAINING PAY</div><div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>${totalSessions * 40}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{totalSessions} hrs x $40/hr</div></div>
          <div><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", marginBottom: 4 }}>PROGRAMMING PAY</div><div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>${active.length * 25}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{active.length} clients x $25/hr</div></div>
        </Grid>
      </Card>
      <Card>
        <Label>Session Packs</Label>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>10-session packs · click a client for details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.filter(c => c.pack).map(c => {
            const p = c.pack, remaining = p.total - p.used, pct = (p.used / p.total) * 100
            const low = remaining <= 2
            const perSession = (p.price / p.total).toFixed(0)
            return (
              <div key={c.id} onClick={() => onSelectClient(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: T.r.md, border: `1px solid ${low ? "#FDE68A" : T.mist}`, background: low ? "#FFFBEB" : "white", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadow.sm; e.currentTarget.style.transform = "translateY(-1px)" }} onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none" }}>
                <Avatar name={c.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{c.name}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: low ? T.amber : "#6B7280" }}>{remaining} left</span>
                  </div>
                  <div style={{ width: "100%", height: 4, backgroundColor: T.mist, borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: 4, backgroundColor: low ? T.amber : T.accent, borderRadius: 2, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF" }}>{p.used}/{p.total} used · ${perSession}/session</span>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: p.tier === "Founders Club" ? T.accent : "#9CA3AF" }}>{p.tier} · ${p.price}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {(() => {
          const packs = active.filter(c => c.pack)
          const totalRevenue = packs.reduce((s, c) => s + c.pack.price, 0)
          const totalUsed = packs.reduce((s, c) => s + c.pack.used, 0)
          const totalSess = packs.reduce((s, c) => s + c.pack.total, 0)
          return (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.mist}`, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: "#6B7280" }}>{totalUsed}/{totalSess} total sessions used across {packs.length} packs</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.green }}>${totalRevenue} collected</span>
            </div>
          )
        })()}
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><Label>Client Roster</Label><button onClick={() => onNav("clients")} style={{ background: "none", border: "none", fontSize: 12, color: T.accent, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>View all →</button></div>
        {active.map(c => (
          <div key={c.id} onClick={() => onSelectClient(c.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.mist}`, flexWrap: "wrap", gap: 8, cursor: "pointer", borderRadius: T.r.sm, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = T.warmCloud} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={c.name} size={28} /><span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{c.name}</span>{!mobile && <span style={{ fontSize: 11, color: "#6B7280" }}>{c.plan}</span>}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontFamily: T.mono, fontSize: 11, color: c.assessments.length ? T.green : T.amber }}>{c.assessments.length ? "Assessed" : "No assessment"}</span><span style={{ fontFamily: T.mono, fontSize: 11, color: "#6B7280" }}>{c.programming.days.filter(d => d.completed).length}/{c.programming.days.length} done</span><span style={{ fontSize: 11, color: "#9CA3AF" }}>→</span></div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function AddClientForm({ onSave, onCancel }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("")
  const [goals, setGoals] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        full_name: name.trim(), email: email.trim() || null,
        plan: plan.trim(), goals: goals.split("\n").map(g => g.trim()).filter(Boolean), status: "active",
      })
    } catch (err) { console.error("Failed to add client:", err) }
    setSaving(false)
  }

  return (
    <Card accent style={{ animation: "slideUp 0.3s ease" }}>
      <Label>Add New Client</Label>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>FULL NAME *</label><Input value={name} onChange={setName} placeholder="Sarah Mitchell" /></div>
        <div><label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>EMAIL (for login)</label><Input value={email} onChange={setEmail} placeholder="sarah@email.com" type="email" /></div>
        <div><label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>TRAINING PLAN</label><Input value={plan} onChange={setPlan} placeholder="2x/week, Tue/Thu" /></div>
        <div><label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>GOALS (one per line)</label><Textarea value={goals} onChange={setGoals} placeholder={"Improve hip stability\nDeadlift 185 lbs\nRun pain-free 5K"} rows={3} /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn active onClick={() => {}} color={T.accent}>{saving ? "Saving..." : "Add Client"}</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
      </form>
    </Card>
  )
}

function ImportTool({ onDone }) {
  const [csv, setCsv] = useState("")
  const [status, setStatus] = useState("")
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    if (!csv.trim()) return
    setImporting(true)
    setStatus("Parsing CSV...")
    try {
      const lines = csv.trim().split("\n")
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase())
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim())
        const obj = {}
        headers.forEach((h, i) => { obj[h] = vals[i] || "" })
        return obj
      })
      let created = 0
      for (const row of rows) {
        const clientData = {
          full_name: row.name || row.full_name || "",
          email: row.email || null, plan: row.plan || "",
          goals: (row.goals || "").split(";").map(g => g.trim()).filter(Boolean),
          status: "active", start_date: row.start_date || new Date().toISOString().split("T")[0],
          next_session: row.next_session || "",
        }
        if (!clientData.full_name) continue
        if (!USE_MOCK) { await db.createClient(clientData) }
        created++
        setStatus(`Created ${created} of ${rows.length}...`)
      }
      setStatus(`Done. ${created} clients imported.`)
      setTimeout(() => { if (onDone) onDone() }, 1500)
    } catch (err) { setStatus(`Error: ${err.message}`) }
    setImporting(false)
  }

  return (
    <Card accent style={{ animation: "slideUp 0.3s ease" }}>
      <Label>Import Clients from CSV</Label>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 12, lineHeight: 1.5 }}>
        Paste CSV with headers: <strong>name, email, plan, goals, start_date, next_session</strong><br />
        Goals separated with semicolons.
      </p>
      <div style={{ fontSize: 11, fontFamily: T.mono, color: "#4B5563", backgroundColor: T.warmBg, padding: 12, borderRadius: T.r.sm, marginBottom: 12, lineHeight: 1.6, overflowX: "auto" }}>
        name,email,plan,goals,start_date,next_session<br />
        Sarah Mitchell,sarah@gmail.com,2x/week Tue/Thu,Hip stability;Deadlift 185,2025-11-04,Thu Mar 13 10AM
      </div>
      <Textarea value={csv} onChange={setCsv} placeholder="Paste your CSV here..." rows={6} />
      {status && <div style={{ fontSize: 12, color: importing ? "#6B7280" : status.startsWith("Error") ? T.red : T.green, marginTop: 8 }}>{status}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><Btn active onClick={handleImport} color={T.accent}>{importing ? "Importing..." : "Import"}</Btn><Btn onClick={onDone}>Close</Btn></div>
    </Card>
  )
}

function OwnerView({ onLogout, allClients, onRefresh }) {
  const mobile = useIsMobile()
  const [page, setPage] = useAppHistory("overview")
  const [selectedClient, setSelectedClient] = useState(null)
  const [showAddClient, setShowAddClient] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const client = selectedClient ? allClients.find(c => c.id === selectedClient) : null

  async function handleAddClient(clientData) {
    if (!USE_MOCK) { await db.createClient(clientData); if (onRefresh) await onRefresh() }
    setShowAddClient(false)
  }

  return (
    <div style={{ fontFamily: T.sans, backgroundColor: T.warmBg, minHeight: "100vh" }}>
      <NavBar active={selectedClient ? "clients" : page} onNav={p => { setPage(p); setSelectedClient(null); setShowAddClient(false); setShowImport(false) }} name="Dr. Simunac" label="AH FIT ADMIN" labelColor={T.red} tabs={["Overview", "Clients", "Hours", "Schedule"]} onLogout={onLogout} />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: mobile ? "0 16px 60px" : "0 24px 60px" }}>
        {page === "overview" && <OwnerOverview clients={allClients} onNav={setPage} onSelectClient={(id) => { setPage("clients"); setSelectedClient(id) }} />}
        {page === "clients" && !selectedClient && !showAddClient && !showImport && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "24px 0 12px", gap: 8 }}>
              <Btn active onClick={() => setShowAddClient(true)} color={T.accent}>+ Add Client</Btn>
              <Btn onClick={() => setShowImport(true)}>Import CSV</Btn>
            </div>
            <Roster clients={allClients} onSelect={setSelectedClient} />
          </>
        )}
        {page === "clients" && showAddClient && <div style={{ paddingTop: 24 }}><AddClientForm onSave={handleAddClient} onCancel={() => setShowAddClient(false)} /></div>}
        {page === "clients" && showImport && <div style={{ paddingTop: 24 }}><ImportTool onDone={async () => { setShowImport(false); if (onRefresh) await onRefresh() }} /></div>}
        {page === "clients" && client && <ClientDetail client={client} onBack={() => setSelectedClient(null)} userName="Dr. Simunac" onRefresh={onRefresh} />}
        {page === "hours" && <OwnerHoursView clients={allClients} />}
        {page === "schedule" && <ScheduleView clients={allClients} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!USE_MOCK)
  const [allClients, setAllClients] = useState(MOCK_CLIENTS)
  const [dataLoading, setDataLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (USE_MOCK) return
    setDataLoading(true)
    try {
      const clients = await db.loadAllClients()
      setAllClients(clients.length ? clients : MOCK_CLIENTS)
    } catch (err) { console.error("Failed to load data:", err); setAllClients(MOCK_CLIENTS) }
    setDataLoading(false)
  }, [])

  // Helper to resolve user from session
  async function resolveUser(session) {
    if (!session?.user) return null
    try {
      const profile = await db.getProfile(session.user.id)
      const userData = { id: session.user.id, email: session.user.email, role: profile.role, name: profile.full_name }
      if (profile.role === "client") {
        const clientRecord = await db.getClientByProfileId(session.user.id)
        if (clientRecord) userData.clientId = clientRecord.id
      }
      return userData
    } catch {
      return { id: session.user.id, email: session.user.email, role: "client", name: session.user.email }
    }
  }

  useEffect(() => {
    if (USE_MOCK) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = await resolveUser(session)
      if (u) setUser(u)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = await resolveUser(session)
        if (u) setUser(u)
      } else { setUser(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user && !USE_MOCK) loadData() }, [user, loadData])

  function handleLogout() {
    if (!USE_MOCK) supabase.auth.signOut()
    setUser(null); setAllClients(MOCK_CLIENTS)
    window.history.replaceState(null, "", window.location.pathname)
  }

  if (loading) return <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: "#6B7280" }}>Loading...</div>
  if (!user) return <LoginScreen onMockLogin={setUser} />
  if (dataLoading) return <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: "#6B7280", gap: 12 }}><Spinner /><span>Loading your dashboard...</span></div>

  const clientData = user.role === "client" ? allClients.find(c => c.id === user.clientId) || allClients[0] : null

  return (
    <AuthContext.Provider value={user}>
      <DataContext.Provider value={{ allClients, refresh: loadData }}>
        {user.role === "owner" && <OwnerView onLogout={handleLogout} allClients={allClients} onRefresh={loadData} />}
        {user.role === "trainer" && <TrainerView onLogout={handleLogout} allClients={allClients} onRefresh={loadData} />}
        {user.role === "client" && clientData && <ClientView client={clientData} onLogout={handleLogout} />}
        <div style={{ borderTop: `1px solid ${T.mist}`, padding: "16px 24px", textAlign: "center" }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF", letterSpacing: 0.5 }}>ACTIVE HEALTH FIT · POWERED BY ACTIVE HEALTH SPINE & SPORT</span>
        </div>
      </DataContext.Provider>
    </AuthContext.Provider>
  )
}
