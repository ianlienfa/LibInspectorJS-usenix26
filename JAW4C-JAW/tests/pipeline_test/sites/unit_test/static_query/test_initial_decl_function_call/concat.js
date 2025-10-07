// Test pattern for function call reference
// This tests the get_initial_declaration query for CallExpression tracing back to function declaration

function testObj() {
    return 3;
}

var temp = testObj() + 3;
console.log('Test result:', temp);


