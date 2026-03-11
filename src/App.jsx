import { useState, useEffect, useMemo, createContext, useContext } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { supabase } from "./lib/supabase"
import { T, flagColor, flagLabel } from "./lib/tokens"

// ── Auth Context ──
const AuthContext = createContext(null)
function useAuth() { return useContext(AuthContext) }

// ── Use mock data when Supabase isn't configured ──
const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://your-project.supabase.co'

// ── Mock Data ──
const MOCK_USERS = {
  "damir@activehealthchicago.com": { id: "u1", email: "damir@activehealthchicago.com", role: "owner", name: "Dr. Simunac" },
  "kristin@activehealthchicago.com": { id: "u2", email: "kristin@activehealthchicago.com", role: "trainer", name: "Kristin" },
  "sarah.m@gmail.com": { id: "u3", email: "sarah.m@gmail.com", role: "client", name: "Sarah Mitchell", clientId: "sarah-mitchell" },
  "mike.chen@email.com": { id: "u4", email: "mike.chen@email.com", role: "client", name: "Mike Chen", clientId: "mike-chen" },
  "jenny.p@email.com": { id: "u5", email: "jenny.p@email.com", role: "client", name: "Jenny Park", clientId: "jenny-park" },
  "tom.russo@email.com": { id: "u6", email: "tom.russo@email.com", role: "client", name: "Tom Russo", clientId: "tom-russo" },
}

