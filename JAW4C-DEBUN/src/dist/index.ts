#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs';
import { downloadScripts } from '../cmd/crawler';
import { evaluate } from '../debun/phase2/lib-scorer';
import rq1 from '../evaluation/rq1/index';
import rq2 from '../evaluation/rq2/index';
import rq3_2 from '../evaluation/rq3-2/index';
import rq3 from '../evaluation/rq3/index';
import fingerprintCollector from '../fingerprint-collector';
import { POGHash } from '../types/pog';

program
  .name('DEBUN')
  .description(
    'DEBUN - Detecting Bundled JavaScript Libraries on Web using Property-Order Graphs'
  )
  .usage('<command> [options]');

program
  .command('detect')
  .description('Detecting Libraries from the target Website')
  .option('-u, --url <url>', 'URL of the target website')
  .option('-d, --dir <dir>', 'Directory to save downloaded scripts', './scripts')
  .action(async (options: { url?: string, dir?: string }) => {
    const url = options.url || '';
    const dir = options.dir || '';
    // declare filePaths
    let filePaths: string[] = [];
    if(!dir && !url) {
      console.error('Either --url or --dir option must be provided.');
      return;
    }
    if(dir) {
      // load filePaths from dir
      console.log(`Loading scripts from directory: ${dir}`);
      filePaths = fs.readdirSync(dir).filter((s) => /^\d+\.js$/.test(s)).map(file => `${dir}/${file}`);      
    }
    if(url){
      console.log(`Downloading scripts from URL: ${url}`);
      filePaths = await downloadScripts(url);      
    }    
    const hashes: POGHash[] = [];
    
    for (const filePath of filePaths) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const fingerprints = fingerprintCollector(raw);
        for (const hash of fingerprints) {
          hashes.push(hash);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    const uniqueHashes = Array.from(
      new Map(hashes.map((hash) => [hash.hash, hash])).values()
    );
    const h: Record<number, string[]> = {};
    for (const hash of uniqueHashes) {
      if (!h[hash.nodes]) {
        h[hash.nodes] = [];
      }
      h[hash.nodes].push(hash.hash);
    }
    const scores = evaluate(h, { threshold: 0.2 });
    console.log('DETECTED LIBRARIES:');
    for (const score of scores) {
      const type3Version = score.type3Versions.join('@');
      const type2Version = score.type2Versions.join('@');
      const topVersion = score.topVersions.join('@');
      const version = type3Version || type2Version || topVersion;
      console.log(
        `${score.libName === 'react-dom' ? 'react' : score.libName}@${version}`
      );
    }
  });

program
  .command('fingerprint-collector')
  .description('Collect fingerprints from the target')
  .argument('<path>', 'path of the target JavaScript file')
  .action((path: string) => {
    console.log(`Collecting fingerprints from ${path} ...`);
    try {
      const raw = fs.readFileSync(path, 'utf-8');
      const hashes = fingerprintCollector(raw);
      const uniqueHashes = Array.from(
        new Map(hashes.map((hash) => [hash.hash, hash])).values()
      );
      const h: Record<number, string[]> = {};
      for (const hash of uniqueHashes) {
        if (!h[hash.nodes]) {
          h[hash.nodes] = [];
        }
        h[hash.nodes].push(hash.hash);
      }
      const jsonFilePath = path.replace(/\.js$/, '.json');
      fs.writeFileSync(jsonFilePath, JSON.stringify(h, null, 2));
      console.log(`Fingerprints collected and saved to ${jsonFilePath}`);
    } catch (error) {
      console.error(`Error processing file ${path}:`, error);
    }
  });

// Add RQ1, RQ2, and RQ3 commands

program
  .command('run')
  .description('Execute Research Question')
  .argument('<rq>', 'rq number (RQ1, RQ2, RQ3)')
  .action((rq) => {
    switch (rq) {
      case 'RQ1':
        console.log('Executing Research Question 1...');
        rq1();
        break;
      case 'RQ2':
        console.log('Executing Research Question 2...');
        rq2();
        break;
      case 'RQ3-1':
        console.log('Executing Research Question 3...');
        rq3();
        break;
      case 'RQ3-2':
        console.log('Executing Research Question 3-2...');
        rq3_2();
        break;
      default:
        console.error('Invalid research question. Use RQ1, RQ2, or RQ3.');
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments provided (this should come after parse)
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
