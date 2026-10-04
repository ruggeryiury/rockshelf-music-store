import fp from 'fastify-plugin'

import { type UserResendVerificationEmailBody, userResendVerificationEmailSchema } from '@schemas'

import { LogAPI } from '../../core/api/LogAPI'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { success } from '../../core/plugins/response'

export const userResendVerificationEmail = fp((fastify, _, done) => {
	fastify.post<{ Body: UserResendVerificationEmailBody }>(
		'/api/v1/users/resend-verification-email',
		{
			schema: {
				summary: 'Resend a verification e-mail for a specific user',
				description: 'Valid requests will always return with `202 ACCEPTED` response status code.\n\nThe response message is left ambiguous of the result of the route to avoid sharing sensitive data over registered users.',
				tags: ['User Verification/Reset Password'],
				body: userResendVerificationEmailSchema,
				response: {
					200: SwaggerAPI.replySchema('RESEND_VERIFICATION_EMAIL_ACCEPTED').describe('Request is valid and it was accepted'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request body format'),
				},
			},
		},
		async (req, reply) => {
			const { email } = req.body
			const now = new Date()
			const expiresAt = new Date(Date.now() + 1000 * 60 * 60)

			const user = await fastify.db.users.findOne({ email })

			if (!user || user.verified || !user.active) return success(req, reply, { code: 'RESEND_VERIFICATION_EMAIL_ACCEPTED' })

			await fastify.db.accVerifications.deleteMany({ userId: user._id })

			const { token, tokenHash } = await fastify.dbFuncs.verifications.genVerificationToken()
			if (reply.server.env.LOG_TOKENS) LogAPI.log(`${LogAPI.chalk.bgGreen('TOKEN RE-EMITTED')} ${LogAPI.chalk.cyan(LogAPI.chalk.italic(email))} - ${LogAPI.chalk.gray(token)}\nTOKEN HASH: ${tokenHash}`)

			// TO-DO: Implement e-mail send logic

			// Expires in 1 hour
			await fastify.db.accVerifications.insertOne({ _id: new fastify.mongo.ObjectId(), userId: user._id, tokenHash, createdAt: now, expiresAt })

			return success(req, reply, { code: 'RESEND_VERIFICATION_EMAIL_ACCEPTED' })
		},
	)
	done()
})
