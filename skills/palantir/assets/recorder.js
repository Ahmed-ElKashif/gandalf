/**
 * palantir recorder — a DOM timeline for a running page.
 *
 * DERIVED FROM: amElnagdy/ui-review-loop (assets/recorder.js), MIT-unverified.
 * Simplified and re-shaped for palantir's WebMCP-first, video-optional evidence model:
 *   - the timeline is a first-class stream, not a companion to video;
 *   - WebMCP tool calls are recorded into the timeline as `tool:*` frames;
 *   - no review-site coupling, no video-clock calibration.
 *
 * Boot is GATED. A missing env marker means NO boot, so this can never run in production.
 * See references/coverage-audit.md ("Setting it up in a project").
 */
(function () {
  "use strict";

  const MAX_FRAMES = 1000; // ring buffer
  const frames = [];
  let started = false;
  let lastEvent = null;

  const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  function push(frame) {
    frames.push(frame);
    if (frames.length > MAX_FRAMES) frames.splice(0, frames.length - MAX_FRAMES);
  }

  /** Coalesce a mutation batch into one readable frame. */
  function summariseMutations(records) {
    const added = [];
    const removed = [];
    const attrs = [];
    for (const r of records) {
      if (r.type === "childList") {
        for (const n of r.addedNodes) if (n.nodeType === 1) added.push(describe(n));
        for (const n of r.removedNodes) if (n.nodeType === 1) removed.push(describe(n));
      } else if (r.type === "attributes") {
        attrs.push(`${describe(r.target)}@${r.attributeName}`);
      }
    }
    return {
      added: dedupe(added).slice(0, 12),
      removed: dedupe(removed).slice(0, 12),
      attrs: dedupe(attrs).slice(0, 12),
      count: records.length,
    };
  }

  function describe(node) {
    if (!node || node.nodeType !== 1) return String(node && node.nodeType);
    const id = node.id ? `#${node.id}` : "";
    const cls = node.classList && node.classList.length ? `.${[...node.classList].slice(0, 2).join(".")}` : "";
    return `${node.tagName.toLowerCase()}${id}${cls}`;
  }
  const dedupe = (a) => [...new Set(a)];

  /** Visible text, trimmed — the "what the operator would read" signal. */
  function visibleText() {
    try { return (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 400); }
    catch { return ""; }
  }

  /** Non-credential form values. Credential-shaped fields are redacted by design. */
  function formValues() {
    const out = {};
    try {
      for (const el of document.querySelectorAll("input, select, textarea")) {
        const name = el.name || el.id;
        if (!name) continue;
        const type = (el.getAttribute("type") || "").toLowerCase();
        const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
        const sensitive =
          type === "password" ||
          /pass|secret|token|card|cvv|ssn/i.test(name) ||
          /current-password|new-password|cc-|one-time-code/.test(ac);
        if (sensitive) { out[name] = "[redacted]"; continue; }
        if (type === "checkbox" || type === "radio") out[name] = el.checked;
        else out[name] = String(el.value).slice(0, 120);
      }
    } catch {}
    return out;
  }

  function nearestEvent() {
    if (!lastEvent) return null;
    const dt = now() - lastEvent.t;
    if (dt > 2000) return null; // too far back to be temporal context
    return { type: lastEvent.type, target: lastEvent.target, dt: Math.round(dt) };
  }

  // ------------------------------------------------------------- listeners

  function onUserEvent(e) {
    lastEvent = { t: now(), type: e.type, target: describe(e.target) };
  }

  /**
   * State frames. Typing into a field or moving focus changes what the page HOLDS without
   * necessarily mutating the DOM, so a mutation-only timeline would never show it — and
   * an assertion like "the field ends up containing X" would be unprovable. We push a
   * lightweight frame on input/change/focus so those state changes land in the timeline
   * in order, next to the mutations they precede.
   *
   * Coalesced: many keystrokes in a burst collapse to one frame, so the timeline stays
   * readable and the package stays small.
   */
  let stateTimer = null;
  let stateEvents = [];   // { kind, target } in arrival order
  function onStateEvent(e) {
    stateEvents.push({ kind: e.type === "focus" ? "focus" : "state", target: describe(e.target) });
    if (stateTimer) return;
    stateTimer = setTimeout(() => {
      stateTimer = null;
      const events = stateEvents;
      stateEvents = [];
      // The frame kind is the kind of the LAST event in the burst; the target is that
      // same event's target. Reporting a focus kind with the earlier input's target (or
      // vice versa) makes the timeline lie about what happened.
      const last = events[events.length - 1] || { kind: "state", target: null };
      const targets = [...new Set(events.map((x) => x.target).filter(Boolean))];
      push({
        t: Math.round(now()),
        kind: last.kind,
        trigger: lastEvent ? { type: lastEvent.type, target: lastEvent.target, dt: Math.round(now() - lastEvent.t) } : null,
        target: last.target,
        targets: targets.length > 1 ? targets : undefined,
        text: visibleText(),
        values: formValues(),
      });
    }, 40);
  }

  function installEvents() {
    for (const type of ["input", "change", "click", "keydown", "submit", "focus"]) {
      document.addEventListener(type, onUserEvent, true);
    }
    for (const type of ["input", "change", "focus"]) {
      document.addEventListener(type, onStateEvent, true);
    }
  }

  function installFetch() {
    if (typeof window.fetch !== "function" || window.fetch.__palantir) return;
    const orig = window.fetch;
    const wrapped = function (input, init) {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const method = (init && init.method) || (input && input.method) || "GET";
      const t0 = now();
      push({ t: Math.round(t0), kind: "fetch:start", method: String(method).toUpperCase(), url: String(url).slice(0, 300), trigger: nearestEvent() });
      return orig.apply(this, arguments).then(
        (res) => {
          push({ t: Math.round(now()), dt: Math.round(now() - t0), kind: "fetch:end", status: res.status, url: String(url).slice(0, 300) });
          return res;
        },
        (err) => {
          push({ t: Math.round(now()), dt: Math.round(now() - t0), kind: "fetch:error", error: String(err && err.message || err).slice(0, 200), url: String(url).slice(0, 300) });
          throw err;
        },
      );
    };
    wrapped.__palantir = true;
    window.fetch = wrapped;
  }

  function installMutations() {
    const obs = new MutationObserver((records) => {
      push({ t: Math.round(now()), kind: "mutation", trigger: nearestEvent(), summary: summariseMutations(records), text: visibleText(), values: formValues() });
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: false });
  }

  /**
   * Observe WebMCP registrations so tool frames land in the SAME timeline as mutations.
   * This is the stream a video-first loop cannot see.
   */
  function installToolWatch() {
    const mc = document.modelContext;
    if (!mc) return;
    try {
      mc.addEventListener("toolchange", () => {
        const tool = { t: Math.round(now()), kind: "tool:change" };
        try {
          Promise.resolve(mc.getTools()).then((tools) => {
            tool.tools = (tools || []).map((x) => x.name);
            push(tool);
          }, () => push(tool));
        } catch { push(tool); }
      });
    } catch {}
  }

  // ------------------------------------------------------------- public API

  const api = {
    start() {
      if (started) return;
      started = true;
      installEvents();
      installFetch();
      if (document.body) installMutations();
      else document.addEventListener("DOMContentLoaded", installMutations);
      installToolWatch();
      push({ t: Math.round(now()), kind: "boot", url: location.href, title: document.title });
    },

    /** Gate: dev/test ONLY. A missing marker means no boot — never runs in production. */
    startRecorderIfEnabled() {
      let enabled = false;
      try {
        const url = new URL(location.href);
        enabled =
          url.searchParams.get("record_dom") === "1" ||
          (typeof localStorage !== "undefined" && localStorage.getItem("dom_recorder") === "on");
      } catch {}
      // Env allow-list: an explicit dev marker, rendered by the app, can also enable it.
      try {
        const meta = document.querySelector('meta[name="rails-env"]');
        if (meta && /development|test/.test(meta.content || "")) enabled = enabled || url.searchParams?.get("record_dom") === "1";
      } catch {}
      if (enabled) api.start();
      return enabled;
    },

    dumpCompact() { return frames.slice(); },

    clear() { frames.length = 0; },

    /**
     * One-shot sweep for interaction bugs no screenshot shows.
     * Empty result = clean.
     */
    auditAffordances() {
      const issues = [];
      try {
        const clickable = document.querySelectorAll('a[href], button, [role="button"], [onclick], input[type="submit"]');
        for (const el of clickable) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          if (el.disabled) continue;
          if (el.tagName === "BUTTON" && el.type === "submit" && el.form) continue; // forms submit, not click-affordance
          if (cs.cursor !== "pointer" && cs.cursor !== "default") {
            issues.push({ kind: "cursor", el: describe(el), note: `cursor is ${cs.cursor}` });
          }
          const tabbable = el.tabIndex >= 0 || ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
          if (!tabbable) issues.push({ kind: "keyboard", el: describe(el), note: "not reachable by keyboard" });
        }
        // Animation declared but not running (purged utility, or a class that does nothing).
        for (const el of document.querySelectorAll('[class*="animate-"]')) {
          const cs = getComputedStyle(el);
          const has = cs.animationName && cs.animationName !== "none";
          const t = cs.transitionDuration && cs.transitionDuration !== "0s";
          if (!has && !t) issues.push({ kind: "animation", el: describe(el), note: "animate-* class but no animation or transition is running" });
        }
      } catch (e) {
        issues.push({ kind: "error", note: String(e) });
      }
      return issues;
    },
  };

  window.AgentReviewRecorder = api;
  window.__rec = api;
})();
