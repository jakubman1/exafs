/***
 * Add the 'd-none' CSS class to a specified element based on a condition
 * that the sourceValue is not equal to the showValue. Otherwise, remove
 * the 'd-none' CSS class.
 *
 * @param {any} sourceValue - Value of the element that specifies the condition to show the target element,
 *                            e.g. value of the protocol select element
 * @param {any} showValue   - Value to compare the condition element to. If the source value is equal to
 *                            the show value, the target element is visible ('d-none' CSS class is removed)
 * @param {string} targetID - ID of the element, that the 'd-none' class should be added to/removed from.
 */
export function showFieldIf(sourceValue: any, showValue: any, targetID: string) {
    const elem = document.getElementById(targetID);
    if (sourceValue != showValue) {
        elem?.classList.add('d-none');
    }
    else {
        elem?.classList.remove('d-none');
    }
}