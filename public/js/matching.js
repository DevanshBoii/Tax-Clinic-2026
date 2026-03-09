(() => {
  "use strict";

  function waitingStudentsSorted(state) {
    return state.students
      .filter((s) => s.status === "waiting")
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  async function tryMatchAll() {
    return window.SupaStore.matchQueue();
  }

  window.Matching = {
    waitingStudentsSorted,
    tryMatchAll
  };
})();