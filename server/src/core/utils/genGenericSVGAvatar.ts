import { pentatonicFont } from './base64'

/**
 * Generates a generic avatar image for users that don't have an avatar uploaded and returns a SVG XML structure as string.
 * - - - -
 * @param {string} letter The letter you want to display.
 * @param {number} size The rendering size of the SVG image.
 * @returns {string}
 */
export const genGenericSVGAvatar = (letter: string, size: number): string => {
	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><defs><style>
  @font-face {
    font-family: 'Pentatonic';
    src: url('data:font/woff2;charset=utf-8;base64,${pentatonicFont}') format('woff2');
  }
    </style></defs><rect x="0" y="0" width="${size}" height="${size}" rx="${Math.floor(size / 8)}" ry="${Math.floor(size / 8)}" fill="#111" /><text x="${Math.floor(size / 2)}" y="${Math.floor(size / 2)}" text-anchor="middle" dominant-baseline="central" fill="#DDD" font-family="Pentatonic, sans-serif" font-size="${Math.floor(size / 1.5)}">${letter.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')}</text></svg>`
}
