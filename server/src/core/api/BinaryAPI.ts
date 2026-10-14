import { FilePath, type FilePathLikeTypes, pathLikeToFilePath, spawnAsync } from 'node-lib'
import type { SpawnOptionsWithoutStdio } from 'node:child_process'
import { platform } from 'node:os'

import { ServerFileSystem } from './ServerFileSystem'

export interface OGGEncodingOptions {
	/**
	 * Specify quality, between `-1` (very low) and `10` (very high), instead of specifying a particular bitrate. Fractional qualities (e.g. `2.75`) are permitted. Default is `3`.
	 */
	quality: number
}

export interface BuiltSpawnCmdObject {
	/**
	 * The command you want to execute, might be the provided `exeName` argument, or `'wine'` in Linux environments.
	 */
	command: string
	/**
	 * An array of strings that will be passed as arguments for the spawn process.
	 */
	args: string[]
	/**
	 * An object with options to the spawn process.
	 */
	options: SpawnOptionsWithoutStdio
}

/**
 * A class with APIs to use RBTools executables.
 */
export class BinaryAPI {
	static buildSpawnCommand(exeName: string, args: string[]): BuiltSpawnCmdObject {
		let command = ''
		const commandArgs: string[] = []
		const env = { ...process.env, WINEDEBUG: '-all' }

		if (platform() === 'linux') {
			command = 'wine'
			commandArgs.push(exeName)
		} else command = exeName

		commandArgs.push(...args)

		return { command, args: commandArgs, options: { env, cwd: ServerFileSystem.binDir().path, windowsHide: true } }
	}
	/**
	 * Executes the NVIDIA Texture Tools.
	 *
	 * _NVIDIA Texture Tools converts TGA image files to DDS image files._
	 * - - - -
	 * @param {FilePathLikeTypes} srcFile The path to the TGA image file to be converted.
	 * @param {FilePathLikeTypes} destPath The path to the new DDS image file.
	 * @returns {Promise<FilePath>}
	 */
	static async nvCompress(srcFile: FilePathLikeTypes, destPath: FilePathLikeTypes): Promise<FilePath> {
		const src = pathLikeToFilePath(srcFile)
		const dest = pathLikeToFilePath(destPath)

		const exeName = ServerFileSystem.binDir().gotoFile('nvcompress.exe').fullname
		const rawArgs: string[] = ['-nocuda', '-bc3', src.path, dest.path]
		const { command, args, options } = this.buildSpawnCommand(exeName, rawArgs)
		const { code, stderr } = await spawnAsync(command, args, options)
		if (code !== 0) throw new Error(stderr.trim())
		return dest
	}
}
