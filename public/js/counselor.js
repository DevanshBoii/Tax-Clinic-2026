(() => {
  "use strict";

  const el = (id) => document.getElementById(id);
  const SESSION_KEY = "counselor_session_name_supabase_v1";

  function getSessionName() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSessionName(name) {
    localStorage.setItem(SESSION_KEY, name);
  }

  function clearSessionName() {
    localStorage.removeItem(SESSION_KEY);
  }

  function fmt(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "2-digit"
    });
  }

  function findMe(state) {
    const name = getSessionName();
    if (!name) return null;
    return state.counselors.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  function render(state) {
    const me = findMe(state);
    const activeCount = state.assignments.filter((a) => a.ended_at === null).length;
    const waitingCount = state.students.filter((s) => s.status === "waiting").length;

    el("statsPill").textContent = `Active: ${activeCount} • Waiting: ${waitingCount} • Counselors: ${state.counselors.length}`;
    el("counselorPill").textContent = `${state.counselors.length} counselors`;

    if (!me) {
      el("mePill").textContent = "Not logged in";
      el("availPill").textContent = "—";
      el("busyPill").textContent = "—";
      el("myAssignmentBox").textContent = "Log in to manage your status.";
      return;
    }

    el("mePill").textContent = `Logged in: ${me.name}`;

    const busy = me.active_assignment_id !== null;
    const avail = me.is_available === true;

    el("busyPill").className = busy ? "pill bad" : "pill good";
    el("busyPill").textContent = busy ? "BUSY" : "NOT BUSY";

    el("availPill").className = avail ? "pill good" : "pill warn";
    el("availPill").textContent = avail ? "AVAILABLE" : "UNAVAILABLE";

    const box = el("myAssignmentBox");
    const assignment = state.assignments.find((a) => a.id === me.active_assignment_id && a.ended_at === null);
    const student = assignment ? state.students.find((s) => s.id === assignment.student_id) : null;

    if (assignment && student) {
      box.textContent = `Assigned to: ${student.name} • Level ${assignment.level} • Started ${fmt(assignment.started_at)}`;
    } else if (avail) {
      box.textContent = "You are available. Waiting for a student match…";
    } else {
      box.textContent = "You are unavailable.";
    }

    const list = el("counselorList");
    list.innerHTML = "";

    state.counselors.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card";

      const meta = document.createElement("div");
      meta.className = "meta";

      const title = document.createElement("div");
      title.className = "title";

      const nm = document.createElement("div");
      nm.className = "name";
      nm.textContent = c.name + (me.id === c.id ? " (You)" : "");

      const pill = document.createElement("span");
      if (c.active_assignment_id) {
        pill.className = "pill bad";
        pill.textContent = "BUSY";
      } else if (c.is_available) {
        pill.className = "pill good";
        pill.textContent = "AVAILABLE";
      } else {
        pill.className = "pill warn";
        pill.textContent = "UNAVAILABLE";
      }

      title.appendChild(nm);
      title.appendChild(pill);

      const sm = document.createElement("div");
      sm.className = "small";
      sm.textContent = `Levels: ${c.levels.join(", ")}`;

      meta.appendChild(title);
      meta.appendChild(sm);
      card.appendChild(meta);
      list.appendChild(card);
    });
  }

  el("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = el("loginName").value.trim();
    const levels = Array.from(document.querySelectorAll('input[name="cLevels"]:checked'))
      .map((x) => Number(x.value))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    if (name.length < 2) {
      window.SupaStore.toast("bad", "Invalid name", "Enter a counselor name.");
      return;
    }

    try {
      await window.SupaStore.upsertCounselor({ name, levels });
      setSessionName(name);
      await window.SupaStore.loadState();
      e.target.reset();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not log in counselor.");
    }
  });

  el("btnLogout").addEventListener("click", () => {
    clearSessionName();
    window.SupaStore.loadState();
  });

  el("btnAvailable").addEventListener("click", async () => {
    const me = findMe(window.SupaStore.getState());
    if (!me) return;

    try {
      await window.SupaStore.setCounselorAvailability(me.id, true);
      await window.Matching.tryMatchAll();
      await window.SupaStore.loadState();
    } catch (err) {
      console.error(err);
    }
  });

  el("btnUnavailable").addEventListener("click", async () => {
    const me = findMe(window.SupaStore.getState());
    if (!me) return;

    try {
      await window.SupaStore.setCounselorAvailability(me.id, false);
      await window.SupaStore.loadState();
    } catch (err) {
      console.error(err);
    }
  });

  el("btnEndSession").addEventListener("click", async () => {
    const me = findMe(window.SupaStore.getState());
    if (!me || !me.active_assignment_id) return;

    try {
      await window.SupaStore.endAssignment(me.active_assignment_id);
      await window.Matching.tryMatchAll();
      await window.SupaStore.loadState();
    } catch (err) {
      console.error(err);
    }
  });

  window.SupaStore.onStateChanged(render);

  async function boot() {
    await window.SupaStore.loadState();
    await window.SupaStore.subscribeRealtime();

    setInterval(async () => {
      try {
        await window.SupaStore.loadState();
        await window.Matching.tryMatchAll();
        await window.SupaStore.loadState();
      } catch (err) {
        console.error("Auto-refresh failed", err);
      }
    }, 4000);
  }

  boot();
})();