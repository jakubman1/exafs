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