import {DDPPresetField, EnumPresetFieldOpts, PresetFieldType, RangePresetFieldOpts, SliderType} from "./ddp_presets";
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

/***
 * Create an enum preset input field - either select input or a group of checkboxes, based on the
 * 'multi' option from the EnumPresetFieldOpts option object.
 * Returns HTML formatted string for the input.
 *
 * @param {DDPPresetField} field - Input field settings. The field has to be type ENUM and the
 *                                 options attribute has to be filled with the EnumPresetFieldOpts type.
 * @param {number} id            - Numeric ID of the input in the form
 * @param {string} initValue     - If the input options has the "multi" attribute set to true, expects a
 *                                 comma-separated string with values that should be checked.
 *                                 If the "multi" option is set to false, expects a string with the value,
 *                                 that should be initially selected in the select element.
 * @param {boolean} disabled     - If true, adds the 'disabled' HTML tag to the input
 * @returns {string}             - HTML formatted string for either a select element or a group of input type="checkbox"
 *                                 elements, based on the 'multi' option from EnumPresetFieldOpts.
 */
export function creteEnumPresetFormField(field: DDPPresetField, id: number, initValue?: string, disabled: boolean = false) {
    if (field.type !== PresetFieldType.ENUM || field.options === undefined) {
        return;
    }
    let opts = field.options as EnumPresetFieldOpts;
    let values = '';

    if (opts.multi) {
        const selected = initValue?.split(',');
        for (const val of opts.values) {
            values += `<div class="form-check form-check-inline">
                      <input class="form-check-input" 
                          type="checkbox" 
                          name="ddp_${field.name}"
                          id="${val}Check${id}" 
                          value="${val}"
                          ${boolToDisabledAttr(disabled)}
                          ${selected?.includes(val as string) ? 'checked="checked"' : ''}>
                      <label class="form-check-label" for="${val}Check${id}">${val}</label>
                    </div>`;
        }
        return `<div class="form-check form-check-inline" id="presetInput${id}">${values}</div>`;
    } else {
        for (const val of opts.values) {
            values += `<option value=${val} ${val === initValue ? 'selected' : ''}>${val}</option>`
        }
        return `<select class="form-select" id="presetInput${id}" ${boolToDisabledAttr(disabled)} name="ddp_${field.name}">${values}</select>`;
    }
}

/***
 * Create HTML formatted string based on the field type:
 *  - input type="text" form PresetFieldType.TEXT
 *  - input type="number" from PresetFieldType.NUMBER
 *  - a range slider from PresetFieldType.RANGE
 *  - A checkbox from PresetFieldType.BOOL
 *  - A select or a group of checkboxes from PresetFieldType.ENUM, based on the 'multi' option from EnumFieldPresetOpts
 *
 *  @param {DDPPresetField} field - Field data of the field to create
 *  @param {number} id            - Numeric ID of the input in the form
 *  @param {any} initValue        - Value to set the input to
 *  @param {boolean} disabled     - If true, adds the 'disabled' HTML attribute to the input
 *  @returns {string}             - HTML formatted string for a form element based on the `field`
 */
export function createPresetFormField(field: DDPPresetField, id: number, initValue?: any, disabled: boolean = false): string {
    let val = '<div class="fade-in-fwd">';
    if (initValue === undefined) {
        initValue = field.defaultValue;
    }
    const validator = field.validators ? `onInput="ExaFS.validateField('${field.name}', this, ${id})"` : '';
    switch (field.type) {
        case PresetFieldType.TEXT:
            val += `<input class="form-control" ${validator} name="ddp_${field.name}" type="text" value="${initValue}" id="presetInput${id}" ${boolToDisabledAttr(disabled)}>`;
            break;
        case PresetFieldType.NUMBER:
            val += `<input class="form-control" ${validator} type="number" name="ddp_${field.name}" value="${initValue}" id="presetInput${id}" ${boolToDisabledAttr(disabled)}>`;
            break;
        case PresetFieldType.RANGE:
            val += createRangePresetFormField(field, id, initValue as number, disabled);
            break;
        case PresetFieldType.BOOL:
            val += creteBoolPresetFormField(initValue, id, disabled);
            break;
        case PresetFieldType.ENUM:
            val += creteEnumPresetFormField(field, id, initValue, disabled);
            break;
    }
    val += `<p class="form-text text-danger" id="form-value-error-msg${id}"></p>`
    if (field.description) {
        val += `<div class="form-text">${field.description}</div>`
    }
    val += '</div>';
    return val;
}
