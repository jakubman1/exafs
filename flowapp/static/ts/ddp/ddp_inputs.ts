/***
 * Create an input field for a boolean value.
 * Returns HTML formatted string to create a Bootstrap 5 checkbox input in the switch style
 * https://getbootstrap.com/docs/5.0/forms/checks-radios/#switches
 *
 * @param {any} initValue    - Value to set the input to
 * @param {number} id        - Numeric ID of the input in the form
 * @param {boolean} disabled - If true, adds the 'disabled' HTML tag to the input
 * @returns {string}         - HTML formatted string for a checkbox.
 */
export function creteBoolPresetFormField(initValue: any, id: number, disabled: boolean = false): string {
    return `<div class="form-check form-switch">
<input class="form-check-input" type="checkbox" value="${initValue}" id="presetInput${id}" ${boolToDisabledAttr(disabled)}></div>`;
}

function boolToDisabledAttr(disabled: boolean): string {
    return disabled ? 'disabled' : '';
}