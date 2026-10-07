import type { FastifySchema } from 'fastify'
import fp from 'fastify-plugin'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { success } from '../../core/plugins/response'
import { dbSharedUserDocumentSchema, getUserDetailsSuccessSchema } from '../../schemas/db'

const schema = {
	summary: 'Retrieves information about the user by its authorization token',
	tags: ['User (Methods)'],
	response: {
		200: SwaggerAPI.replySchema('OK', getUserDetailsSuccessSchema.shape.data.nonoptional()).describe('User validated and found on the database, user data received'),
		401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
		403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
		404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
	},
	security: [
		{
			bearerAuth: [],
		},
	],
} as FastifySchema

export const getMyUserDetails = fp((fastify, _, done) => {
	fastify.get(
		'/api/v1/users/me',
		{
			preHandler: fastify.auth([userBearerAuth]),
			schema,
		},
		async (req, reply) => {
			const user = dbSharedUserDocumentSchema.parse(req.userDocument)
			return success(req, reply, {
				code: 'SUCCESS_GET_MYUSER_DETAILS',
				data: {
					user,
					songsCount: await fastify.dbFuncs.songs.countUserSongs(user._id),
				},
			})
		},
	)
	done()
})
