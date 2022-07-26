import {
    DDPPreset,
    DDPPresetField,
    DDPRuleType, FieldRequirements,
    getPresetField,
    getPresetFieldsByRuleType,
    PresetFieldRequirementRelationship
} from "./ddp_presets";
import {createPresetFormField} from "./ddp_inputs";
import {createChild} from "../renderer";

export class DDPPresetEditForm {
    /** CSS ID of a parent element to render the form to */
    public containerId: string;
    /** Select element for selecting the rule type */
    public ruleTypeSelect: HTMLSelectElement;
    /** True if there are any changes made to the preset */
    public changes = false;
    /** Name of the variable this class is assigned to.
     Used when creating event callbacks on input elements. */
    public varName: string;
    /** Input element for the preset name field */
    public presetNameInput: HTMLInputElement;

    private _maxId: number = 0;
    private _ruleType: DDPRuleType = DDPRuleType.FILTER;
    private _activeFields: DDPPresetField[] = [];
    private _availableFields: DDPPresetField[] = [];

    constructor(containerId: string, ruleTypeSelectId: string, presetNameInputId: string, varName: string) {
        this.containerId = containerId;
        this.ruleTypeSelect = document.getElementById(ruleTypeSelectId) as HTMLSelectElement;
        this.presetNameInput = document.getElementById(presetNameInputId) as HTMLInputElement;
        this.varName = varName;
        this.onRuleTypeChange();
    }

    /***
     * Initialize the form from existing preset.
     * Sets the rule type and creates all fields present in the preset.
     *
     * @param {DDPPreset} preset - Preset to initialize from
     * */
    public initFromPreset(preset: DDPPreset) {
        this.ruleTypeSelect.value = preset.fields.rule_type as string;
        this.onRuleTypeChange();
        Object.entries(preset.fields).forEach(([key, value], index) => {
            if (key !== 'rule_type') {
                const id = this.addField(key, value);
                if (id !== -1) {
                    const check = document.getElementById(`userEditable${id}`) as HTMLInputElement;
                    check.checked = preset.editable.includes(key);
                }
            }
        });
    }

    /***
     * Add a new field to the form
     *
     * @param {string} name   - name of the attribute the field should represent
     * @param {any} initValue - Value to set the field to upon creation
     * @returns {number}      - Numeric ID of the newly created field or -1 if given field name was not found
     */
    public addField(name: string, initValue?: any): number {
        // We need to modify the field, create copy instead of passing a reference
        let field = {...getPresetField(name)} as DDPPresetField;
        if (field) {
            this.changes = true;
            const fieldHTML = createPresetFormField(field, this._maxId, initValue, false);
            const wrapped = this._wrapField(fieldHTML, this._maxId, name);
            field.formId = this._maxId;
            this._activeFields.push(field);
            this._maxId++;
            createChild(wrapped, this.containerId);
            return field.formId;
        }
        return -1;
    }

    /***
     * Remove a field from the form
     *
     * @param {number} id - numeric ID of the field to remove.
     */
    public removeField(id: number) {
        const container = document.getElementById(`fieldContainer${id}`);
        if (container) {
            this.changes = true;
            container.parentElement?.removeChild(container);
            const index = this._activeFields.findIndex(p => p.formId === id);
            if (index !== -1) {
                this._activeFields.splice(index, 1);
            }
        }
    }

    /***
     * Handle rule type change - set the internal variable, reload the available
     * attributes cache, rebuild dropdowns and check for invalid attributes for
     * the new rule type.
     */
    public onRuleTypeChange() {
        this._ruleType = this.ruleTypeSelect.value as DDPRuleType;
        this._availableFields = getPresetFieldsByRuleType(this._ruleType);
        this._rebuildAttributeSelectDropdowns();
    }

