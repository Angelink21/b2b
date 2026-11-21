/**
 * Production smoke for runtime catalog (12A).
 * Assumes `pnpm build` already succeeded.
 *
 * Spins a local CSV mock + `pnpm start`, then checks:
 * (a) field change visible after short cacheLife
 * (b) renamed model: old slug 404, new slug 200
 * (c) new model opens on first request
 * (d) dead CSV source → site alive, /api/catalog-status source=snapshot
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_CSV = path.join(ROOT, "data", "products_clean.csv");
const MOCK_PORT = Number(process.env.SMOKE_CSV_PORT || 3457);
const APP_PORT = Number(process.env.SMOKE_APP_PORT || 3017);
const REVALIDATE = Number(process.env.SMOKE_REVALIDATE || 3);
const STATUS_SECRET = "smoke-catalog-status";

const results = [];

function log(msg) {
  console.log(`[catalog-smoke] ${msg}`);
}

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[catalog-smoke] ${ok ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForUrl(url, { timeoutMs = 60_000, expectStatus } = {}) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      last = `HTTP ${res.status}`;
      if (expectStatus === undefined || res.status === expectStatus) {
        return res;
      }
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await sleep(500);
  }
  throw new Error(`timeout waiting for ${url} (${last})`);
}

function startMockCsv(initialText) {
  let body = initialText;
  let forceFail = false;
  let hits = 0;

  const server = createServer((req, res) => {
    hits += 1;
    if (forceFail) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("unavailable");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(body);
  });

  return {
    hits: () => hits,
    setBody(next) {
      body = next;
    },
    setFail(v) {
      forceFail = v;
    },
    listen() {
      return new Promise((resolve) => {
        server.listen(MOCK_PORT, "127.0.0.1", resolve);
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

function startApp() {
  // Spawn Node directly — `pnpm.cmd` hits spawn EINVAL on some Windows setups.
  const child = spawn(
    process.execPath,
    [path.join(ROOT, "scripts", "start-server.mjs")],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(APP_PORT),
        HOSTNAME: "127.0.0.1",
        CATALOG_CSV_URL: `http://127.0.0.1:${MOCK_PORT}/catalog.csv`,
        CATALOG_CACHE_REVALIDATE_SECONDS: String(REVALIDATE),
        CATALOG_STATUS_SECRET: STATUS_SECRET,
        CATALOG_ALLOW_SHRINK: "1",
        NEXT_DIST_DIR: ".next",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let out = "";
  child.stdout.on("data", (c) => {
    out += c.toString();
  });
  child.stderr.on("data", (c) => {
    out += c.toString();
  });

  return {
    child,
    logs: () => out,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await sleep(800);
      if (child.exitCode === null) child.kill("SIGKILL");
    },
  };
}

async function statusJson() {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/catalog-status`, {
    headers: { Authorization: `Bearer ${STATUS_SECRET}` },
  });
  if (!res.ok) throw new Error(`status HTTP ${res.status}`);
  return res.json();
}

async function pageStatus(pathname) {
  const res = await fetch(`http://127.0.0.1:${APP_PORT}${pathname}`, {
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, text };
}

function patchCsv(csv, mutator) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = lines[0] ?? "";
  const cols = parseCsvLine(header);
  const nameIdx = cols.indexOf("Назва моделі");
  const gIdx = cols.indexOf("G-фактор");
  const catIdx = cols.indexOf("Тип обладнання");
  const out = [header];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    mutator(cells, { nameIdx, gIdx, catIdx, cols });
    out.push(serializeCsvLine(cells));
  }
  return `${out.join("\n")}\n`;
}

/** Minimal CSV line parser for quoted fields. */
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function serializeCsvLine(cells) {
  return cells
    .map((cell) => {
      if (/[",\r\n]/.test(cell)) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    })
    .join(",");
}

function appendModel(csv, name) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0];
  const cols = parseCsvLine(header);
  const blank = cols.map(() => "");
  blank[cols.indexOf("Назва моделі")] = name;
  blank[cols.indexOf("Тип обладнання")] = "Пральні машини";
  blank[cols.indexOf("Сфера застосування")] = "Лікарні та медичні центри";
  blank[cols.indexOf("Завантаження (кг)")] = "10";
  blank[cols.indexOf("Потужність (кВт)")] = "5";
  blank[cols.indexOf("G-фактор")] = "400";
  blank[cols.indexOf("Віджим (об/хв)")] = "1000";
  blank[cols.indexOf("Габарити (ШхГхВ)")] = "700x700x1000";
  blank[cols.indexOf("Тип нагріву")] = "Електричний";
  blank[cols.indexOf("Напруга живлення")] = "400V III+N+T";
  blank[cols.indexOf("Короткий опис")] = "Smoke model";
  blank[cols.indexOf("Повний опис")] = "Smoke model full";
  blank[cols.indexOf("Зображення")] = "SMOKE-NEW.png";
  return `${lines.join("\n")}\n${serializeCsvLine(blank)}\n`;
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    throw new Error("Missing .next build — run pnpm build first");
  }

  let csv = fs.readFileSync(SOURCE_CSV, "utf8");
  const mock = startMockCsv(csv);
  await mock.listen();
  log(`mock CSV on :${MOCK_PORT}`);

  const app = startApp();
  try {
    await waitForUrl(`http://127.0.0.1:${APP_PORT}/uk`, {
      timeoutMs: 90_000,
      expectStatus: 200,
    });
    log(`app ready on :${APP_PORT}`);

    // Warm sheet path
    let st = await statusJson();
    log(`initial status source=${st.runtime.runtimeSource} count=${st.runtime.runtimeModelCount}`);

    // (a) change G-factor for LAP-08 TP2 E V
    csv = patchCsv(csv, (cells, { nameIdx, gIdx }) => {
      if (cells[nameIdx] === "LAP-08 TP2 E V") {
        cells[gIdx] = "451";
      }
    });
    mock.setBody(csv);
    await sleep((REVALIDATE + 2) * 1000);
    // First hit may be stale; second should refresh. Status shares getCatalog().
    await statusJson().catch(() => null);
    await pageStatus("/uk/catalog/washers/lap-08-tp2-e-v");
    await sleep(800);
    await statusJson().catch(() => null);
    const a = await pageStatus("/uk/catalog/washers/lap-08-tp2-e-v");
    const aOk = a.status === 200 && /\b451\b/.test(a.text);
    record(
      "a-value-refresh",
      aOk,
      aOk
        ? `model page shows G-factor 451 after ~${REVALIDATE + 2}s`
        : `status=${a.status}, has451=${/\b451\b/.test(a.text)}, mockHits=${mock.hits()}`,
    );

    // (b) rename model
    csv = patchCsv(csv, (cells, { nameIdx }) => {
      if (cells[nameIdx] === "LAP-08 TP2 E V") {
        cells[nameIdx] = "LAP-08 TP2 E V SMOKE";
      }
    });
    mock.setBody(csv);
    await sleep((REVALIDATE + 2) * 1000);
    await pageStatus("/uk/catalog/washers/lap-08-tp2-e-v-smoke");
    await sleep(500);
    const oldPage = await pageStatus("/uk/catalog/washers/lap-08-tp2-e-v");
    const newPage = await pageStatus(
      "/uk/catalog/washers/lap-08-tp2-e-v-smoke",
    );
    const bOk =
      (oldPage.status === 404 || oldPage.text.includes("404")) &&
      newPage.status === 200 &&
      newPage.text.includes("LAP-08 TP2 E V SMOKE");
    record(
      "b-rename",
      bOk,
      `old=${oldPage.status}, new=${newPage.status}`,
    );

    // (c) new model
    csv = appendModel(csv, "SMOKE-NEW-MODEL-99");
    mock.setBody(csv);
    await sleep((REVALIDATE + 2) * 1000);
    await pageStatus("/uk/catalog/washers/smoke-new-model-99");
    await sleep(500);
    const c = await pageStatus("/uk/catalog/washers/smoke-new-model-99");
    const cOk = c.status === 200 && c.text.includes("SMOKE-NEW-MODEL-99");
    record(
      "c-new-model",
      cOk,
      cOk ? "first-request render ok" : `status=${c.status}`,
    );

    // (d) unavailable source — restart app with mock failing (clears in-memory cache)
    mock.setFail(true);
    await app.stop();
    const app2 = startApp();
    try {
      await waitForUrl(`http://127.0.0.1:${APP_PORT}/uk`, {
        timeoutMs: 90_000,
        expectStatus: 200,
      });
      const home = await pageStatus("/uk");
      const st2 = await statusJson();
      const dOk =
        home.status === 200 &&
        st2.runtime.runtimeSource === "snapshot" &&
        st2.runtime.runtimeModelCount >= 1;
      record(
        "d-snapshot-fallback",
        dOk,
        `home=${home.status}, source=${st2.runtime.runtimeSource}, errors=${(st2.runtime.lastErrors || []).length}`,
      );
    } finally {
      await app2.stop();
    }
  } finally {
    await app.stop().catch(() => {});
    await mock.close().catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n[catalog-smoke] summary");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.id} — ${r.detail}`);
  }
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[catalog-smoke] FATAL", err);
  process.exitCode = 1;
});
