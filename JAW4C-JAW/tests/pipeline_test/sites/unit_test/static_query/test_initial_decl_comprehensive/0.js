// Comprehensive test for all initial declaration query functions
// This tests all 4 query functions plus the complete getInitialDeclaration

// Test 1: CFG-based declaration (var keyword) with dummy code in between
var cfgTest = 3;
var dummyVar1 = 10;
var dummyVar2 = 20;
function dummyFunc() {
    return 42;
}
var cfgUsage = cfgTest + 1;

// Test 2: CallGraph-based declaration with arrow function
const callGraphTest = () => {
    return 5;
};
function anotherDummyFunc() {
    return 99;
}
var callResult = callGraphTest() + 1;

// Test 3: Parameter-based declaration with multiple dummy parameters
function paramTest(dummyParam1, dummyParam2, paramObj, dummyParam3) {
    var paramUsage = paramObj + 1;
    return paramUsage;
}

// Test 4: Assignment-based declaration with const usage
assignTest = 7;
var dummyAssign1 = 100;
var dummyAssign2 = 200;
const assignUsage = assignTest + 1;

// Test 5: Library Object pattern - complete getInitialDeclaration test
// This simulates a webpack/browserify module pattern where 't' parameter should be found
// NOT the 't = {}' assignment
var modulePattern = (r, e, t) => {
    t(692)("#div").html("<style><style /><img src=x onerror=alert(1)>");
};
t = {};
