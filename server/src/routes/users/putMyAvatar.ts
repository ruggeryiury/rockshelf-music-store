import fp from 'fastify-plugin'
import { DirPath, parseReadableBytesSize } from 'node-lib'
import sharp, { type Sharp } from 'sharp'

import { ServerFileSystem } from '../../core/api/ServerFileSystem'
import { SwaggerAPI } from '../../core/api/SwaggerAPI'
import { userBearerAuth } from '../../core/plugins/auth'
import { ServerError } from '../../core/plugins/errors'
import { success } from '../../core/plugins/response'
import { putMyAvatarBodySchema, putMyAvatarBodyWithNoFileSchema } from '../../schemas'

export const putMyAvatar = fp((fastify, _, done) => {
	fastify.put(
		'/api/v1/users/me/avatar',
		{
			schema: {
				summary: 'Uploads a profile image for a registered user',
				tags: ['User (Methods)'],
				consumes: ['multipart/form-data'],
				response: {
					200: SwaggerAPI.replySchema('SUCCESS_AVATAR_UPLOAD').describe('Profile image processed and saved, user document updated'),
					400: SwaggerAPI.replySchema('NO_PROFILE_IMAGE_UPLOADED').describe('No profile image attached to form, crop area exceeds image dimensions'),
					401: SwaggerAPI.replySchema('AUTH_TOKEN_ERROR').describe('Token error (No token on request headers, expired token, invalid token signature)'),
					403: SwaggerAPI.replySchema('FORBIDDEN_BANNED_USER').describe('User banned from the server'),
				},
				body: putMyAvatarBodySchema.nullable(),
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			preHandler: fastify.auth([userBearerAuth]),
		},
		async (req, reply) => {
			const parts = req.parts({ limits: { fileSize: parseReadableBytesSize('1MB'), files: 1 } })
			const fields: Record<string, any> = {}

			let img: Sharp | undefined
			for await (const part of parts) {
				if (part.type === 'file') {
					const buffer = await part.toBuffer()
					img = sharp(buffer)
				} else {
					fields[part.fieldname] = part.value
				}
			}

			if (!img) throw new ServerError({ code: 'NO_PROFILE_IMAGE_UPLOADED' })

			const metadata = await img.metadata()
			const { cropSize, cropX, cropY } = putMyAvatarBodyWithNoFileSchema.parse(fields)

			if (cropX !== undefined && cropY !== undefined && cropSize !== undefined && cropSize > 0) {
				if (cropX + cropSize > metadata.width || cropY + cropSize > metadata.height) throw new ServerError({ code: 'IMAGE_PROCESSING_INVALID_CROP_DIMENSIONS' })
				img.extract({
					top: cropY,
					left: cropX,
					width: cropSize,
					height: cropSize,
				})
			}

			const outputPath = ServerFileSystem.publicDir().gotoFile(`users/${req.userDocument._id.toHexString()}/avatar.webp`)
			const outputRoot = DirPath.of(outputPath.root)
			if (!outputRoot.exists) await outputRoot.mkDir(true)
			const tempPath = ServerFileSystem.publicDir().gotoFile(`users/${req.userDocument._id.toHexString()}/avatar-${crypto.randomUUID()}.tmp.webp`)

			await img.resize(256, 256, { withoutEnlargement: true, fit: 'contain', background: '#00000000' }).webp({ quality: 100 }).toFile(tempPath.path)

			if (outputPath.exists) await outputPath.delete()
			await tempPath.copy(outputPath)
			await tempPath.delete()

			await fastify.db.users.findOneAndUpdate({ _id: req.userDocument._id }, { $inc: { avatarVer: 1 }, $currentDate: { modifiedAt: true } })

			img.destroy()
			return success(req, reply, { code: 'SUCCESS_AVATAR_UPLOAD' })
		},
	)
	done()
})