const ALL_CLIENTS = [
  {
    id: "sarah-mitchell", name: "Sarah Mitchell", email: "sarah.m@gmail.com",
    startDate: "2025-11-04", plan: "2x/week, Tue/Thu", status: "active",
    nextSession: "Thu, Mar 13, 10:00 AM",
    goals: ["Improve hip stability", "Deadlift 185 lbs", "Run pain-free 5K"],
    notes: [
      { date: "Mar 11", from: "Kristin", text: "Great session today. Hip hinge is clicking. Add 10 lbs to RDL next week." },
      { date: "Mar 6", from: "Kristin", text: "Shoulder felt tight on overhead press. Swapped for landmine press. Monitor next session." },
      { date: "Feb 27", from: "Dr. Simunac", text: "Assessment update: Left glute med improved 18%. Keep loading single-leg work." },
    ],
    programming: {
      weekLabel: "Week 12, Mar 10-14", phase: "Strength Block B",
      days: [
        { day: "Tuesday", date: "Mar 11", focus: "Lower Body, Posterior Chain", completed: true, blocks: [
          { label: "Warm-Up", exercises: [
            { name: "90/90 Hip Switches", sets: "2", reps: "8 each", load: "BW", note: "" },
            { name: "Dead Bug w/ Band", sets: "2", reps: "8 each", load: "Light band", note: "Exhale fully at bottom" },
            { name: "Banded Clamshell", sets: "2", reps: "12 each", load: "Medium band", note: "" },
          ]},
          { label: "Main Lifts", exercises: [
            { name: "Barbell RDL", sets: "4", reps: "6", load: "115 lbs", note: "Hinge from hips. Bar stays close." },
            { name: "Bulgarian Split Squat", sets: "3", reps: "8 each", load: "30 lb DBs", note: "Control the eccentric. 3 sec down." },
            { name: "Hip Thrust", sets: "3", reps: "10", load: "135 lbs", note: "Pause 2 sec at top. Squeeze." },
          ]},
          { label: "Accessories", exercises: [
            { name: "Single-Leg Calf Raise", sets: "3", reps: "12 each", load: "25 lb DB", note: "" },
            { name: "Pallof Press", sets: "3", reps: "10 each", load: "Cable", note: "Slow and controlled" },
          ]},
        ]},
        { day: "Thursday", date: "Mar 13", focus: "Upper Body, Push/Pull", completed: false, blocks: [
          { label: "Warm-Up", exercises: [
            { name: "Shoulder CARs", sets: "2", reps: "5 each", load: "BW", note: "Full range. Slow." },
            { name: "Band Pull-Apart", sets: "2", reps: "15", load: "Light band", note: "" },
          ]},
          { label: "Main Lifts", exercises: [
            { name: "DB Bench Press", sets: "4", reps: "8", load: "35 lb DBs", note: "Feet flat. Arch natural." },
            { name: "Cable Row", sets: "4", reps: "10", load: "70 lbs", note: "Squeeze shoulder blades 2 sec" },
            { name: "Landmine Press", sets: "3", reps: "8 each", load: "25 lbs + bar", note: "Half-kneeling position" },
          ]},
          { label: "Accessories", exercises: [
            { name: "Face Pull", sets: "3", reps: "15", load: "Cable", note: "" },
            { name: "Farmer Carry", sets: "3", reps: "40 yds", load: "50 lb DBs", note: "Shoulders packed. Breathe." },
          ]},
        ]},
      ],
      attachments: [
        { name: "Week 12 Program.pdf", type: "pdf", size: "142 KB" },
        { name: "Hip Hinge Cues.png", type: "image", size: "89 KB" },
      ]
    },
    assessments: [
      { date: "Feb 27, 2026", type: "Quarterly Reassessment", assessor: "Dr. Simunac",
        summary: "Significant bilateral improvements in hip and glute strength. Left glute med up 18% from baseline. Grip strength stable.",
        metrics: [
          { name: "L Glute Med", prev: 28, now: 33, unit: "lbs", change: "+18%", flag: "improved" },
          { name: "R Glute Med", prev: 34, now: 36, unit: "lbs", change: "+6%", flag: "stable" },
          { name: "L Grip", prev: 62, now: 64, unit: "lbs", change: "+3%", flag: "noise" },
          { name: "R Grip", prev: 68, now: 69, unit: "lbs", change: "+1%", flag: "noise" },
          { name: "L Shoulder ER", prev: 42, now: 48, unit: "deg", change: "+6 deg", flag: "improved" },
          { name: "R Shoulder ER", prev: 50, now: 52, unit: "deg", change: "+2 deg", flag: "noise" },
        ]},
      { date: "Nov 20, 2025", type: "Initial Assessment", assessor: "Dr. Simunac",
        summary: "Baseline established. Notable left glute med weakness (LSI 82%). Good grip strength bilaterally.",
        metrics: [
          { name: "L Glute Med", prev: null, now: 28, unit: "lbs", change: "Baseline", flag: "baseline" },
          { name: "R Glute Med", prev: null, now: 34, unit: "lbs", change: "Baseline", flag: "baseline" },
          { name: "L Grip", prev: null, now: 62, unit: "lbs", change: "Baseline", flag: "baseline" },
          { name: "R Grip", prev: null, now: 68, unit: "lbs", change: "Baseline", flag: "baseline" },
          { name: "L Shoulder ER", prev: null, now: 42, unit: "deg", change: "Baseline", flag: "baseline" },
          { name: "R Shoulder ER", prev: null, now: 50, unit: "deg", change: "Baseline", flag: "baseline" },
        ]},
    ],
    progress: [
      { month: "Nov", lGluteMed: 28, rGluteMed: 34, lGrip: 62, rGrip: 68 },
      { month: "Dec", lGluteMed: 29, rGluteMed: 34, lGrip: 62, rGrip: 68 },
      { month: "Jan", lGluteMed: 30, rGluteMed: 35, lGrip: 63, rGrip: 68 },
      { month: "Feb", lGluteMed: 33, rGluteMed: 36, lGrip: 64, rGrip: 69 },
    ],
    trainingLog: [
      { week: "W9", sessions: 2, volume: 12400 },
      { week: "W10", sessions: 2, volume: 13100 },
      { week: "W11", sessions: 2, volume: 13800 },
      { week: "W12", sessions: 1, volume: 7200 },
    ],
  },
  {
    id: "mike-chen", name: "Mike Chen", email: "mike.chen@email.com",
    startDate: "2026-01-13", plan: "2x/week, Mon/Wed", status: "active",
    nextSession: "Mon, Mar 16, 11:00 AM",
    goals: ["Improve squat depth", "Fix anterior pelvic tilt", "Build core strength"],
    notes: [{ date: "Mar 10", from: "Kristin", text: "Squat depth is improving. Ankle mobility still limiting. Added extra ankle warm-up." }],
    programming: {
      weekLabel: "Week 8, Mar 10-14", phase: "Hypertrophy A",
      days: [
        { day: "Monday", date: "Mar 10", focus: "Full Body, Squat Focus", completed: true, blocks: [
          { label: "Main Lifts", exercises: [
            { name: "Goblet Squat", sets: "4", reps: "8", load: "45 lb KB", note: "Heels elevated on plate" },
            { name: "DB Row", sets: "3", reps: "10 each", load: "40 lb DB", note: "" },
          ]},
        ]},
        { day: "Wednesday", date: "Mar 12", focus: "Full Body, Hinge Focus", completed: false, blocks: [
          { label: "Main Lifts", exercises: [
            { name: "Trap Bar Deadlift", sets: "4", reps: "6", load: "185 lbs", note: "Drive through floor" },
            { name: "Push-Up", sets: "3", reps: "12", load: "BW", note: "" },
          ]},
        ]},
      ],
      attachments: []
    },
    assessments: [
      { date: "Jan 15, 2026", type: "Initial Assessment", assessor: "Dr. Simunac",
        summary: "Baseline. Limited ankle dorsiflexion bilaterally. Core endurance below average.",
        metrics: [
          { name: "L Ankle DF", prev: null, now: 32, unit: "deg", change: "Baseline", flag: "baseline" },
          { name: "R Ankle DF", prev: null, now: 34, unit: "deg", change: "Baseline", flag: "baseline" },
        ]},
    ],
    progress: [
      { month: "Jan", lGluteMed: 30, rGluteMed: 32, lGrip: 70, rGrip: 72 },
      { month: "Feb", lGluteMed: 32, rGluteMed: 33, lGrip: 71, rGrip: 73 },
    ],
    trainingLog: [
      { week: "W6", sessions: 2, volume: 9800 },
      { week: "W7", sessions: 2, volume: 10400 },
      { week: "W8", sessions: 1, volume: 5200 },
    ],
  },
  {
    id: "jenny-park", name: "Jenny Park", email: "jenny.p@email.com",
    startDate: "2025-09-15", plan: "3x/week, Mon/Wed/Fri", status: "active",
    nextSession: "Fri, Mar 14, 9:00 AM",
    goals: ["Half marathon prep", "Prevent runner's knee", "Single-leg strength"],
    notes: [
      { date: "Mar 7", from: "Kristin", text: "Added tempo single-leg RDL. She is nailing the balance work." },
      { date: "Mar 3", from: "Dr. Simunac", text: "Reassessment: LSI improved to 91% on quad. Cleared for increased mileage." },
    ],
    programming: {
      weekLabel: "Week 24, Mar 10-14", phase: "Race Prep Block",
      days: [
        { day: "Monday", date: "Mar 10", focus: "Strength, Lower", completed: true, blocks: [
          { label: "Main Lifts", exercises: [
            { name: "Single-Leg RDL", sets: "3", reps: "8 each", load: "25 lb DB", note: "3 sec eccentric" },
            { name: "Step-Up", sets: "3", reps: "10 each", load: "20 lb DBs", note: "" },
          ]},
        ]},
        { day: "Wednesday", date: "Mar 12", focus: "Power + Core", completed: false, blocks: [
          { label: "Main Lifts", exercises: [
            { name: "Box Jump", sets: "4", reps: "5", load: "20 in box", note: "Soft landing. Step down." },
            { name: "Plank", sets: "3", reps: "45 sec", load: "BW", note: "" },
          ]},
        ]},
        { day: "Friday", date: "Mar 14", focus: "Mobility + Recovery", completed: false, blocks: [
          { label: "Movement", exercises: [
            { name: "Foam Roll IT Band", sets: "1", reps: "2 min each", load: "", note: "" },
            { name: "Hip CARs", sets: "2", reps: "5 each", load: "BW", note: "" },
          ]},
        ]},
      ],
      attachments: []
    },
    assessments: [
      { date: "Mar 3, 2026", type: "Quarterly Reassessment", assessor: "Dr. Simunac",
        summary: "Quad LSI improved to 91%. Cleared for mileage increase. Calf strength still asymmetric.",
        metrics: [
          { name: "L Quad", prev: 45, now: 50, unit: "lbs", change: "+11%", flag: "stable" },
          { name: "R Quad", prev: 52, now: 55, unit: "lbs", change: "+6%", flag: "noise" },
          { name: "L Calf", prev: 38, now: 42, unit: "lbs", change: "+11%", flag: "stable" },
          { name: "R Calf", prev: 48, now: 50, unit: "lbs", change: "+4%", flag: "noise" },
        ]},
    ],
    progress: [
      { month: "Sep", lGluteMed: 25, rGluteMed: 30, lGrip: 55, rGrip: 58 },
      { month: "Dec", lGluteMed: 28, rGluteMed: 31, lGrip: 56, rGrip: 59 },
      { month: "Mar", lGluteMed: 31, rGluteMed: 33, lGrip: 57, rGrip: 60 },
    ],
    trainingLog: [
      { week: "W22", sessions: 3, volume: 11200 },
      { week: "W23", sessions: 3, volume: 11800 },
      { week: "W24", sessions: 1, volume: 4100 },
    ],
  },
  {
    id: "tom-russo", name: "Tom Russo", email: "tom.russo@email.com",
    startDate: "2026-02-10", plan: "1x/week, Thu (Kinstretch)", status: "active",
    nextSession: "Thu, Mar 13, 9:00 AM (Kinstretch)",
    goals: ["Improve hip mobility for golf", "Reduce low back stiffness"],
    notes: [{ date: "Mar 6", from: "Kristin", text: "First Kinstretch class. Struggled with hip CARs range. Good effort." }],
    programming: {
      weekLabel: "Week 4, Mar 10-14", phase: "Kinstretch Foundations",
      days: [
        { day: "Thursday", date: "Mar 13", focus: "Kinstretch Class, 9:00 AM", completed: false, blocks: [
          { label: "Class Work", exercises: [
            { name: "Hip CARs", sets: "3", reps: "5 each", load: "BW", note: "Focus on end-range control" },
            { name: "Spine CARs", sets: "2", reps: "5", load: "BW", note: "" },
            { name: "90/90 PAILs/RAILs", sets: "2", reps: "3 each", load: "BW", note: "20 sec contractions" },
          ]},
        ]},
      ],
      attachments: []
    },
    assessments: [],
    progress: [],
    trainingLog: [
      { week: "W2", sessions: 1, volume: 0 },
      { week: "W3", sessions: 1, volume: 0 },
      { week: "W4", sessions: 0, volume: 0 },
    ],
  },
]

