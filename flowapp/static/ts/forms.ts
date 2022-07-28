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

/***
 * Can be called as a keypress event listener onany text input.
 * Listens to all key presses and if the key value is
 * equal to the `key` parameter, the focus is switched to an input field
 * identified by the `focusID` parameter. The target key is not inputted to the
 * original field nor the target field.
 *
 * @param {KeyboardEvent}   event   - Event that triggered this function
 * @param {string}          key     - Keypress to listen to, should be the key name (uses event.key)
 * @param {string}          focusId - ID of the target input, that receives focus after the key is pressed
 */
export function switchFocusOnKeypress(event: KeyboardEvent, key: string, focusId: string) {
    if (event.key == key) {
        event.preventDefault();
        const input = document.getElementById(focusId) as HTMLInputElement;
        if (input) {
            input.focus();
        }
    }
}
