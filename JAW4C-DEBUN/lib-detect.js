#!/usr/bin/env node
/**
 * DEBUN Library Detection Wrapper
 * This module wraps DEBUN's library detection functionality for use in JAW4C
 */

const fs = require('fs');
const path = require('path');

// Import compiled JavaScript modules from dist/
const fingerprintCollector = require('./dist/fingerprint-collector/index.js').default;
const { evaluate } = require('./dist/debun/phase2/lib-scorer.js');

/**
 * Detect libraries in a directory of JavaScript files
 * @param {string} dirPath - Path to directory containing JS files (0.js, 1.js, etc.)
 * @param {object} options - Detection options
 * @param {number} options.threshold - Detection threshold (default: 0.2)
 * @returns {Array} Array of detected libraries with name and version
 */
function detectLibraries(dirPath, options = {}) {
  const threshold = options.threshold || 0.2;

  try {
    // Load JavaScript files from directory
    const files = fs.readdirSync(dirPath)
      .filter((s) => /^\d+\.js$/.test(s))
      .map(file => path.join(dirPath, file));

    if (files.length === 0) {
      console.log(`No JavaScript files found in ${dirPath}`);
      return [];
    }

    const hashes = [];

    // Process each file to collect fingerprints
    for (const filePath of files) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const fingerprints = fingerprintCollector(raw);
        for (const hash of fingerprints) {
          hashes.push(hash);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
      }
    }

    // Remove duplicate hashes
    const uniqueHashes = Array.from(
      new Map(hashes.map((hash) => [hash.hash, hash])).values()
    );

    // Group hashes by node count
    const h = {};
    for (const hash of uniqueHashes) {
      if (!h[hash.nodes]) {
        h[hash.nodes] = [];
      }
      h[hash.nodes].push(hash.hash);
    }

    // Evaluate and get library scores
    const scores = evaluate(h, { threshold });

    // Format results
    const results = [];
    for (const score of scores) {
      const type3Version = score.type3Versions.join('@');
      const type2Version = score.type2Versions.join('@');
      const topVersion = score.topVersions.join('@');
      const version = type3Version || type2Version || topVersion || 'unknown';

      results.push({
        libname: score.libName === 'react-dom' ? 'react' : score.libName,
        version: version,
        url: `https://www.npmjs.com/package/${score.libName}`,
        location: 'bundled',
        accurate: true,
        score: score.score
      });
    }

    return results;

  } catch (error) {
    console.error(`Error in DEBUN library detection:`, error);
    throw error;
  }
}

module.exports = { detectLibraries };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node lib-detect.js <directory>');
    console.log('  directory: Path to directory containing JavaScript files (0.js, 1.js, etc.)');
    process.exit(1);
  }

  const dirPath = args[0];

  try {
    const results = detectLibraries(dirPath);
    console.log('DETECTED LIBRARIES:');
    results.forEach(lib => {
      console.log(`${lib.libname}@${lib.version} (score: ${lib.score})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
