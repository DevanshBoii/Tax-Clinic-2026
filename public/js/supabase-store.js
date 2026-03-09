(() => {
  "use strict";

  // Replace these with your Supabase project values
  const SUPABASE_URL = "https://xhnhlvqkzemlzxceawxk.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5x7o2_eg_wwn9qZcVkcAog_LLxqRzDZ";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  let state = {
    counselors: [],
    students: [],
    assignments: []
  };

  const listeners = new Set();

  function notify() {
    for (const fn of listeners) {
      try { fn(state); } catch (err) { console.error(err); }
    }
  }

  function toast(kind, title, message) {
    const wrap = document.getElementById("toastWrap");
    if (!wrap) return;

    const t = document.createElement("div");
    t.className = "toast";

    const head = document.createElement("div");
    head.className = "tHead";

    const tTitle = document.createElement("div");
    tTitle.className = "tTitle";
    const icon = kind === "good" ? "✅" : kind === "bad" ? "⛔" : "⚠️";
    tTitle.textContent = `${icon} ${title}`;

    const close = document.createElement("button");
    close.className = "secondary";
    close.style.padding = "8px 10px";
    close.textContent = "✖";
    close.onclick = () => t.remove();

    head.appendChild(tTitle);
    head.appendChild(close);

    const body = document.createElement("div");
    body.className = "tBody";
    body.textContent = message;

    t.appendChild(head);
    t.appendChild(body);
    wrap.appendChild(t);

    setTimeout(() => { if (t.isConnected) t.remove(); }, 5000);
  }

  async function loadState() {
    const [
      { data: counselors, error: cErr },
      { data: students, error: sErr },
      { data: assignments, error: aErr }
    ] = await Promise.all([
      supabase.from("counselors").select("*").order("created_at", { ascending: true }),
      supabase.from("students").select("*").order("created_at", { ascending: true }),
      supabase.from("assignments").select("*").order("started_at", { ascending: false })
    ]);

    if (cErr) throw cErr;
    if (sErr) throw sErr;
    if (aErr) throw aErr;

    state = {
      counselors: counselors ?? [],
      students: students ?? [],
      assignments: assignments ?? []
    };

    notify();
    return state;
  }

  async function addStudent({ name, level }) {
    const { error } = await supabase.from("students").insert({
      name,
      level,
      status: "waiting"
    });

    if (error) throw error;
    await loadState();
  }

  async function upsertCounselor({ name, levels }) {
    const { data: existing, error: fetchError } = await supabase
      .from("counselors")
      .select("*")
      .eq("name", name)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from("counselors")
      .insert({
        name,
        levels,
        is_available: false
      })
      .select()
      .single();

    if (error) throw error;
    await loadState();
    return data;
  }

  async function setCounselorAvailability(counselorId, isAvailable) {
    const { error } = await supabase
      .from("counselors")
      .update({ is_available: isAvailable })
      .eq("id", counselorId);

    if (error) throw error;
    await loadState();
  }

  async function endAssignment(assignmentId) {
    const { data: assignment, error: fetchErr } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    if (fetchErr) throw fetchErr;

    const { error: aErr } = await supabase
      .from("assignments")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (aErr) throw aErr;

    const { error: cErr } = await supabase
      .from("counselors")
      .update({ active_assignment_id: null })
      .eq("id", assignment.counselor_id);

    if (cErr) throw cErr;

    await loadState();
  }

  async function subscribeRealtime() {
    const channel = supabase
      .channel("queue-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, loadState)
      .on("postgres_changes", { event: "*", schema: "public", table: "counselors" }, loadState)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, loadState)
      .subscribe();

    return channel;
  }

  function onStateChanged(fn) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  }

  window.SupaStore = {
    supabase,
    getState: () => state,
    onStateChanged,
    loadState,
    addStudent,
    upsertCounselor,
    setCounselorAvailability,
    endAssignment,
    subscribeRealtime,
    toast
  };
})();