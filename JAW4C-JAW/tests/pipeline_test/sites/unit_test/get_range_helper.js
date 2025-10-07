#!/usr/bin/env node

/*
 * Range Helper for ans.json Generation
 *
 * This helper uses JAW4C's jsparser.js (Esprima) to find identifier ranges
 * in JavaScript code, matching the same format stored in Neo4j nodes.
 *
 * Usage:
 *   node get_range_helper.js <js_file> <identifier_name> [occurrence]
 *   node get_range_helper.js --verify <js_file> <identifier_name> <range>
 *
 * Examples:
 *   # Find first occurrence of 'testObj'
 *   node get_range_helper.js test.js testObj
 *
 *   # Find second occurrence (0-indexed)
 *   node get_range_helper.js test.js testObj 1
 *
 *   # Find all occurrences
 *   node get_range_helper.js test.js testObj --all
 *
 *   # Verify a range matches an identifier
 *   node get_range_helper.js --verify test.js testObj "[100,107]"
 */

const fs = require('fs');
const path = require('path');

// Use JAW4C's jsparser module (it exports a parser instance, not a constructor)
const jsParserPath = path.join(__dirname, '../../../../engine/lib/jaw/parser/jsparser.js');
const parser = require(jsParserPath);

/**
 * Find all occurrences of an identifier in the AST
 */
function findIdentifierRanges(code, identifierName) {
    const ast = parser.parseAST(code, { range: true, loc: true });
    const results = [];

    function walk(node) {
        if (!node || typeof node !== 'object') return;

        // Check if this is an Identifier node with matching name
        if (node.type === 'Identifier' && node.name === identifierName) {
            results.push({
                range: `[${node.range[0]},${node.range[1]}]`,
                start: node.range[0],
                end: node.range[1],
                line: node.loc.start.line,
                column: node.loc.start.column,
                location: JSON.stringify(node.loc),
                code: code.substring(node.range[0], node.range[1]),
                type: node.type
            });
        }

        // Traverse children
        for (let key in node) {
            if (node.hasOwnProperty(key)) {
                let child = node[key];
                if (Array.isArray(child)) {
                    child.forEach(walk);
                } else if (typeof child === 'object' && child !== null) {
                    walk(child);
                }
            }
        }
    }

    walk(ast);
    return results;
}

/**
 * Verify that a range corresponds to the expected identifier
 */
function verifyRange(code, identifierName, expectedRange) {
    const ast = parser.parseAST(code, { range: true, loc: true });

    // Parse range string "[start,end]"
    const rangeMatch = expectedRange.match(/\[(\d+),(\d+)\]/);
    if (!rangeMatch) {
        return {
            valid: false,
            message: `Invalid range format: ${expectedRange}`
        };
    }

    const targetStart = parseInt(rangeMatch[1]);
    const targetEnd = parseInt(rangeMatch[2]);

    let found = null;

    function walk(node) {
        if (!node || typeof node !== 'object') return;

        if (node.range && node.range[0] === targetStart && node.range[1] === targetEnd) {
            found = {
                type: node.type,
                name: node.name || null,
                code: code.substring(node.range[0], node.range[1]),
                range: `[${node.range[0]},${node.range[1]}]`,
                location: JSON.stringify(node.loc),
                line: node.loc.start.line,
                column: node.loc.start.column
            };
            return;
        }

        for (let key in node) {
            if (node.hasOwnProperty(key)) {
                let child = node[key];
                if (Array.isArray(child)) {
                    child.forEach(walk);
                } else if (typeof child === 'object' && child !== null) {
                    walk(child);
                }
            }
        }
    }

    walk(ast);

    if (!found) {
        return {
            valid: false,
            message: `Range ${expectedRange} not found in AST`
        };
    }

    const isValid = (
        found.name === identifierName ||
        found.code === identifierName
    );

    return {
        valid: isValid,
        found_code: found.code,
        found_type: found.type,
        found_name: found.name,
        found_range: found.range,
        found_location: found.location,
        message: isValid
            ? `✓ Range ${expectedRange} correctly identifies '${identifierName}' (${found.type})`
            : `✗ Range ${expectedRange} found '${found.code}' (${found.type}), expected '${identifierName}'`
    };
}

/**
 * Print usage information
 */
function printUsage() {
    console.log(`
Usage:
  node get_range_helper.js <js_file> <identifier_name> [occurrence|--all]
  node get_range_helper.js --verify <js_file> <identifier_name> <range>

Examples:
  # Find first occurrence of 'testObj'
  node get_range_helper.js test.js testObj

  # Find second occurrence (0-indexed)
  node get_range_helper.js test.js testObj 1

  # Find all occurrences
  node get_range_helper.js test.js testObj --all

  # Verify a range matches an identifier
  node get_range_helper.js --verify test.js testObj "[100,107]"
`);
}

/**
 * Main entry point
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        process.exit(0);
    }

    // Verify mode
    if (args[0] === '--verify') {
        if (args.length < 4) {
            console.error('Error: --verify requires <js_file> <identifier_name> <range>');
            printUsage();
            process.exit(1);
        }

        const jsFile = args[1];
        const identifierName = args[2];
        const expectedRange = args[3];

        if (!fs.existsSync(jsFile)) {
            console.error(`Error: File not found: ${jsFile}`);
            process.exit(1);
        }

        const code = fs.readFileSync(jsFile, 'utf-8');
        const result = verifyRange(code, identifierName, expectedRange);

        console.log(JSON.stringify(result, null, 2));
        process.exit(result.valid ? 0 : 1);
    }

    // Find mode
    if (args.length < 2) {
        console.error('Error: Missing required arguments');
        printUsage();
        process.exit(1);
    }

    const jsFile = args[0];
    const identifierName = args[1];
    const occurrenceArg = args[2];

    if (!fs.existsSync(jsFile)) {
        console.error(`Error: File not found: ${jsFile}`);
        process.exit(1);
    }

    const code = fs.readFileSync(jsFile, 'utf-8');
    const results = findIdentifierRanges(code, identifierName);

    if (results.length === 0) {
        console.log(JSON.stringify({
            found: false,
            message: `Identifier '${identifierName}' not found in ${jsFile}`
        }, null, 2));
        process.exit(1);
    }

    // Return all occurrences
    if (occurrenceArg === '--all') {
        console.log(JSON.stringify({
            found: true,
            identifier: identifierName,
            total_occurrences: results.length,
            occurrences: results
        }, null, 2));
        process.exit(0);
    }

    // Return specific occurrence
    const occurrence = occurrenceArg ? parseInt(occurrenceArg) : 0;

    if (occurrence >= results.length || occurrence < 0) {
        console.log(JSON.stringify({
            found: false,
            message: `Occurrence ${occurrence} not found. Total occurrences: ${results.length}`
        }, null, 2));
        process.exit(1);
    }

    const result = results[occurrence];
    console.log(JSON.stringify({
        found: true,
        identifier: identifierName,
        occurrence: occurrence,
        total_occurrences: results.length,
        ...result
    }, null, 2));
    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = {
    findIdentifierRanges,
    verifyRange
};
