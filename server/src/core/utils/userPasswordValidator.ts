export interface UserPasswordValidatorOptions {
	/**
	 * The minimum length of the password. Default is `8`.
	 */
	minLength?: number
	/**
	 * The maximum length of the password. Default is `32`.
	 */
	maxLength?: number
	/**
	 * Allows the function to throw an error if the provided password has no uppercase letters. Default is `true`.
	 */
	requireUppercase?: boolean
	/**
	 * Allows the function to throw an error if the provided password has no lowercase letters. Default is `true`.
	 */
	requireLowercase?: boolean
	/**
	 * Allows the function to throw an error if the provided password has no numbers. Default is `true`.
	 */
	requireNumbers?: boolean
	/**
	 * Allows the function to throw an error if the provided password has no special character of any kind. Default is `true`.
	 */
	requireSpecialChars?: boolean
}

const defaultUserPasswordValidatorOptions = {
	minLength: 8,
	maxLength: 32,
	requireUppercase: true,
	requireLowercase: true,
	requireNumbers: true,
	requireSpecialChars: true,
} as Required<UserPasswordValidatorOptions>

export interface UserPasswordValidatorResults {
	/**
	 * Tells if the provided password is valid.
	 */
	isValid: boolean
	/**
	 * The error code. Returns `undefined` if the provided password is valid.
	 */
	error?: 'tooSmall' | 'tooBig' | 'noUppercase' | 'noLowercase' | 'noNumbers' | 'noSpecialChars'
}

/**
 * Validates a provided password string with provided validation options. Returns an object with the validation flag, along with the flagged error (if any).
 * - - - -
 * @param {string} password The password string to be validated.
 * @param {UserPasswordValidatorOptions} [options] `OPTIONAL` An object with values that enables/disables and settles the validation rules for the provided password.
 * @returns {UserPasswordValidatorResults}
 */
export const userPasswordValidator = (password: string, options?: UserPasswordValidatorOptions): UserPasswordValidatorResults => {
	const { maxLength, minLength, requireLowercase, requireNumbers, requireSpecialChars, requireUppercase } = {
		...defaultUserPasswordValidatorOptions,
		...options,
	}
	let isValid = false

	// 1. Length Check
	if (password.length < minLength) {
		return { isValid, error: 'tooSmall' }
	}

	if (password.length > maxLength) {
		return { isValid, error: 'tooBig' }
	}
	// 2. Character Variety Checks
	if (requireUppercase && !/[A-Z]/.test(password)) {
		return { isValid, error: 'noUppercase' }
	}

	if (requireLowercase && !/[a-z]/.test(password)) {
		return { isValid, error: 'noLowercase' }
	}

	if (requireNumbers && !/[0-9]/.test(password)) {
		return { isValid, error: 'noNumbers' }
	}

	if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>_-]/.test(password)) {
		return { isValid, error: 'noSpecialChars' }
	}

	isValid = true
	return {
		isValid,
	}
}
