---
name: performance-measurement
description: Use when asked to test, measure, benchmark, or improve the performance/timing of a browser-side function or interaction in this repo (e.g. pointerMove, hover handlers, rendering), especially with large synthetic datasets.
---

# Performance Measurement (browser, this repo)

## Overview

Measuring a DOM event handler's speed in the browser has several failure modes that
produce confidently wrong numbers or wasted effort: measuring the wrong event phase,
measuring the JS handler when the real cost is in rendering, and implementing an
optimization that "should" help without checking whether it actually moves the needle.
This skill covers all three, plus how to drive Chrome's Performance trace via the
`mcp__chrome-devtools__*` tools.

## Generating synthetic large datasets

For `elevation-profile`, `lines` is `number[][][]` of `[x, y, elevation, distance]`
tuples — generate large profiles procedurally, don't hand-write them:

```js
function generateLargeProfile(numPoints) {
  const points = [];
  let x = 0, y = 0, elevation = 440, distance = 0;
  for (let i = 0; i < numPoints; i++) {
    x += 5 * Math.cos(i * 0.01);
    y += 5 * Math.sin(i * 0.01);
    elevation += Math.sin(i * 0.05) * 0.5;
    distance += 5;
    points.push([x, y, elevation, distance]);
  }
  return [points];
}
```

Keep dense `lineSegments`/`xAxisSegments` (e.g. one segment per few points) out of the
persisted demo — `renderLineSegments`/`renderTrailBands` aren't guarded, so tens of
thousands of segments means tens of thousands of `<path>`/`<rect>` elements re-rendered
on every pointer move, which can hang the tab. Stress-test heavy segment counts with
direct function benchmarks or a scratch page instead.

## Pitfall: instrumenting with a listener on the wrong phase

`pointerMove` is bound to an inner `<rect>` (light DOM — `createRenderRoot()` returns
`this`). A timing listener on the host element without `{ capture: true }` fires during
the **bubble** phase, i.e. *after* the library's listener (attached to the `<rect>`, the
actual event target) already ran and synchronously dispatched `over`. Your "start"
timestamp ends up being last move's leftover state, producing nonsense multi-second
"elapsed" numbers on the first sample.

```js
el.addEventListener('pointermove', () => { start = performance.now(); }, { capture: true });
el.addEventListener('over', () => { report(performance.now() - start); });
```

Also don't `console.log` every sample — it's slow and floods the console, adding real
jank while you're trying to feel out responsiveness. Log a running summary into the DOM
instead.

## Pitfall: JS handler time ≠ perceived interaction cost

A fast synchronous handler doesn't mean the interaction is cheap. `pointerMove` sets a
reactive Lit property, triggering a full re-render. `EventDispatch` (the JS handler)
measured ~0.25ms regardless of point count, but `PrePaint` measured ~5.6ms/frame at
50,000 points and only ~0.6ms at 2,000 — it scales with point count even though the
handler doesn't. Root cause: a `clip-path` tracking pointer position sat over the full
line geometry, forcing paint-property recompute on the whole path every frame.

**Always check both**: the handler's own execution time (`EventDispatch`, or wall-clock
around dispatch) AND `Layout`/`UpdateLayoutTree`/`PrePaint`/`Paint`. If the JS is fast
but the interaction still feels laggy, the trace — not the function — has the answer.

## Pitfall: a clip-path fix can silently shift the coordinate space

The fix for the above (native `<clipPath><rect/></clipPath>` referenced via
`clip-path="url(#id)"`, replacing `clip-path: polygon(...)`) is not a drop-in numeric
swap. CSS `clip-path` on an SVG element defaults to the **fill-box** of the element it's
applied to (origin at that element's own bbox corner); `<clipPath>`'s `clipPathUnits`
defaults to `userSpaceOnUse` — **absolute** SVG coordinates. Reusing the old polygon's
numbers verbatim shifted the clip origin by the left margin (`ml`), so the highlight
visibly lagged behind the cursor by that many pixels — no error, just visibly wrong.
Verify by comparing the driving value against the rendered geometry (e.g. `pointer.x`
must equal `clipPathRect.getAttribute('width')` exactly), not just "looks right" in a
screenshot — segment coloring etc. can visually mask a real offset.

## Technique: measure before implementing a "should help" optimization

Don't implement a plausible optimization on reasoning alone — toggle it at runtime and
A/B the same trace. Example: to check whether skipping `d3-axis` `.call()` on
pointer-only re-renders was worth it, we wrapped the calls in
`if (!window.__skipAxis) { ... }`, ran the identical simulation with the flag on and off,
and compared `analyze-trace.js` output. Total wall-clock was identical in both runs
(bounded by `requestAnimationFrame` cadence, not JS) — only ~0.3-0.6ms/frame of
scripting differed. Not worth shipping. Remove the toggle once you have the answer,
whichever way it goes.

## Using Chrome's Performance tool via MCP

1. Start a trace on the live page with `reload: false, autoStop: false` so you can drive
   interaction manually instead of profiling page load:
   `performance_start_trace({ pageId, reload: false, autoStop: false })`
2. Mark the window and simulate the interaction — dispatch real `PointerEvent`s on the
   actual target element (see phase pitfall above), `await`-ing a `requestAnimationFrame`
   between each so the browser actually renders every one:
   ```js
   performance.mark('perf-sim-start');
   for (let i = 0; i < 300; i++) {
     el.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY, bubbles: true, composed: true }));
     await new Promise((r) => requestAnimationFrame(r));
   }
   performance.mark('perf-sim-end');
   ```
3. Stop the trace, saving raw JSON: `performance_stop_trace({ pageId, filePath })`.
4. `performance_analyze_insight` only covers page-load insights (LCP, CLS, etc.) — it
   returns nothing for a no-navigation interaction trace. Parse the JSON yourself:
   `node analyze-trace.js <trace.json>` (this skill's directory) aggregates event
   durations by name within the marked window. User-timing marks appear as `ph: "I"`
   (instant), not `ph: "R"`.
5. `RunTask`/`GPUTask` totals are bounded by vsync cadence (~16.6ms × sample count)
   regardless of code speed — if total window time barely changes between two variants,
   check the specific event totals (`Layout`, `EventDispatch`, ...), not overall duration.

## Quick reference

| Question | Where to look |
|---|---|
| Is the handler itself slow? | `EventDispatch` duration, or wall-clock with a capture-phase start marker |
| Does cost scale with data size but the handler doesn't? | Compare `PrePaint`/`Layout` totals at two dataset sizes |
| Segment/range lookup slow with many segments? | O(m) linear scan over sorted data — binary search if sorted/non-overlapping |
| Did swapping CSS clip-path for SVG `<clipPath>` break alignment? | Compare the driving value to the rendered clip geometry attribute exactly, not visually |
| Is a suggested optimization worth shipping? | Toggle it at runtime, A/B the same trace, compare specific event totals |
