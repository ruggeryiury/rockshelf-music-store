import { create } from 'zustand/react'
import { immer } from 'zustand/middleware/immer'

export interface SongRegisterStateProps {
	selectedPackageFile: File | null
}

export interface SongRegisterStateActions {
	/**
	 * Sets new values to the state.
	 * - - - -
	 * @param {Partial<SongRegisterStateProps> | ((oldState: SongRegisterStateProps) => Partial<SongRegisterStateProps>)} state The new state values or a function that receives the old state and returns the new state values.
	 */
	setSongRegisterState(state: Partial<SongRegisterStateProps> | ((oldState: SongRegisterStateProps) => Partial<SongRegisterStateProps>)): void
	/**
	 * Retrieves the values of the entire state, excluding its own functions.
	 * - - - -
	 * @returns {SongRegisterStateProps}
	 */
	getSongRegisterState(): SongRegisterStateProps
	/**
	 * Resets the state to its default values.
	 */
	resetSongRegisterState(): void
}

export type SongRegisterStateHook = SongRegisterStateProps & SongRegisterStateActions

const defaultState: SongRegisterStateProps = {
	selectedPackageFile: null,
}

export const useSongRegisterState = create<SongRegisterStateHook>()(
	immer((set, get) => ({
		...defaultState,
		setSongRegisterState(state) {
			if (typeof state === 'function') return set((s) => state(s))
			return set(() => state)
		},
		getSongRegisterState() {
			const state = get()
			const map = new Map<keyof SongRegisterStateProps, unknown>()
			for (const key of Object.keys(state) as (keyof SongRegisterStateHook)[]) {
				if (typeof state[key] === 'function') continue
				else map.set(key as keyof SongRegisterStateProps, state[key])
			}

			return Object.fromEntries(map.entries()) as Record<keyof SongRegisterStateProps, unknown> as SongRegisterStateProps
		},
		resetSongRegisterState() {
			return set(() => defaultState)
		},
	})),
)
