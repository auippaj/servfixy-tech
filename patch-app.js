// One-shot patcher: inserts the three TaskScreen wiring lines into App.js.
// Idempotent — running twice will not double-insert. Delete after use.
const fs = require('fs');

const APP_PATH = 'C:/servfixy-tech/src/App.js';

let src = fs.readFileSync(APP_PATH, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
let lines = src.split(/\r?\n/);

const importLine = "import TaskScreen from './TaskScreen';";
const buttonLine =
  "      {screen === 'list' && <div onClick={() => setScreen('tasks')} " +
  "style={{ backgroundColor: '#14B8A6', color: 'white', padding: '14px 16px', " +
  "margin: '12px 16px 0', borderRadius: '10px', fontWeight: 600, fontSize: '14px', " +
  "cursor: 'pointer', display: 'flex', justifyContent: 'space-between', " +
  "alignItems: 'center' }}><span>\uD83E\uDDEA Rounds & Tasks</span><span>\u2192</span></div>}";
const screenLine =
  "      {screen === 'tasks' && <TaskScreen token={token} lang={lang} " +
  "onBack={() => setScreen('list')} />}";

function report(name, result) {
  if (result === true) console.log('OK       - inserted: ' + name);
  else if (result === false) console.log('SKIP     - already present: ' + name);
  else console.log('NOT FOUND- anchor missing for: ' + name);
}

// 1. import (after the axios import)
let r1;
if (lines.some((l) => l.includes('import TaskScreen'))) {
  r1 = false;
} else {
  const i = lines.findIndex((l) => l.includes("import axios from 'axios'"));
  if (i < 0) r1 = null;
  else { lines.splice(i + 1, 0, importLine); r1 = true; }
}
report('import TaskScreen', r1);

// 2. entry button (before the JobList render line)
let r2;
if (lines.some((l) => l.includes('Rounds & Tasks'))) {
  r2 = false;
} else {
  const i = lines.findIndex((l) => l.includes("{screen === 'list' && <JobList"));
  if (i < 0) r2 = null;
  else { lines.splice(i, 0, buttonLine); r2 = true; }
}
report('Rounds & Tasks button', r2);

// 3. screen render (after the video render line)
let r3;
if (lines.some((l) => l.includes("{screen === 'tasks'"))) {
  r3 = false;
} else {
  const i = lines.findIndex((l) => l.includes("{screen === 'video'"));
  if (i < 0) r3 = null;
  else { lines.splice(i + 1, 0, screenLine); r3 = true; }
}
report('tasks screen render', r3);

fs.writeFileSync(APP_PATH, lines.join(nl), 'utf8');
console.log('\nApp.js written. If any line says NOT FOUND, do not proceed — tell me.');
