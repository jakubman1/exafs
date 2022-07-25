import {DDPPresetField, PresetFieldType, RangePresetFieldOpts, SliderType} from "./ddp_presets";
import {logarithmicValueFromPos, posFromLogarithmicValue} from "../logscale";
import {formatSIUnitNumber} from "../utils";


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

/***
 * Create a range slider (input type="range") based on a range DDPPresetField.
 * Returns HTML formatted string for a range slider in custom styles, displaying the
 * current value in the middle of the slier, formatted as an SI unit and converted to logarithmic value,
 * if the slider is set logarithmic in the field options.
 * The slider also displays "Restrictive" at the beginning of the slider and "Permissive" at the end.
 * The slider is based on the Bootstrap 5 range input
 * https://getbootstrap.com/docs/5.0/forms/range/
 *
 * @param {DDPPresetField} field - Input field settings. The field has to be type RANGE and the
 *                                 options attribute has to be filled with the RangePresetFieldOpts type.
 * @param {number} id             - Numeric ID of the input in the form
 * @param {any} initValue         - Value to set the input to. If the slider is logarithmic, the initValue
 *                                  should be linear in range from 0 to 100.
 * @param {boolean} disabled      - If true, adds the 'disabled' HTML tag to the input
 * @returns {string}              - HTML formatted string for the custom range slider, based on the Bootstrap 5 range inputs.
 */
export function createRangePresetFormField(field: DDPPresetField, id: number, initValue?: number, disabled: boolean = false) {
    if (field.type !== PresetFieldType.RANGE || field.options === undefined) {
        return;
    }
    const opts = field.options as RangePresetFieldOpts;
    if (initValue === undefined) {
        initValue = 50
    } else {
        if (opts.type === SliderType.LOGARITHMIC) {
            initValue = posFromLogarithmicValue(initValue, opts.low, opts.high);
        }
    }
    let initLabel = '';
    let minMaxStr = '';
    switch (opts.type) {
        case SliderType.LINEAR:
            initLabel = formatSIUnitNumber(initValue, 2, opts.unit);
            minMaxStr = `min=${opts.low} max=${opts.high}`;
            break;
        case SliderType.LOGARITHMIC:
            initLabel = formatSIUnitNumber(logarithmicValueFromPos(initValue, opts.low, opts.high), 2, opts.unit)
            minMaxStr = "min=0 max=100";
            break;
    }
    return `
<div class="row form-text">
<div class="col-4">Restrictive</div>
<div class="col-4 text-center" id="rangeVal${id}">${initLabel}</div>
<div class="col-4 text-end">Permissive</div>
</div>
<input class="form-range" type="range" value="${initValue}" id="presetInput${id}" ${minMaxStr} step=1 ${boolToDisabledAttr(disabled)}
onChange="ExaFS.updateRangeValText(this, ${id}, ${opts.low}, ${opts.high}, ${opts.type}, '${opts.unit}')" name="ddp_${field.name}"
onInput="ExaFS.updateRangeValText(this, ${id}, ${opts.low}, ${opts.high}, ${opts.type}, '${opts.unit}')">`;
}