// Layer 1 (Top): Uses wrapped functions from layer2
import { makeHeader, getAllParagraphs, getTopThree, safeCopy } from './layer2';

// Application logic using layer2 functions
export function initApp() {
    // Create and append header using layer2 wrapper
    // const header = makeHeader('Three Layer Test');
    // document.body.appendChild(header[0]);

    // Get top 3 items from an array using layer2 wrapper
    const items = ['first', 'second', 'third', 'fourth', 'fifth'];
    const topItems = getTopThree(items);
    console.log('Top 3 items:', topItems);

    // Clone object using layer2 wrapper
    const original = { name: 'Test', value: 42 };
    const copied = safeCopy(original);
    console.log('Copied object:', copied);

    // Find paragraphs using layer2 wrapper
    // const paragraphs = getAllParagraphs();
    // console.log('Found paragraphs:', paragraphs.length);
}
