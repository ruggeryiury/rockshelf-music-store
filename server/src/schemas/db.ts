import { ObjectId } from 'mongodb'
import z from 'zod'

import { countryCodeSchemaWithUnselected, genericServerResponse } from '@schemas'

export const dbUserDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	username: z.string().min(3).max(32).describe('The user name'),
	email: z.email().describe("The user's e-mail address."),
	passwordHash: z.string().describe("A hash of the user's password"),
	rank: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).describe('The privileges rank of the user: `0` Normal user; `3` Server administrator'),
	country: countryCodeSchemaWithUnselected,
	createdAt: z.date().describe('The creation date of the user'),
	modifiedAt: z.date().describe('he date where the user values where last modified.'),
	verified: z.boolean().describe('A value that tells if the user has a verified account by its e-mail'),
	verifiedAt: z.date().optional().describe('The date of the user verification'),
	active: z.boolean().describe('Tells if the user is active. If the value is false, the user was banned from the server'),
	avatarVer: z.number().nonnegative().describe('Abstract value used to control URL cache for avatars'),
})
export type UserDocument = z.infer<typeof dbUserDocumentSchema>

export const dbSharedUserDocumentSchema = dbUserDocumentSchema.omit({ passwordHash: true, active: true })
export type SharedUserDocument = z.infer<typeof dbSharedUserDocumentSchema>

export const dbVerificationTypeDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	userId: z.instanceof(ObjectId).describe('The user ID'),
	tokenHash: z.hash('sha256').describe('A computed hash of the verification token sent for the user by e-mail'),
	createdAt: z.date().describe('The creation date of the verification token.'),
	expiresAt: z.date().describe('The date where the verification token will expire.'),
})
export type VerificationDocument = z.infer<typeof dbVerificationTypeDocumentSchema>

export const getUserDetailsSuccessSchema = genericServerResponse.extend({
	data: z
		.object({
			user: dbSharedUserDocumentSchema,
			//  songsCount: z.number().nonnegative()
		})
		.optional(),
})
export type GetUserDetailsSuccess = z.infer<typeof getUserDetailsSuccessSchema>

