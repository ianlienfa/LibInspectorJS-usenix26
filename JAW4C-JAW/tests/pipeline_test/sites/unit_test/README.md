# Unit Tests for Static Analysis Graph Querying

This directory contains unit tests for static analysis graph queries. Each test consists of a simple JavaScript file that is processed to generate an HPG (Hybrid Program Graph), which can then be queried via Neo4j.

## Directory Structure

```
unit_test/
├── unit_test_builder.py       # Main driver script
├── README.md                   # This file
└── static_query/               # Query-specific unit tests
    └── test_<name>/            # Individual test case
        ├── 0.js                # Test JavaScript code (numbered like crawler output)
        ├── nodes.csv.gz        # Generated graph nodes (compressed)
        ├── edges.csv.gz        # Generated graph edges (compressed)
        └── ans.json            # Expected query results
```

**Important**: JavaScript files must be named `0.js`, `1.js`, etc. (not `index.js`) to match the format expected by `static_analysis.js`, which mirrors the crawler's output format.

## Usage

### List Available Tests

```bash
python unit_test_builder.py --list
```

### Create New Test

```bash
python unit_test_builder.py --create test_name
```

This creates a new test directory with template `index.js` and `ans.json` files.

### Build Graph for Single Test

```bash
python unit_test_builder.py --test=test_initial_decl_cfg
```

This runs static analysis on the test's `index.js` file and generates:
- `nodes.csv.gz` - Compressed graph nodes
- `edges.csv.gz` - Compressed graph edges

### Build All Tests

```bash
python unit_test_builder.py --all
```

### Build and Load to Neo4j

```bash
python unit_test_builder.py --test=test_initial_decl_cfg --query
```

This:
1. Builds the graph files
2. Starts a Neo4j container
3. Imports the graph into Neo4j
4. Leaves container running for manual queries

### Clean Generated Files

```bash
python unit_test_builder.py --test=test_initial_decl_cfg --clean
```

Removes generated `nodes.csv.gz` and `edges.csv.gz` files.

## Available Tests

### Initial Declaration Tests

These tests verify the `get_initial_declaration` query functionality:

#### test_initial_decl_cfg
Tests variable declaration with `var` keyword.
```javascript
var testObj = 3;
var temp = testObj + 3;
```

#### test_initial_decl_assignment
Tests assignment without declaration keyword.
```javascript
testObj = 3;
temp = testObj + 3;
```

#### test_initial_decl_function_arg
Tests function parameter as initial declaration.
```javascript
function foo(testObj) {
    var temp = testObj + 3;
    return temp;
}
```

#### test_initial_decl_function_call
Tests CallExpression tracing to function declaration via `CG_parentOf`.
```javascript
function testObj() {
    return 3;
}
var temp = testObj() + 3;
```

## Writing Query Tests

Each test directory should contain a `test.py` file with test functions that validate graph query behavior. The `--query` option automatically loads the graph, runs the tests, and validates results against `ans.json`.

### Test File Structure

Create a `test.py` file in your test directory:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

# Add project root to path
TEST_DIR = Path(__file__).resolve().parent
BASE_DIR = TEST_DIR.parent.parent.parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import hpg_neo4j.query_utility as neo4jQueryUtilityModule


def test_get_initial_declaration(tx, test_cases):
    """
    Test the getInitialDeclaration function

    Args:
        tx: Neo4j transaction object
        test_cases: List of test case dictionaries from ans.json

    Returns:
        dict: Test results with pass/fail status for each case
    """
    results = {}

    for test_case in test_cases:
        test_name = test_case['name']
        node_range = test_case['node_range']
        expected = test_case['expected']

        # Get the node from the graph using its Range property
        nodes = neo4jQueryUtilityModule.getNodeFromRange(tx, node_range)

        if not nodes:
            results[test_name] = {
                'status': 'FAIL',
                'reason': f'Node with range {node_range} not found in graph'
            }
            continue

        node = nodes[0]

        # Call the function being tested
        try:
            declaration_node, identifier_node = neo4jQueryUtilityModule.getInitialDeclaration(tx, node)

            # Verify results
            passed = (
                declaration_node['Type'] == expected['declaration_type'] and
                identifier_node['Code'] == expected['identifier_code']
            )

            if passed:
                results[test_name] = {'status': 'PASS'}
            else:
                results[test_name] = {
                    'status': 'FAIL',
                    'reason': 'Result mismatch',
                    'expected': expected,
                    'actual': {
                        'declaration_type': declaration_node['Type'],
                        'identifier_code': identifier_node['Code']
                    }
                }

        except Exception as e:
            results[test_name] = {
                'status': 'ERROR',
                'reason': str(e)
            }

    return results
```

### Using getNodeFromRange

The `getNodeFromRange(tx, rangeStr)` function from `query_utility.py` retrieves nodes by their Range property. This is essential for testing specific nodes in the graph:

```python
# Get a node by its character position range in the source code
nodes = neo4jQueryUtilityModule.getNodeFromRange(tx, "[100,107]")
if nodes:
    node = nodes[0]
    # Test the query function on this node
    result = neo4jQueryUtilityModule.getInitialDeclaration(tx, node)