    /***
     * Handle input to the preset name input field.
     * Adds the 'is-invalid' class, if the field is empty.
     * If a text element with ID 'presetNameError' is present in
     * the document, an error message is filled to it
     * if the name is empty.
     *
     * If the preset name input field is not empty, the 'is-invalid'
     * class and the error message are removed.
     */
    public onPresetNameChange() {
        const msg = document.getElementById('presetNameError');
        this.changes = true;
        if (this.presetNameInput.value !== '') {
            if (msg) {
                msg.innerText = '';
            }
            this.presetNameInput.classList.remove('is-invalid');
        } else {
            if (msg) {
                msg.innerText = 'Preset name is required';
            }
            this.presetNameInput.classList.add('is-invalid');
        }
    }

    /***
     * Set an error message to an attribute selection dropdown.
     *
     * @param {number} id - numeric ID of the dropdown to display the message to
     * @param {string} message - Message to display to the user
     */
    public setKeyErrorMessage(id: number, message: string) {
        const errorElem = document.getElementById('form-error-msg' + id);
        const selectElem = document.getElementById('fieldSelect' + id)
        if (errorElem && selectElem) {
            errorElem.innerText = message;
            if (message == '') {
                selectElem.classList.remove('is-invalid');
            } else {
                selectElem.classList.add('is-invalid');
            }
        }
    }

    /***
     * Find all duplicate attribute keys in the form for the given field name
     * and mark them with an error message and the 'is-invalid' class.
     * If a duplicate is found, marks both the found field and the field
     * given in params with the error message.
     *
     * @param {number} id   - The formId of the checked field
     * @param {string} name - Name of the checked attribute
     */
    public checkForDuplicates(id: number, name: string) {
        const duplicates = this._findDuplicateKeys(id, name);
        if (duplicates.length > 0) {
            for (const d of duplicates) {
                if (d.formId !== undefined) {
                    this._setFieldAsDuplicate(d.formId);
                }
            }
            this._setFieldAsDuplicate(id);
        }
    }

    /***
     * Check if field requirements of all fields are satisfied.
     * If not, add error messages to them.
     */
    public checkFieldRequirements() {
        for (const f of this._activeFields) {
            if (f.requires_fields && f.formId !== undefined) {
                const reqs = this._findUnsatisfiedRequirements(f);
                if (reqs.length !== 0) {
                    let msg = '';
                    for (let r of reqs) {
                        msg += ', ' + r;
                    }
                    msg = msg.slice(2);
                    this.setKeyErrorMessage(f.formId, "Requirements not satisfied: " + msg);
                } else {
                    this.setKeyErrorMessage(f.formId, '');
                }
            }
        }
    }

    /***
     * Get all attribute selection dropdowns and change options to reflect rule type change.
     * If an invalid option for current rule type is selected, the invalid option stays selected,
     * but the selection dropdown is given the "is-invalid" css class, the invalid options gets the
     * 'invalid' HTML attribute and an error message is displayed.
     */
    private _rebuildAttributeSelectDropdowns() {
        for (let i = 0; i < this._maxId; i++) {
            const field = document.getElementById('fieldSelect' + i) as HTMLSelectElement;
            if (field) {
                field.classList.remove('is-invalid');
                let wrongOpt = '';
                if (!this._fieldExistsInCache(field)) {
                    wrongOpt = `<option value=${field.value} selected invalid>${field.options[field.selectedIndex].text}</option>`;
                    field.classList.add('is-invalid');
                    this.setKeyErrorMessage(i, 'Invalid field for selected rule type');
                } else {
                    this.setKeyErrorMessage(i, '');
                }
                field.innerHTML = this._createFieldSelectionDropdownOptions(field.value) + wrongOpt;
            }
        }
    }

    /***
     * Check if selected attribute is in available fields (and is not from a different rule type)
     *
     * @param {HTMLSelectElement} field - Attribute selection element to check
     * @returns {boolean}               - True if attribute can be set with current rule type
     */
    private _fieldExistsInCache(field: HTMLSelectElement): boolean {
        return !!this._availableFields.find((f) => {
            return f.name === field.value
        });
    }

