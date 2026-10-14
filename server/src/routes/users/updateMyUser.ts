import fp from 'fastify-plugin'
import { MongoServerError } from 'mongodb'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { type UserUpdateBody, userUpdateBodySchema } from '../../schemas'

export const updateMyUser = fp((fastify, _, done) => {
	fastify.patch<{ Body: UserUpdateBody }>(
		'/api/v1/users/me/update',
		{
			schema: {
				summary: 'Updates a user document by its authorization token',
				tags: ['User (Methods)'],
				response: {
					200: SwaggerAPI.replySchema('OK').describe('User verification status retrieved successfully'),
					400: SwaggerAPI.replySchema('BAD_REQUEST_NO_UPDATE').describe('Request body with no fields to update'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
					409: SwaggerAPI.replySchema('DUPLICATED_EMAIL').describe('Provided e-mail or username is already being used'),
				},
				body: userUpdateBodySchema,
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth()]),
		},
		async (req, reply) => {
			const { _id } = req.userDocument
			const { username, email, country } = req.body

			const update: Record<string, unknown> = {}

			if (username !== undefined) update.username = username
			if (email !== undefined) update.email = email
			if (country !== undefined) update.country = country

			if (Object.keys(update).length === 0) throw new ServerError({ code: 'BAD_REQUEST_NO_UPDATE' })
			try {
				await fastify.db.users.findOneAndUpdate({ _id }, { $set: update, $currentDate: { modifiedAt: true } })

				return success(req, reply, { code: 'OK' })
			} catch (err) {
				if (err instanceof MongoServerError && err.code === 11000) {
					if (typeof err.keyValue.email === 'string') throw new ServerError({ code: 'DUPLICATED_EMAIL', messageValues: { email: err.keyValue.email as string } })
					else if (typeof err.keyValue.username === 'string') throw new ServerError({ code: 'DUPLICATED_USERNAME', messageValues: { username: err.keyValue.email as string } })
				}

				throw new ServerError({ code: 'SERVER_ERROR_UNKNOWN' })
			}
		},
	)
	done()
})