const EXERCISE_LIBRARY = [
  { id: "rdl", name: "Barbell RDL", category: "Hinge" },
  { id: "bss", name: "Bulgarian Split Squat", category: "Squat" },
  { id: "hip-thrust", name: "Hip Thrust", category: "Hinge" },
  { id: "dead-bug", name: "Dead Bug w/ Band", category: "Core" },
  { id: "shoulder-cars", name: "Shoulder CARs", category: "Mobility" },
  { id: "hip-switches", name: "90/90 Hip Switches", category: "Mobility" },
  { id: "hip-cars", name: "Hip CARs", category: "Mobility" },
  { id: "clamshell", name: "Banded Clamshell", category: "Activation" },
  { id: "db-bench", name: "DB Bench Press", category: "Push" },
  { id: "cable-row", name: "Cable Row", category: "Pull" },
  { id: "landmine", name: "Landmine Press", category: "Push" },
  { id: "pallof", name: "Pallof Press", category: "Core" },
  { id: "face-pull", name: "Face Pull", category: "Pull" },
  { id: "farmer-carry", name: "Farmer Carry", category: "Carry" },
  { id: "calf-raise", name: "Single-Leg Calf Raise", category: "Isolation" },
  { id: "pull-apart", name: "Band Pull-Apart", category: "Activation" },
  { id: "goblet-squat", name: "Goblet Squat", category: "Squat" },
  { id: "sl-rdl", name: "Single-Leg RDL", category: "Hinge" },
  { id: "step-up", name: "Step-Up", category: "Squat" },
  { id: "box-jump", name: "Box Jump", category: "Power" },
  { id: "trap-bar-dl", name: "Trap Bar Deadlift", category: "Hinge" },
  { id: "push-up", name: "Push-Up", category: "Push" },
  { id: "plank", name: "Plank", category: "Core" },
  { id: "spine-cars", name: "Spine CARs", category: "Mobility" },
  { id: "90-90-pails", name: "90/90 PAILs/RAILs", category: "Mobility" },
]
const VIDEO_CATS = ["All", "Mobility", "Activation", "Core", "Push", "Pull", "Hinge", "Squat", "Power", "Carry", "Isolation"]

