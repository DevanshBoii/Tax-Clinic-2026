(() => {
  "use strict";

  const el = (id) => document.getElementById(id);

  function fmt(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "2-digit"
    });
  }

  function empty(text) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = text;
    return d;
  }

  function render(state) {
    const active = state.assignments.filter((a) => a.ended_at === null);
    const waiting = state.students.filter((s) => s.status === "waiting");

    el("statsPill").textContent = `Active: ${active.length} • Waiting: ${waiting.length} • Counselors: ${state.counselors.length}`;
    el("activePill").textContent = `${active.length} active`;
    el("waitingPill").textContent = `${waiting.length} waiting`;
    el("waitingPill2").textContent = `${waiting.length} waiting`;
    el("counselorPill").textContent = `${state.counselors.length} counselors`;

    el("livePill").textContent =
      active.length ? `${active.length} in session` :
      waiting.length ? `Students waiting` :
      `Idle`;

    const assignmentsList = el("assignmentsList");
    assignmentsList.innerHTML = "";
    if (!active.length) {
      assignmentsList.appendChild(empty("No active assignments."));
    } else {
      active.forEach((a) => {
        const student = state.students.find((s) => s.id === a.student_id);
        const counselor = state.counselors.find((c) => c.id === a.counselor_id);

        const card = document.createElement("div");
        card.className = "card";

        const meta = document.createElement("div");
        meta.className = "meta";

        const title = document.createElement("div");
        title.className = "title";

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = `${student?.name ?? "Student"} ↔ ${counselor?.name ?? "Counselor"}`;

        const pill = document.createElement("span");
        pill.className = "pill good";
        pill.textContent = "ACTIVE";

        title.appendChild(nm);
        title.appendChild(pill);

        const sm = document.createElement("div");
        sm.className = "small";
        sm.textContent = `Level ${a.level} • Started ${fmt(a.started_at)}`;

        meta.appendChild(title);
        meta.appendChild(sm);
        card.appendChild(meta);
        assignmentsList.appendChild(card);
      });
    }

    const waitingList = el("waitingList");
    waitingList.innerHTML = "";
    const sortedWaiting = window.Matching.waitingStudentsSorted(state);

    if (!sortedWaiting.length) {
      waitingList.appendChild(empty("No students waiting."));
    } else {
      sortedWaiting.forEach((s) => {
        const card = document.createElement("div");
        card.className = "card";

        const meta = document.createElement("div");
        meta.className = "meta";

        const title = document.createElement("div");
        title.className = "title";

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = s.name;

        const pill = document.createElement("span");
        pill.className = "pill warn";
        pill.textContent = "WAITING";

        title.appendChild(nm);
        title.appendChild(pill);

        const sm = document.createElement("div");
        sm.className = "small";
        sm.textContent = `Needs Level ${s.level} • Added ${fmt(s.created_at)}`;

        meta.appendChild(title);
        meta.appendChild(sm);
        card.appendChild(meta);
        waitingList.appendChild(card);
      });
    }

    const counselorList = el("counselorList");
    counselorList.innerHTML = "";
    if (!state.counselors.length) {
      counselorList.appendChild(empty("No counselors yet."));
    } else {
      state.counselors.forEach((c) => {
        const busy = c.active_assignment_id !== null;
        const avail = c.is_available === true;

        const card = document.createElement("div");
        card.className = "card";

        const meta = document.createElement("div");
        meta.className = "meta";

        const title = document.createElement("div");
        title.className = "title";

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = c.name;

        const pill = document.createElement("span");
        if (busy) {
          pill.className = "pill bad";
          pill.textContent = "BUSY";
        } else if (avail) {
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
        counselorList.appendChild(card);
      });
    }
  }

  el("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = el("studentName").value.trim();
    const level = Number(el("studentLevel").value);

    if (name.length < 2) {
      window.SupaStore.toast("bad", "Invalid name", "Student name must be at least 2 characters.");
      return;
    }

    if (!Number.isFinite(level)) {
      window.SupaStore.toast("bad", "Invalid level", "Please select a level.");
      return;
    }

    try {
      await window.SupaStore.addStudent({ name, level });
      await window.Matching.tryMatchAll();
      await window.SupaStore.loadState();
      e.target.reset();
      window.SupaStore.toast("good", "Student added", `${name} joined the waiting room.`);
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not add student.");
    }
  });

  el("btnTryMatch").addEventListener("click", async () => {
    try {
      await window.Matching.tryMatchAll();
      await window.SupaStore.loadState();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not match students.");
    }
  });

  window.SupaStore.onStateChanged(render);

  async function boot() {
    await window.SupaStore.loadState();
    await window.SupaStore.subscribeRealtime();

    // refresh every few seconds
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