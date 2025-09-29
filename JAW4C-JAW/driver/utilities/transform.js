#!/opt/homebrew/bin/node
/**
 * Code Transformation Module
 * Handles sequence expression splitting and other AST transformations
 * Separated from lifting functionality for clean architecture
 */

const splitSequence = require("./split-sequence")

/**
 * Transform code by applying sequence expression splitting
 * @param {string} code - JavaScript code to transform
 * @returns {string} - Transformed code
 */
function transform(code) {
    if (!code || code.trim() === "") {
        return "";
    }

    try {
        return splitSequence(code);
    } catch (error) {
        console.error("Error in code transformation:", error);
        return "";
    }
}

module.exports = transform;

// Run transformer if this file is run directly
if (require.main === module) {
    const { ArgumentParser } = require('argparse');
    const fs = require('fs');

    const parser = new ArgumentParser({
        description: 'JavaScript code transformer for sequence expressions'
    });
    parser.add_argument('inputfile', { help: 'input file path (positional)' });
    parser.add_argument('outputfile', { help: 'output file path' });
    const args = parser.parse_args();

    const inputfile = args.inputfile;
    const outputfile = args.outputfile;

    if (inputfile) {
        fs.readFile(inputfile, 'utf8', (err, data) => {
            if (err || (data === undefined)) {
                console.error(`Error reading ${inputfile}:`, err);
                process.exit(1);
            }

            const transformed = transform(data);
            if (transformed !== "") {
                fs.writeFile(outputfile, transformed, (err) => {
                    if (err) {
                        console.error(`Error writing ${outputfile}:`, err);
                        process.exit(1);
                    }
                    console.log("Transformed code written to " + outputfile);
                });
            } else {
                console.error(`Unable to transform ${inputfile}`);
            }
        });
    }
}