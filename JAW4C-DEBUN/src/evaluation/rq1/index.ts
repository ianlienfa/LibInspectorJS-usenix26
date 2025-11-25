import fs, { mkdirSync } from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { evaluateAll } from '../../debun/phase2/lib-scorer';

const allLibNames = Object.keys(
  JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../data/debun-hashes/all-libs.json`), 'utf-8')
  )
).filter((lib) => lib !== 'react-dom');

function multiplesInRange(n: number, m: number, k: number) {
  return Array.from(
    { length: Math.floor((m - n) / k) + 1 },
    (_, i) => n + i * k
  ).filter((num) => num <= m);
}

const thresholds = multiplesInRange(0, 0.3, 0.01);

interface Metrics {
  TP: number;
  FP: number;
  FN: number;
  TN: number;
}

const inputCsvFilePath = path.join(__dirname, '../../ground/ground-truth.csv');

function formatDelta(num: number): string {
  return num < 0 ? `-${-num}` : `+${num}`;
}

async function evaluateDetectors(options: { threshold: number }) {
  const scoreOutputCsvFilePath = path.join(
    __dirname,
    `../../results/rq1/detail/${options.threshold}/score.csv`
  );
  const libsOutputCsvFilePath = path.join(
    __dirname,
    `../../results/rq1/detail/${options.threshold}/libs.csv`
  );
  const libsCntOutputCsvFilePath = path.join(
    __dirname,
    `../../results/rq1/detail/${options.threshold}/libsCnt.csv`
  );

  const intersectCsvOutputPath = path.join(
    __dirname,
    `../../results/rq1/detail/${options.threshold}/intesecrt.csv`
  );

  mkdirSync(
    path.join(__dirname, `../../results/rq1/detail/${options.threshold}`),
    {
      recursive: true,
    }
  );
  const debunResult = evaluateAll(options);
  const fileContent = fs.readFileSync(inputCsvFilePath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true });
  const data: any[] = parsed.data;
  let ptOnly = 0;
  let ptDbIntersect = 0;
  let dbPtOnly = 0;
  let ldOnly = 0;
  let ldDbIntersect = 0;
  let dbLdOnly = 0;

  if (!data.length) {
    console.log('No data found in CSV file.');
    return;
  }

  const idxLdc = data[0].hasOwnProperty('ldc') ? 'ldc' : null;
  const idxPtdetector = data[0].hasOwnProperty('ptdetector')
    ? 'ptdetector'
    : null;
  const idxGroundTruth = data[0].hasOwnProperty('ground truth')
    ? 'ground truth'
    : null;

  if (!idxLdc || !idxPtdetector || !idxGroundTruth) {
    console.log('One or more required columns are missing.');
    return;
  }

  let ldc: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };
  let pt: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };
  let db: Metrics = { TP: 0, FP: 0, FN: 0, TN: 0 };

  let libsOutput = 'url, ground truth, ldc, ptdetector, debun\n';

  const libCnts: Record<
    string,
    Record<'ldc' | 'ptdetector' | 'debun' | 'ground_truth', number>
  > = {};

  data.forEach((row) => {
    const truthSet = new Set(parseLibraries(row[idxGroundTruth]));
    if (truthSet.size === 0) return;
    const ldcSet = new Set(parseLibraries(row[idxLdc]));
    const ptSet = new Set(parseLibraries(row[idxPtdetector]));
    const debunSet = new Set(
      debunResult[row['url']].map((r) => r.split('@')[0])
    );
    libsOutput += `${row['url']},"${Array.from(truthSet).join(
      ','
    )}","${Array.from(ldcSet).join(',')}","${Array.from(ptSet).join(
      ','
    )}","${Array.from(debunSet).join(',')}"\n`;

    const allLibs = new Set([...allLibNames]);

    allLibs.forEach((lib) => {
      updateMetrics(ldc, truthSet.has(lib), ldcSet.has(lib));
      updateMetrics(pt, truthSet.has(lib), ptSet.has(lib));
      updateMetrics(db, truthSet.has(lib), debunSet.has(lib));

      if (truthSet.has(lib) && !ptSet.has(lib) && debunSet.has(lib)) dbPtOnly++;
      if (truthSet.has(lib) && ptSet.has(lib) && debunSet.has(lib))
        ptDbIntersect++;
      if (truthSet.has(lib) && ptSet.has(lib) && !debunSet.has(lib)) ptOnly++;

      if (truthSet.has(lib) && !ldcSet.has(lib) && debunSet.has(lib))
        dbLdOnly++;
      if (truthSet.has(lib) && ldcSet.has(lib) && debunSet.has(lib))
        ldDbIntersect++;
      if (truthSet.has(lib) && ldcSet.has(lib) && !debunSet.has(lib)) ldOnly++;

      if (truthSet.has(lib)) {
        if (!libCnts[lib])
          libCnts[lib] = { ldc: 0, ptdetector: 0, debun: 0, ground_truth: 0 };
        libCnts[lib].ground_truth++;
        if (ldcSet.has(lib) && truthSet.has(lib)) libCnts[lib].ldc++;
        if (ptSet.has(lib) && truthSet.has(lib)) libCnts[lib].ptdetector++;
        if (debunSet.has(lib) && truthSet.has(lib)) libCnts[lib].debun++;
      }
    });
  });

  const results = [
    ['Metric', 'LDC', 'PTDetector', 'DEBUN'],
    ['TP', ldc.TP, pt.TP, db.TP],
    ['FP', ldc.FP, pt.FP, db.FP],
    ['FN', ldc.FN, pt.FN, db.FN],
    [
      'Precision',
      formatPercentage(precision(ldc)),
      formatPercentage(precision(pt)),
      formatPercentage(precision(db)),
    ],
    [
      'Recall',
      formatPercentage(recall(ldc)),
      formatPercentage(recall(pt)),
      formatPercentage(recall(db)),
    ],
    [
      'F1score',
      formatPercentage(f1score(ldc)),
      formatPercentage(f1score(pt)),
      formatPercentage(f1score(db)),
    ],
  ];

  const csvOutput = Papa.unparse(results);
  fs.writeFileSync(scoreOutputCsvFilePath, csvOutput);
  fs.writeFileSync(libsOutputCsvFilePath, libsOutput);

  const libCntCsv: (string | number)[][] = [
    ['Library', 'LDC', 'Delta', 'DEBUN', 'Delta', 'PTDetector', 'Ground'],
  ];
  Object.entries(libCnts)
    .sort((a, b) => b[1].ground_truth - a[1].ground_truth)
    .forEach(([lib, cnts]) => {
      libCntCsv.push([
        lib,
        cnts.ldc,
        formatDelta(cnts.debun - cnts.ldc),
        cnts.debun,
        formatDelta(cnts.debun - cnts.ptdetector),
        cnts.ptdetector,
        cnts.ground_truth,
      ]);
    });
  libCntCsv.push([
    'Total',
    ldc.TP,
    formatDelta(db.TP - ldc.TP),
    db.TP,
    formatDelta(db.TP - pt.TP),
    pt.TP,
    Object.values(libCnts).reduce((acc, cur) => acc + cur.ground_truth, 0),
  ]);
  fs.writeFileSync(libsCntOutputCsvFilePath, Papa.unparse(libCntCsv));

  fs.writeFileSync(
    intersectCsvOutputPath,
    Papa.unparse([
      [
        'ptOnly',
        'ptDbIntersect',
        'dbPtOnly',
        'ldOnly',
        'ldDbIntersect',
        'dbLdOnly',
      ],
      [ptOnly, ptDbIntersect, dbPtOnly, ldOnly, ldDbIntersect, dbLdOnly],
    ])
  );

  return db;
}