// ── Shared UI Components ──
function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ backgroundColor: T.white, border: `1px solid ${T.mist}`, borderRadius: T.r.md, padding: 20, ...style }}>{children}</div>
}
function Label({ children, color = T.accent }) {
  return <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>{children}</div>
}
function Btn({ children, active, onClick, color = T.accent, small }) {
  return <button onClick={onClick} style={{
    background: active ? color : "transparent", color: active ? T.white : "#6B7280",
    border: `1px solid ${active ? color : T.mist}`, padding: small ? "4px 10px" : "8px 16px",
    borderRadius: T.r.sm, fontSize: small ? 11 : 13, fontWeight: 500, cursor: "pointer", fontFamily: T.sans,
  }}>{children}</button>
}
function Input({ value, onChange, placeholder, style = {}, type = "text" }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
    padding: "10px 14px", border: `1px solid ${T.mist}`, borderRadius: T.r.sm, fontSize: 13, fontFamily: T.sans, outline: "none", width: "100%", boxSizing: "border-box", ...style
  }} />
}
function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{
    padding: "10px 14px", border: `1px solid ${T.mist}`, borderRadius: T.r.sm, fontSize: 13, fontFamily: T.sans, outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical",
  }} />
}
function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map(n => n[0]).join("")
  return <div style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: T.white, flexShrink: 0 }}>{initials}</div>
}

// ═══════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════

