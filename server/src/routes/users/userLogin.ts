import fp from 'fastify-plugin'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { type UserLoginBody, userLoginBodySchema, userLoginSuccessSchema } from '../../schemas'

export const userLogin = fp((fastify, _, done) => {
	fastify.post<{ Body: UserLoginBody }>(
		'/api/v1/users/login',
		{
			schema: {
				summary: 'Authenticates an user and return a token',
				tags: ['Login/Register'],
				response: {
					200: SwaggerAPI.replySchema('SUCCESS_USER_LOGIN', userLoginSuccessSchema.shape.data.nonoptional()).describe('User is valid, token received'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request body format'),
					401: SwaggerAPI.replySchema('USER_LOGIN_WRONG_CREDENTIALS').describe('Wrong credentails (invalid password)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					404: SwaggerAPI.replySchema('USER_LOGIN_EMAIL_NOT_REGISTERED').describe('No registered user with provided e-mail to login'),
				},
				body: userLoginBodySchema,
			},
		},
		async (req, reply) => {
			const { email, password } = req.body

			const user = await fastify.dbFuncs.users.findByEmail(email)
			if (!user) throw new ServerError({ code: 'USER_LOGIN_EMAIL_NOT_REGISTERED' })
			if (!user.active) throw new ServerError({ code: 'FORBIDDEN_BANNED_USER' })
			await fastify.dbFuncs.users.comparePasswordForLogin(password, user.passwordHash)
			const token = fastify.jwt.sign({ sub: user._id.toString(), rank: user.rank }, fastify.env.NON_EXPIRING_TOKENS && fastify.env.NODE_ENV === 'development' ? {} : { expiresIn: user.rank === 3 ? '30 minutes' : '1 hour' })

			return success(req, reply, { code: 'SUCCESS_USER_LOGIN', data: { token } })
		},
	)
	done()
})
