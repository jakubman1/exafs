import {getValidatorsByAttribute} from "./ddp_presets";
import {setErrorMessage} from "./ddp_inputs";

export interface Validator {
    /**
     * Optional extra settings for the validator
     */
    options?: any;
     /**
     * Validate a field value, should return true if validation was successful, false otherwise
     */
    validate(value: any): boolean;
     /**
     * Should return a message that is shown to the user, if the value is invalid.
     */
    invalidMessage(): string
}

export class NumberRangeValidator implements Validator {
    options: { min?: number, max?: number }

    /**
     * Validate a numeric field to be in a given range.
     * If min is undefined, only checks for the maximum value
     * If max is undefined, only checks for the minimum value
     *
     * @param {number | undefined} min - To be valid, the field value has to be larger or equal to this value
     * @param {number | undefined} max - To be valid, the field value has to be smaller or equal to this value
     */
    constructor(min?: number, max?: number) {
        this.options = {min: min, max: max};
    }

    validate(value: number): boolean {
        let valid = true;
        if (this.options.min !== undefined && value <= this.options.min) {
            valid = false;
        }
        if (this.options.max !== undefined && value >= this.options.max) {
            valid = false;
        }
        return valid;
    }

    invalidMessage(): string {
        return `Value has to be in range ${this.options.min} - ${this.options.max}`;
    }
}

export class RegexPatternValidator implements Validator {
    options: {
        readonly regex: RegExp,
        name?: string,
        hint?: string
    }

    /**
     * Validate a text field based on a regular expression.
     *
     * @param {RegExp} regex            - Regular expression the input has to pass
     * @param {string | undefined} name - Name of the input field to show to the user as a hint
     * @param {string | undefined} hint - A hint to display to the user, if the input is invalid
     */
    constructor(regex: RegExp, name?: string, hint?: string) {
        this.options = {regex: regex, name: name, hint: hint};
    }

    validate(value: string): boolean {
        const re = new RegExp(this.options.regex)
        return re.test(value);
    }

    invalidMessage(): string {
        let message = 'Invalid format'
        if (this.options.name) {
            message += ' for ' + this.options.name
        }
        if (this.options.hint) {
            message += ' - ' + this.options.hint;
        }
        return message;
    }
}

export class NonZeroValidator implements Validator {
    /**
     * Check if a given value is not equal to zero.
     */
    validate(value: string | number): boolean {
        return (+value) !== 0;
    }

    invalidMessage(): string {
        return 'This field can not be zero.';
    }
}

/***
 * Get all validators from a given field name and check them.
 * If a validator does not pass, add an error message to the field.
 *
 * @param {string} fieldName                              - DDoS Protector rule attribute the field represents
 * @param {HTMLInputElement | HTMLSelectElement} fieldRef - Reference to the field in the HTML document
 * @param {number} id                                     - Numeric ID of the field in HTML
 */
export function validateField(fieldName: string, fieldRef: HTMLInputElement | HTMLSelectElement, id: number) {
    const validators = getValidatorsByAttribute(fieldName);
    if (validators.length > 0) {
        let messages = '';
        let valid = true;
        for (let v of validators) {
            if (!v.validate(fieldRef.value)) {
                valid = false;
                messages += v.invalidMessage() + '<br>';
            }
        }
        setErrorMessage(id, messages);
        if (!valid) {
            fieldRef.classList.add('is-invalid');
        } else {
            fieldRef.classList.remove('is-invalid');
        }
    }
}
