import fp from 'fastify-plugin'
import sharp from 'sharp'

import { type ImageProcessingParams, type SongIdParams, imageProcessingParamsSchema, songIdParams } from '@schemas'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'

export const getSongThumbnail = fp((fastify, _, done) => {
	fastify.get<{ Params: SongIdParams; Querystring: ImageProcessingParams }>(
		'/api/v1/songs/:songId/thumbnail',
		{
			schema: {
				summary: 'Retrieves a song thumbnail',
				tags: ['Song (Data)'],
				response: {
					200: SwaggerAPI.replySchemaWithFile('image/*').describe('User avatar retrieved successfully'),
					404: SwaggerAPI.replySchema('SONG_ID_NOT_FOUND').describe('No registered song found with provided ID'),
				},
				params: songIdParams,
				querystring: imageProcessingParamsSchema,
			},
		},
		async (req, reply) => {
			const { songId } = req.params
			const { format, size, quality } = req.query
			const mime = format ? (format === 'jpg' ? 'jpeg' : format) : 'webp'

			const song = await fastify.db.songs.findOne({ _id: new fastify.mongo.ObjectId(songId) })
			if (!song) throw new ServerError({ code: 'SONG_ID_NOT_FOUND' })

			if ((format === 'webp' || !format) && size === 256 && quality === 100) {
				reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
				return reply.sendFile(`artworks/${song.albumId?.toHexString() ?? 'website'}.webp`)
			}

			const rawImgPath = ServerFileSystem.publicDir().gotoFile(`artworks/${song.albumId?.toHexString() ?? 'website'}.webp`)

			// Load into memory as it blocks the file access
			const rawImgBuffer = await rawImgPath.read()
			const processedImg = sharp(rawImgBuffer).toFormat(mime, { quality })

			if (size < 256) {
				processedImg.resize(size)
			}

			reply.type(`image/${mime}`).header('cache-control', 'public, max-age:6400')
			const imgBuffer = await processedImg.toBuffer()
			return reply.send(imgBuffer)
		},
	)
	done()
})
