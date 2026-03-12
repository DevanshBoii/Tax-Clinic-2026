(() => {
  "use strict";

  const el = (id) => document.getElementById(id);

  function formatElapsed(startedAt) {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }/n/n;  function fmt(ts) {
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

  function renderAvailableCounselors(state) {
    try {
      const list = el("availableCounselorsList");
      if (!list) return;

      list.innerHTML = "";

      const counselors = state.counselors;
      if (!counselors.length) {
        list.appendChild(empty("No counselors logged in yet."));
        return;
      }

      counselors.forEach((c) => {
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
    } catch (err) {
      console.error("renderAvailableCounselors error:", err);
    }
  }

  function render(state) {
    const active = state.assignments.filter((a) => a.ended_at === null);
    const waiting = state.students.filter((s) => s.status === "waiting");

    el("statsPill").textContent = `Active: ${active.length} • Waiting: ${waiting.length} • Counselors: ${state.counselors.length}`;
    el("activePill").textContent = `${active.length} active`;
    el("waitingPill").textContent = `${waiting.length} waiting`;
    el("waitingPill2").textContent = `${waiting.length} waiting`;
    el("counselorPill").textContent = `${state.counselors.length} counselors`;

    renderAvailableCounselors(state);

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
        nm.textContent = `${student?.name ?? "Student"} (${student?.student_number ?? "N/A"}) ↔ ${counselor?.name ?? "Counselor"}`;

        const pill = document.createElement("span");
        pill.className = "pill good";
        pill.textContent = `${formatElapsed(a.started_at)} elapsed`;

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
        nm.textContent = `${s.name} (${s.student_number ?? "N/A"})`;

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
        counselorList.appendChild(card);
      });
    }

    updateIntakePairingDropdowns(state);
  }

  function updateIntakePairingDropdowns(state) {
    const studentSelect = el("intakeSelectStudent");
    const counselorSelect = el("intakeSelectCounselor");
    
    if (!studentSelect || !counselorSelect) return;

    // Store current selections
    const currentStudent = studentSelect.value;
    const currentCounselor = counselorSelect.value;

    // Update students dropdown - only waiting students
    const waitingStudents = state.students.filter((s) => s.status === "waiting");
    studentSelect.innerHTML = '<option value="" disabled selected>Choose a student</option>';
    waitingStudents.forEach((s) => {
      const option = document.createElement("option");
      option.value = s.id;
      option.textContent = `${s.name} (${s.student_number ?? "N/A"}) - Level ${s.level}`;
      studentSelect.appendChild(option);
    });
    if (currentStudent) studentSelect.value = currentStudent;

    // Update counselors dropdown - only available counselors
    const availableCounselors = state.counselors.filter((c) => c.is_available && !c.active_assignment_id);
    counselorSelect.innerHTML = '<option value="" disabled selected>Choose a counselor</option>';
    availableCounselors.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = `${c.name} - Levels: ${Array.isArray(c.levels) ? c.levels.join(", ") : "N/A"}`;
      counselorSelect.appendChild(option);
    });
    if (currentCounselor) counselorSelect.value = currentCounselor;

    // Update pill status
    const pairingPill = el("intakePairingPill");
    if (pairingPill) {
      pairingPill.className = waitingStudents.length > 0 && availableCounselors.length > 0 ? "pill good" : "pill warn";
      pairingPill.textContent = `${waitingStudents.length} waiting • ${availableCounselors.length} available`;
    }
  }

  el("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const student_number = el("studentNumber").value.trim();
    const name = el("studentName").value.trim();
    const level = Number(el("studentLevel").value);

    if (student_number.length < 1) {
      window.SupaStore.toast("bad", "Invalid number", "Student number is required.");
      return;
    }

    if (name.length < 2) {
      window.SupaStore.toast("bad", "Invalid name", "Student name must be at least 2 characters.");
      return;
    }

    if (!Number.isFinite(level)) {
      window.SupaStore.toast("bad", "Invalid level", "Please select a level.");
      return;
    }

    try {
      await window.SupaStore.addStudent({ name, level, student_number });
      await window.Matching.tryMatchAll();
      await window.SupaStore.loadState();
      e.target.reset();
      window.SupaStore.toast("good", "Student added", `${name} (${student_number}) joined the waiting room.`);
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

  el("intakePairingForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentId = el("intakeSelectStudent")?.value;
    const counselorId = el("intakeSelectCounselor")?.value;

    if (!studentId || !counselorId) {
      window.SupaStore.toast("bad", "Invalid selection", "Please select both a student and a counselor.");
      return;
    }

    const state = window.SupaStore.getState();
    const student = state.students.find((s) => s.id === studentId);
    const counselor = state.counselors.find((c) => c.id === counselorId);

    if (!student || !counselor) {
      window.SupaStore.toast("bad", "Invalid selection", "Student or counselor not found.");
      return;
    }

    try {
      await window.SupaStore.manuallyPairStudentCounselor(studentId, counselorId, student.level);
      window.SupaStore.toast("good", "Pairing successful", `${student.name} paired with ${counselor.name}`);
      e.target.reset();
      await window.SupaStore.loadState();
    } catch (err) {
      console.error(err);
      window.SupaStore.toast("bad", "Error", err.message || "Could not pair student with counselor.");
    }
  });

  window.SupaStore.onStateChanged((state) => {
    try {
      render(state);
    } catch (err) {
      console.error("Render failed:", err);
    }
  });

  async function boot() {
  try {
    // Try cleanup, but don't let it kill the page if it fails
    try {
      await window.SupaStore.reconcileSystem();
    } catch (err) {
      console.warn("reconcileSystem failed, continuing startup:", err);
    }

    await window.SupaStore.loadState();

    try {
      await window.SupaStore.subscribeRealtime();
    } catch (err) {
      console.warn("Realtime subscription failed, continuing with polling only:", err);
    }

    setInterval(async () => {
      try {
        await window.SupaStore.loadState();
      } catch (err) {
        console.error("Auto-refresh failed", err);
      }
    }, 4000);

    // Update timers every second
    setInterval(() => {
      render(window.SupaStore.getState());
    }, 1000);
  } catch (err) {
    console.error("Boot failed", err);
  }
}

  boot();
})();