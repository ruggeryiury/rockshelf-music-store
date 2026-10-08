import z from 'zod'

import { booleanValueAsStringSchema, genericServerResponse, rb3CompatibleDTAFileSchema, rb3FileHeaderSchema } from '@schemas'

import { dbSharedUserDocumentSchema, dbSongDocumentSchema } from '../db'

export const songRegisterBodySchema = z.object({
	rb3File: z.file().describe('The Rock Band 3 Song Package file cointaing the song to be registered'),
})

export const songRegisterBodyWithNoFileSchema = songRegisterBodySchema.omit({ rb3File: true })

export const getSongDataQuerystringSchema = z.object({
	incrementCount: booleanValueAsStringSchema.default(false).describe('Increments the "views" value of the song entry by 1. Default is false.'),
})
export type GetSongDataQuerystring = z.infer<typeof getSongDataQuerystringSchema>

export const getSongDataSuccessSchema = genericServerResponse.extend({
	data: rb3CompatibleDTAFileSchema.optional(),
})
export type GetSongDataSuccess = z.infer<typeof getSongDataSuccessSchema>

export const getSongDetailsSuccessSchema = genericServerResponse.extend({
	data: z
		.object({
			song: dbSongDocumentSchema,
			user: dbSharedUserDocumentSchema,
		})
		.optional(),
})
export type GetSongDetailsSuccess = z.infer<typeof getSongDetailsSuccessSchema>

export const getSongFileHeaderSuccessSchema = genericServerResponse.extend({
	data: rb3FileHeaderSchema.optional(),
})
export type GetSongFileHeaderSuccess = z.infer<typeof getSongFileHeaderSuccessSchema>
