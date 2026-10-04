import { DirPath, FilePath } from 'node-lib'

/**
 * A class with static methods to initialize the server's file system, along with mounting paths for specific files on the file system.
 */
export class ServerFileSystem {
	/**
	 * The directory path of the server's current working directory.
	 * - - - -
	 * @returns {DirPath}
	 */
	static cwd = (): DirPath => DirPath.of(process.cwd())
	/**
	 * The directory path of the server's public directory.
	 * @returns {DirPath}
	 */
	static publicDir = (): DirPath => DirPath.of(process.cwd(), 'public')
	static newLogFilename = (): FilePath => FilePath.of(process.cwd(), `logs/server-log-${new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-').replace('Z', '')}.log`)
}
