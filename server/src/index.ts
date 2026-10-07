import Fastify, { LogController } from 'fastify'

import { type ZodTypeProvider } from '@fastify/type-provider-zod'

import { LogAPI } from './core/api/LogAPI'
import { ServerInit } from './core/api/ServerInit'
import { AdminRoute } from './routes/admin'
import { SongRoute } from './routes/songs'
import { StatusRoute } from './routes/status'
import { UserRoute } from './routes/users'

export const app = Fastify({ logController: new LogController({ disableRequestLogging: true }) }).withTypeProvider<ZodTypeProvider>()
ServerInit.setValidatorAndSerializerCompiler(app)

await ServerInit.initFileSystem()
await ServerInit.initPlugins(app)
await ServerInit.initServerPlugins(app)
await ServerInit.initSwaggerPlugins(app)

// Routes
await app.register(UserRoute)
await app.register(StatusRoute)
await app.register(AdminRoute)
await app.register(SongRoute)

try {
	await app.ready()

	LogAPI.log(LogAPI.chalk.italic('Rockshelf v0.0.1'))
	const isDev = app.isDev()

	const localHostPort = await app.listen({ port: app.env.PORT, host: isDev ? '0.0.0.0' : 'localhost' })
	await LogAPI.logServerStart(app, localHostPort)
} catch (err) {
	app.log.error(err)
	process.exit(1)
}

process.on('SIGINT', () => {
	app.close()
})
