import z from 'zod'

import { OBJECT_ID_REGEX, countryCodeSchemaWithUnselected, rb3CompatibleDTAFileSchema } from './globals'

// #region User Document
export const dbSerializedUserDocumentSchema = z.object({
	_id: z.string().regex(OBJECT_ID_REGEX),
	username: z.string().min(3).max(32),
	usernameSearch: z.string().min(3).max(32),
	email: z.email(),
	passwordHash: z.string(),
	rank: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
	country: countryCodeSchemaWithUnselected,
	createdAt: z.iso.datetime(),
	modifiedAt: z.iso.datetime(),
	verified: z.boolean(),
	verifiedAt: z.iso.datetime().optional(),
	active: z.boolean(),
	avatarVer: z.number().nonnegative(),
})
export type SerializedUserDocument = z.infer<typeof dbSerializedUserDocumentSchema>

export const dbSerializedSharedUserDocumentSchema = dbSerializedUserDocumentSchema.omit({ passwordHash: true, active: true })
export type SerializedSharedUserDocument = z.infer<typeof dbSerializedSharedUserDocumentSchema>

// #region Verification Document
export const dbSerializedVerificationTypeDocumentSchema = z.object({
	_id: z.string().regex(OBJECT_ID_REGEX),
	userId: z.string().regex(OBJECT_ID_REGEX),
	tokenHash: z.base64url(),
	createdAt: z.iso.datetime(),
	expiresAt: z.iso.datetime(),
})
export type SerializedVerificationDocument = z.infer<typeof dbSerializedVerificationTypeDocumentSchema>

// #region Song Document
/**
 * Roles list:
```text
0 - Tempo mapping
1 - Drums
2 - Bass
3 - Guitar
4 - Vocals
5 - Keys
6 - PRO Bass
7 - PRO Guitar
8 - PRO Keys
9 - Harmonies
10 - Venues
11 - Cameras
12 - Lighting
13 - Trainers
14 - Animations
15 - Lipsync
16 - Overdrive/Solo Markers
20 - Metadata
21 - Reductions
*/
export const songEntryRolesList = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10), z.literal(11), z.literal(12), z.literal(13), z.literal(14), z.literal(15), z.literal(16), z.literal(20), z.literal(21), z.literal(22)])

export const dbSerializedSongEntryRolesArrayObjSchema = z.object({
	charterId: z.string().regex(OBJECT_ID_REGEX),
	roles: z.array(songEntryRolesList),
})

export const dbSerializedSongDocumentSchema = z.object({
	_id: z.string().regex(OBJECT_ID_REGEX),
	charterId: z.string().regex(OBJECT_ID_REGEX),
	artistId: z.string().regex(OBJECT_ID_REGEX),
	albumId: z.string().regex(OBJECT_ID_REGEX),
	fileSize: z.number(),
	fileHash: z.base64(),
	uploadedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
	releaseDate: z.iso.datetime(),
	status: z.union([z.literal('processing'), z.literal('available')]),
	views: z.int().nonnegative(),
	downloads: z.int().nonnegative(),
	description: z.string(),
	version: z.int().min(1).max(0xffff),
	roles: z.array(dbSerializedSongEntryRolesArrayObjSchema),
	songData: rb3CompatibleDTAFileSchema,
})
export type SerializedSongDocument = z.infer<typeof dbSerializedSongDocumentSchema>