function parseLibraries(cellValue: string | undefined): string[] {
  if (!cellValue) return [];
  return cellValue
    .split(',')
    .map((lib) => lib.split('@')[0].trim())
    .filter((lib) => lib.length > 0);
}

function updateMetrics(
  metrics: Metrics,
  truthExists: boolean,
  detected: boolean,
  log = false
): void {
  if (truthExists && detected) metrics.TP++;
  if (!truthExists && detected) metrics.FP++;
  if (truthExists && !detected) metrics.FN++;
  if (!truthExists && !detected) metrics.TN++;
}

function precision({ TP, FP }: Metrics): number {
  return TP + FP === 0 ? 0 : TP / (TP + FP);
}

function recall({ TP, FN }: Metrics): number {
  return TP + FN === 0 ? 0 : TP / (TP + FN);
}

function f1score(metrics: Metrics): number {
  const p = precision(metrics);
  const r = recall(metrics);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

function formatPercentage(value: number): string {
  return (value * 100).toFixed(5) + ' %';
}

const makeTextTable = (headers: string[], rows: string[][]) => {
  const table = [headers, ...rows];
  const widths = headers.map((_, c) =>
    Math.max(...table.map((r) => (r[c] ?? '').length))
  );
  const line = (cells: string[]) =>
    cells.map((cell, i) => (cell ?? '').padEnd(widths[i], ' ')).join('  |  ');
  const hr = widths.map((w) => '-'.repeat(w)).join('--|--');
  return [line(table[0]), hr, ...table.slice(1).map(line)].join('\n');
};
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

const main = async () => {
  const options = thresholds.map((t) => ({ threshold: t }));

  let bestThreshold = thresholds[0];
  let bestF1 = 0;

  let bestMetric: { TP: number; FP: number; FN: number } | null = null;
  let bestP = 0,
    bestR = 0,
    bestF = 0;

  const metricsCsvPath = path.join(__dirname, '../../results/rq1/metrics.csv');
  fs.mkdirSync(path.dirname(metricsCsvPath), { recursive: true });
  fs.writeFileSync(
    metricsCsvPath,
    'Threshold,TP,FP,FN,Precision,Recall,F1Score\n'
  );

  for (const option of options) {
    const dbMetric = await evaluateDetectors(option);
    if (!dbMetric) continue;

    const [p, r, f] = [precision, recall, f1score].map((fn) => fn(dbMetric));

    fs.appendFileSync(
      metricsCsvPath,
      `${option.threshold},${dbMetric.TP},${dbMetric.FP},${dbMetric.FN},${p},${r},${f}\n`
    );

    if (f > bestF1) {
      bestF1 = f;
      bestThreshold = option.threshold;
      bestMetric = dbMetric;
      bestP = p;
      bestR = r;
      bestF = f;
    }

    console.log(
      `Threshold: ${option.threshold} is done. Check`,
      path.join(__dirname, `../../results/rq1/detail/${option.threshold}/`)
    );
  }

  console.log('Best F1:', bestF1, 'at threshold:', bestThreshold);
  console.log(
    'Check Best Settings in directory: ',
    path.join(__dirname, `../../results/rq1/detail/${bestThreshold}/`)
  );
  console.log('All Scores by Threshold', metricsCsvPath);

  if (bestMetric) {
    const bestScoreCsvPath = path.join(
      __dirname,
      `../../results/rq1/detail/${bestThreshold}/score.csv`
    );

    try {
      const scoreCsv = fs.readFileSync(bestScoreCsvPath, 'utf-8');
      const parsed = Papa.parse(scoreCsv, { header: true });

      const rowOf = (metricName: string) =>
        (parsed.data as any[]).find((r) => r?.Metric === metricName) || null;

      const tp = rowOf('TP');
      const fp = rowOf('FP');
      const fn = rowOf('FN');

      if (tp && fp && fn) {
        const ldc: Metrics = {
          TP: Number(tp.LDC) || 0,
          FP: Number(fp.LDC) || 0,
          FN: Number(fn.LDC) || 0,
          TN: 0,
        };
        const pt: Metrics = {
          TP: Number(tp.PTDetector) || 0,
          FP: Number(fp.PTDetector) || 0,
          FN: Number(fn.PTDetector) || 0,
          TN: 0,
        };
        const db: Metrics = {
          TP: Number(tp.DEBUN) || 0,
          FP: Number(fp.DEBUN) || 0,
          FN: Number(fn.DEBUN) || 0,
          TN: 0,
        };

        const headers = ['Metrics', 'PTDETECTOR', 'LDC', 'DEBUN'];
        const rows: string[][] = [
          [
            'Precision',
            pct(precision(pt)),
            pct(precision(ldc)),
            pct(precision(db)),
          ],
          ['Recall', pct(recall(pt)), pct(recall(ldc)), pct(recall(db))],
          ['F1-score', pct(f1score(pt)), pct(f1score(ldc)), pct(f1score(db))],
        ];

        console.log('\n' + makeTextTable(headers, rows) + '\n');
      } else {
        const headers = ['Metrics', `DEBUN (threshold=${bestThreshold})`];
        const rows: string[][] = [
          ['Precision', pct(bestP)],
          ['Recall', pct(bestR)],
          ['F1-Score', pct(bestF)],
        ];
        console.log('\n' + makeTextTable(headers, rows) + '\n');
      }
    } catch {
      const headers = ['Metrics', `DEBUN (threshold=${bestThreshold})`];
      const rows: string[][] = [
        ['Precision', pct(bestP)],
        ['Recall', pct(bestR)],
        ['F1-Score', pct(bestF)],
      ];
      console.log('\n' + makeTextTable(headers, rows) + '\n');
    }
  }
};

export default main;
