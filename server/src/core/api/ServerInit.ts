import { type FastifyInstance } from 'fastify'
import { DirPath } from 'node-lib'

import authPlugin from '@fastify/auth'
import corsPlugin from '@fastify/cors'
import envPlugin from '@fastify/env'
import jwtPlugin from '@fastify/jwt'
import mongodbPlugin from '@fastify/mongodb'
import multipartPlugin from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import swaggerPlugin from '@fastify/swagger'
import swaggerUIPlugin from '@fastify/swagger-ui'
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import websocketPlugin from '@fastify/websocket'
import { type ServerEnvObject, serverEnvSchema } from '@schemas'

import { DBPlugin } from '../plugins/db'
import { NodeEnvPlugin } from '../plugins/env'
import { ErrorHandlerPlugin, NotFoundHandlerPlugin } from '../plugins/errors'
import { LogPlugin } from '../plugins/log'
import { ServerFileSystem } from './ServerFileSystem'

/**
 * A class with static methods that initializes the server functions, plugins and decorators.
 */
export class ServerInit {
	/**
	 * Sets the validator and serizalizer for requests and response on the server using Zod.
	 * - - - -
	 * @param {FastifyInstance} app The Fastify instance of the server.
	 */
	static setValidatorAndSerializerCompiler(app: FastifyInstance) {
		app.setValidatorCompiler(validatorCompiler)
		app.setSerializerCompiler(serializerCompiler)
	}
	/**
	 * Initializes the server's file system.
	 */
	static async initFileSystem() {
		const serverRoot = ServerFileSystem.cwd()

		const logsDir = serverRoot.gotoDir('logs')
		if (!logsDir.exists) await logsDir.mkDir()

		const publicDir = ServerFileSystem.publicDir()
		if (!publicDir.exists) await publicDir.mkDir()

		const usersDir = publicDir.gotoDir('users')
		if (!usersDir.exists) await usersDir.mkDir()

		const artworkDir = publicDir.gotoDir('artworks')
		if (!artworkDir.exists) await artworkDir.mkDir()
	}
	/**
	 * Initializes official plugins from the Fastify ecosystem.
	 * - - - -
	 * @param {FastifyInstance} app The Fastify instance of the server.
	 */
	static async initPlugins(app: FastifyInstance): Promise<void> {
		// Official plugins
		await app.register(envPlugin, {
			dotenv: true,
			schema: serverEnvSchema,
		})
		await app.register(mongodbPlugin, {
			url: 'mongodb://localhost:27017/rockshelf',
			forceClose: true,
			ignoreUndefined: true,
		})
		await app.register(websocketPlugin)
		await app.register(jwtPlugin, {
			secret: app.getEnvs<ServerEnvObject>().JWT_SECRET,
		})
		await app.register(authPlugin)
		await app.register(multipartPlugin)
		await app.register(staticPlugin, {
			root: DirPath.of(process.cwd(), 'public').path,
			prefix: '/public',
			serve: false,
		})
		await app.register(corsPlugin, {
			// TO-DO: Change this to the real website
			origin: app.getEnvs<ServerEnvObject>().NODE_ENV === 'development' ? true : ['https://your-production-site.com'],
			methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		})
	}

	/**
	 * Initializes server-specific plugins.
	 * - - - -
	 * @param {FastifyInstance} app The Fastify instance of the server.
	 */
	static async initServerPlugins(app: FastifyInstance): Promise<void> {
		await app.register(NodeEnvPlugin)
		await app.register(ErrorHandlerPlugin)
		await app.register(NotFoundHandlerPlugin)
		await app.register(DBPlugin)
		await app.register(LogPlugin)
	}

	/**
	 * Initializes Swagger-related plugins for server API documentation.
	 * - - - -
	 * @param {FastifyInstance} app The Fastify instance of the server.
	 */
	static async initSwaggerPlugins(app: FastifyInstance): Promise<void> {
		if (app.isDev === undefined) throw new Error('Swagger Plugin init error: NodeEnvPlugin needs to be initialized, please init ServerInit.initServerPlugins() and make sure NoveEnvPlugin is initialized there')
		if (app.isDev()) {
			await app.register(swaggerPlugin, {
				openapi: {
					openapi: '3.0.0',
					info: {
						title: 'Rockshelf Music Store',
						version: '0.1.0',
						description: 'Rockshelf Music Store Server API',
					},
					servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
					tags: [
						{ name: 'Status', description: 'Endpoints related to server status testing' },
						{ name: 'Login/Register', description: 'Endpoints to register and authorize users to the system' },
						{ name: 'User (Data)', description: 'Endpoints to fetch data and content from an user (requires user ID)' },
						{ name: 'User (Methods)', description: 'Endpoints to manipulate an user entry (requires user authorization token)' },
						{ name: 'User Verification/Reset Password', description: 'Endpoints to verify users, re-send user verification e-mails and reset passwords' },
						{ name: 'Song (Data)', description: 'Endpoints to fetch data and content from a song (requires song ID)' },
						{ name: 'Song (Methods)', description: 'Endpoints to manipulate a song entry (requires user authorization token)' },
						{ name: 'Admin', description: 'Endpoints that required administrator privileges' },
					],
					components: {
						securitySchemes: {
							bearerAuth: {
								type: 'http',
								scheme: 'bearer',
								bearerFormat: 'JWT',
							},
						},
					},
				},
				transform: jsonSchemaTransform,
			})
			await app.register(swaggerUIPlugin, {
				routePrefix: '/docs',
				uiConfig: { persistAuthorization: true },
			})
		}
	}
}
