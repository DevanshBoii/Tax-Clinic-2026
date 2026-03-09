(() => {
  "use strict";

  function waitingStudentsSorted(state) {
    return state.students
      .filter((s) => s.status === "waiting")
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function availableCounselorsForLevel(state, level) {
    return state.counselors.filter((c) =>
      c.is_available === true &&
      c.active_assignment_id === null &&
      Array.isArray(c.levels) &&
      c.levels.includes(level)
    );
  }

  async function createAssignment(studentId, counselorId, level) {
    const { supabase } = window.SupaStore;

    const { data: inserted, error: insertError } = await supabase
      .from("assignments")
      .insert({
        student_id: studentId,
        counselor_id: counselorId,
        level
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { error: sErr } = await supabase
      .from("students")
      .update({ status: "assigned" })
      .eq("id", studentId);

    if (sErr) throw sErr;

    const { error: cErr } = await supabase
      .from("counselors")
      .update({ active_assignment_id: inserted.id })
      .eq("id", counselorId);

    if (cErr) throw cErr;

    return inserted;
  }

  async function tryMatchAll() {
    const state = window.SupaStore.getState();
    const waiting = waitingStudentsSorted(state);

    for (const student of waiting) {
      const eligible = availableCounselorsForLevel(state, student.level);
      if (eligible.length === 0) continue;

      const counselor = eligible[0];
      await createAssignment(student.id, counselor.id, student.level);
      await window.SupaStore.loadState();
    }
  }

  window.Matching = {
    waitingStudentsSorted,
    tryMatchAll
  };
})();