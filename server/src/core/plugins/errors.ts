import fp from 'fastify-plugin'
import type { LiteralUnion } from 'type-fest'
import { ZodError } from 'zod'

import type { GenericServerResponse } from '@schemas'
import { interpolateStr } from '@utils/string'

import { type HTTPCodeNames, type HTTPStatusCodes, type ReplyCodeNames, codeMap, httpCodes } from '../../constants'

export type ServerErrorCodeType = LiteralUnion<ReplyCodeNames, string>

export interface ServerErrorOptions {
	/**
	 * The code of the error, you can use declared error codes from the internal `codeMap` object or use a custom error code.
	 *
	 * All custom error codes (not present on the `codeMap` object) will have status code `500 INTERNAL SERVER ERROR`.
	 */
	code: ServerErrorCodeType
	/**
	 * A custom message that will override the default code message.
	 */
	message?: string
	/**
	 * An object with values that will interpolate on the provided code default message.
	 */
	messageValues?: Record<string, string>
	/**
	 * An object with values that can be appended to the server error instance.
	 */
	data?: Record<string, unknown>
}

/**
 * An error class used to properly assign values structured for default Fastify error handler.
 */
export class ServerError extends Error {
	/**
	 * The status code of the error.
	 */
	statusCode: HTTPStatusCodes
	/**
	 * The status name of the error.
	 */
	statusName: HTTPCodeNames
	/**
	 * A formatted code description of the error
	 */
	code: ServerErrorCodeType
	/**
	 * An object with values to be send on the error response.
	 */
	data?: Record<string, unknown>
	error: undefined
	constructor(options: ServerErrorCodeType | ServerErrorOptions) {
		if (typeof options === 'string') {
			super(options in codeMap ? codeMap[options as ReplyCodeNames][1] : codeMap.SERVER_ERROR_UNKNOWN[1])
			this.error = undefined
			this.statusCode = options in codeMap ? codeMap[options as ReplyCodeNames][0] : codeMap.SERVER_ERROR_UNKNOWN[0]
			this.statusName = httpCodes[this.statusCode]
			this.code = options
			return
		}
		const { code: c, message: m, messageValues: mv, data: d } = options
		super(m || (c in codeMap ? interpolateStr(codeMap[c as ReplyCodeNames][1], mv) : codeMap.SERVER_ERROR_UNKNOWN[1]))
		this.error = undefined
		this.statusCode = c in codeMap ? codeMap[c as ReplyCodeNames][0] : codeMap.SERVER_ERROR_UNKNOWN[0]
		this.statusName = httpCodes[this.statusCode]
		this.code = c
		if (d) this.data = d
	}
}

/**
 * Formats the first Zod validation issue into a Fastify-compatible validation error response.
 * - - - -
 * @param {ZodError} error The Zod error containing the validation issue.
 * @param {string} [location] `OPTIONAL` The location of the validated data, such as `body`, `querystring`, or `params`. Default is `body`.
 * @returns {GenericServerResponse}
 */
export const formatZodValidationError = (error: ZodError, location: string = 'body'): GenericServerResponse => {
	const issue = error.issues[0]!

	const path = issue.path.map((value) => String(value)).join('/')

	return {
		statusCode: 400,
		statusName: 'Bad Request',
		code: 'FST_ERR_VALIDATION',
		message: `${location}/${path} ${issue.message}`,
	}
}

/**
 * ## Error Handler Plugin
 * - - - -
 * Customizes the Fastify default error handler function to detect thrown `ServerError` instances.
 */
export const ErrorHandlerPlugin = fp((fastify, _, done) => {
	fastify.setErrorHandler((error, _, reply) => {
		if (error instanceof ServerError) {
			const responseData = {
				statusCode: error.statusCode,
				statusName: error.statusName,
				code: error.code,
				message: error.message,
			}
			return reply.status(responseData.statusCode).send(responseData)
		} else if (error instanceof ZodError) {
			const responseData = formatZodValidationError(error)
			return reply.status(responseData.statusCode).send(responseData)
		} else if (error instanceof Error && 'code' in error && 'statusCode' in error) {
			const responseData = { statusCode: error.statusCode, statusName: httpCodes[error.statusCode as keyof typeof httpCodes], code: error.code as string, message: error.message } as GenericServerResponse

			return reply.status(responseData.statusCode as number).send(responseData)
		} else {
			const responseData = { statusCode: 500, statusName: httpCodes[500], code: '', message: 'An unknown error has occurred', error: !fastify.isDev() ? undefined : typeof error === 'object' ? { ...error } : undefined }

			return reply.status(responseData.statusCode).send(responseData)
		}
	})
	done()
})

/**
 * ## Not Found Handler Plugin
 * - - - -
 * Customizes the Fastify default "route not found" using a standardized `GenericServerResponse` response.
 */
export const NotFoundHandlerPlugin = fp((fastify, _, done) => {
	fastify.setNotFoundHandler((req) => {
		throw new ServerError({ code: 'ROUTE_NOT_FOUND', messageValues: { method: req.method, url: req.url } })
	})
	done()
})