function LoginScreen({ onMockLogin }) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e) {
    e.preventDefault()
    setError("")

    if (USE_MOCK) {
      const user = MOCK_USERS[email.toLowerCase()]
      if (user) { onMockLogin(user); return }
      setError("Email not found. Try: damir@activehealthchicago.com, kristin@activehealthchicago.com, or sarah.m@gmail.com")
      return
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (authError) { setError(authError.message); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: T.warmBg }}>
      <div style={{ width: 380, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ACTIVE HEALTH FIT</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, margin: 0 }}>Sign in to your dashboard</h1>
        </div>

        {sent ? (
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Check your email</div>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
              We sent a sign-in link to <strong>{email}</strong>. Click the link to access your dashboard.
            </p>
          </Card>
        ) : (
          <form onSubmit={handleLogin}>
            <Card>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>EMAIL</label>
                <Input value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
              </div>
              {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 12 }}>{error}</div>}
              <button type="submit" style={{
                width: "100%", padding: "12px 0", backgroundColor: T.accent, color: T.white,
                border: "none", borderRadius: T.r.sm, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
              }}>
                {USE_MOCK ? "Sign In (Demo)" : "Send Magic Link"}
              </button>
            </Card>
          </form>
        )}

        {USE_MOCK && (
          <div style={{ marginTop: 20, padding: 16, backgroundColor: T.warmCloud, borderRadius: T.r.sm }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", letterSpacing: 0.5, marginBottom: 8 }}>DEMO ACCOUNTS</div>
            <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.8 }}>
              <strong>Owner:</strong> damir@activehealthchicago.com<br />
              <strong>Trainer:</strong> kristin@activehealthchicago.com<br />
              <strong>Client:</strong> sarah.m@gmail.com
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// CLIENT VIEW
// ═══════════════════════════════════════════

function ClientNav({ active, onNav, client, onLogout }) {
  const tabs = ["Home", "Programming", "Assessments", "Progress", "Videos"]
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: T.ink, padding: "0 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, fontWeight: 700, letterSpacing: 1.5 }}>ACTIVE HEALTH FIT</span>
          <div style={{ display: "flex", gap: 2 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => onNav(t.toLowerCase())} style={{
                background: active === t.toLowerCase() ? T.accentDeep : "transparent",
                color: active === t.toLowerCase() ? T.white : "#9CA3AF",
                border: "none", padding: "6px 14px", borderRadius: T.r.sm, fontSize: 13,
                fontWeight: active === t.toLowerCase() ? 600 : 400, cursor: "pointer", fontFamily: T.sans,
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={client.name} size={30} />
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>{client.name.split(" ")[0]}</span>
          <button onClick={onLogout} style={{ background: "none", border: "none", fontSize: 11, color: "#6B7280", cursor: "pointer", fontFamily: T.sans, marginLeft: 8 }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

function ClientHome({ client, onNav }) {
  const prog = client.programming
  const weeksSinceStart = Math.round((new Date() - new Date(client.startDate)) / (7 * 24 * 60 * 60 * 1000))
  const sessionsThisWeek = prog.days.filter(d => d.completed).length
  const nextDay = prog.days.find(d => !d.completed)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 8px" }}>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: T.ink, margin: 0 }}>Hey {client.name.split(" ")[0]}.</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Card><Label color="#6B7280">Training Week</Label><div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{parseInt(prog.weekLabel.match(/\d+/)?.[0] || "1")}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{weeksSinceStart} weeks total</div></Card>
        <Card><Label color="#6B7280">This Week</Label><div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{sessionsThisWeek} / {prog.days.length}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>sessions done</div></Card>
        <Card><Label color="#6B7280">Next Session</Label><div style={{ fontSize: 14, fontWeight: 600, color: T.accent }}>{client.nextSession.split(",")[0]}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{client.nextSession.split(",").slice(1).join(",").trim()}</div></Card>
      </div>
      {nextDay && (
        <Card style={{ cursor: "pointer", border: `1px solid ${T.accent}22` }} onClick={() => onNav("programming")}>
          <Label>Up Next</Label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{nextDay.day}, {nextDay.date}</div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>{nextDay.focus}</div>
            </div>
            <span style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>View full workout →</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(nextDay.blocks.find(b => b.label === "Main Lifts") || nextDay.blocks[0])?.exercises.map((ex, i) => (
              <span key={i} style={{ fontSize: 11, color: T.ink, backgroundColor: T.warmCloud, padding: "4px 10px", borderRadius: 4 }}>{ex.name}</span>
            ))}
          </div>
        </Card>
      )}
      <Card><Label>Your Goals</Label>{client.goals.map((g, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent, flexShrink: 0 }} /><span style={{ fontSize: 14, color: T.ink }}>{g}</span></div>
      ))}</Card>
      <Card><Label>Recent Notes</Label>{client.notes.map((n, i) => (
        <div key={i} style={{ borderBottom: i < client.notes.length - 1 ? `1px solid ${T.mist}` : "none", paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{n.from}</span><span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF" }}>{n.date}</span></div>
          <p style={{ fontSize: 13, color: "#4B5563", margin: 0, lineHeight: 1.5 }}>{n.text}</p>
        </div>
      ))}</Card>
    </div>
  )
}

function ProgramView({ client, editable = false }) {
  const [expandedDay, setExpandedDay] = useState(0)
  const prog = client.programming
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>{prog.weekLabel}</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{prog.phase}</div></div>
          {editable && <div style={{ display: "flex", gap: 8 }}><Btn active onClick={() => {}} color={T.accent}>+ Add Training Day</Btn><Btn onClick={() => {}}>Upload PDF</Btn></div>}
        </div>
      </div>
      {prog.days.map((day, di) => (
        <Card key={di} style={{ border: expandedDay === di ? `1px solid ${T.accent}` : `1px solid ${T.mist}`, cursor: "pointer" }} onClick={() => setExpandedDay(expandedDay === di ? -1 : di)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{day.day}</span><span style={{ fontSize: 12, color: "#6B7280" }}>{day.date}</span>
                {day.completed && <span style={{ fontSize: 9, fontWeight: 700, color: T.white, backgroundColor: T.green, padding: "2px 8px", borderRadius: 3 }}>DONE</span>}
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
                    <div key={ei} style={{ display: "grid", gridTemplateColumns: editable ? "1fr 70px 80px 40px" : "1fr 70px 80px", gap: 8, alignItems: "center", padding: "10px 12px", backgroundColor: ei % 2 === 0 ? T.warmBg : T.white, borderRadius: 4 }}>
                      <div><div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{ex.name}</div>{ex.note && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{ex.note}</div>}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 12, color: "#6B7280", textAlign: "center" }}>{ex.sets} x {ex.reps}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.ink, fontWeight: 500, textAlign: "center" }}>{ex.load}</div>
                      {editable && <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", cursor: "pointer" }}>✏</span>}
                    </div>
                  ))}
                  {editable && <button style={{ marginTop: 6, background: "none", border: `1px dashed ${T.mist}`, borderRadius: 4, padding: "6px 12px", fontSize: 11, color: "#9CA3AF", cursor: "pointer", width: "100%", fontFamily: T.sans }}>+ Add exercise</button>}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
      {prog.attachments.length > 0 && (
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
          {editable && <button style={{ marginTop: 8, background: "none", border: `1px dashed ${T.mist}`, borderRadius: 4, padding: "8px 14px", fontSize: 12, color: "#9CA3AF", cursor: "pointer", fontFamily: T.sans }}>+ Upload file</button>}
        </Card>
      )}
    </div>
  )
}

function AssessmentView({ client }) {
  const [sel, setSel] = useState(0)
  if (!client.assessments.length) return <div style={{ padding: "60px 0", textAlign: "center" }}><div style={{ fontSize: 16, color: "#6B7280" }}>No assessments yet.</div><div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Your first assessment with Dr. Simunac will appear here.</div></div>
  const a = client.assessments[sel]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Assessments</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Measurement history with Dr. Simunac</div></div>
      <div style={{ display: "flex", gap: 8 }}>{client.assessments.map((ass, i) => <Btn key={i} active={sel === i} onClick={() => setSel(i)} color={T.ink}>{ass.date}</Btn>)}</div>
      <Card>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{a.type}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 12 }}>Assessed by {a.assessor}, {a.date}</div>
        <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.6, margin: "0 0 20px" }}>{a.summary}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 80px 110px", gap: 8, padding: "8px 12px", backgroundColor: T.warmCloud, borderRadius: "4px 4px 0 0" }}>
            {["MEASURE", "PREV", "NOW", "CHANGE", "STATUS"].map((h, i) => <span key={h} style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5, textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>{h}</span>)}
          </div>
          {a.metrics.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 80px 110px", gap: 8, padding: "10px 12px", alignItems: "center", backgroundColor: i % 2 === 0 ? T.white : T.warmBg }}>
              <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{m.name}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>{m.prev !== null ? `${m.prev} ${m.unit}` : "\u2014"}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.ink, fontWeight: 600, textAlign: "center" }}>{m.now} {m.unit}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: m.flag === "improved" ? T.green : m.flag === "declined" ? T.red : "#6B7280", fontWeight: 600, textAlign: "center" }}>{m.change}</span>
              <div style={{ textAlign: "right" }}><span style={{ fontSize: 9, fontWeight: 700, color: flagColor(m.flag) === "#D1D5DB" ? "#6B7280" : flagColor(m.flag), backgroundColor: `${flagColor(m.flag)}20`, padding: "2px 8px", borderRadius: 3 }}>{flagLabel(m.flag)}</span></div>
            </div>
          ))}
        </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Progress</h1></div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Label>Strength Trends</Label>
          <div style={{ display: "flex", gap: 4 }}>{opts.map(m => <Btn key={m.id} small active={metric === m.id} onClick={() => setMetric(m.id)}>{m.label}</Btn>)}</div>
        </div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={client.progress}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.mist} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} domain={["dataMin - 5", "dataMax + 5"]} width={55} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v, n) => [`${v} ${act.unit}`, n === act.lKey ? "Left" : "Right"]} />
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
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v) => [`${v.toLocaleString()} lbs`, "Volume"]} /><Bar dataKey="volume" fill={T.accent} radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer></div></Card>
      )}
    </div>
  )
}

