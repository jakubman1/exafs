export class DDPPresetSelectForm {
    

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
}