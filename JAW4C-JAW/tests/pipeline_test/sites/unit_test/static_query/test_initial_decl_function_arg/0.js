// Test pattern for function argument
// This tests the get_initial_declaration query for function parameters

function foo(testObj) {
    var temp = testObj + 3;
    return temp;
}

var result = foo(5);
console.log('Test result:', result);
