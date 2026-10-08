import fp from 'fastify-plugin'

import { type SongIdParams, getSongDetailsSuccessSchema, songIdParams } from '@schemas'

import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { type SongDocument, type UserDocument, dbSharedUserDocumentSchema, dbSongDocumentSchema } from '../../schemas/db'

export const getSongDetails = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams }>(
		'/api/v1/songs/:songId/details',
		{
			schema: {
				summary: 'Retrieves information about a song',
				tags: ['Song (Data)'],
				response: {
					200: SwaggerAPI.replySchema('OK', getSongDetailsSuccessSchema.shape.data.nonoptional()).describe('Song data received'),
					404: SwaggerAPI.replySchema('SONG_ID_NOT_FOUND').describe('No registered song found with provided ID'),
				},
				params: songIdParams,
			},
		},
		async (req, reply) => {
			const { songId } = req.params
			const songObjectId = new fastify.mongo.ObjectId(songId)

			const song = await fastify.db.songs.aggregate<SongDocument & { user: UserDocument }>().match({ _id: songObjectId }).lookup({ from: 'users', localField: 'userId', foreignField: '_id', as: 'user' }).unwind('$user').next()
			if (!song) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })

			await fastify.db.songs.updateOne({ _id: songObjectId }, { $inc: { views: 1 } })

			const { user: userData, ...songData } = song

			const sharedUserData = dbSharedUserDocumentSchema.parse(userData)
			const sharedSongData = dbSongDocumentSchema.parse(songData)

			return success(req, reply, {
				code: 'OK',
				data: {
					song: sharedSongData,
					user: sharedUserData,
				},
			})
		},
	)
	done()
})
