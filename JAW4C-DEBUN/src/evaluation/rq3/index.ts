import escodegen from 'escodegen';
import fs from 'fs';
import { ESTree } from 'meriyah';
import path from 'path';
import readline from 'readline';
import extractFunctions from '../../fingerprint-collector/function-collector';
import { generatePOGHash } from '../../fingerprint-collector/hash-function';
import { extractPOG } from '../../fingerprint-collector/pog-generator';
import { POGHash } from '../../types/pog';
import { getPropertyCnthash } from './property-cnt';

function getAllFiles(dirPath: string, basePath: string = dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let result: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);
    if (entry.isFile()) result.push(relativePath);
    else if (entry.isDirectory())
      result = result.concat(getAllFiles(fullPath, basePath));
  }
  return result;
}

function countLines(str: string) {
  return str.split('\n').length;
}

const hashOneFunc: Record<
  'A' | 'B' | 'C' | 'D' | 'E',
  (body: ESTree.Node) => POGHash
> = {
  // Count
  A: (body: ESTree.Node) => getPropertyCnthash(undefined, body),
  // POG
  B: (body: ESTree.Node) => {
    const cfg = extractPOG(body, [false, false, false]);
    return generatePOGHash({ body, graph: cfg.nodes });
  },
  // POG + F
  C: (body: ESTree.Node) => {
    const cfg = extractPOG(body, [true, false, false]);
    return generatePOGHash({ body, graph: cfg.nodes });
  },
  // POG + FB
  D: (body: ESTree.Node) => {
    const cfg = extractPOG(body, [true, true, false]);
    return generatePOGHash({ body, graph: cfg.nodes });
  },
  // POG + FBC
  E: (body: ESTree.Node) => {
    const cfg = extractPOG(body, [true, true, true]);
    return generatePOGHash({ body, graph: cfg.nodes });
  },
};

function extractHash(type: string) {
  const allFiles = getAllFiles(path.join(__dirname, `../../data/${type}`));
  const filename = path.join(__dirname, `../../data/${type}.log`);
  fs.writeFileSync(
    filename,
    `idx,${Object.keys(hashOneFunc)
      .map((k) => `nodes${k},hash${k}`)
      .join(',')},loc\n`
  );
  allFiles.forEach((filePath) => {
    const raw = fs.readFileSync(
      path.join(__dirname, `../../data/${type}`, filePath),
      'utf-8'
    );
    try {
      const functions = extractFunctions(raw);
      functions
        .filter((f) => f.id !== undefined && !f.id.startsWith('JSCA_null'))
        .forEach((f) => {
          const res = Object.entries(hashOneFunc).map(([key, func]) =>
            func(f.body)
          );
          const body = escodegen.generate(f.body);
          const lines = countLines(body);
          fs.appendFileSync(
            filename,
            `${f.id},${res
              .map((r) => `${r.nodes},${r.hash}`)
              .join(',')},${lines}\n`
          );
        });
    } catch (e) {
      console.log(e, filePath, raw);
    }
  });
}

function getExitCondition(value: number, threshold: number): boolean {
  return value < threshold;
}

async function processLogFile(
  filePath: string,
  callback: (line: string) => void
) {
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Windows CRLF (\r\n)도 정상 처리
  });

  for await (const line of rl) {
    callback(line);
  }
}

