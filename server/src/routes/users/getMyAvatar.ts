import fp from 'fastify-plugin'
import sharp from 'sharp'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { genGenericSVGAvatar } from '../../core/utils/genGenericSVGAvatar'
import { type ImageProcessingParams, imageProcessingParamsSchema } from '../../schemas'

export const getMyAvatar = fp((fastify, _, done) => {
	fastify.get<{ Querystring: ImageProcessingParams }>(
		'/api/v1/users/me/avatar',
		{
			schema: {
				summary: 'Retrieves an user avatar by its authorization token',
				description: 'Avatars can be static images or generic generated SVG placeholder. The output format can be maniputed by the route.',
				tags: ['User (Methods)'],
				response: {
					200: SwaggerAPI.replySchemaWithFile('image/*').describe('User avatar retrieved successfully'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
					404: SwaggerAPI.replySchema('USER_NOT_FOUND').describe('No registered user found with provided ID'),
				},
				querystring: imageProcessingParamsSchema,
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth]),
		},
		async (req, reply) => {
			const { format, size, quality } = req.query
			const user = req.userDocument
			const userId = user._id.toHexString()
			const mime = format ? (format === 'jpg' ? 'jpeg' : format) : 'webp'
			// const ext = format === 'jpeg' ? 'jpg' : format

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
				const imgBuffer = await processedImg.toBuffer()
				return reply.send(imgBuffer)
			}

			if ((format === 'webp' || !format) && size === 256 && quality === 100) {
				reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
				return reply.sendFile(`users/${userId}/avatar.webp`)
			}

			const rawImgPath = ServerFileSystem.publicDir().gotoFile(`users/${userId}/avatar.webp`)
			const rawImgBuffer = await rawImgPath.read()
			const processedImg = sharp(rawImgBuffer).toFormat(mime, { quality })

			if (size < 256) {
				processedImg.resize(size)
			}

			reply.type(`image/${mime}`).header('cache-control', 'public, max-age:3600')
			const imgBuffer = await processedImg.toBuffer()
			return reply.send(imgBuffer)
		},
	)
	done()
})
