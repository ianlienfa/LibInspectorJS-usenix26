// Layer 3 (Deepest): Direct library usage
// import $ from 'jquery';
import _ from 'lodash';


// // Simple jQuery function
// export function createElement(tagName, text) {
//     return $('<' + tagName + '>').html(text);
// }

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
    return _.defaultsDeep(obj, JSON.parse(obj));
}
