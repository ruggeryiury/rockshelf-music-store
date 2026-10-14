import type { FastifyReply, FastifyRequest } from 'fastify'

import { interpolateStr } from '@utils/strNum'

import { type ReplyCodeNames, codeMap, httpCodes } from '../../constants'
import { LogAPI } from '../api/LogAPI'
import type { ServerErrorCodeType, ServerErrorOptions } from './errors'

export function success(req: FastifyRequest, reply: FastifyReply, options: ServerErrorCodeType | ServerErrorOptions) {
	if (typeof options === 'string') {
		const message = options in codeMap ? codeMap[options as ReplyCodeNames][1] : codeMap.SERVER_ERROR_UNKNOWN[1]
		const statusCode = options in codeMap ? codeMap[options as ReplyCodeNames][0] : codeMap.SERVER_ERROR_UNKNOWN[0]
		const statusName = httpCodes[statusCode]
		const code = options

		const responseData = {
			statusCode,
			statusName,
			code,
			message,
		}

		if (reply.server.env.LOG_SUCCESS) LogAPI.logResponse(req, responseData)

		return reply.status(statusCode).send(responseData)
	}
	const { code: c, message: m, messageValues, data } = options
	const message = m || (c in codeMap ? interpolateStr(codeMap[c as ReplyCodeNames][1], messageValues) : codeMap.SERVER_ERROR_UNKNOWN[1])
	const statusCode = c in codeMap ? codeMap[c as ReplyCodeNames][0] : codeMap.SERVER_ERROR_UNKNOWN[0]
	const statusName = httpCodes[statusCode]
	const code = c

	const responseData = {
		statusCode,
		statusName,
		code,
		message,
		data,
	}

	if (reply.server.env.LOG_SUCCESS) LogAPI.logResponse(req, responseData)

	return reply.status(statusCode).send(responseData)
}