```

## ans.json Format

Each test includes an `ans.json` file that specifies the test function to run and expected results.

### Current Format (Range-Based)

The format uses **ranges** from JSParser output to avoid issues with code representation differences (e.g., quote styles):

```json
{
  "description": "Test description",
  "test_function": "test_get_initial_declaration",
  "test_cases": [
    {
      "name": "test_case_name",
      "description": "What this test case validates",
      "node_range": "[134,141]",
      "expected": {
        "declaration_node_type": "VariableDeclaration",
        "identifier_node_type": "Identifier",
        "declaration_node_range": "[130,146]",
        "identifier_node_range": "[134,141]"
      },
      "verify": {
        "source_file": "0.js",
        "declaration_code": "var testObj = 3",
        "identifier_code": "testObj"
      }
    }
  ]
}
```

**Fields:**
- `description`: Overall test description
- `test_function`: Name of the test function in `test.py` to execute
- `test_cases`: Array of test cases to validate
  - `name`: Unique identifier for this test case
  - `description`: What this specific case tests
  - `node_range`: The Range property value to identify the starting node for the test
  - `expected`: Expected query results (using ranges, not code strings)
    - `declaration_node_type`: Expected type of the declaration node
    - `identifier_node_type`: Expected type of the identifier node (usually "Identifier")
    - `declaration_node_range`: Expected range of the full declaration
    - `identifier_node_range`: Expected range of just the identifier
  - `verify`: Human-readable verification info (for documentation/debugging)
    - `source_file`: The JavaScript source file (e.g., "0.js")
    - `declaration_code`: Human-readable declaration code
    - `identifier_code`: Human-readable identifier name

### Why Range-Based Format?

**Problem**: JSParser/escodegen normalizes code during parsing:
- `var testObj = "3"` becomes `var testObj = '3'` (double → single quotes)
- Whitespace normalization
- Other AST transformations

**Solution**: Match by **range** instead of exact code strings. Ranges are stable and represent the exact character positions in the source file.

### Finding Node Ranges

Use the `get_range_helper.js` tool to find ranges for identifiers:

```bash
# Find all occurrences of an identifier
node get_range_helper.js static_query/test_name/0.js testObj --all

# Find specific occurrence (0-indexed)
node get_range_helper.js static_query/test_name/0.js testObj 0

# Verify a range matches expected identifier
node get_range_helper.js --verify static_query/test_name/0.js testObj "[134,141]"
```

**Example output:**
```json
{
  "found": true,
  "identifier": "testObj",
  "occurrence": 0,
  "total_occurrences": 2,
  "range": "[134,141]",
  "start": 134,
  "end": 141,
  "line": 4,
  "column": 4,
  "code": "testObj",
  "type": "Identifier"
}
```

### Workflow for Creating ans.json

1. **Write test JavaScript** (e.g., `0.js`)
2. **Find identifier ranges** using `get_range_helper.js`:
   ```bash
   node get_range_helper.js static_query/test_name/0.js testObj 0
   node get_range_helper.js static_query/test_name/0.js temp 0
   ```
3. **Build the graph** to find declaration ranges:
   ```bash
   python unit_test_builder.py --test=test_name
   python unit_test_builder.py --test=test_name --query
   ```
4. **Query Neo4j** manually to find declaration node ranges:
   ```cypher
   MATCH (n {Type: 'Identifier', Range: '[134,141]'})
   MATCH (decl)-[:AST_parentOf*]->(n)
   WHERE decl.Type IN ['VariableDeclaration', 'FunctionDeclaration', 'ExpressionStatement']
   RETURN decl.Type, decl.Range, n.Range
   ```
5. **Create ans.json** with the ranges found
6. **Verify ranges** using `get_range_helper.js --verify`:
   ```bash
   node get_range_helper.js --verify static_query/test_name/0.js testObj "[134,141]"
   ```

## Integration with Pipeline

These unit tests are designed to test individual graph query functions in isolation, complementing the integration tests in `sites/integration_test/`.

- **Integration tests**: Test full pipeline (crawl → build → query)
- **Unit tests**: Test specific queries on minimal graph structures

## Advanced Options

### Custom Memory Allocation

```bash
python unit_test_builder.py --test=test_name --memory=16384
```

### Custom Timeout

```bash
python unit_test_builder.py --test=test_name --timeout=300
```

## Troubleshooting

### Static Analysis Fails

- Check that `index.js` contains valid JavaScript
- Increase `--memory` or `--timeout` values
- Check logs in terminal output

### Neo4j Connection Fails

- Ensure Docker is running
- Check that port 7474/7687 are available
- Verify Neo4j credentials in `constants.py`

### Graph Files Not Generated

- Verify `analyses/cve_vuln/static_analysis.js` exists
- Check Node.js version compatibility
- Review static analysis error messages
