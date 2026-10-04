import fp from 'fastify-plugin'

import { type UserResendVerificationEmailBody, userResendVerificationEmailSchema } from '@schemas'

import { LogAPI } from '../../core/api/LogAPI'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'

export const userResendResetPasswordEmail = fp((fastify, _, done) => {
	fastify.post<{ Body: UserResendVerificationEmailBody }>(
		'/api/v1/users/resend-reset-password',
		{
			schema: {
				summary: 'Resend a reset password e-mail for a specific user',
				tags: ['User Verification/Reset Password'],
				response: {
					200: SwaggerAPI.replySchema('RESEND_RESET_PASSWORD_EMAIL_ACCEPTED').describe('Reset password e-mail sent'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
				},
				body: userResendVerificationEmailSchema,
			},
		},
		async (req, reply) => {
			const { email } = req.body
			const now = new Date()
			const expiresAt = new Date(Date.now() + 1000 * 60 * 60)

			const user = await fastify.db.users.findOne({ email })

			if (!user) throw new ServerError({ code: 'USER_NOT_FOUND' })
			if (!user.active) throw new ServerError({ code: 'FORBIDDEN_BANNED_USER' })

			await fastify.db.passResetVerifications.deleteMany({ userId: user._id })

			const { token, tokenHash } = await fastify.dbFuncs.verifications.genVerificationToken()
			if (reply.server.env.LOG_TOKENS) LogAPI.log(`${LogAPI.chalk.bgGreen('PASSWORD CHANGE TOKEN EMITTED')} ${LogAPI.chalk.cyan(LogAPI.chalk.italic(email))} - ${LogAPI.chalk.gray(token)}\nTOKEN HASH: ${tokenHash}`)

			// TO-DO: Implement e-mail send logic

			// Expires in 1 hour
			await fastify.db.passResetVerifications.insertOne({ _id: new fastify.mongo.ObjectId(), userId: user._id, tokenHash, createdAt: now, expiresAt })

			return success(req, reply, { code: 'RESEND_RESET_PASSWORD_EMAIL_ACCEPTED' })
		},
	)
	done()
})
