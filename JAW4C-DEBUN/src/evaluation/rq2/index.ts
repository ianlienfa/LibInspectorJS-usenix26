import fs, { mkdirSync } from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { evaluateAll } from '../../debun/phase2/lib-scorer';

interface Metrics {
  TP: number;
  FP: number;
  FN: number;
  TN: number;
}

const SCORE_THRESHOLD = 0.2;

const inputCsvFilePath = path.join(__dirname, '../../ground/ground-truth.csv');

mkdirSync(path.join(__dirname, `../../results/rq2/detail/${SCORE_THRESHOLD}`), {
  recursive: true,
});
const scoreCsvFilePath = path.join(
  __dirname,
  `../../results/rq2/detail/${SCORE_THRESHOLD}/score.csv`
);
const allCsvFilePath = path.join(
  __dirname,
  `../../results/rq2/detail/${SCORE_THRESHOLD}/all.csv`
);

function evaluateDetectors() {
  const debunResult = evaluateAll({ threshold: SCORE_THRESHOLD });
  const fileContent = fs.readFileSync(inputCsvFilePath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true });
  const data: any[] = parsed.data;
  let allResults: string = 'url,ground_truth,debun\n';

  if (!data.length) {
    console.log('No data found in CSV file.');
    return;
  }

  const idxLdc = data[0].hasOwnProperty('ldc_version') ? 'ldc_version' : null;
  const idxGroundTruth = data[0].hasOwnProperty('ground truth')
    ? 'ground truth'
    : null;

  if (!idxLdc || !idxGroundTruth) {
    console.log('One or more required columns are missing.');
    return;
  }

  const ldcRange: Metrics = {
    TP: 0,
    FP: 0,
    TN: 0,
    FN: 0,
  };
  const ldcExact: Metrics = {
    TP: 0,
    FP: 0,
    TN: 0,
    FN: 0,
  };
  const dbRange: Metrics = {
    TP: 0,
    FP: 0,
    TN: 0,
    FN: 0,
  };
  const dbExact: Metrics = {
    TP: 0,
    FP: 0,
    TN: 0,
    FN: 0,
  };

  const venRange = {
    onlyLDC: 0,
    onlyDB: 0,
    intersect: 0,
  };
  const venExact = {
    onlyLDC: 0,
    onlyDB: 0,
    intersect: 0,
  };

  let allversions = 0;
  data.forEach((row) => {
    const truthSet = new Set(parseLibraries(row[idxGroundTruth]));
    if (truthSet.size === 0) return;
    const ldcSet = new Set(parseLibraries(row[idxLdc]));
    const debunSet = new Set(debunResult[row['url']]);

    allResults += `"${row['url']}","${row[idxGroundTruth]}","${debunResult[
      row['url']
    ].join(',')}"\n`;

    truthSet.forEach((lib) => {
      let ldcRangeDetected = false;
      let ldcExactDetected = false;
      let debunRangeDetected = false;
      let debunExactDetected = false;
      const [libName, ...versions] = lib.split('@');
      if (!versions.length) return;
      allversions++;

      const ldcLib = [...ldcSet].find((l) => l.startsWith(`${libName}@`));
      if (ldcLib) {
        const ldcVersion = ldcLib.split('@')[1];
        if (ldcVersion) {
          const [ldcVersion] = ldcLib.split('@').slice(1);
          if (versions.includes(ldcVersion)) {
            ldcRangeDetected = true;
            ldcRange.TP++;
            ldcExactDetected = true;
            ldcExact.TP++;
          } else if (ldcVersion.startsWith(versions[0].split('.')[0])) {
            ldcRangeDetected = true;
            ldcRange.TP++;
            ldcExact.FN++;
          } else {
            ldcRange.FP++;
            ldcExact.FP++;
          }
        } else {
          ldcRange.FN++;
          ldcExact.FN++;
        }
      } else {
        ldcRange.FN++;
        ldcExact.FN++;
      }
      const debunLib = [...debunSet].filter((l) => l.startsWith(`${libName}@`));
      if (debunLib) {
        const debunVersions = debunLib.flatMap((d) => d.split('@').slice(1));
        if (debunVersions.length > 0) {
          let trueVersions = 0;
          versions.forEach((version) => {
            if (debunVersions.includes(version)) trueVersions++;
          });

          if (trueVersions > 0) {
            if (debunVersions.length === 1) {
              debunExactDetected = true;
              dbExact.TP++;
              debunRangeDetected = true;
              dbRange.TP++;
            } else {
              debunRangeDetected = true;
              dbRange.TP++;
              dbExact.FN++;
            }
          } else {
            if (debunVersions.length === 1) {
              dbExact.FP++;
              dbExact.FN++;
              dbRange.FP++;
              dbRange.FN++;
            } else {
              dbExact.FN++;
              dbRange.FP++;
              dbRange.FN++;
            }
          }
        } else {
          dbRange.FN++;
          dbExact.FN++;
        }
      } else {
        dbRange.FN++;
        dbExact.FN++;
      }

      if (debunExactDetected && ldcExactDetected) venExact.intersect++;
      else if (ldcExactDetected) venExact.onlyLDC++;
      else if (debunExactDetected) venExact.onlyDB++;

      if (debunRangeDetected && ldcRangeDetected) venRange.intersect++;
      else if (ldcRangeDetected) venRange.onlyLDC++;
      else if (debunRangeDetected) venRange.onlyDB++;
    });
    ldcSet.forEach((lib) => {
      const [libName, version] = lib.split('@');
      if ([...truthSet].find((l) => l.startsWith(`${libName}`))) return;
      ldcRange.FP++;
    });
    debunSet.forEach((lib) => {
      const [libName, version] = lib.split('@');
      if ([...truthSet].find((l) => l.startsWith(`${libName}`))) return;
      dbRange.FP++;
    });
  });

  type C = { TP: number; FP: number; FN: number };

  const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);
  const prf = (m: C) => {
    const precision = safeDiv(m.TP, m.TP + m.FP);
    const recall = safeDiv(m.TP, m.TP + m.FN);
    const f1 =
      precision + recall === 0
        ? 0
        : (2 * precision * recall) / (precision + recall);
    return { precision, recall, f1 };
  };
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  /** 헤더 포함 단순 텍스트 테이블 (마크다운 아님) */
  const makeTable = (headers: string[], rows: string[][]) => {
    const table = [headers, ...rows];
    const widths = headers.map((_, c) =>
      Math.max(...table.map((r) => (r[c] ?? '').length))
    );
    const line = (cells: string[]) =>
      cells.map((cell, i) => (cell ?? '').padEnd(widths[i], ' ')).join('  |  ');
    const hr = widths.map((w) => '-'.repeat(w)).join('--|--');
    return [line(table[0]), hr, ...table.slice(1).map(line)].join('\n');
  };

  const results = [
    ['Metric', 'LDC', 'DEBUN', 'LDC_RANGE', 'DEBUN_RANGE'],
    ['TP', ...[ldcExact, dbExact, ldcRange, dbRange].map((m) => m.TP)],
    ['FP', ...[ldcExact, dbExact, ldcRange, dbRange].map((m) => m.FP)],
    ['FN', ...[ldcExact, dbExact, ldcRange, dbRange].map((m) => m.FN)],
    [
      'Precision',
      ...[ldcExact, dbExact, ldcRange, dbRange].map((m) =>
        format(m.TP / (m.TP + m.FP))
      ),
    ],
    [
      'Recall',
      ...[ldcExact, dbExact, ldcRange, dbRange].map((m) =>
        format(m.TP / (m.TP + m.FN))
      ),
    ],
    [
      'F1-Score',
      ...[ldcExact, dbExact, ldcRange, dbRange].map((m) => {
        const precision = m.TP / (m.TP + m.FP);
        const recall = m.TP / (m.TP + m.FN);
        return format((2 * precision * recall) / (precision + recall));
      }),
    ],
  ];

  const csvOutput = Papa.unparse(results);

  {
    const L = prf(ldcExact);
    const D = prf(dbExact);
    const Lr = prf(ldcRange);
    const Dr = prf(dbRange);

    const headers = [
      'Metrics',
      'LDC (exact)',
      'DEBUN (exact)',
      'LDC (inclusion)',
      'DEBUN (inclusion)',
    ];

    const rows: string[][] = [
      [
        'Precision',
        pct(L.precision),
        pct(D.precision),
        pct(Lr.precision),
        pct(Dr.precision),
      ],
      ['Recall', pct(L.recall), pct(D.recall), pct(Lr.recall), pct(Dr.recall)],
      ['F1-Score', pct(L.f1), pct(D.f1), pct(Lr.f1), pct(Dr.f1)],
    ];

    console.log(makeTable(headers, rows));
  }

  fs.writeFileSync(scoreCsvFilePath, csvOutput);
  fs.writeFileSync(allCsvFilePath, allResults);
  console.log(scoreCsvFilePath, allCsvFilePath);

  const venExactResults = [
    ['Metric', 'Value'],
    ['Only LDC', venExact.onlyLDC],
    ['Only DEBUN', venExact.onlyDB],
    ['Intersect', venExact.intersect],
  ];
  const venExactOutputCsv = Papa.unparse(venExactResults);
  fs.writeFileSync(
    path.join(__dirname, `../../results/rq2/ven-exact.csv`),
    venExactOutputCsv
  );

  const venRangeResults = [
    ['Metric', 'Value'],
    ['Only LDC', venRange.onlyLDC],
    ['Only DEBUN', venRange.onlyDB],
    ['Intersect', venRange.intersect],
  ];
  const venRangeOutputCsv = Papa.unparse(venRangeResults);
  fs.writeFileSync(
    path.join(__dirname, `../../results/rq2/ven-range.csv`),
    venRangeOutputCsv
  );
}

function parseLibraries(cellValue: string | undefined): string[] {
  if (!cellValue) return [];
  return cellValue
    .split(',')
    .map((lib) => lib.trim())
    .filter((lib) => lib.length > 0);
}

function format(value: number): string {
  return value.toFixed(5);
}

const main = () => {
  evaluateDetectors();
};

export default main;
