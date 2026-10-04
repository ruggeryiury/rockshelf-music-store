import type { Collection, ObjectId, WithId } from 'mongodb'

import type { DecodedUserTokenObject, ServerEnvObject, SignedUserTokenObject, UserDocument, VerificationDocument } from './schemas'

declare module 'fastify' {
	interface FastifyRequest {
		/**
		 * User document schema populated only on routes which uses `userBearerAuth` or `adminBearerAuth` authorization handlers.
		 */
		userDocument: WithId<UserDocument>
	}
	interface FastifyInstance {
		// NodeEnv Plugin
		// src/app/plguins/nodeEnv.ts

		/**
		 * An object with parsed values from the `.env` file.
		 */
		env: ServerEnvObject
		/**
		 * Returns `true` is the environment is in development mode, false otherwise.
		 *
		 * The flag must be passed in the script execution argument level.
		 * ----
		 *
		 * ```sh
		 * pnpm add cross-env tsx -D
		 * cross-env NODE_ENV=development tsx watch ./src/index.ts"
		 * ```
		 * - - - -
		 * @returns {boolean}
		 */
		isDev: () => boolean

		db: {
			users: Collection<UserDocument>
			// songs: Collection<SongDocument>
			accVerifications: Collection<VerificationDocument>
			passResetVerifications: Collection<VerificationDocument>
			// artists: Collection<ArtistDocument>
			// albums: Collection<AlbumDocument>
		}
		dbFuncs: {
			users: {
				/**
				 * Validates a provided password string. Automatically throws a `ServerError` when any of the password criterias don't match for the provided password string.
				 * - - - -
				 * @param {string} password The password to be validated.
				 * @returns {void}
				 * @throws {ServerError} When any of the password criterias don't match
				 */
				validateUserPassword: (password: string) => void
				/**
				 * Hashes the provided password with `bcrypt` password hashing algorithm and returns the hashed password.
				 * - - - -
				 * @param {string} password The password to be hashed.
				 * @returns {Promise<string>}
				 */
				hashPassword: (password: string) => Promise<string>
				/**
				 * Asynchronously finds an user by its e-mail and returns its database entry object. Returns `null` if the e-mail is not registered for any user.
				 * - - - -
				 * @param {string} email An e-mail address to fetch the user document from.
				 * @returns {Promise<WithId<UserDocument> | null>}
				 */
				findByEmail: (email: string) => Promise<WithId<UserDocument> | null>
				/**
				 * Asynchronously finds an user by its ID and returns its database entry object. Returns `null` if the provided ID doesn't match any user on the database registry.
				 * - - - -
				 * @param {string} id An ID to fetch the user document from.
				 * @returns {Promise<WithId<UserDocument> | null>}
				 */
				findById: (id: string) => Promise<WithId<UserDocument> | null>
				/**
				 * Asynchronously compares a user entry password (hashed) and a route-provided password (raw) to validate an user login. Automatically throws a `ServerError` (code `USER_LOGIN_WRONG_CREDENTIALS`) when the route-provided password and the user entry password hash don't match.
				 * - - - -
				 * @param {string} routeProvidedPassword The raw password provided by the login request body.
				 * @param {string} hashedUserEntryPassword The hashed password from a user database entry.
				 * @returns {Promise<void>}
				 * @throws {ServerError} When the route-provided password and the user entry password hash don't match.
				 */
				comparePasswordForLogin: (routeProvidedPassword: string, hashedUserEntryPassword: string) => Promise<void>
			}
			verifications: {
				/**
				 * Asynchronously generates a verification token to verify a registered user. The function returns an object with a raw token (to be sent by e-mail to the registered user) and a hash of the same token (to be kept on the EmailVerification database collection).
				 * - - - -
				 * @returns {Promise<VerificationTokenGeneratorObject>}
				 */
				genVerificationToken: () => Promise<VerificationTokenGeneratorObject>
				/**
				 * Produces a SHA256 hash of a raw e-mail verification token.
				 * - - - -
				 * @param {string} verificationToken The e-mail verification token to be hashed.
				 * @returns {string}
				 */
				hashToken: (verificationToken: string) => string
			}
			// songs: {
			// 	findById: (id: string) => Promise<WithId<SongDocument> | null>
			// 	countUserSongs: (userId: ObjectId | string) => Promise<number>
			// }
			// artists: {
			// 	findById: (id: string) => Promise<WithId<ArtistDocument> | null>
			// 	findByHash: (hash: string) => Promise<WithId<ArtistDocument> | null>
			// }
			// albums: {
			// 	findById: (id: string) => Promise<WithId<AlbumDocument> | null>
			// 	findByHash: (hash: string) => Promise<WithId<AlbumDocument> | null>
			// }
		}
	}
}

declare module '@fastify/jwt' {
	interface FastifyJWT {
		/**
		 * The document schema accepted to be signed for a registered user.
		 */
		payload: SignedUserTokenObject
		/**
		 * The parsed `DecodedUserToken` object, decoded from bearer authorization header.
		 */
		user: DecodedUserTokenObject
	}
}
