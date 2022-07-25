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