    /***
     * Create a wrapper for input fields in the preset editing form.
     * The wrapper adds a rule attribute selection dropdown, Bootstrap
     * grid wrappers, error message containers, a checkbox to set whether
     * users can edit this field and a button to remove this field.
     *
     * @param {string} field   - HTML formatted string to wrap
     * @param {number} id      - numeric id of the wrapped input
     * @param {string} initKey - which key is selected in the attribute selection dropdown
     * @returns {string}       - Wrapped input as HTML formatted string
     */
    private _wrapField(field: string, id: number, initKey: string): string {
        return `<div id="fieldContainer${id}">
        <hr class="d-md-none my-2">
        <div class="row my-3 fade-in-fwd">
            <div class="col-sm-12 col-md-4 my-1">
            <select class="form-select" id="fieldSelect${id}" onChange="${this.varName}.updatePresetFormField(this, ${id})">
                ${this._createFieldSelectionDropdownOptions(initKey)}
        </select>
        <p class="form-text text-danger" id="form-error-msg${id}"></p>
        </div>
        <div class="col-sm-12 col-md-4 my-1" id="fieldValueContainer${id}">
            ${field}
        </div>
        <div class="col-sm-12 col-md-4 my-1">
        <div class="form-check form-switch form-check-inline">
          <input class="form-check-input" type="checkbox" id="userEditable${id}">
          <label class="form-check-label" for="userEditable${id}">User can edit</label>
        </div>
        <button class="btn btn-outline-danger mx-2" role="button" onclick="${this.varName}.removeField(${id})" title="Remove line"><i class="bi bi-x-lg"></i></button>
        </div>
        </div>
        </div>`;
    }

    /***
     * Create HTML formatted string of options for all rule attributes from set rule type
     *
     * @param {string | undefined} selected - Which attribute should be selected by default
     * @returns {string} - HTML formatted string with valid attribute options for set rule type.
     */
    private _createFieldSelectionDropdownOptions(selected?: string): string {
        let retval = '';
        for (const f of this._availableFields) {
            retval += `<option value="${f.name}" ${f.name === selected ? 'selected' : ''}>${f.printName}</option>`;
        }
        return retval;
    }

    /***
     * Read the preset name from the input field. If the field is empty,
     * add an error message and the 'is-invalid' class to the input
     * and scroll to it.
     *
     * @returns {string | null} - The input value or null if the field is not filled.
     */
    private _getPresetName(): string | null {

        if (!this.presetNameInput) {
            return null;
        }
        if (!this.presetNameInput.value || this.presetNameInput.value === '') {
            window.scrollTo({top: 0, behavior: 'smooth'});
            this.presetNameInput.classList.add('is-invalid');
            this.presetNameInput.focus();
            const presetNameError = document.getElementById('presetNameError');
            if (presetNameError) {
                presetNameError.innerText = 'Preset name is required.';
            }
            return null;
        }
        return this.presetNameInput.value;
    }

    /***
     * Returns index from the activeFields _array by the formId attribute.
     * Returns -1 if given ID is not in activeFields.
     *
     * @param {number} id - The numeric id of the element to find
     * @returns {number}  - Index of the searched element in the `_activeFields` array
     *                      or -1 if the element was not found.
     */
    private _getFieldIndexById(id: number): number {
        return this._activeFields.findIndex((field) => {
            return field.formId === id;
        })
    }

