/***
 * Convert HTML formatted string to HTML element
 *
 * @param {string} str - string to convert
 * @returns {HTMLCollection} - collection of HTML elements created from `str`
 */
export function stringToHtml(str: string): HTMLCollection {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    // Parser adds a <body> tag to the document, we just want the children
    return doc.body.children;
}