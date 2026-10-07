import z from 'zod'

import { OBJECT_ID_REGEX, countryCodeSchemaWithUnselected, rb3CompatibleDTAFileSchema } from './globals'

// #region User Document
export const dbSerializedUserDocumentSchema = z.object({
	_id: z.string().regex(OBJECT_ID_REGEX),
	username: z.string().min(3).max(32),
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
export const dbSerializedSongDocumentSchema = z.object({
	_id: z.string().regex(OBJECT_ID_REGEX),
	userId: z.string().regex(OBJECT_ID_REGEX),
	artistId: z.string().regex(OBJECT_ID_REGEX),
	albumId: z.string().regex(OBJECT_ID_REGEX),
	fileSize: z.number(),
	fileHash: z.base64(),
	uploadedAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
	status: z.union([z.literal('processing'), z.literal('available')]),
	views: z.int().nonnegative(),
	downloads: z.int().nonnegative(),
	description: z.string(),
	songData: rb3CompatibleDTAFileSchema,
})
export type SerializedSongDocument = z.infer<typeof dbSerializedSongDocumentSchema>