function VideosView() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const filtered = useMemo(() => EXERCISE_LIBRARY.filter(v => (filter === "All" || v.category === filter) && (!search || v.name.toLowerCase().includes(search.toLowerCase()))), [filter, search])
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Exercise Library</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{EXERCISE_LIBRARY.length} exercises</div></div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Input value={search} onChange={setSearch} placeholder="Search exercises..." style={{ flex: 1, minWidth: 200 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{VIDEO_CATS.map(c => <Btn key={c} small active={filter === c} onClick={() => setFilter(c)}>{c}</Btn>)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {filtered.map(v => (
          <Card key={v.id} style={{ cursor: "pointer", padding: 16 }}>
            <div style={{ width: "100%", height: 90, backgroundColor: T.warmCloud, borderRadius: T.r.sm, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><span style={{ fontSize: 20, color: T.accent }}>▶</span></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{v.name}</div>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.accent, fontWeight: 600, letterSpacing: 0.5 }}>{v.category.toUpperCase()}</span>
          </Card>
        ))}
      </div>
      {!filtered.length && <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF" }}>No exercises match your search.</div>}
    </div>
  )
}

function ClientView({ client, onLogout }) {
  const [page, setPage] = useState("home")
  return (
    <div style={{ fontFamily: T.sans, backgroundColor: T.warmBg, minHeight: "100vh" }}>
      <ClientNav active={page} onNav={setPage} client={client} onLogout={onLogout} />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 60px" }}>
        {page === "home" && <ClientHome client={client} onNav={setPage} />}
        {page === "programming" && <ProgramView client={client} />}
        {page === "assessments" && <AssessmentView client={client} />}
        {page === "progress" && <ProgressView client={client} />}
        {page === "videos" && <VideosView />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// TRAINER VIEW (Kristin)
// ═══════════════════════════════════════════

function StaffNav({ active, onNav, name, label, labelColor, tabs, onLogout }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: T.ink, padding: "0 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: labelColor, fontWeight: 700, letterSpacing: 1.5 }}>{label}</span>
          <div style={{ display: "flex", gap: 2 }}>
            {tabs.map(t => <button key={t} onClick={() => onNav(t.toLowerCase())} style={{
              background: active === t.toLowerCase() ? T.accentDeep : "transparent", color: active === t.toLowerCase() ? T.white : "#9CA3AF",
              border: "none", padding: "6px 14px", borderRadius: T.r.sm, fontSize: 13, fontWeight: active === t.toLowerCase() ? 600 : 400, cursor: "pointer", fontFamily: T.sans,
            }}>{t}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={name} size={30} /><span style={{ fontSize: 13, color: "#9CA3AF" }}>{name}</span>
          <button onClick={onLogout} style={{ background: "none", border: "none", fontSize: 11, color: "#6B7280", cursor: "pointer", fontFamily: T.sans, marginLeft: 8 }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

function Roster({ clients, onSelect }) {
  const active = clients.filter(c => c.status === "active")
  const totalSessions = active.reduce((s, c) => s + c.programming.days.length, 0)
  const done = active.reduce((s, c) => s + c.programming.days.filter(d => d.completed).length, 0)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Clients</h1><div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{active.length} active, {totalSessions} sessions this week ({done} done)</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Card><Label color="#6B7280">Active Clients</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{active.length}</div></Card>
        <Card><Label color="#6B7280">Sessions This Week</Label><div style={{ fontSize: 28, fontWeight: 700, color: T.ink }}>{done}/{totalSessions}</div></Card>
        <Card><Label color="#6B7280">Kinstretch Thu 9 AM</Label><div style={{ fontSize: 16, fontWeight: 600, color: T.accent }}>{clients.filter(c => c.programming.days.some(d => d.focus.includes("Kinstretch"))).length} enrolled</div></Card>
      </div>
      {active.map(c => {
        const nextDay = c.programming.days.find(d => !d.completed)
        return (
          <Card key={c.id} style={{ cursor: "pointer" }} onClick={() => onSelect(c.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={c.name} size={40} />
                <div><div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{c.name}</div><div style={{ fontSize: 12, color: "#6B7280" }}>{c.plan}, {c.programming.phase}</div></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280" }}>THIS WEEK</div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.programming.days.filter(d => d.completed).length}/{c.programming.days.length}</div></div>
                {nextDay && <div style={{ textAlign: "right" }}><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280" }}>NEXT</div><div style={{ fontSize: 12, color: T.accent, fontWeight: 500 }}>{nextDay.day}, {nextDay.date}</div></div>}
                <span style={{ fontSize: 16, color: "#9CA3AF" }}>→</span>
              </div>
            </div>
            {c.notes.length > 0 && <div style={{ marginTop: 12, padding: "8px 12px", backgroundColor: T.warmBg, borderRadius: T.r.sm }}><span style={{ fontSize: 11, color: "#6B7280" }}>Last note ({c.notes[0].date}): </span><span style={{ fontSize: 11, color: T.ink }}>{c.notes[0].text.length > 100 ? c.notes[0].text.slice(0, 100) + "..." : c.notes[0].text}</span></div>}
          </Card>
        )
      })}
    </div>
  )
}

function ClientDetail({ client, onBack }) {
  const [tab, setTab] = useState("program")
  const [newNote, setNewNote] = useState("")
  const [showNoteForm, setShowNoteForm] = useState(false)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "20px 0 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.accent, fontWeight: 500, padding: 0, fontFamily: T.sans, marginBottom: 12 }}>← Back to roster</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={client.name} size={48} />
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>{client.name}</h1><div style={{ fontSize: 13, color: "#6B7280" }}>{client.plan}, Started {client.startDate}, {client.programming.phase}</div></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>{client.goals.map((g, i) => <span key={i} style={{ fontSize: 11, color: T.ink, backgroundColor: T.warmCloud, padding: "4px 10px", borderRadius: 4 }}>{g}</span>)}</div>
      </div>
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.mist}`, paddingBottom: 8 }}>
        {["program", "assessments", "progress", "notes"].map(t => <Btn key={t} active={tab === t} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</Btn>)}
      </div>
      {tab === "program" && <ProgramView client={client} editable />}
      {tab === "assessments" && <AssessmentView client={client} />}
      {tab === "progress" && <ProgressView client={client} />}
      {tab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Label>Session Notes</Label><Btn active onClick={() => setShowNoteForm(!showNoteForm)} color={T.accent}>+ Add Note</Btn></div>
          {showNoteForm && (
            <Card style={{ border: `1px solid ${T.accent}` }}>
              <Textarea value={newNote} onChange={setNewNote} placeholder="Session notes... (what you worked on, what to watch for, load changes)" />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Btn active onClick={() => { setNewNote(""); setShowNoteForm(false) }} color={T.accent}>Save Note</Btn><Btn onClick={() => { setNewNote(""); setShowNoteForm(false) }}>Cancel</Btn></div>
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

function ScheduleView({ clients }) {
  const dayMap = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" }
  const schedule = ["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => {
    const sessions = []
    clients.forEach(c => c.programming.days.forEach(day => { if (day.day === dayMap[d]) sessions.push({ client: c.name, focus: day.focus, completed: day.completed }) }))
    if (d === "Thu") {
      const kin = clients.filter(c => c.programming.days.some(day => day.focus.includes("Kinstretch")))
      if (kin.length) sessions.unshift({ client: `Kinstretch Class (${kin.length})`, focus: "9:00 AM Group", isClass: true })
    }
    return { day: d, sessions }
  })
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>This Week</h1></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {schedule.map(s => (
          <div key={s.day}>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.ink, marginBottom: 8, letterSpacing: 0.5, textAlign: "center", padding: "8px 0", backgroundColor: T.warmCloud, borderRadius: T.r.sm }}>{s.day}</div>
            {!s.sessions.length && <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", padding: 16 }}>No sessions</div>}
            {s.sessions.map((sess, i) => (
              <div key={i} style={{ backgroundColor: sess.isClass ? `${T.purple}10` : T.white, border: `1px solid ${sess.isClass ? T.purple + "30" : T.mist}`, borderRadius: T.r.sm, padding: 10, marginBottom: 6 }}>
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

function TrainerView({ onLogout }) {
  const [page, setPage] = useState("roster")
  const [selectedClient, setSelectedClient] = useState(null)
  const client = selectedClient ? ALL_CLIENTS.find(c => c.id === selectedClient) : null
  return (
    <div style={{ fontFamily: T.sans, backgroundColor: T.warmBg, minHeight: "100vh" }}>
      <StaffNav active={selectedClient ? "roster" : page} onNav={p => { setPage(p); setSelectedClient(null) }} name="Kristin" label="AH FIT TRAINER" labelColor={T.amber} tabs={["Roster", "Schedule", "Videos"]} onLogout={onLogout} />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 60px" }}>
        {page === "roster" && !selectedClient && <Roster clients={ALL_CLIENTS} onSelect={setSelectedClient} />}
        {page === "roster" && client && <ClientDetail client={client} onBack={() => setSelectedClient(null)} />}
        {page === "schedule" && <ScheduleView clients={ALL_CLIENTS} />}
        {page === "videos" && <VideosView />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// OWNER VIEW (Damir)
// ═══════════════════════════════════════════

function OwnerOverview({ clients, onNav }) {
  const active = clients.filter(c => c.status === "active")
  const totalSessions = active.reduce((s, c) => s + c.programming.days.length, 0)
  const done = active.reduce((s, c) => s + c.programming.days.filter(d => d.completed).length, 0)
  const assessed = active.filter(c => c.assessments.length > 0).length
  const revenue = active.reduce((s, c) => s + c.programming.days.length * 99, 0)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "28px 0 0" }}><h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>Active Health Fit Overview</h1></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Card><Label color="#6B7280">Active Clients</Label><div style={{ fontSize: 32, fontWeight: 700, color: T.ink }}>{active.length}</div></Card>
        <Card><Label color="#6B7280">Weekly Sessions</Label><div style={{ fontSize: 32, fontWeight: 700, color: T.ink }}>{done}/{totalSessions}</div><div style={{ width: "100%", height: 4, backgroundColor: T.mist, borderRadius: 2, marginTop: 8 }}><div style={{ width: `${totalSessions ? (done / totalSessions) * 100 : 0}%`, height: 4, backgroundColor: T.accent, borderRadius: 2 }} /></div></Card>
        <Card><Label color="#6B7280">Assessed</Label><div style={{ fontSize: 32, fontWeight: 700, color: T.ink }}>{assessed}/{active.length}</div></Card>
        <Card><Label color="#6B7280">Weekly Revenue</Label><div style={{ fontSize: 32, fontWeight: 700, color: T.green }}>${revenue}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{totalSessions} sessions x $99/hr</div></Card>
      </div>
      <Card>
        <Label>Kristin Hours Tracker</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", marginBottom: 4 }}>THIS WEEK</div><div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{totalSessions} hrs</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>of 10 hr cap</div><div style={{ width: "100%", height: 4, backgroundColor: T.mist, borderRadius: 2, marginTop: 6 }}><div style={{ width: `${(totalSessions / 10) * 100}%`, height: 4, backgroundColor: totalSessions > 10 ? T.red : T.accent, borderRadius: 2 }} /></div></div>
          <div><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", marginBottom: 4 }}>TRAINING PAY</div><div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>${totalSessions * 40}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{totalSessions} hrs x $40/hr</div></div>
          <div><div style={{ fontFamily: T.mono, fontSize: 10, color: "#6B7280", marginBottom: 4 }}>PROGRAMMING PAY</div><div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>${active.length * 25}</div><div style={{ fontSize: 11, color: "#9CA3AF" }}>{active.length} clients x $25/hr</div></div>
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><Label>Client Roster</Label><button onClick={() => onNav("clients")} style={{ background: "none", border: "none", fontSize: 12, color: T.accent, fontWeight: 500, cursor: "pointer", fontFamily: T.sans }}>View all →</button></div>
        {active.map(c => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.mist}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={c.name} size={28} /><span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{c.name}</span><span style={{ fontSize: 11, color: "#6B7280" }}>{c.plan}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontFamily: T.mono, fontSize: 11, color: c.assessments.length ? T.green : T.amber }}>{c.assessments.length ? "Assessed" : "No assessment"}</span><span style={{ fontFamily: T.mono, fontSize: 11, color: "#6B7280" }}>{c.programming.days.filter(d => d.completed).length}/{c.programming.days.length} done</span></div>
          </div>
        ))}
      </Card>
      <Card style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <Label color="#166534">Platform Savings</Label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 14, color: "#166534" }}>TrainHeroic was $37/month. This dashboard is $0/month.</div><div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>Supabase free tier + Vercel free tier. Full control over your data.</div></div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#166534" }}>$444/yr saved</div>
        </div>
      </Card>
    </div>
  )
}

function OwnerView({ onLogout }) {
  const [page, setPage] = useState("overview")
  const [selectedClient, setSelectedClient] = useState(null)
  const client = selectedClient ? ALL_CLIENTS.find(c => c.id === selectedClient) : null
  return (
    <div style={{ fontFamily: T.sans, backgroundColor: T.warmBg, minHeight: "100vh" }}>
      <StaffNav active={selectedClient ? "clients" : page} onNav={p => { setPage(p); setSelectedClient(null) }} name="Dr. Simunac" label="AH FIT ADMIN" labelColor={T.red} tabs={["Overview", "Clients", "Schedule", "Videos"]} onLogout={onLogout} />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 60px" }}>
        {page === "overview" && <OwnerOverview clients={ALL_CLIENTS} onNav={setPage} />}
        {page === "clients" && !selectedClient && <Roster clients={ALL_CLIENTS} onSelect={setSelectedClient} />}
        {page === "clients" && client && <ClientDetail client={client} onBack={() => setSelectedClient(null)} />}
        {page === "schedule" && <ScheduleView clients={ALL_CLIENTS} />}
        {page === "videos" && <VideosView />}
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

  useEffect(() => {
    if (USE_MOCK) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // In production, fetch user role from profiles table
        setUser({ id: session.user.id, email: session.user.email, role: "client", name: session.user.email })
      }
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email, role: "client", name: session.user.email })
      } else {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleLogout() {
    if (!USE_MOCK) supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: "#6B7280" }}>Loading...</div>

  if (!user) return <LoginScreen onMockLogin={setUser} />

  const clientData = user.role === "client" ? ALL_CLIENTS.find(c => c.id === user.clientId) || ALL_CLIENTS[0] : null

  return (
    <AuthContext.Provider value={user}>
      {user.role === "owner" && <OwnerView onLogout={handleLogout} />}
      {user.role === "trainer" && <TrainerView onLogout={handleLogout} />}
      {user.role === "client" && clientData && <ClientView client={clientData} onLogout={handleLogout} />}
      <div style={{ borderTop: `1px solid ${T.mist}`, padding: "16px 24px", textAlign: "center" }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: "#9CA3AF", letterSpacing: 0.5 }}>ACTIVE HEALTH FIT · POWERED BY ACTIVE HEALTH SPINE & SPORT</span>
      </div>
    </AuthContext.Provider>
  )
}
