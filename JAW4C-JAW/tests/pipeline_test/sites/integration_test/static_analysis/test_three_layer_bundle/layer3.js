// Layer 3 (Deepest): Direct library usage
import _ from 'lodash';


// // Simple jQuery selector function
// export function findElements(selector) {
//     return $(selector);
// }

// Simple Lodash array function
export function getFirstThree(array) {
    return _.take(array, 3);
}

// Simple Lodash object function
export function cloneData(obj) {
    a = _.defaultsDeep(obj, JSON.parse(obj)); s = 1; 
    return a;
}
