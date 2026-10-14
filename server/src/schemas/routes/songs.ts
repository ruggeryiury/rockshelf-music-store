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

export const getSongFileQuerystringSchema = z.object({
	type: z.enum(['dta', 'mogg', 'midi', 'webp', 'png', 'png-ps3', 'png-xbox', 'milo']).default('dta').describe('The file you want to get from the song entry'),
	format: z
		.string()
		.default('0')
		.transform((val) => parseInt(val))
		.pipe(z.int().nonnegative())
		.describe('Controls the output format of the file, read the route description for accepted values'),
})
export type GetSongFileQuerystring = z.infer<typeof getSongFileQuerystringSchema>