const processRq3 = async (LOC_THRESHOLD: number) => {
  const swcMapA: Record<string, string> = {};
  const swcMapB: Record<string, string> = {};
  const swcMapC: Record<string, string> = {};
  const swcMapD: Record<string, string> = {};
  const swcMapE: Record<string, string> = {};

  const terserMapA: Record<string, string> = {};
  const terserMapB: Record<string, string> = {};
  const terserMapC: Record<string, string> = {};
  const terserMapD: Record<string, string> = {};
  const terserMapE: Record<string, string> = {};

  const cntA: Record<string, number> = {};
  const cntB: Record<string, number> = {};
  const cntC: Record<string, number> = {};
  const cntD: Record<string, number> = {};
  const cntE: Record<string, number> = {};

  const locMap: Record<string, number> = {};

  let allFunctionCount = 0;
  let allMatchCntA = 0;
  let allMatchCntB = 0;
  let allMatchCntC = 0;
  let allMatchCntD = 0;
  let allMatchCntE = 0;
  let minifiedFunctionCount = 0;

  let bothTrueMatchCntA = 0;
  let bothTrueMatchCntB = 0;
  let bothTrueMatchCntC = 0;
  let bothTrueMatchCntD = 0;
  let bothTrueMatchCntE = 0;

  // 1. create loc map
  await processLogFile(
    path.join(__dirname, '../../data/original.log'),
    (line: string) => {
      const [
        idx,
        nodesA,
        hashA,
        nodesB,
        hashB,
        nodesC,
        hashC,
        nodesD,
        hashD,
        nodesE,
        hashE,
        _loc,
      ] = line.split(',');
      if (!idx.startsWith('JSCA')) return;
      const loc = +_loc;
      locMap[idx] = loc;
    }
  );

  await processLogFile(
    path.join(__dirname, '../../data/swc.log'),
    (line: string) => {
      const [
        idx,
        nodesA,
        hashA,
        nodesB,
        hashB,
        nodesC,
        hashC,
        nodesD,
        hashD,
        nodesE,
        hashE,
      ] = line.split(',');
      if (!idx.startsWith('JSCA')) return;
      if (
        locMap[idx] === undefined ||
        getExitCondition(locMap[idx], LOC_THRESHOLD)
      )
        return;
      swcMapA[idx] = hashA;
      swcMapB[idx] = hashB;
      swcMapC[idx] = hashC;
      swcMapD[idx] = hashD;
      swcMapE[idx] = hashE;
    }
  );

  await processLogFile(
    path.join(__dirname, '../../data/terser.log'),
    (line: string) => {
      const [
        idx,
        nodesA,
        hashA,
        nodesB,
        hashB,
        nodesC,
        hashC,
        nodesD,
        hashD,
        nodesE,
        hashE,
      ] = line.split(',');
      if (!idx.startsWith('JSCA')) return;
      if (
        locMap[idx] === undefined ||
        getExitCondition(locMap[idx], LOC_THRESHOLD)
      )
        return;

      terserMapA[idx] = hashA;
      terserMapB[idx] = hashB;
      terserMapC[idx] = hashC;
      terserMapD[idx] = hashD;
      terserMapE[idx] = hashE;
    }
  );

  await processLogFile(
    path.join(__dirname, '../../data/original.log'),
    (line: string) => {
      const [
        idx,
        nodesA,
        hashA,
        nodesB,
        hashB,
        nodesC,
        hashC,
        nodesD,
        hashD,
        nodesE,
        hashE,
        loc,
      ] = line.split(',');
      if (getExitCondition(+loc, LOC_THRESHOLD)) return;
      allFunctionCount++;

      cntA[hashA] = cntA[hashA] + 1 || 1;
      cntB[hashB] = cntB[hashB] + 1 || 1;
      cntC[hashC] = cntC[hashC] + 1 || 1;
      cntD[hashD] = cntD[hashD] + 1 || 1;
      cntE[hashE] = cntE[hashE] + 1 || 1;
    }
  );

  await processLogFile(
    path.join(__dirname, '../../data/original.log'),
    (line: string) => {
      const [
        idx,
        nodesA,
        hashA,
        nodesB,
        hashB,
        nodesC,
        hashC,
        nodesD,
        hashD,
        nodesE,
        hashE,
        loc,
      ] = line.split(',');
      if (getExitCondition(+loc, LOC_THRESHOLD)) return;
      // if (+nodesA < 2 || +nodesB < 6 || +nodesC < 6) return;
      if (swcMapA[idx] && terserMapA[idx]) minifiedFunctionCount++;

      if (swcMapA[idx] === hashA && terserMapA[idx] === hashA)
        bothTrueMatchCntA++;
      if (swcMapB[idx] === hashB && terserMapB[idx] === hashB)
        bothTrueMatchCntB++;
      if (swcMapC[idx] === hashC && terserMapC[idx] === hashC)
        bothTrueMatchCntC++;
      if (swcMapD[idx] === hashD && terserMapD[idx] === hashD)
        bothTrueMatchCntD++;
      if (swcMapE[idx] === hashE && terserMapE[idx] === hashE)
        bothTrueMatchCntE++;

      if (cntA[hashA]) allMatchCntA += cntA[hashA];
      if (cntB[hashB]) allMatchCntB += cntB[hashB];
      if (cntC[hashC]) allMatchCntC += cntC[hashC];
      if (cntD[hashD]) allMatchCntD += cntD[hashD];
      if (cntE[hashE]) allMatchCntE += cntE[hashE];
    }
  );

  return {
    allFunctionCount,
    minifiedFunctionCount,
    bothTrueMatchCntA,
    allMatchCntA,
    bothTrueMatchCntB,
    allMatchCntB,
    bothTrueMatchCntC,
    allMatchCntC,
    bothTrueMatchCntD,
    allMatchCntD,
    bothTrueMatchCntE,
    allMatchCntE,
  };
};

const scoreFilename = path.join(__dirname, `../../results/rq3/score.csv`);
if (!fs.existsSync(path.dirname(scoreFilename))) {
  fs.mkdirSync(path.dirname(scoreFilename), { recursive: true });
}

const main = async () => {
  console.log('\n============ [PROCESS: HASH EXTRACTION] ============');
  console.log('\nExtracting [Original] hash...');
  console.time('Time[original]');
  extractHash('original');
  console.timeEnd('Time[original]');

  console.log('\nExtracting [SWC] hash...');
  console.time('Time[swc]');
  extractHash('swc');
  console.timeEnd('Time[swc]');

  console.log('\nExtracting [Terser] hash...');
  console.time('Time[terser]');
  extractHash('terser');
  console.timeEnd('Time[terser]');

  console.log('\n============ [PROCESS: SCORING] ============');
  console.time('Time[score]');
  const locs = Array.from({ length: 30 }, (_, i) => i);
  fs.writeFileSync(
    scoreFilename,
    'LOC,allFunctionCount,minifiedFunctionCount,bothTrueMatchCntA,allMatchCntA,bothTrueMatchCntB,allMatchCntB,bothTrueMatchCntC,allMatchCntC,bothTrueMatchCntD,allMatchCntD,bothTrueMatchCntE,allMatchCntE,\n'
  );
  for (const loc of locs) {
    console.log('processing', loc);
    const res = await processRq3(loc + 5);
    fs.appendFileSync(
      scoreFilename,
      `${loc + 1},${Object.values(res).join(',')}\n`
    );
  }
  console.timeEnd('Time[score]');
  console.log('done', scoreFilename);
};

export default main;
