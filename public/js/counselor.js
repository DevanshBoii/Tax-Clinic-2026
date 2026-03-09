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

  function setText(id, text) {
    const node = el(id);
    if (node) node.textContent = text;
  }

  function setClass(id, className) {
    const node = el(id);
    if (node) node.className = className;
  }

  function fmt(ts) {
    if (!ts) return "—";
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

    return state.counselors.find(
      (c) => String(c.name).trim().toLowerCase() === String(name).trim().toLowerCase()
    ) ?? null;
  }

  function renderCounselorList(state, me) {
    const list = el("counselorList");
    if (!list) return;

    list.innerHTML = "";

    if (!state.counselors.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No counselors yet.";
      list.appendChild(empty);
      return;
    }

    state.counselors.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card";

      const meta = document.createElement("div");
      meta.className = "meta";

      const title = document.createElement("div");
      title.className = "title";

      const nm = document.createElement("div");
      nm.className = "name";
      nm.textContent = c.name + (me && me.id === c.id ? " (You)" : "");

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
      sm.textContent = `Levels: ${Array.isArray(c.levels) ? c.levels.join(", ") : ""}`;

      meta.appendChild(title);
      meta.appendChild(sm);

      card.appendChild(meta);
      list.appendChild(card);
    });
  }

  function render(state) {
    if (!state) return;

    const activeCount = state.assignments.filter((a) => a.ended_at === null).length;
    const waitingCount = state.students.filter((s) => s.status === "waiting").length;
    const me = findMe(state);

    setText(
      "statsPill",
      `Active: ${activeCount} • Waiting: ${waitingCount} • Counselors: ${state.counselors.length}`
    );
    setText("counselorPill", `${state.counselors.length} counselors`);

    if (!me) {
      setText("mePill", "Not logged in");
      setText("availPill", "—");
      setText("busyPill", "—");

      const box = el("myAssignmentBox");
      if (box) {
        box.className = "empty";
        box.textContent = "Log in to manage your status.";
      }

      renderCounselorList(state, null);
      return;
    }

    setText("mePill", `Logged in: ${me.name}`);

    const busy = me.active_assignment_id !== null;
    const avail = me.is_available === true;

    setClass("busyPill", busy ? "pill bad" : "pill good");
    setText("busyPill", busy ? "BUSY" : "NOT BUSY");

    setClass("availPill", avail ? "pill good" : "pill warn");
    setText("availPill", avail ? "AVAILABLE" : "UNAVAILABLE");

    const box = el("myAssignmentBox");
    if (box) {
      const assignment = state.assignments.find(
        (a) => a.id === me.active_assignment_id && a.ended_at === null
      );

      const student = assignment
        ? state.students.find((s) => s.id === assignment.student_id)
        : null;

      box.className = "empty";

      if (assignment && student) {
        box.textContent = `Assigned to: ${student.name} • Level ${assignment.level} • Started ${fmt(assignment.started_at)}`;
      } else if (avail) {
        box.textContent = "You are available. Waiting for a student match…";
      } else {
        box.textContent = "You are unavailable.";
      }
    }

    renderCounselorList(state, me);
  }

  async function refreshState() {
    try {
      await window.SupaStore.loadState();
    } catch (err) {
      console.error("Failed to refresh counselor state", err);
    }
  }

  el("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = el("loginName")?.value.trim() ?? "";
    const levels = Array.from(document.querySelectorAll('input[name="cLevels"]:checked'))
      .map((x) => Number(x.value))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    if (name.length < 2) {
      window.SupaStore.toast("bad", "Invalid name", "Enter a counselor name.");
      return;
    }

    try {
      await window.SupaStore.upsertCounselor({ name, levels });
      setSessionName(name);
      await refreshState();
      e.target.reset();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not log in counselor.");
    }
  });

  el("btnLogout")?.addEventListener("click", async () => {
    clearSessionName();
    await refreshState();
  });

  el("btnAvailable")?.addEventListener("click", async () => {
    const me = findMe(window.SupaStore.getState());
    if (!me) {
      window.SupaStore.toast("bad", "Not logged in", "Log in first.");
      return;
    }

    try {
      await window.SupaStore.setCounselorAvailability(me.id, true);
      await window.Matching.tryMatchAll();
      await refreshState();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not set available.");
    }
  });

  el("btnUnavailable")?.addEventListener("click", async () => {
    const me = findMe(window.SupaStore.getState());
    if (!me) {
      window.SupaStore.toast("bad", "Not logged in", "Log in first.");
      return;
    }

    try {
      await window.SupaStore.setCounselorAvailability(me.id, false);
      await refreshState();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not set unavailable.");
    }
  });

  el("btnEndSession")?.addEventListener("click", async () => {
    const me = findMe(window.SupaStore.getState());
    if (!me || !me.active_assignment_id) {
      window.SupaStore.toast("warn", "No session", "You are not assigned right now.");
      return;
    }

    try {
      await window.SupaStore.endAssignment(me.active_assignment_id);
      await window.Matching.tryMatchAll();
      await refreshState();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not end session.");
    }
  });

  el("btnTryMatch")?.addEventListener("click", async () => {
    try {
      await window.Matching.tryMatchAll();
      await refreshState();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not try match.");
    }
  });

  window.SupaStore.onStateChanged((state) => {
    render(state);
  });

  async function boot() {
    await window.SupaStore.reconcileSystem();
    await refreshState();
    await window.SupaStore.subscribeRealtime();

    setInterval(async () => {
      await refreshState();
    }, 4000);
  }

  boot();
})();