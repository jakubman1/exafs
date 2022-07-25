import {DDPPreset, DDPPresetField, DDPRuleType, getPresetField, PresetFieldType} from "./ddp_presets";
import {clearAllChildren, createChild} from "../renderer";
import {createPresetFormField} from "./ddp_inputs";

export class DDPPresetSelectForm {
    /** CSS ID of a parent element to render the form to */
    public parentId: string;

    private _preset?: DDPPreset;

    /***
     * Create a preset form, redraw it when the selected preset changes.
     *
     * @param {string} parentId - ID of an element to render the form to. The element will be cleared
     *                            every time the preset changes.
     */
    constructor(parentId: string) {
        this.parentId = parentId;
    }

    /***
     * Set a different preset and redraw the form.
     *
     * @param {DDPPreset} preset              - the new preset
     * @param { [key: string]: any } initData - An object of values to initialize fields with. Keys should be the field names.
     */
    public setPreset(preset: DDPPreset, initData?: { [key: string]: any }) {
        this._preset = preset;
        this.renderForm(initData);
    }

    /***
     * Create a form from set preset and render it to the parent element.
     * If the parent element is invalid, does nothing.
     * Clears the contents of the parent element before rendering the form.
     *
     * @param { [key: string]: any } initData - An object of values to initialize fields with. Keys should be the field names.
     */
    public renderForm(initData?: { [key: string]: any }) {
        clearAllChildren(this.parentId);
        if (this._preset) {
            const presetForm = this._presetToHtml(initData);
            createChild(presetForm, this.parentId);
        }
    }

    /***
     * Convert a DDPPreset object into HTML form for editing by a user.
     * Only editable fields can be modified, no fields can be added or removed.
     *
     * @param { [key: string]: any } initData - An object of values to initialize fields with. Keys should be the field names.
     * @returns {string}                      - HTML formatted string of input elements
     */
    private _presetToHtml(initData?: { [key: string]: any }): string {
        if (!this._preset) {
            return '';
        }
        const ruleTypePresetField: DDPPresetField =
            {
                defaultValue: this._preset.fields.rule_type,
                name: "rule_type",
                printName: "Rule type",
                type: PresetFieldType.TEXT,
                rule_types: [DDPRuleType.AMPLIFICATION, DDPRuleType.FILTER, DDPRuleType.SYN_DROP, DDPRuleType.TCP_AUTHENTICATOR]
            };
        const ruleTypeFieldHtml = createPresetFormField(ruleTypePresetField, 0, this._preset.fields.rule_type, true);
        let fields = DDPPresetSelectForm._wrapField(ruleTypeFieldHtml, 0, ruleTypePresetField.printName);
        let id = 1
        Object.entries(this._preset.fields).forEach(([key, value], index) => {
            if (key !== 'rule_type' && this._preset !== undefined) {
                let field = {...getPresetField(key)} as DDPPresetField;
                if (initData && 'ddp_' + key in initData) {
                    value = initData['ddp_' + key] as any;
                }
                const fieldHtml = createPresetFormField(field, id, value, !DDPPresetSelectForm._isEditable(key, this._preset.editable));
                fields += '\n' + DDPPresetSelectForm._wrapField(fieldHtml, id, field.printName);
                id++;
            }
        });
        fields += '<hr class="my-2>';
        return fields;
    }

    /***
     * Create a wrapper for input fields in the preset selection form.
     * The wrapper contains Bootstrap 5 positioning and a label
     * and an empty error text element.
     *
     * @param {string} fieldHtml - The input field in HTML formatted string
     * @param {number} id        - The numeric ID of the element in the form
     * @param {string} label     - The label text for the input field
     * @returns {string}         - HTML formatted string of the wrapped field
     */
    private static _wrapField(fieldHtml: string, id: number, label: string) {
        return `
    <div class="row">
        <div class="my-3 col-md-6 col-sm-12 px-3">
            <label for="presetInput${id}" class="form-label">${label}</label>
                ${fieldHtml}
            <p class="form-text text-danger" id="form-error-msg${id}"></p>
        </div>
    </div>`
    }

    /***
     * Check if users can edit given field.
     * @param {string} key         - Rule field internal name
     * @param {string[]} editables - An array of editable fields
     * @return {boolean}           - True if given field is in the editables array
     * */
    private static _isEditable(key: string, editables: string[]): boolean {
        return editables.includes(key);
    }
}