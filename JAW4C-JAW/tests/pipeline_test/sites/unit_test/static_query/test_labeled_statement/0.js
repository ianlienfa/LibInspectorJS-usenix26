// Test case for labeled statement CFG generation
// let result = 0;
// let check = true;

// Simple labeled block with break
// outerBlock: {
//     if (result === 0) {
//         result = 5;
//         break outerBlock;
//     }
//     result = 10;
// }

// // Nested labeled blocks
outer: {
    for (let i = 0; i < 5; i++) {
        inner: {
            if (i === 2) {
                break inner;
            }
            else{
                break outer;
            }
        }
    }
}

// const foo = 5;
// switch (foo) {
//   case 2:
//     console.log(2);
//     break; // it encounters this break so will not continue into 'default:'
//   default:
//     console.log("default");
//   // fall-through
//   case 1:
//     console.log("1");
// }


// console.log(result);
