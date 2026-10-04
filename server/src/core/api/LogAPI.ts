import chalk from 'chalk'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { StreamWriter } from 'node-lib'
import os from 'node:os'
import type { Primitive } from 'type-fest'

import { type GenericServerResponse, type ServerEnvObject } from '@schemas'
import { decodeChalkString, stripSurroundingQuotes } from '@utils/string'

import { ServerFileSystem } from './ServerFileSystem'

export interface LogData {
	time: number
	msg: string
	pid: number
	hostname: string
	v: number
}

/**
 * A class with static methods related to logging.
 */
export class LogAPI {
	/**
	 * The WriteStream instance of the log file reader.
	 *
	 * Logging is only enabled when setting the `SERVER_LOG` env variable to `true`.
	 */
	static logFile: StreamWriter | undefined

	/**
	 * Initializes the server logging if enabled.
	 * - - - -
	 * @param {FastifyInstance} app The Fastify instance of the server.
	 */
	static async init(app: FastifyInstance): Promise<void> {
		if (app.env.SERVER_LOG) {
			this.logFile = await StreamWriter.toFile(ServerFileSystem.newLogFilename())
		}
	}

	static async logServerStart(app: FastifyInstance, localHostPort: string) {
		const env = app.getEnvs<ServerEnvObject>()
		if (env.NODE_ENV === 'production') {
			LogAPI.log(localHostPort)
		} else {
			LogAPI.log(LogAPI.getNetInterfacePort(app))
			LogAPI.log('Server running in development mode\n')

			LogAPI.log(LogAPI.chalk.blue('Server environment variables'))
			LogAPI.logObject(env)
			LogAPI.log()

			const usersCount = await app.db.users.countDocuments()
			LogAPI.log(LogAPI.chalk.blue('Server status:'))
			LogAPI.logObject({ 'Users Count': usersCount })
			LogAPI.log()
		}
	}
	/**
	 * Closes the server logging file stream.
	 */
	static async closeLogStream(): Promise<void> {
		if (this.logFile) await this.logFile.close()
	}
	/**
	 * An object cointaining methods to stylize the logging messages.
	 */
	static chalk = chalk.bind(chalk)

	/**
	 * Retrieve the local internet url of the server.
	 * - - - -
	 * @param {FastifyInstance} app The Fastify instance of the server.
	 * @returns {string}
	 */
	static getNetInterfacePort(app: FastifyInstance): string {
		let url: string = ''
		const interfaces = os.networkInterfaces()

		const ips = Object.values(interfaces)
			.flatMap((addresses) => addresses ?? [])
			.filter((address) => address.family === 'IPv4' && !address.internal)
			.map((address) => address.address)

		for (const ip of ips) {
			url = `http://${ip}:${app.env.PORT}`
		}

		return url
	}

	/**
	 * Generates a log data object containing information about the time and the machine which the logging were summoned.
	 * - - - -
	 * @param {string | undefined} [msg] `OPTIONAL` The message that will be embed to the log data object.
	 * @returns {LogData}
	 */
	static genLogData(msg: string = ''): LogData {
		return {
			time: Date.now(),
			msg,
			pid: process.pid,
			hostname: os.hostname(),
			v: 1,
		}
	}

	/**
	 * Alias to `console.log()`.
	 * - - - -
	 * @param {any[]} items The items you want to log.
	 */
	static log(...items: any[]): void {
		if (this.logFile) this.logFile.writeUTF8(`${stripSurroundingQuotes(decodeChalkString(JSON.stringify(items.join(' '))))}\n`)
		console.log(...items)
	}

	/**
	 * Alias to `console.error()`.
	 * - - - -
	 * @param {any[]} items The items you want to log.
	 */
	static error(...items: any[]): void {
		if (this.logFile) this.logFile.writeUTF8(stripSurroundingQuotes(decodeChalkString(JSON.stringify(items.join(' ')))))
		console.error(...items)
	}

	/**
	 * Logs primitive values with highlighted values.
	 * - - - -
	 * @param val The value you want to log.
	 */
	private static logPrimitive(val: Primitive): void {
		switch (typeof val) {
			case 'string':
				this.log(this.chalk.green(val))
				break
			case 'boolean':
			case 'undefined':
				this.log(this.chalk.yellow(val))
				break
			case 'number':
			case 'bigint':
				this.log(this.chalk.cyan(val))
				break
			case 'symbol':
				this.log(this.chalk.magenta(val))
				break
			default:
				this.logObject(val)
				break
		}
	}

	/**
	 * Pretty log objects and its values. Works better with flat objects (without nested objects).
	 * - - - -
	 * @param obj The value you want to log.
	 */
	static logObject(obj: unknown): void {
		switch (typeof obj) {
			case 'object': {
				if (Array.isArray(obj)) this.log(obj)
				else if (obj === null) this.log(this.chalk.yellow('null'))
				else {
					const keys = Object.keys(obj).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
					for (const key of keys) {
						const val = obj[key as keyof typeof obj]
						process.stdout.write(`${key}: `)
						if (this.logFile) this.logFile.writeUTF8(`${key}: `)
						this.logPrimitive(val)
					}
				}
				break
			}
		}
	}

	static logResponse(req: FastifyRequest, responseData: GenericServerResponse & { [k: string]: unknown }): void {
		const data = this.genLogData()
		const date = new Date(data.time)

		this.log(`${this.chalk.gray(req.method)} ${req.url} (${req.id.toUpperCase()})`)
		this.log(`${this.chalk.magenta(`[${date.toLocaleString()}]`)} [${responseData.statusCode < 400 ? this.chalk.green(`${responseData.statusCode.toString()} ${responseData.statusName}`) : this.chalk.red(`${responseData.statusCode.toString()} ${responseData.statusName}`)}] ${responseData.message}`)
		this.log(responseData.code)
		if (responseData.data) console.dir(JSON.parse(JSON.stringify(responseData.data)))
		this.log()
	}
}
