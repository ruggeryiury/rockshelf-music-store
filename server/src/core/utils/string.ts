import stripAnsi from 'strip-ansi'

/**
 * Removes a matching pair of double quotes surrounding a string.
 *
 * Only removes the first and last character when the value starts
 * and ends with a double quote (`"`). Otherwise, the value is returned
 * unchanged.
 * - - - -
 * @param {string} value The string from which surrounding double quotes should be removed.
 * @returns {string} The string without its surrounding double quotes, or the original
 * string when it is not enclosed in double quotes.
 */
export const stripSurroundingQuotes = (value: string): string => {
	if (value.startsWith('"') && value.endsWith('"')) {
		return value.slice(1, -1)
	}

	return value
}

/**
 * Decodes escaped characters commonly found in Chalk-formatted strings
 * and removes ANSI escape sequences.
 *
 * The following escape sequences are decoded:
 * - `\\uXXXX` - A four-digit Unicode escape sequence.
 * - `\\n` - A newline character.
 * - `\\r` - A carriage return character.
 *
 * ANSI escape sequences are removed from the resulting string.
 * - - - -
 * @param {string} value The encoded string to decode and sanitize.
 * @returns {string} The decoded string with ANSI escape sequences removed.
 */
export const decodeChalkString = (value: string): string => {
	return stripAnsi(
		value
			.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '\r'),
	)
}

/**
 * Replaces `{{key}}` placeholders in a string with values from an object.
 *
 * Placeholders are matched using the corresponding object key. Values are
 * converted to strings before replacement.
 * - - - -
 * @param {string} text The string containing `{{key}}` placeholders to interpolate.
 * @param {Record<string, string | number | boolean>} [values] `OPTIONAL` An optional object containing placeholder names and their values.
 * @returns {string} The string with all matching placeholders replaced by their values.
 *
 * @example
 * interpolateStr('Hello, {{name}}!', { name: 'John' })
 * // 'Hello, John!'
 *
 * @example
 * interpolateStr('{{count}} items, enabled: {{enabled}}', {
 *   count: 5,
 *   enabled: true,
 * })
 * // '5 items, enabled: true'
 */
export const interpolateStr = (text: string, values?: Record<string, string | number | boolean>): string => {
	if (!values) return text
	for (const key of Object.keys(values)) {
		const val = values[key as keyof typeof values] ?? key
		text = text.replaceAll(`{{${key}}}`, val.toString())
	}

	return text
}

/**
 * Escapes regular expression special characters in a string.
 *
 * This prevents characters provided by the user from being interpreted
 * as regular expression syntax when the resulting string is used to
 * construct a `RegExp`.
 *
 * @param {string} value The string to escape.
 * @returns {string} The escaped string, safe to use as a literal pattern in a regular expression.
 */
export const escapeRegex = (value: string): string => {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Normalizes a string for case-insensitive and diacritic-insensitive searching.
 *
 * The string is decomposed using Unicode NFD normalization, diacritic
 * characters are removed, and the result is converted to lowercase.
 *
 * @param {string} value The string to normalize.
 * @returns {string} The normalized string without diacritics and in lowercase.
 *
 * @example
 * normalizeSearch('João') // 'joao'
 * normalizeSearch('Beyoncé') // 'beyonce'
 * normalizeSearch('Café') // 'cafe'
 */
export const normalizeStr = (value: string): string => {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
}
