import { create } from 'zustand/react'
import { immer } from 'zustand/middleware/immer'
import type { CountryCodeWithUnselected } from 'rockshelf-core/schemas'

export interface ProfileSettingsStateProps {
	selectedAvatar: string | null
	file: File | null
	country: CountryCodeWithUnselected
	isCountryModalOpened: boolean
	hasUserDetailsChange: boolean
}

export interface ProfileSettingsStateActions {
	/**
	 * Sets new values to the state.
	 * - - - -
	 * @param {Partial<ProfileSettingsStateProps> | ((oldState: ProfileSettingsStateProps) => Partial<ProfileSettingsStateProps>)} state The new state values or a function that receives the old state and returns the new state values.
	 */
	setProfileSettingsState(state: Partial<ProfileSettingsStateProps> | ((oldState: ProfileSettingsStateProps) => Partial<ProfileSettingsStateProps>)): void
	/**
	 * Retrieves the values of the entire state, excluding its own functions.
	 * - - - -
	 * @returns {ProfileSettingsStateProps}
	 */
	getProfileSettingsState(): ProfileSettingsStateProps
	/**
	 * Resets the state to its default values.
	 */
	resetProfileSettingsState(): void

	selAvatar(file: File): void
	unselAvatar(): void
}

export type ProfileSettingsStateHook = ProfileSettingsStateProps & ProfileSettingsStateActions

const defaultState: ProfileSettingsStateProps = {
	selectedAvatar: null,
	file: null,
	country: '',
	isCountryModalOpened: false,
	hasUserDetailsChange: false,
}

export const useProfileSettingsState = create<ProfileSettingsStateHook>()(
	immer((set, get) => ({
		...defaultState,
		setProfileSettingsState(state) {
			if (typeof state === 'function') return set((s) => state(s))
			return set(() => state)
		},
		getProfileSettingsState() {
			const state = get()
			const map = new Map<keyof ProfileSettingsStateProps, unknown>()
			for (const key of Object.keys(state) as (keyof ProfileSettingsStateHook)[]) {
				if (typeof state[key] === 'function') continue
				else map.set(key as keyof ProfileSettingsStateProps, state[key])
			}

			return Object.fromEntries(map.entries()) as Record<keyof ProfileSettingsStateProps, unknown> as ProfileSettingsStateProps
		},
		resetProfileSettingsState() {
			return set(() => defaultState)
		},

		selAvatar(file) {
			set((state) => {
				if (state.selectedAvatar) URL.revokeObjectURL(state.selectedAvatar)
				return { selectedAvatar: URL.createObjectURL(file), file }
			})
		},
		unselAvatar() {
			set((state) => {
				if (state.selectedAvatar) URL.revokeObjectURL(state.selectedAvatar)
				return { selectedAvatar: null, file: null }
			})
		},
	})),
)
