import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { evaluateAll } from '../../debun/phase2/lib-scorer';

interface Metrics {
  TP: number;
  FP: number;
  FN: number;
  TN: number;
}

const allLibNames = Object.keys(
  JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../data/debun-hashes/all-libs.json`), 'utf-8')
  )
).filter((lib) => lib !== 'react-dom');

const SCORE_THRESHOLD = 0.2;
const inputCsvFilePath = path.join(__dirname, '../../ground/ground-truth.csv');

function parseLibraries(cellValue: string | undefined): string[] {
  if (!cellValue) return [];
  return cellValue
    .split(',')
    .map((lib) => lib.trim())
    .filter((lib) => lib.length > 0);
}

function updateMetrics(
  metrics: Metrics,
  truthExists: boolean,
  detected: boolean
): void {
  if (truthExists && detected) metrics.TP++;
  else if (!truthExists && detected) metrics.FP++;
  else if (truthExists && !detected) metrics.FN++;
  else metrics.TN++;
}

function splitNameAndVersions(item: string): {
  name: string;
  versions: string[];
} {
  const [name, ...versions] = item.split('@').map((s) => s.trim());
  return { name, versions };
}

function addRangeForOneLib(
  truthVersions: string[],
  predictedVersions: string[] | undefined,
  rangeM: Metrics
) {
  if (!predictedVersions || predictedVersions.length === 0) {
    rangeM.FN++;
    return;
  }

  const inter = predictedVersions.filter((v) => truthVersions.includes(v));
  const hasAnyMatch = inter.length > 0;

  if (hasAnyMatch) {
    rangeM.TP++;
  } else {
    rangeM.FP++;
    rangeM.FN++;
  }
}

function evaluateDetectors() {
  const METHODS = [
    { key: 'pog', flag: '' },
    { key: 'cnt', flag: '-cnt' },
    { key: 'cfg', flag: '-cfg' },
  ] as const;

  const predictionsByMethod: Record<
    (typeof METHODS)[number]['key'],
    Record<string, string[]>
  > = {
    pog: evaluateAll({ threshold: SCORE_THRESHOLD }, METHODS[0].flag),
    cnt: evaluateAll({ threshold: SCORE_THRESHOLD }, METHODS[1].flag),
    cfg: evaluateAll({ threshold: SCORE_THRESHOLD }, METHODS[2].flag),
  };

  let pog: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };
  let cnt: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };
  let cfg: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };

  const pogRange: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };
  const cntRange: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };
  const cfgRange: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };

  const fileContent = fs.readFileSync(inputCsvFilePath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true });
  const data: any[] = parsed.data;

  if (!data.length) {
    console.log('No data found in CSV file.');
    return {
      pog,
      cnt,
      cfg,
      pogRange,
      cntRange,
      cfgRange,
    };
  }

  const idxGroundTruth = data[0].hasOwnProperty('ground truth')
    ? 'ground truth'
    : null;
  if (!idxGroundTruth) {
    console.log('Required column "ground truth" is missing.');
    return {
      pog,
      cnt,
      cfg,
      pogRange,
      cntRange,
      cfgRange,
    };
  }

  for (const row of data) {
    const url = row['url'];
    const truthList = parseLibraries(row[idxGroundTruth]);
    if (!truthList.length) continue;

    const truthByName = new Map<string, string[]>();
    for (const t of truthList) {
      const { name, versions } = splitNameAndVersions(t);
      if (!truthByName.has(name)) truthByName.set(name, []);

      const acc = truthByName.get(name)!;
      versions.forEach((v) => {
        if (v && !acc.includes(v)) acc.push(v);
      });
    }
    const truthNames = new Set(truthByName.keys());

    const preds: Record<
      string,
      { names: Set<string>; versionsByName: Map<string, string[]> }
    > = {};
    for (const { key } of METHODS) {
      const raw = (predictionsByMethod[key][url] ?? []) as string[];
      const names = new Set<string>();
      const versionsByName = new Map<string, string[]>();
      for (const p of raw) {
        const { name, versions } = splitNameAndVersions(p);
        names.add(name);
        if (!versionsByName.has(name)) versionsByName.set(name, []);
        const acc = versionsByName.get(name)!;
        versions.forEach((v) => {
          if (v && !acc.includes(v)) acc.push(v);
        });
      }
      preds[key] = { names, versionsByName };
    }

    const allNamesUniverse = new Set(allLibNames);
    for (const lib of allNamesUniverse) {
      updateMetrics(pog, truthNames.has(lib), preds['pog'].names.has(lib));
      updateMetrics(cnt, truthNames.has(lib), preds['cnt'].names.has(lib));
      updateMetrics(cfg, truthNames.has(lib), preds['cfg'].names.has(lib));
    }

    for (const [libName, gtVersions] of truthByName.entries()) {
      if (gtVersions.length === 0) continue;

      addRangeForOneLib(
        gtVersions,
        preds['pog'].versionsByName.get(libName),
        pogRange
      );

      addRangeForOneLib(
        gtVersions,
        preds['cnt'].versionsByName.get(libName),
        cntRange
      );

      addRangeForOneLib(
        gtVersions,
        preds['cfg'].versionsByName.get(libName),
        cfgRange
      );
    }

    for (const { key } of METHODS) {
      for (const predName of preds[key].names) {
        if (!truthNames.has(predName)) {
          if (key === 'pog') pogRange.FP++;
          else if (key === 'cnt') cntRange.FP++;
          else cfgRange.FP++;
        }
      }
    }
  }

  return {
    pog,
    cnt,
    cfg,
    pogRange,
    cntRange,
    cfgRange,
  };
}

function safeDiv(n: number, d: number) {
  return d === 0 ? 0 : n / d;
}
function pct(v: number) {
  return (v * 100).toFixed(2) + '%';
}
function prf(m: Metrics) {
  const precision = safeDiv(m.TP, m.TP + m.FP);
  const recall = safeDiv(m.TP, m.TP + m.FN);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}
function pad(str: string, w: number, right = false) {
  const s = String(str);
  if (s.length >= w) return s;
  const spaces = ' '.repeat(w - s.length);
  return right ? spaces + s : s + spaces;
}
function makeTable(cols: string[], rows: Array<string[]>): string {
  const all = [['Metric', ...cols], ...rows];
  const widths = all[0].map((_, i) =>
    Math.max(...all.map((r) => (r[i] ?? '').length))
  );
  const sep = '─'.repeat(
    widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * 3
  );

  const line = (cells: string[]) =>
    cells.map((c, i) => pad(c, widths[i], i !== 0)).join(' | ');

  let out = '';
  out += line(['Metric', ...cols]) + '\n';
  out += sep + '\n';
  for (const r of rows) out += line(r) + '\n';
  return out;
}

const main = () => {
  const res = evaluateDetectors();
  const { pog, cnt, cfg, pogRange, cntRange, cfgRange } = res;

  const libRows: string[][] = [
    ['TP', String(cnt.TP), String(cfg.TP), String(pog.TP)],
    ['FP', String(cnt.FP), String(cfg.FP), String(pog.FP)],
    ['FN', String(cnt.FN), String(cfg.FN), String(pog.FN)],
  ];

  const libPRF = {
    Count: prf(cnt),
    CFG: prf(cfg),
    POG: prf(pog),
  };
  libRows.push(['', '', '', '']);
  libRows.push([
    'Precision',
    pct(libPRF.Count.precision),
    pct(libPRF.CFG.precision),
    pct(libPRF.POG.precision),
  ]);
  libRows.push([
    'Recall',
    pct(libPRF.Count.recall),
    pct(libPRF.CFG.recall),
    pct(libPRF.POG.recall),
  ]);
  libRows.push([
    'F1-score',
    pct(libPRF.Count.f1),
    pct(libPRF.CFG.f1),
    pct(libPRF.POG.f1),
  ]);

  console.log(makeTable(['Count', 'POG', 'POG+FBC'], libRows));

  const verRows: string[][] = [
    ['TP', String(cntRange.TP), String(cfgRange.TP), String(pogRange.TP)],
    ['FP', String(cntRange.FP), String(cfgRange.FP), String(pogRange.FP)],
    ['FN', String(cntRange.FN), String(cfgRange.FN), String(pogRange.FN)],
  ];

  const verPRF = {
    Count: prf(cntRange),
    CFG: prf(cfgRange),
    POG: prf(pogRange),
  };
  verRows.push(['', '', '', '']);
  verRows.push([
    'Precision',
    pct(verPRF.Count.precision),
    pct(verPRF.CFG.precision),
    pct(verPRF.POG.precision),
  ]);
  verRows.push([
    'Recall',
    pct(verPRF.Count.recall),
    pct(verPRF.CFG.recall),
    pct(verPRF.POG.recall),
  ]);
  verRows.push([
    'F1-score',
    pct(verPRF.Count.f1),
    pct(verPRF.CFG.f1),
    pct(verPRF.POG.f1),
  ]);

  console.log(makeTable(['Count', 'POG', 'POG+FBC'], verRows));
};

export default main;
