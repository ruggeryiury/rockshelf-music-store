import fp from 'fastify-plugin'
import { MongoServerError } from 'mongodb'

import { LogAPI } from '../../core/api/LogAPI'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { normalizeString } from '../../core/rockshelf/dta/textMethods'
import { type UserRegisterBody, userRegisterBodySchema } from '../../schemas'

export const userRegister = fp((fastify, _, done) => {
	fastify.post<{ Body: UserRegisterBody }>(
		'/api/v1/users/register',
		{
			schema: {
				summary: 'Registers a new user',
				tags: ['Login/Register'],
				response: {
					201: SwaggerAPI.replySchema('SUCCESS_USER_REGISTER').describe('User has been registered successfully'),
					400: SwaggerAPI.replySchema('BAD_REQUEST').describe('Wrong request body format'),
					401: SwaggerAPI.replySchema('USER_PASSWORD_TOO_SMALL').describe('Weak password provided'),
					409: SwaggerAPI.replySchema('DUPLICATED_EMAIL').describe('Provided e-mail or username is already being used'),
				},
				body: userRegisterBodySchema,
			},
		},
		async (req, reply) => {
			const { username, email, password } = req.body
			const now = new Date()

			if (!reply.server.env.DISABLE_PASSWORD_VALIDATOR) fastify.dbFuncs.users.validateUserPassword(password)

			const passwordHash = await fastify.dbFuncs.users.hashPassword(password)

			try {
				const newUser = await fastify.db.users.insertOne({ _id: new fastify.mongo.ObjectId(), username, usernameSearch: normalizeString(username), email, passwordHash, createdAt: now, modifiedAt: now, rank: 0, country: '', verified: false, active: true, avatarVer: 0 })

				const { token, tokenHash } = await fastify.dbFuncs.verifications.genVerificationToken()

				// TO-DO: Implement e-mail send logic
				if (reply.server.env.LOG_TOKENS) LogAPI.log(`${LogAPI.chalk.bgGreen('TOKEN EMITTED')} ${LogAPI.chalk.cyan(LogAPI.chalk.italic(email))} - ${LogAPI.chalk.gray(`TOKEN HASH: ${tokenHash}`)}\nTo validate: http://192.168.15.5:5173/users/verify-acc?token=${token}`)

				// Expires in 1 hour
				await fastify.db.accVerifications.insertOne({ _id: new fastify.mongo.ObjectId(), userId: newUser.insertedId, tokenHash, createdAt: now, expiresAt: new Date(Date.now() + 1000 * 60 * 60) })

				return success(req, reply, { code: 'SUCCESS_USER_REGISTER' })
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
