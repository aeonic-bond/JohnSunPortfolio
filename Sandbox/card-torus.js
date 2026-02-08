const isTorusCard = (card) =>
  card instanceof HTMLElement && card.dataset.cardKind === "torus";

const TORUS_SPLINE_PLAY_ONCE_MS = 1600;
const TORUS_SPLINE_COOLDOWN_MS = 0;
const torusSplineState = new WeakMap();

const getTorusSplineViewer = (card) =>
  card instanceof HTMLElement
    ? card.querySelector(".torus_spline")
    : null;

const getTorusSplineRuntime = (viewer) => {
  if (!(viewer instanceof HTMLElement)) return null;
  const runtime = viewer._spline || viewer.spline || null;
  return runtime && typeof runtime.play === "function" ? runtime : null;
};

const stopTorusSpline = (viewer) => {
  const runtime = getTorusSplineRuntime(viewer);
  if (!runtime || typeof runtime.stop !== "function") return false;
  runtime.stop();
  return true;
};

const clearTorusSplineTimers = (state) => {
  if (!state) return;
  if (state.stopTimer) {
    window.clearTimeout(state.stopTimer);
    state.stopTimer = null;
  }
  if (state.loopTimer) {
    window.clearTimeout(state.loopTimer);
    state.loopTimer = null;
  }
  if (state.startRaf) {
    window.cancelAnimationFrame(state.startRaf);
    state.startRaf = null;
  }
  if (state.watchRaf) {
    window.cancelAnimationFrame(state.watchRaf);
    state.watchRaf = null;
  }
};

const stopTorusSplinePlayback = (card) => {
  const state = torusSplineState.get(card);
  if (!state) return;
  state.isHovering = false;
  state.pendingHoverPlay = false;
  clearTorusSplineTimers(state);
  if (state.viewer) {
    stopTorusSpline(state.viewer);
  }
};

const finishTorusSplineCurrentCycle = (card) => {
  const state = torusSplineState.get(card);
  if (!state) return;

  state.isHovering = false;
  state.pendingHoverPlay = false;

  // Prevent new cycles from starting after leave.
  if (state.loopTimer) {
    window.clearTimeout(state.loopTimer);
    state.loopTimer = null;
  }
  if (state.startRaf) {
    window.cancelAnimationFrame(state.startRaf);
    state.startRaf = null;
  }

  // If not currently in a cycle, clean up immediately.
  const runtime = getTorusSplineRuntime(state.viewer);
  const isPlaying = isTorusSplineRuntimePlaying(runtime);
  if (!isPlaying) {
    if (state.stopTimer) {
      window.clearTimeout(state.stopTimer);
      state.stopTimer = null;
    }
    if (state.watchRaf) {
      window.cancelAnimationFrame(state.watchRaf);
      state.watchRaf = null;
    }
    if (state.viewer) {
      stopTorusSpline(state.viewer);
    }
  }
};

const getTorusSplinePlayOnceMs = (card) => {
  const raw = card?.dataset?.splinePlayOnceMs;
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0
    ? value
    : TORUS_SPLINE_PLAY_ONCE_MS;
};

const getTorusSplineCooldownMs = (card) => {
  const raw = card?.dataset?.splineCooldownMs;
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value >= 0
    ? value
    : TORUS_SPLINE_COOLDOWN_MS;
};

const isTorusSplineRuntimePlaying = (runtime) =>
  Boolean(runtime) &&
  typeof runtime.isStopped === "boolean" &&
  runtime.isStopped === false;

const queueTorusSplineNextLoop = (card) => {
  const state = torusSplineState.get(card);
  if (!state) return;
  if (!state.isHovering) return;
  state.loopTimer = window.setTimeout(() => {
    state.loopTimer = null;
    runTorusSplineHoverCycle(card);
  }, getTorusSplineCooldownMs(card));
};

