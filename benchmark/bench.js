// Compares the satori and the Chromium renderer on the same card.
// Starts run.js for each renderer and samples the memory of its process tree.
//   node bench.js
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { createInterface } from 'node:readline';

const SAMPLE_MS = 100;
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });

// Memory of a process and all its child processes, in MB.
// rss: resident memory; it counts shared pages (libraries) once in each process.
// pss: on Linux, shared pages are divided between the processes that share them.
function treeMemory(rootPid) {
  const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/).map(Number));
  const tree = new Set([rootPid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [pid, ppid] of rows) {
      if (tree.has(ppid) && !tree.has(pid)) {
        tree.add(pid);
        grew = true;
      }
    }
  }
  if (!rows.some(([pid]) => pid === rootPid)) throw new Error(`process ${rootPid} not found`);
  let rssKb = 0;
  let pssKb = 0;
  for (const [pid, , rss] of rows) {
    if (!tree.has(pid)) continue;
    rssKb += rss;
    const pss = readPssKb(pid);
    pssKb = pss === null || pssKb === null ? null : pssKb + pss;
  }
  return { processes: tree.size, rss: rssKb / 1024, pss: pssKb === null ? null : pssKb / 1024 };
}

function readPssKb(pid) {
  try {
    const text = readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
    return Number(/^Pss:\s+(\d+) kB/m.exec(text)[1]);
  } catch {
    return null; // not Linux, or the process ended
  }
}

function runRenderer(renderer) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['run.js', renderer], {
      cwd: new URL('.', import.meta.url),
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const peaks = {};
    let phase = 'cold';
    let result;
    const sample = () => {
      try {
        const memory = treeMemory(child.pid);
        const peak = (peaks[phase] ??= { rss: 0, pss: 0, processes: 0 });
        peak.rss = Math.max(peak.rss, memory.rss);
        peak.pss = memory.pss === null || peak.pss === null ? null : Math.max(peak.pss, memory.pss);
        peak.processes = Math.max(peak.processes, memory.processes);
      } catch (error) {
        // ps can fail while processes end
        if (process.env.BENCH_DEBUG) console.error(error.message);
      }
    };
    const timer = setInterval(sample, SAMPLE_MS);
    createInterface({ input: child.stdout }).on('line', (line) => {
      const data = JSON.parse(line);
      sample();
      if (data.phase === 'done') result = data;
      else phase = data.phase;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      clearInterval(timer);
      if (code !== 0 || !result) return reject(new Error(`run.js ${renderer} ended with code ${code}`));
      resolve({ ...result, memoryMb: peaks });
    });
  });
}

function packageVersion(folder, name) {
  const file = new URL(`${folder}/node_modules/${name}/package.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')).version;
}

const { chromium } = await import('../nodejs-playwright/node_modules/playwright/index.mjs');
const browser = await chromium.launch();
const chromiumVersion = browser.version();
await browser.close();

const machine = {
  os: `${os.type()} ${os.release()} ${os.arch()}`,
  runnerImage: process.env.ImageOS ? `${process.env.ImageOS} ${process.env.ImageVersion}` : null,
  cpu: `${os.cpus()[0].model} x ${os.cpus().length}`,
  memoryGb: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
  node: process.version,
  satori: packageVersion('../nodejs-satori', 'satori'),
  resvgJs: packageVersion('../nodejs-satori', '@resvg/resvg-js'),
  playwright: packageVersion('../nodejs-playwright', 'playwright'),
  chromium: chromiumVersion,
};

const results = [];
for (const renderer of ['satori', 'chromium']) {
  results.push(await runRenderer(renderer));
}

writeFileSync(new URL('./out/results.json', import.meta.url), JSON.stringify({ machine, results }, null, 2));
console.log(JSON.stringify(machine, null, 2));

const mb = (value) => (value === null || value === undefined ? 'n/a' : value.toFixed(0));
console.log('\n| Measure | satori + resvg-js | Chromium (Playwright) |');
console.log('|---|---|---|');
const rows = [
  ['Cold start to first image (ms)', (r) => r.coldMs],
  ['Render time, median (ms)', (r) => r.medianMs],
  ['Render time, 95th percentile (ms)', (r) => r.p95Ms],
  ['Images per second, 4 at a time', (r) => r.imagesPerSecond],
  ['Longest event loop block (ms)', (r) => r.maxLoopDelayMs],
  ['PNG size (bytes)', (r) => r.pngBytes],
  ['Processes', (r) => r.memoryMb.parallel?.processes],
  ['Memory when idle, RSS (MB)', (r) => mb(r.memoryMb.idle?.rss)],
  ['Memory when idle, PSS (MB)', (r) => mb(r.memoryMb.idle?.pss)],
  ['Peak memory, 4 at a time, RSS (MB)', (r) => mb(r.memoryMb.parallel?.rss)],
  ['Peak memory, 4 at a time, PSS (MB)', (r) => mb(r.memoryMb.parallel?.pss)],
];
for (const [label, value] of rows) {
  console.log(`| ${label} | ${value(results[0])} | ${value(results[1])} |`);
}
