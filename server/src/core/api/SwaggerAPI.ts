import { ZodNonOptional, z } from 'zod'

import { genericServerResponse } from '@schemas'

import { type HTTPStatusCodes, codeMap, httpCodes } from '../../constants'
import type { ServerErrorCodeType } from '../plugins/errors'

/**
 * A class with helper methods to generate schemas for Swagger documentation.
 */
export class SwaggerAPI {
	/**
	 * Generates a specific response schema with the exact status code and name provided from the response `code` argument.
	 *
	 * This is used to generate documented route responses for Swagger UI.
	 * - - - -
	 * @param {ServerErrorCodeType} code The code of the response you want to create the schema from.
	 * @param {ZodRawShape | undefined} [dataSchema] `OPTIONAL` An object with keys and value schemas to populate the response body `data` key.
	 * @link [Code map](./constants.ts).
	 */
	static replySchema(code: ServerErrorCodeType, dataSchema?: ZodNonOptional) {
		const hasStatus = code in codeMap
		const newStatusCode = hasStatus ? codeMap[code as keyof typeof codeMap][0] : (codeMap.INTERNAL_SERVER_ERROR[0] as HTTPStatusCodes)
		const schema = genericServerResponse.extend({
			statusCode: z.literal(newStatusCode),
			statusName: z.literal(httpCodes[newStatusCode]),
		})
		if (dataSchema) return schema.extend({ data: dataSchema })
		return schema
	}

	/**
	 * Generates a specific response schema with the exact status code and name provided from the response `code` argument.
	 *
	 * This is used to generate documented route responses (that accept `multipart/form-data`) for Swagger UI.
	 * - - - -
	 * @param {string} mimeType The MIME type of the file sent by the response.
	 */
	static replySchemaWithFile(mimeType: string) {
		const schema = z.instanceof(Buffer).meta({ content: { [mimeType]: { schema: { type: 'string', format: 'binary' } } } })
		return schema
	}
}
