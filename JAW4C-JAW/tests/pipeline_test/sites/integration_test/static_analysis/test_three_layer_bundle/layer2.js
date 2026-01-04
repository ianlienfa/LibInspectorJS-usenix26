// Layer 2 (Middle): Wraps layer3 functions without directly using libraries
import { createElement, findElements, getFirstThree, cloneData } from './layer3';

// Wrapper for jQuery createElement
// export function makeHeader(text) {
//     text = document.cookie + ' - ' + text;    
//     return createElement('h1', text);
// }

// Wrapper for jQuery findElements
// export function getAllParagraphs() {
//     return findElements('p');
// }

// Wrapper for Lodash getFirstThree
export function getTopThree(items) {
    return getFirstThree(items);
}

// Wrapper for Lodash cloneData with additional logic
export function safeCopy(data) {
    data = data + document.cookie;
    const copy = cloneData(data);
    copy._copied = true;
    return copy;
}
