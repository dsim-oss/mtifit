// ═══════════════════════════════════════════════════════════════
// ACTIVE HEALTH FIT — Supabase Data Layer
// All queries, mutations, and helpers for real data mode.
// ═══════════════════════════════════════════════════════════════

import { supabase } from "./supabase"

// ── Profile ──

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Clients ──

export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("full_name")
  if (error) throw error
  return data
}

export async function getClientByProfileId(profileId) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("profile_id", profileId)
    .single()
  if (error && error.code !== "PGRST116") throw error
  return data
}

export async function getClient(clientId) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()
  if (error) throw error
  return data
}

export async function createClient(client) {
  const { data, error } = await supabase
    .from("clients")
    .insert(client)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(clientId, updates) {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", clientId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Programs (with full nested structure) ──

export async function getActiveProgram(clientId) {
  // Get the most recent program for a client
  const { data: program, error } = await supabase
    .from("programs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== "PGRST116") throw error
  if (!program) return null

  // Get days
  const { data: days } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_id", program.id)
    .order("sort_order")

  // Get blocks for all days
  const dayIds = days.map(d => d.id)
  const { data: blocks } = await supabase
    .from("program_blocks")
    .select("*")
    .in("day_id", dayIds)
    .order("sort_order")

  // Get exercises for all blocks
  const blockIds = blocks.map(b => b.id)
  const { data: exercises } = await supabase
    .from("program_exercises")
    .select("*")
    .in("block_id", blockIds)
    .order("sort_order")

  // Get attachments
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("program_id", program.id)

  // Assemble nested structure matching mock data shape
  return {
    weekLabel: program.week_label,
    phase: program.phase,
    days: days.map(day => ({
      day: day.day_name,
      date: day.date_label,
      focus: day.focus,
      completed: day.completed,
      blocks: blocks
        .filter(b => b.day_id === day.id)
        .map(block => ({
          label: block.label,
          exercises: exercises
            .filter(e => e.block_id === block.id)
            .map(ex => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              load: ex.load,
              note: ex.note,
            })),
        })),
    })),
    attachments: (attachments || []).map(a => ({
      name: a.file_name,
      type: a.file_type,
      size: a.file_size,
      url: a.file_url,
    })),
  }
}

export async function createProgram(clientId, programData, createdBy) {
  // Insert program
  const { data: program, error } = await supabase
    .from("programs")
    .insert({
      client_id: clientId,
      week_label: programData.weekLabel,
      phase: programData.phase || "",
      week_number: programData.weekNumber || 1,
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error

  // Insert days, blocks, exercises
  for (let di = 0; di < (programData.days || []).length; di++) {
    const day = programData.days[di]
    const { data: dayRow } = await supabase
      .from("program_days")
      .insert({
        program_id: program.id,
        day_name: day.day,
        date_label: day.date || "",
        focus: day.focus || "",
        completed: day.completed || false,
        sort_order: di,
      })
      .select()
      .single()

    for (let bi = 0; bi < (day.blocks || []).length; bi++) {
      const block = day.blocks[bi]
      const { data: blockRow } = await supabase
        .from("program_blocks")
        .insert({
          day_id: dayRow.id,
          label: block.label,
          sort_order: bi,
        })
        .select()
        .single()

      if (block.exercises?.length) {
        await supabase.from("program_exercises").insert(
          block.exercises.map((ex, ei) => ({
            block_id: blockRow.id,
            name: ex.name,
            sets: ex.sets || "",
            reps: ex.reps || "",
            load: ex.load || "",
            note: ex.note || "",
            sort_order: ei,
          }))
        )
      }
    }
  }

  return program
}

export async function toggleDayCompleted(dayId, completed) {
  const { error } = await supabase
    .from("program_days")
    .update({ completed })
    .eq("id", dayId)
  if (error) throw error
}

// ── Assessments ──

export async function getAssessments(clientId) {
  const { data: assessments, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("client_id", clientId)
    .order("assessed_date", { ascending: false })
  if (error) throw error

  if (!assessments.length) return []

  const ids = assessments.map(a => a.id)
  const { data: metrics } = await supabase
    .from("assessment_metrics")
    .select("*")
    .in("assessment_id", ids)
    .order("sort_order")

  return assessments.map(a => ({
    date: new Date(a.assessed_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: a.type,
    assessor: a.assessor,
    summary: a.summary,
    metrics: metrics
      .filter(m => m.assessment_id === a.id)
      .map(m => ({
        name: m.name,
        prev: m.prev_value,
        now: m.current_value,
        unit: m.unit,
        change: m.change_label,
        flag: m.flag,
      })),
  }))
}

export async function createAssessment(clientId, assessmentData) {
  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({
      client_id: clientId,
      assessed_date: assessmentData.date || new Date().toISOString().split("T")[0],
      type: assessmentData.type,
      assessor: assessmentData.assessor,
      summary: assessmentData.summary || "",
    })
    .select()
    .single()
  if (error) throw error

  if (assessmentData.metrics?.length) {
    await supabase.from("assessment_metrics").insert(
      assessmentData.metrics.map((m, i) => ({
        assessment_id: assessment.id,
        name: m.name,
        prev_value: m.prev,
        current_value: m.now,
        unit: m.unit || "",
        change_label: m.change || "",
        flag: m.flag || "baseline",
        sort_order: i,
      }))
    )
  }

  return assessment
}

// ── Progress ──

export async function getProgress(clientId) {
  const { data, error } = await supabase
    .from("progress_snapshots")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at")
  if (error) throw error
  return data.map(s => ({ month: s.month, ...s.data }))
}

export async function addProgressSnapshot(clientId, month, data) {
  const { error } = await supabase
    .from("progress_snapshots")
    .insert({ client_id: clientId, month, data })
  if (error) throw error
}

// ── Training Logs ──

export async function getTrainingLogs(clientId) {
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at")
  if (error) throw error
  return data.map(l => ({ week: l.week, sessions: l.sessions, volume: Number(l.volume) }))
}

export async function addTrainingLog(clientId, week, sessions, volume) {
  const { error } = await supabase
    .from("training_logs")
    .insert({ client_id: clientId, week, sessions, volume })
  if (error) throw error
}

// ── Notes ──

export async function getNotes(clientId) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data.map(n => ({
    id: n.id,
    date: new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    from: n.author_name,
    text: n.content,
  }))
}

export async function addNote(clientId, authorName, content) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ client_id: clientId, author_name: authorName, content })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Exercise Library ──

export async function getExercises() {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name")
  if (error) throw error
  return data
}

export async function addExercise(id, name, category) {
  const { error } = await supabase
    .from("exercises")
    .insert({ id, name, category })
  if (error) throw error
}

// ── Attachments ──

export async function uploadAttachment(file, clientId, programId) {
  const filePath = `${clientId}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file)
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from("attachments")
    .getPublicUrl(filePath)

  const { error } = await supabase.from("attachments").insert({
    client_id: clientId,
    program_id: programId,
    file_name: file.name,
    file_url: publicUrl,
    file_type: file.name.split(".").pop().toLowerCase(),
    file_size: `${Math.round(file.size / 1024)} KB`,
  })
  if (error) throw error
  return publicUrl
}

// ── Full Client Data Loader (assembles mock-shaped object) ──

export async function loadFullClient(clientId) {
  const [client, programming, assessments, progress, trainingLog, notesData] = await Promise.all([
    getClient(clientId),
    getActiveProgram(clientId),
    getAssessments(clientId),
    getProgress(clientId),
    getTrainingLogs(clientId),
    getNotes(clientId),
  ])

  return {
    id: client.id,
    name: client.full_name,
    email: client.email,
    startDate: client.start_date,
    plan: client.plan,
    status: client.status,
    nextSession: client.next_session,
    goals: client.goals || [],
    notes: notesData,
    programming: programming || { weekLabel: "No program", phase: "", days: [], attachments: [] },
    assessments,
    progress,
    trainingLog,
  }
}

export async function loadAllClients() {
  const clients = await getClients()
  const results = await Promise.all(clients.map(c => loadFullClient(c.id)))
  return results
}
