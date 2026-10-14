import { DirPath, FilePath } from 'node-lib'
import { type FileOptions, temporaryFile } from 'tempy'

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
	 * - - - -
	 * @returns {DirPath}
	 */
	static publicDir = (): DirPath => DirPath.of(process.cwd(), 'public')
	/**
	 * The directory path of the server's album artwork directory.
	 * - - - -
	 * @returns {DirPath}
	 */
	static artworksDir = (): DirPath => DirPath.of(process.cwd(), 'public/artworks')
	/**
	 * The directory path of the server's temp directory.
	 * - - - -
	 * @returns {DirPath}
	 */
	static tempDir = (): DirPath => DirPath.of(process.cwd(), 'temp')
	/**
	 * The directory path of the server's binary file directory.
	 * - - - -
	 * @returns {DirPath}
	 */
	static binDir = (): DirPath => DirPath.of(process.cwd(), 'src/bin')
	/**
	 * Get a temporary file path you can write to and returns a `FilePath` instance pointing to the temporary file path.
	 * - - - -
	 * @param {FileOptions | undefined} [options] `OPTIONAL` An object with values that tweaks the temporary file naming process.
	 * @returns {FilePath}
	 */
	static tempFile = (options?: FileOptions): FilePath => FilePath.of(temporaryFile({ rootDirectory: DirPath.of(process.cwd(), 'temp').path, ...options }))
	/**
	 * Returns a free file path on the server's log folder to save `stdout` from the server.
	 * - - - -
	 * @returns {DirPath}
	 */
	static newLogFilename = (): FilePath => FilePath.of(process.cwd(), `logs/server-log-${new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-').replace('Z', '')}.log`)
}
