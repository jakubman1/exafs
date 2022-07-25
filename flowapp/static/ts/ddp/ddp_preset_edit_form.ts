import {DDPPresetField, DDPRuleType, getPresetField} from "./ddp_presets";

export class DDPPresetEditForm {
    /** CSS ID of a parent element to render the form to */
    public containerId: string;
    /** Select element for selecting the rule type */
    public ruleTypeSelect: HTMLSelectElement;
    /** True if there are any changes made to the preset */
    public changes = false;

    private _maxId: number = 0;
    private _ruleType: DDPRuleType = DDPRuleType.FILTER;
    private _activeFields: DDPPresetField[] = [];

    constructor(containerId: string, ruleTypeSelectId: string) {
        this.containerId = containerId;
        this.ruleTypeSelect = document.getElementById(ruleTypeSelectId) as HTMLSelectElement;
        this._ruleType = this.ruleTypeSelect.value as DDPRuleType;
    }

}