# Unit Test Suite Summary

## Overview

Created a comprehensive unit test framework for static analysis graph querying with 4 test cases testing the `get_initial_declaration` function.

## Created Files

### Framework
- **unit_test_builder.py**: Main driver script for building and managing unit tests
  - Generates HPG (nodes.csv.gz, rels.csv.gz) from JavaScript test files
  - Loads graphs into Neo4j containers for querying
  - Supports batch operations and individual test management

- **README.md**: Comprehensive documentation for the unit test framework
  - Usage instructions
  - Test descriptions
  - Query examples

- **SUMMARY.md**: This file

### Test Cases

All tests successfully built with graph files generated:

#### 1. test_initial_decl_cfg
**Purpose**: Variable declaration with `var` keyword
**Pattern**:
```javascript
var testObj = 3;
var temp = testObj + 3;
```
**Files**:
- 0.js (207 bytes)
- nodes.csv.gz (587 bytes)
- rels.csv.gz (356 bytes)
- ans.json (expected query results)

#### 2. test_initial_decl_assignment
**Purpose**: Assignment without declaration keyword
**Pattern**:
```javascript
testObj = 3;
temp = testObj + 3;
```
**Files**:
- 0.js (180 bytes)
- nodes.csv.gz (generated)
- rels.csv.gz (generated)
- ans.json (expected query results)

#### 3. test_initial_decl_function_arg
**Purpose**: Function parameter as initial declaration
**Pattern**:
```javascript
function foo(testObj) {
    var temp = testObj + 3;
    return temp;
}
var result = foo(5);
```
**Files**:
- 0.js (211 bytes)
- nodes.csv.gz (generated)
- rels.csv.gz (generated)
- ans.json (expected query results)

#### 4. test_initial_decl_function_call
**Purpose**: CallExpression tracing to function declaration via CG_parentOf
**Pattern**:
```javascript
function testObj() {
    return 3;
}
var temp = testObj() + 3;
```
**Files**:
- 0.js (143 bytes)
- nodes.csv.gz (generated)
- rels.csv.gz (generated)
- ans.json (expected query results)

## Directory Structure

```
unit_test/
├── unit_test_builder.py       # Main driver script
├── README.md                   # Comprehensive documentation
├── SUMMARY.md                  # This summary file
└── static_query/               # Query-specific unit tests
    ├── test_initial_decl_cfg/
    │   ├── 0.js                # Test JavaScript code
    │   ├── url.out             # Required URL file
    │   ├── test.py             # Test function implementation
    │   ├── ans.json            # Expected results + test config
    │   ├── nodes.csv.gz        # Generated graph nodes
    │   ├── rels.csv.gz         # Generated graph edges
    │   └── rels_dynamic.csv.gz # Generated dynamic relations
    ├── test_initial_decl_assignment/
    │   └── (same structure)
    ├── test_initial_decl_function_arg/
    │   └── (same structure)
    └── test_initial_decl_function_call/
        └── (same structure)
```

## Usage Examples

### Build All Tests
```bash
python unit_test_builder.py --all
```

### Build Single Test
```bash
python unit_test_builder.py --test=test_initial_decl_cfg
```

### Build and Load to Neo4j
```bash
python unit_test_builder.py --test=test_initial_decl_cfg --query
```

### List Tests
```bash
python unit_test_builder.py --list
```

### Clean Generated Files
```bash
python unit_test_builder.py --test=test_initial_decl_cfg --clean
```

## Key Features

1. **Automatic Graph Generation**: Runs static_analysis.js to generate HPG files
2. **Neo4j Integration**: Can load graphs into Docker containers for querying
3. **Automated Test Execution**: `--query` flag automatically runs test.py and validates results
4. **Range-Based Node Selection**: Uses `getNodeFromRange()` to precisely target test nodes
5. **Batch Operations**: Build all tests at once or individually
6. **Expected Results**: Each test includes ans.json with test config and expected query outputs
7. **Crawler Format Compatibility**: Uses same file naming (0.js, 1.js) as crawler output
8. **Range-Based Matching**: ans.json uses ranges instead of code strings to avoid JSParser normalization issues
9. **Range Helper Tool**: `get_range_helper.js` for finding and verifying identifier ranges

