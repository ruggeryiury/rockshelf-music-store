import z from 'zod'

import { countryCodeSchemaWithUnselected, dbSerializedSharedUserDocumentSchema, genericServerResponse } from '@schemas'

// #region GET users/me/status
export const getMyStatusSuccessSchema = genericServerResponse.extend({ data: z.object({ verified: z.boolean(), verifiedAt: z.instanceof(Date).optional() }).optional() })
export type GetMyStatusSuccess = z.infer<typeof getMyStatusSuccessSchema>
export const getMyStatusSerializedSuccessSchema = getMyStatusSuccessSchema.extend({ data: z.object({ verified: z.boolean(), verifiedAt: z.iso.datetime().optional() }).optional() })
export type GetMyStatusSerializedSuccess = z.infer<typeof getMyStatusSerializedSuccessSchema>

// #region GET users/:userId

export const getUserDetailsSuccessSerializedSchema = genericServerResponse.extend({
	data: z
		.object({
			user: dbSerializedSharedUserDocumentSchema,
			//  songsCount: z.number().nonnegative()
		})
		.optional(),
})
export type GetUserDetailsSuccessSerialized = z.infer<typeof getUserDetailsSuccessSerializedSchema>

// #region GET users/me/avatar
export const putMyAvatarBodySchema = z.object({
	avatar: z.file().describe('The image file to be processed and saved as avatar'),
	cropX: z
		.string()
		.optional()
		.transform((arg) => (arg ? Number(arg) : undefined))
		.pipe(z.number().nonnegative().max(5000).optional())
		.describe('The X coordinates where the cropping must begin'),
	cropY: z
		.string()
		.optional()
		.transform((arg) => (arg ? Number(arg) : undefined))
		.pipe(z.number().nonnegative().max(5000).optional())
		.describe('The Y coordinates where the cropping must begin'),
	cropSize: z
		.string()
		.optional()
		.transform((arg) => (arg ? Number(arg) : undefined))
		.pipe(z.number().positive().max(5000).optional())
		.describe('The crop size. Max is 5000'),
})

export const putMyAvatarBodyWithNoFileSchema = putMyAvatarBodySchema.omit({ avatar: true })

// #region POST users/resend-verification-email
export const userResendVerificationEmailSchema = z.object({
	email: z.email(),
})

export type UserResendVerificationEmailBody = z.infer<typeof userResendVerificationEmailSchema>

// #region POST users/reset-password
export const userResetPasswordBodySchema = z.object({
	token: z.string().regex(/[a-f0-9]{64}/),
	newPassword: z.string().max(32),
})

export type UserResetPasswordBody = z.infer<typeof userResetPasswordBodySchema>

// #region PATCH users/me/update
export const userUpdateBodySchema = z.object({
	username: z.string().min(3).max(32).optional(),
	email: z.email().optional(),
	country: countryCodeSchemaWithUnselected,
})

export type UserUpdateBody = z.infer<typeof userUpdateBodySchema>

// #region POST users/login
export const userLoginBodySchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(32),
})
export type UserLoginBody = z.infer<typeof userLoginBodySchema>

export const userLoginSuccessSchema = genericServerResponse.extend({
	data: z.object({ token: z.string() }).optional(),
})
export type UserLoginSuccess = z.infer<typeof userLoginSuccessSchema>

// #region POST users/register
export const userRegisterBodySchema = z.object({
	username: z.string().min(3).max(32),
	email: z.email(),
	password: z.string().min(8).max(32),
})
export type UserRegisterBody = z.infer<typeof userRegisterBodySchema>

// #region POST users/verify-acc
export const userVerifyAccBodySchema = z.object({
	token: z.base64url(),
})

export type UserVerifyAccBody = z.infer<typeof userVerifyAccBodySchema>
