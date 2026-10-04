import bcrypt from 'bcryptjs'
import fp from 'fastify-plugin'
import { Cryptography } from 'node-lib'

import type { UserDocument, VerificationDocument } from '../../schemas/db'
import { userPasswordValidator } from '../utils/userPasswordValidator'
import { ServerError } from './errors'

export const DBPlugin = fp(async (fastify) => {
	const users = fastify.mongo.db?.collection<UserDocument>('users')
	const accVerifications = fastify.mongo.db?.collection<VerificationDocument>('acc_verifications')
	const passResetVerifications = fastify.mongo.db?.collection<VerificationDocument>('pass_reset_verifications')
	if (!users || !accVerifications || !passResetVerifications) throw new Error("Couldn't estabilish schema documents for the database")

	await users.createIndex('email', { unique: true })
	await users.createIndex('username', { unique: true, collation: { locale: 'en', strength: 2 } })

	await accVerifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
	await passResetVerifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

	fastify.decorateRequest('userDocument')

	fastify.decorate('db', { users, accVerifications, passResetVerifications })
	fastify.decorate('dbFuncs', {
		users: {
			validateUserPassword: (password) => {
				const { error: userPasswordError } = userPasswordValidator(password)

				if (userPasswordError) {
					switch (userPasswordError) {
						case 'tooSmall':
							throw new ServerError({ code: 'USER_PASSWORD_TOO_SMALL' })
						case 'tooBig':
							throw new ServerError({ code: 'USER_PASSWORD_TOO_BIG' })
						case 'noUppercase':
							throw new ServerError({ code: 'USER_PASSWORD_NO_UPPERCASE' })
						case 'noLowercase':
							throw new ServerError({ code: 'USER_PASSWORD_NO_LOWERCASE' })
						case 'noNumbers':
							throw new ServerError({ code: 'USER_PASSWORD_NO_NUMBERS' })
						case 'noSpecialChars':
							throw new ServerError({ code: 'USER_PASSWORD_NO_SPECIAL_CHARS' })
					}
				}
			},
			hashPassword: async (password) => {
				const salt = await bcrypt.genSalt(12)
				const hashedPassword = await bcrypt.hash(password, salt)
				return hashedPassword
			},
			findByEmail: async (email) => await fastify.db.users.findOne({ email }),
			findById: async (id) => await fastify.db.users.findOne({ _id: new fastify.mongo.ObjectId(id) }, {}),
			comparePasswordForLogin: async (routeProvidedPassword, hashedUserEntryPassword) => {
				const isCorrectPassword = await bcrypt.compare(routeProvidedPassword, hashedUserEntryPassword)
				if (!isCorrectPassword) throw new ServerError({ code: 'USER_LOGIN_WRONG_CREDENTIALS' })
			},
		},
		verifications: {
			genVerificationToken: async () => {
				const token = (await Cryptography.randomBytes(32)).toHex()
				const tokenHash = Cryptography.hash('sha256', token, { outputEncoding: 'hex' })

				return { token, tokenHash }
			},
			hashToken: (hash) => {
				return Cryptography.hash('sha256', hash, { outputEncoding: 'hex' })
			},
		},
	})
})