    /***
     * Find all children of the given select element that have the 'invalid'
     * tag and remove them. Remove the error message and the 'is-invalid'
     * class from the element
     *
     * @param {HTMLSelectElement} select - Element to remove the invalid options from
     * @param {number} id                - Numeric formId of the element
     */
    private _removeInvalidSelectOptions(select: HTMLSelectElement, id: number) {
        let children = select.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].hasAttribute('invalid')) {
                select.removeChild(children[i]);
            }
        }
        this.setKeyErrorMessage(id, '');
        select.classList.remove('is-invalid');
    }


    /***
     * Find all duplicate keys for given attribute name.
     *
     * @param {number} sourceId - FormID of the source attribute select.
     *                            Field with this ID will not be included in the duplicates array
     * @param {string} name     - Name of the attribute to find duplicates for
     * @returns {DDPPresetField[]} - An array of fields, that have the same attribute name set.
     */
    private _findDuplicateKeys(sourceId: number, name: string): DDPPresetField[] {
        return this._activeFields.filter((field) => {
            return field.name === name && field.formId !== sourceId;
        });
    }

    /***
     * Add the 'is-invalid' class to the attribute select in a field
     * and set error message to 'Duplicate rule field'.
     *
     * @param {number} id - FormID of the field to set the message to.
     */
    private _setFieldAsDuplicate(id: number) {
        const field = document.getElementById('fieldSelect' + id);
        field?.classList.add('is-invalid');
        this.setKeyErrorMessage(id, 'Duplicate rule field');
    }

    /***
     * Check if the duplicate field error is still valid. If not, remove it.
     *
     * @param {number} id   - FormID of the field to check
     * @param {string} name - Name of the attribute selected in the field.
     */
    private _clearInvalidDuplicateWarnings(id: number, name: string) {
        const duplicates = this._findDuplicateKeys(id, name);
        if (duplicates.length === 1 && duplicates[0].formId !== undefined) {
            const select = document.getElementById('fieldSelect' + duplicates[0].formId);
            select?.classList.remove('is-invalid');
            this.setKeyErrorMessage(duplicates[0].formId, '');
        }
    }

    /***
     * Check field requirements and return error messages if some requirements
     * are not satisfied.
     *
     * @param {DDPPresetField} checkedField - A field to check requirements for
     * @returns {string[]}                  - An array of error messages for unsatisfied requirements
     */
    private _findUnsatisfiedRequirements(checkedField: DDPPresetField): string[] {
        let notSatisfied: string[] = []
        const field = document.getElementById('presetInput' + checkedField?.formId) as HTMLInputElement;
        if (checkedField.requires_fields) {
            for (const r of checkedField.requires_fields) {
                if (r.rule_types.includes((this._ruleType))) {
                    const idx = this._activeFields.findIndex((field) => {
                        return field.name == r.name;
                    });
                    if (idx == -1) {
                        if (r.relationship == PresetFieldRequirementRelationship.IsSet) {
                            notSatisfied.push(r.name + ' has to be set');
                        }
                    } else {
                        const val = document.getElementById('presetInput' + this._activeFields[idx].formId) as HTMLInputElement;
                        if (val && field) {
                            const msg = DDPPresetEditForm._handleRequirement(val, r, field);
                            if (msg !== null) {
                                notSatisfied.push(msg);
                            }
                        }
                    }
                }
            }
        }
        return notSatisfied;
    }

    /***
     * Check the requirement based on its relationship and create an error message
     * based on the unsatisfied requirements.
     *
     * @param {HTMLInputElement} val   - Input element containing the value of the checked field
     * @param {FieldRequirements} r    - Requirements for the checked field
     * @param {HTMLInputElement} field - Input field that the checked field has the relationship with
     * @returns {string|null}          - Error message if the requirement was _not_ satisfied, null otherwise.
     */
    private static _handleRequirement(val: HTMLInputElement, r: FieldRequirements, field: HTMLInputElement): string | null {
        const value = val.value;
        switch (r.relationship) {
            case PresetFieldRequirementRelationship.IsNotSet:
                return (r.name + ' can not be set with this field');
            case PresetFieldRequirementRelationship.IsGreater:
                if (value <= field.value) {
                    return (r.name + ' has to be greater than this field');
                }
                break;
            case PresetFieldRequirementRelationship.IsLower:
                if (value >= field.value) {
                    return (r.name + ' has to be lower than this field');
                }
                break;
            case PresetFieldRequirementRelationship.IsGreaterOrEqual:
                if (value < field.value) {
                    return (r.name + ' has to be greater or equal to this field');
                }
                break;
            case PresetFieldRequirementRelationship.IsLowerOrEqual:
                if (value > field.value) {
                    return (r.name + ' has to be lower or equal to this field');
                }
                break;
            case PresetFieldRequirementRelationship.IsEqual:
                if (value != field.value) {
                    return (r.name + ' has to be equal to this field');
                }
                break;
            case PresetFieldRequirementRelationship.IsNotEqual:
                if (value == field.value) {
                    return (r.name + ' has to be different from this field');
                }
                break;
        }
        return null;
    }
}
