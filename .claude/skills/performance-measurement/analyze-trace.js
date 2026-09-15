#!/usr/bin/env node
// Summarizes a Chrome DevTools trace (from mcp__chrome-devtools__performance_stop_trace)
// between two performance.mark() names, aggregating main-thread event durations by name.
//
// Usage: node analyze-trace.js <trace.json> [startMark] [endMark]
// Defaults: startMark=perf-sim-start, endMark=perf-sim-end

import {readFileSync} from 'node:fs';

const [, , tracePath, startMark = 'perf-sim-start', endMark = 'perf-sim-end'] = process.argv;
if (!tracePath) {
  console.error('Usage: node analyze-trace.js <trace.json> [startMark] [endMark]');
  process.exit(1);
}

const data = JSON.parse(readFileSync(tracePath, 'utf8'));
const events = data.traceEvents || data;

const marks = events.filter((e) => e.name === startMark || e.name === endMark);
const simStart = marks.find((e) => e.name === startMark)?.ts;
const simEnd = marks.find((e) => e.name === endMark)?.ts;

if (simStart == null || simEnd == null) {
  console.error(`Marks not found (looked for "${startMark}" / "${endMark}"). Did you call performance.mark() in the page before stopping the trace?`);
  process.exit(1);
}

console.log(`Window: ${((simEnd - simStart) / 1000).toFixed(1)}ms\n`);

const inWindow = events.filter((e) => e.ts >= simStart && e.ts <= simEnd && typeof e.dur === 'number');

const byName = {};
for (const e of inWindow) {
  const s = (byName[e.name] ??= {count: 0, totalDur: 0, maxDur: 0});
  s.count++;
  s.totalDur += e.dur;
  s.maxDur = Math.max(s.maxDur, e.dur);
}

const sorted = Object.entries(byName).sort((a, b) => b[1].totalDur - a[1].totalDur).slice(0, 25);
console.log('name'.padEnd(28), 'count'.padStart(6), 'totalMs'.padStart(10), 'avgMs'.padStart(8), 'maxMs'.padStart(8));
for (const [name, s] of sorted) {
  console.log(
    name.padEnd(28),
    String(s.count).padStart(6),
    (s.totalDur / 1000).toFixed(2).padStart(10),
    (s.totalDur / 1000 / s.count).toFixed(3).padStart(8),
    (s.maxDur / 1000).toFixed(3).padStart(8),
  );
}
