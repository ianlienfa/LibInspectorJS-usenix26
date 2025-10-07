# Range Helper for ans.json Generation

The `get_range_helper.js` script uses JAW4C's jsparser (Esprima) to find identifier ranges in JavaScript code, matching the exact format stored in Neo4j nodes.

## Purpose

When creating ans.json test cases, you need to specify the exact `node_range` for identifiers you're testing. This helper finds those ranges automatically and verifies they're correct.

## Usage

### Find All Occurrences
```bash
node get_range_helper.js <js_file> <identifier> --all
```

**Example:**
```bash
node get_range_helper.js static_query/test_initial_decl_cfg/0.js testObj --all
```

**Output:**
```json
{
  "found": true,
  "identifier": "testObj",
  "total_occurrences": 2,
  "occurrences": [
    {
      "range": "[134,141]",
      "start": 134,
      "end": 141,
      "line": 4,
      "column": 4,
      "location": "{\"start\":{\"line\":4,\"column\":4},\"end\":{\"line\":4,\"column\":11}}",
      "code": "testObj",
      "type": "Identifier"
    },
    {
      "range": "[158,165]",
      "start": 158,
      "end": 165,
      "line": 5,
      "column": 11,
      "location": "{\"start\":{\"line\":5,\"column\":11},\"end\":{\"line\":5,\"column\":18}}",
      "code": "testObj",
      "type": "Identifier"
    }
  ]
}
```

### Find Specific Occurrence
```bash
node get_range_helper.js <js_file> <identifier> <occurrence>
```

**Example (0-indexed):**
```bash
# First occurrence
node get_range_helper.js static_query/test_initial_decl_cfg/0.js testObj 0

# Second occurrence
node get_range_helper.js static_query/test_initial_decl_cfg/0.js testObj 1
```

**Output:**
```json
{
  "found": true,
  "identifier": "testObj",
  "occurrence": 1,
  "total_occurrences": 2,
  "range": "[158,165]",
  "start": 158,
  "end": 165,
  "line": 5,
  "column": 11,
  "location": "{\"start\":{\"line\":5,\"column\":11},\"end\":{\"line\":5,\"column\":18}}",
  "code": "testObj",
  "type": "Identifier"
}
```

### Verify Range Matches Identifier
```bash
node get_range_helper.js --verify <js_file> <identifier> <range>
```

**Example:**
```bash
node get_range_helper.js --verify static_query/test_initial_decl_cfg/0.js testObj "[158,165]"
```

**Output (Success):**
```json
{
  "valid": true,
  "found_code": "testObj",
  "found_type": "Identifier",
  "found_name": "testObj",
  "found_range": "[158,165]",
  "found_location": "{\"start\":{\"line\":5,\"column\":11},\"end\":{\"line\":5,\"column\":18}}",
  "message": "✓ Range [158,165] correctly identifies 'testObj' (Identifier)"
}
```

**Output (Failure):**
```json
{
  "valid": false,
  "found_code": "temp",
  "found_type": "Identifier",
  "found_name": "temp",
  "message": "✗ Range [151,155] found 'temp' (Identifier), expected 'testObj'"
}
```

## Workflow for Creating ans.json

### Step 1: Create test JavaScript file
```bash
cd /home/ian/JAW4C/JAW4C-JAW/tests/pipeline_test/sites/unit_test
cat > static_query/test_example/0.js << 'EOF'
var testObj = 3;
var temp = testObj + 3;
console.log('Result:', temp);
EOF
```

### Step 2: Find identifier ranges
```bash
# Find all occurrences of 'testObj'
node get_range_helper.js static_query/test_example/0.js testObj --all

# Find specific occurrence you want to test (e.g., the usage on line 2)
node get_range_helper.js static_query/test_example/0.js testObj 1
```

### Step 3: Create ans.json with the correct range
```json
{
  "description": "Test description",
  "test_function": "test_get_initial_declaration",
  "test_cases": [
    {
      "name": "test_case_1",
      "description": "Find declaration of testObj from usage",
      "node_range": "[158,165]",  // ← Use range from helper
      "expected": {
        "declaration_type": "VariableDeclaration",
        "identifier_code": "testObj"
      }
    }
  ]
}
```

### Step 4: Verify the range is correct
```bash
node get_range_helper.js --verify static_query/test_example/0.js testObj "[158,165]"
```

## Understanding Range Format

### Range: `[start, end]`
- **start**: Character position (inclusive) where identifier begins
- **end**: Character position (exclusive) where identifier ends
- **Format**: JSON array as string, e.g., `"[158,165]"`
- **Matches**: Esprima parser's `node.range` property
- **Storage**: Stored in Neo4j as the `Range` property

### Location: `{start:{line,column},end:{line,column}}`
- **line**: 1-indexed line number
- **column**: 0-indexed column position
- **Format**: JSON object as string
- **Matches**: Esprima parser's `node.loc` property
- **Storage**: Stored in Neo4j as the `Location` property

## Troubleshooting

### Identifier Not Found
```bash
$ node get_range_helper.js test.js myVar 0
{
  "found": false,
  "message": "Identifier 'myVar' not found in test.js"
}
```
- Check spelling of identifier
- Make sure identifier exists in the file
- Remember: This only finds `Identifier` nodes (not literals, operators, etc.)

### Occurrence Out of Range
```bash
$ node get_range_helper.js test.js testObj 5
{
  "found": false,
  "message": "Occurrence 5 not found. Total occurrences: 2"
}
```
- Use `--all` to see total number of occurrences
- Occurrences are 0-indexed

### Range Verification Failed
```bash
$ node get_range_helper.js --verify test.js testObj "[100,107]"
{
  "valid": false,
  "message": "Range [100,107] not found in AST"
}
```
- The range doesn't correspond to any AST node
- Check if range was calculated with different code version
- Regenerate range using the helper

## Integration with LLM Workflows

When using LLMs to generate test cases:

1. **Ask LLM to identify which identifier to test**
2. **Use helper to get accurate range**: `node get_range_helper.js <file> <identifier> --all`
3. **LLM selects appropriate occurrence** based on test intent
4. **Verify before finalizing**: `node get_range_helper.js --verify <file> <identifier> <range>`

This ensures ranges are always accurate and match what the static analysis will see in Neo4j.
