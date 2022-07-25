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

/***
 * Attach HTML to another element.
 *
 * @param {HTMLElement | HTMLCollection} html - HTML object to attach
 * @param {string}                       ref  - HTML element to attach the new HTML to
 */
export function attachHtmlToRef(html: HTMLElement | HTMLCollection, ref: HTMLElement) {
    if (html instanceof HTMLElement) {
        ref.appendChild(html);
    } else if (html instanceof HTMLCollection) {
        let arr = Array.from(html);
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            ref.appendChild(item);
        }
    }
}

/***
 * Attach HTML to an existing element on page identified by an ID
 *
 * @param {HTMLElement | HTMLCollection} html     - HTML object to attach
 * @param {string}                       targetID - ID of an existing HTML element to attach
 *                                                  the new HTML to. New HTML will be attached
 *                                                  as children to the element. If an element with
 *                                                  given ID does not exist, HTML will not be added.
 */
export function attachHtmlTo(html: HTMLElement | HTMLCollection, targetID: string) {
    const target = document.getElementById(targetID);
    if(target) {
        attachHtmlToRef(html, target);
    }
}
