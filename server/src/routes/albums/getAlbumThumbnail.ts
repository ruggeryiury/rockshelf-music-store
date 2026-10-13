import fp from 'fastify-plugin'
import sharp from 'sharp'

import { type AlbumIdParams, type ImageProcessingParams, albumIdParams, imageProcessingParamsSchema } from '@schemas'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'

export const getAlbumThumbnail = fp((fastify, _, done) => {
	fastify.get<{ Params: AlbumIdParams; Querystring: ImageProcessingParams }>(
		'/api/v1/albums/:albumId/thumbnail',
		{
			schema: {
				summary: 'Retrieves a album thumbnail by its ID',
				tags: ['Album (Data)'],
				response: {
					200: SwaggerAPI.replySchemaWithFile('image/*').describe('User avatar retrieved successfully'),
					404: SwaggerAPI.replySchema('ALBUM_ID_NOT_FOUND').describe('No registered song found with provided ID'),
				},
				params: albumIdParams,
				querystring: imageProcessingParamsSchema,
			},
		},
		async (req, reply) => {
			const { albumId } = req.params
			const { format, size, quality } = req.query
			const mime = format ? (format === 'jpg' ? 'jpeg' : format) : 'webp'

			const album = await fastify.db.albums.findOne({ _id: new fastify.mongo.ObjectId(albumId) })
			if (!album) throw new ServerError({ code: 'ALBUM_ID_NOT_FOUND' })

			if ((format === 'webp' || !format) && size === 256 && quality === 100) {
				reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
				return reply.sendFile(`artworks/${album._id.toHexString()}.webp`)
			}

			const rawImgPath = ServerFileSystem.publicDir().gotoFile(`artworks/${album._id.toHexString()}.webp`)
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