const armTorusSplineCycleCompletion = (card, runtime) => {
  const state = torusSplineState.get(card);
  if (!state) return;
  if (!state.isHovering) return;

  const fallbackMs = getTorusSplinePlayOnceMs(card);
  const handleFallbackCompletion = () => {
    const currentRuntime = getTorusSplineRuntime(state.viewer);
    const hasRuntimeState =
      currentRuntime && typeof currentRuntime.isStopped === "boolean";

    // On leave, never cut an active loop short if runtime state is available.
    if (!state.isHovering && hasRuntimeState && !currentRuntime.isStopped) {
      state.stopTimer = window.setTimeout(handleFallbackCompletion, 80);
      return;
    }

    stopTorusSpline(state.viewer);
    state.stopTimer = null;
    if (state.watchRaf) {
      window.cancelAnimationFrame(state.watchRaf);
      state.watchRaf = null;
    }
    if (!state.isHovering) return;
    queueTorusSplineNextLoop(card);
  };
  state.stopTimer = window.setTimeout(handleFallbackCompletion, fallbackMs);

  if (typeof runtime?.isStopped !== "boolean") return;

  const watchPlaybackStop = () => {
    state.watchRaf = null;

    const currentRuntime = getTorusSplineRuntime(state.viewer);
    if (!currentRuntime) {
      if (state.isHovering) {
        state.pendingHoverPlay = true;
      }
      return;
    }

    if (currentRuntime.isStopped) {
      if (state.stopTimer) {
        window.clearTimeout(state.stopTimer);
        state.stopTimer = null;
      }
      if (state.isHovering) {
        queueTorusSplineNextLoop(card);
      }
      return;
    }

    state.watchRaf = window.requestAnimationFrame(watchPlaybackStop);
  };

  state.watchRaf = window.requestAnimationFrame(watchPlaybackStop);
};

const runTorusSplineHoverCycle = (card, { adoptIfPlaying = false } = {}) => {
  const state = torusSplineState.get(card);
  if (!state) return;
  if (!state.isHovering) return;

  const runtime = getTorusSplineRuntime(state.viewer);
  // If runtime is not ready yet, defer one shot until load completes.
  if (!runtime) {
    state.pendingHoverPlay = true;
    return;
  }

  state.pendingHoverPlay = false;
  const hasManagedCycleInFlight = Boolean(
    state.stopTimer || state.watchRaf || state.startRaf,
  );

  // If a tracked cycle is already running, keep it and let completion logic drive the next loop.
  if (
    adoptIfPlaying &&
    isTorusSplineRuntimePlaying(runtime) &&
    hasManagedCycleInFlight
  ) {
    return;
  }

  clearTorusSplineTimers(state);

  // Defer play by one frame so hover can take over cleanly from an active initial run.
  state.startRaf = window.requestAnimationFrame(() => {
    state.startRaf = null;
    if (!state.isHovering) return;

    const readyRuntime = getTorusSplineRuntime(state.viewer);
    if (!readyRuntime) {
      state.pendingHoverPlay = true;
      return;
    }

    stopTorusSpline(state.viewer);
    readyRuntime.play();
    armTorusSplineCycleCompletion(card, readyRuntime);
  });
};

const bindTorusSplineHover = (card) => {
  if (!isTorusCard(card)) return;
  if (card.dataset.torusSplineBound === "true") return;

  const viewer = getTorusSplineViewer(card);
  if (!(viewer instanceof HTMLElement)) return;

  const state = {
    viewer,
    stopTimer: null,
    loopTimer: null,
    startRaf: null,
    watchRaf: null,
    pendingHoverPlay: false,
    isHovering: false,
  };
  torusSplineState.set(card, state);

  const handleLoadComplete = () => {
    stopTorusSpline(viewer);
    if (state.pendingHoverPlay && state.isHovering) {
      runTorusSplineHoverCycle(card);
    }
  };

  card.addEventListener("pointerenter", () => {
    state.isHovering = true;
    runTorusSplineHoverCycle(card, { adoptIfPlaying: true });
  });

  card.addEventListener("pointerleave", () => {
    finishTorusSplineCurrentCycle(card);
  });

  viewer.addEventListener("load-complete", handleLoadComplete);
  handleLoadComplete();
  card.dataset.torusSplineBound = "true";
};

const setupTorusCard = (card) => {
  if (!isTorusCard(card)) return;
  card.classList.remove("media_revealed");
  card.classList.remove("bottom_panel_revealed");
  bindTorusSplineHover(card);
};

const revealTorusForReducedMotion = (card) => {
  if (!isTorusCard(card)) return;
  card.classList.add("media_revealed");
  card.classList.add("bottom_panel_revealed");
};

const triggerTorusFlipReveal = (card) => {
  if (!isTorusCard(card)) return;

  setTimeout(() => {
    if (!card.classList.contains("is_flipped")) {
      card.classList.add("media_revealed");
    }
  }, 100);

  setTimeout(() => {
    if (!card.classList.contains("is_flipped")) {
      card.classList.add("bottom_panel_revealed");
    }
  }, 200);
};

window.SandboxTorusCard = {
  setup: setupTorusCard,
  revealForReducedMotion: revealTorusForReducedMotion,
  revealOnFlip: triggerTorusFlipReveal,
};
