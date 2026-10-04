import fp from 'fastify-plugin'
import sharp from 'sharp'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { ServerError } from '../../core/plugins/errors'
import { genGenericSVGAvatar } from '../../core/utils/genGenericSVGAvatar'
import { type ImageProcessingParams, type UserIdParams, imageProcessingParamsSchema, userIdParams } from '../../schemas'

export const getUserAvatar = fp((fastify, _, done) => {
	fastify.get<{ Params: UserIdParams; Querystring: ImageProcessingParams }>(
		'/api/v1/users/:userId/avatar',
		{
			schema: {
				summary: 'Retrieves an user avatar',
				description: 'Avatars can be static images or generic generated SVG placeholder. The output format can be maniputed by the route.',
				tags: ['User (Data)'],
				response: {
					200: SwaggerAPI.replySchemaWithFile('image/*').describe('User avatar retrieved successfully'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
				},
				params: userIdParams,
				querystring: imageProcessingParamsSchema,
			},
		},
		async (req, reply) => {
			const { userId: id } = req.params
			const { format, size, quality } = req.query
			const mime = format ? (format === 'jpg' ? 'jpeg' : format) : 'webp'
			// const ext = format === 'jpeg' ? 'jpg' : format

			const user = await fastify.dbFuncs.users.findById(id)
			if (!user) throw new ServerError({ code: 'USER_NOT_FOUND' })

			if (user.avatarVer == 0) {
				// Generate a SVG avatar
				const letter = user.username[0].toUpperCase()
				const svgBuffer = Buffer.from(genGenericSVGAvatar(letter, size))

				if (!format) {
					reply.type('image/svg+xml').header('cache-control', 'public, max-age:3600')

					return reply.send(svgBuffer)
				}

				const processedImg = sharp(svgBuffer).toFormat(mime, { quality: 100 })

				if (size < 256) {
					processedImg.resize(size)
				}

				reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
				return reply.send(await processedImg.toBuffer())
			}

			if ((format === 'webp' || !format) && size === 256 && quality === 100) {
				reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
				return reply.sendFile(`users/${id}/avatar.webp`)
			}

			const rawImgPath = ServerFileSystem.publicDir().gotoFile(`users/${id}/avatar.webp`)
			const processedImg = sharp(rawImgPath.path).toFormat(mime, { quality })

			if (size < 256) {
				processedImg.resize(size)
			}

			reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
			return reply.send(await processedImg.toBuffer())
		},
	)
	done()
})
