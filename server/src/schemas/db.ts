import { ObjectId } from 'mongodb'
import z from 'zod'

import { countryCodeSchemaWithUnselected, genericServerResponse, rb3CompatibleDTAFileSchema, songEntryRolesList } from '@schemas'

// #region User Document
export const dbUserDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	username: z.string().min(3).max(32).describe('The user name'),
	usernameSearch: z.string().min(3).max(32).describe('Normalized username for search queries'),
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

// #region Verification Document
export const dbVerificationDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	userId: z.instanceof(ObjectId).describe('The user ID'),
	tokenHash: z.base64url().describe('A computed hash of the verification token sent for the user by e-mail'),
	createdAt: z.date().describe('The creation date of the verification token'),
	expiresAt: z.date().describe('The date where the verification token will expire'),
})
export type VerificationDocument = z.infer<typeof dbVerificationDocumentSchema>

// #region Song Document
export const songEntryRolesArrayObjSchema = z.object({
	charterId: z.instanceof(ObjectId),
	roles: z.array(songEntryRolesList),
})
export type SongEntryRolesArrayObj = z.infer<typeof songEntryRolesArrayObjSchema>

export const dbSongDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	charterId: z.instanceof(ObjectId).describe('The user ID'),
	artistId: z.instanceof(ObjectId).describe('The hash of the artist/band of the song'),
	albumId: z.instanceof(ObjectId).optional().describe('The hash of the album of the song'),
	fileSize: z.number().describe('The size of the RB3 file'),
	fileHash: z.base64().describe('The computed hash of the song file contents'),
	uploadedAt: z.date().describe('The upload date of the song'),
	updatedAt: z.date().describe('The update date of the song'),
	releaseDate: z.date().describe('The original release date of the song'),
	status: z.union([z.literal('processing'), z.literal('available')]).describe('A flag to describe if the song file is busy on server request operations'),
	views: z.int().nonnegative().describe('The amount of views of the song file'),
	downloads: z.int().nonnegative().describe('The amount of downloads of the song'),
	description: z.string().describe('A Markdown-compatible description of the song'),
	version: z.int().min(1).max(0xffff).describe('The version of the song'),
	roles: z.array(songEntryRolesArrayObjSchema).describe("An array of roles representing each charter and its role on the song's charting process"),
	songData: rb3CompatibleDTAFileSchema.describe('The parsed song data'),
})
export type SongDocument = z.infer<typeof dbSongDocumentSchema>

// #region Artist Document
export const dbArtistDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	name: z.string().describe('The name of the artist'),
	nameSearch: z.string().describe('Normalized artist/band name for search queries'),
	hash: z.base64url().describe("The hash of the artist's name (in lowercase)"),
})
export type ArtistDocument = z.infer<typeof dbArtistDocumentSchema>

// #region Album Document
export const dbAlbumDocumentSchema = z.object({
	_id: z.instanceof(ObjectId).describe('The entry object ID'),
	artistId: z.instanceof(ObjectId).describe('The artist/band object ID'),
	name: z.string().describe('The name of the artist'),
	nameSearch: z.string().describe('Normalized album name for search queries'),
	hash: z.base64url().describe("The hash of the artist's name (in lowercase)"),
})
export type AlbumDocument = z.infer<typeof dbAlbumDocumentSchema>

// #region CountersDocument
export const dbCountersDocumentSchema = z.object({
	_id: z.union([z.literal('songID')]),
	prefix: z.int(),
	value: z.int(),
})
export type CountersDocument = z.infer<typeof dbCountersDocumentSchema>

// #region Unserialized
export const getUserDetailsSuccessSchema = genericServerResponse.extend({
	data: z
		.object({
			user: dbSharedUserDocumentSchema,
			songsCount: z.number().nonnegative(),
		})
		.optional(),
})
export type GetUserDetailsSuccess = z.infer<typeof getUserDetailsSuccessSchema>
