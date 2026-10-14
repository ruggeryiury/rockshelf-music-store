import fp from 'fastify-plugin'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { success } from '../../core/plugins/response'
import { getMyStatusSuccessSchema } from '../../schemas'

export const getMyStatus = fp((fastify, _, done) => {
	fastify.get(
		'/api/v1/users/me/status',
		{
			schema: {
				summary: 'Checks if an user has a verified account by its authorization token',
				tags: ['User (Methods)'],
				response: {
					200: SwaggerAPI.replySchema('OK', getMyStatusSuccessSchema.shape.data.nonoptional()).describe('User verification status retrieved successfully'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth()]),
		},
		async (req, reply) => {
			const user = req.userDocument
			const { verified, verifiedAt } = user

			return success(req, reply, { code: 'OK', data: { verified, verifiedAt } })
		},
	)
	done()
})
