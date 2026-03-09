(() => {
  "use strict";

  const SUPABASE_URL = "https://xhnhlvqkzemlzxceawxk.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5x7o2_eg_wwn9qZcVkcAog_LLxqRzDZ";

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  let state = {
    counselors: [],
    students: [],
    assignments: []
  };

  const listeners = new Set();
let isLoadingState = false;
  let pendingLoadState = false;

  function notify() {
    for (const fn of listeners) {
      try {
        fn(state);
      } catch (err) {
        console.error(err);
      }
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

    setTimeout(() => {
      if (t.isConnected) t.remove();
    }, 5000);
  }

  async function loadState() {
    if (isLoadingState) {
      pendingLoadState = true;
      return state;
    }

    isLoadingState = true;
    pendingLoadState = false;

    try {
      const [
        { data: counselors, error: cErr },
        { data: students, error: sErr },
        { data: assignments, error: aErr }
      ] = await Promise.all([
        supabase.from("counselors").select("*").order("created_at", { ascending: true }),
        supabase
          .from("students")
          .select("*")
          .not("status", "in", '("completed","cancelled")')
          .order("created_at", { ascending: true }),
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

      if (pendingLoadState) {
        isLoadingState = false;
        return loadState();
      }

      return state;
    } finally {
      isLoadingState = false;
    }
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
    const { data: existing, error: lookupError } = await supabase
      .from("counselors")
      .select("*")
      .eq("name", name)
      .maybeSingle();

    if (lookupError) throw lookupError;

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
    const { data, error } = await supabase.rpc("complete_assignment", {
      p_assignment_id: assignmentId
    });

    if (error) throw error;
    await loadState();
    return data;
  }

  async function cancelStudent(studentId) {
    const { data, error } = await supabase.rpc("cancel_student", {
      p_student_id: studentId
    });

    if (error) throw error;
    await loadState();
    return data;
  }

  async function reconcileSystem() {
    const { data, error } = await supabase.rpc("reconcile_system");
    if (error) throw error;
    await loadState();
    return data;
  }

  async function matchQueue() {
    const { data, error } = await supabase.rpc("match_queue");
    if (error) throw error;
    await loadState();
    return Number(data ?? 0);
  }

  function onStateChanged(fn) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  }

  async function subscribeRealtime() {
    return supabase
      .channel("queue-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => loadState())
      .on("postgres_changes", { event: "*", schema: "public", table: "counselors" }, () => loadState())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => loadState())
      .subscribe();
  }

  window.SupaStore = {
    supabase,
    getState: () => state,
    loadState,
    addStudent,
    upsertCounselor,
    setCounselorAvailability,
    endAssignment,
    cancelStudent,
    reconcileSystem,
    matchQueue,
    subscribeRealtime,
    onStateChanged,
    toast
  };
})();