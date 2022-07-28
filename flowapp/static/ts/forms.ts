import {Modal} from "bootstrap";

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

/***
 * Show a bootstrap modal window identified by css ID #orgSelectModal.
 * The modal is specified as a jinja macro "fill_org_form" in the
 * flowapp/templates/forms/macros.j2 file.
 *
 * Calling this function opens the modal and registers a callback to
 * its "Use range" button. The callback reads the value from the
 * range selection input and applies it to appropriate input fields.
 *
 * @param {string} ipInputId   - id of the input field,
 *                               where organization IP address should be filled to
 * @param {string} maskInputId - id of the input field,
 *                               where organization IP mask should be filled to
 */
export function fillOrganization(ipInputId: string, maskInputId: string): void {
    const modalContainer = document.getElementById('orgSelectModal');
    if (!modalContainer) {
        return;
    }
    const modal = new Modal(modalContainer, {backdrop: true});
    modal.show();
    const btn = document.getElementById('fill-org-btn');
    if (btn) {
        btn.onclick = function () {
            fillOrgValue(
                document.getElementById(ipInputId) as HTMLInputElement,
                document.getElementById(maskInputId) as HTMLInputElement
            );
            modal.hide();
        }
    }
}

/***
 * Fill value from the selected organization range to appropriate fields.
 * If a field is null, the value is skipped.
 *
 * @param {HTMLInputElement} ipField - A field to input the IP value to
 * @param {HTMLInputElement} maskField - A field to input the mask value to
 */
function fillOrgValue(ipField: HTMLInputElement | null, maskField: HTMLInputElement | null) {
    const org_select = document.getElementById('orgSelect') as HTMLInputElement;
    if (!org_select) {
        return;
    }
    const val = org_select.value.split('/');
    if (ipField) {
        ipField.value = val[0];
    }
    if (maskField) {
        maskField.value = val[1];
    }
}
