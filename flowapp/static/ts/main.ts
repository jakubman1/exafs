import {Tooltip} from "bootstrap";

window.onload = function () {
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new Tooltip(tooltipTriggerEl)
    })
}

export {showPresetModal} from "./ddp/ddp_presets";
export {DDPPresetEditForm} from "./ddp/ddp_preset_edit_form";
export {DDPPresetSelectForm} from "./ddp/ddp_preset_select_form";
export {validateField} from "./ddp/validators";
export {updateRangeValText} from "./ddp/ddp_inputs";