## Integration with run_pipeline.py

The unit test framework mirrors the static analysis flow from run_pipeline.py:

1. **Graph Generation** (static_analysis.js):
   - Parses JavaScript files
   - Builds AST/CFG/PDG
   - Exports to nodes.csv.gz and rels.csv.gz

2. **Neo4j Import** (build_hpg):
   - Creates Docker container
   - Imports CSV files
   - Waits for connection

3. **Query Execution** (analyze_hpg):
   - Runs Cypher queries via exec_fn_within_transaction
   - Validates against ans.json expectations

## Testing Workflow

```
JavaScript Test (0.js)
    ↓
Static Analysis (static_analysis.js)
    ↓
Graph Files (nodes.csv.gz, rels.csv.gz)
    ↓
Neo4j Container (docker container)
    ↓
Load Graph (CSV import)
    ↓
Execute test.py (calls query functions)
    ↓
Validate Results (compare with ans.json expected)
    ↓
Report Pass/Fail (✓/✗ summary)
    ↓
Cleanup Container (if tests passed)
```

### Automated Test Execution

When using `--query` flag:

1. **Graph Loading**: Loads HPG into Neo4j container
2. **Test Discovery**: Reads `ans.json` for `test_function` name
3. **Module Import**: Dynamically imports `test.py` module
4. **Node Selection**: Uses `getNodeFromRange(tx, node_range)` to get test nodes
5. **Query Execution**: Calls the query function being tested (e.g., `getInitialDeclaration`)
6. **Result Validation**: Compares actual vs expected results
7. **Result Display**: Shows ✓ PASS / ✗ FAIL / ✗ ERROR for each test case
8. **Container Cleanup**: Automatically stops/removes container if all tests passed

## Future Extensions

To add new tests:

```bash
# Create new test structure
python unit_test_builder.py --create test_new_feature

# Edit the generated 0.js and ans.json files

# Build the test
python unit_test_builder.py --test=test_new_feature
```

## ans.json Format Update (Range-Based)

As of the latest update, all ans.json files use a **range-based format** to avoid issues with JSParser code normalization:

### Old Format (Code-Based) ❌
```json
{
  "expected": {
    "declaration_type": "VariableDeclaration",
    "identifier_code": "testObj",
    "declaration_code": "var testObj = 3"
  }
}
```
**Problem**: JSParser changes `"3"` to `'3'`, causing string mismatches.

### New Format (Range-Based) ✅
```json
{
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
```
**Benefits**:
- Matches by stable character positions (ranges)
- `verify` section provides human-readable code for documentation
- No issues with quote style, whitespace, or AST normalization

### Range Verification Tool

Use `get_range_helper.js` to find and verify ranges:

```bash
# Find first occurrence of identifier
node get_range_helper.js static_query/test_name/0.js testObj 0

# Verify a range matches expected identifier
node get_range_helper.js --verify static_query/test_name/0.js testObj "[134,141]"
```

All 4 existing tests have been updated to the new format and verified ✓

## Notes

- **File Naming**: JavaScript files must be named 0.js, 1.js, etc. (same as crawler)
- **url.out Required**: Each test needs url.out file (auto-created by builder)
- **Memory**: Default 8GB, adjustable with --memory flag
- **Timeout**: Default 180s, adjustable with --timeout flag
- **Range Format**: All ans.json files use range-based matching (updated format)

## Build Results

✅ test_initial_decl_cfg - Success
✅ test_initial_decl_assignment - Success
✅ test_initial_decl_function_arg - Success
✅ test_initial_decl_function_call - Success

**Total**: 4/4 tests built successfully
