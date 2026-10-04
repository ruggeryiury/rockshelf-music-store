import { create } from 'zustand/react'
import { immer } from 'zustand/middleware/immer'

export interface RegisterStateProps {
	showPassword: boolean
	lastUsernameError: string
	lastEmailError: string
	lastPasswordError: string
	showSuccessModal: boolean
}

export interface RegisterStateActions {
	/**
	 * Sets new values to the state.
	 * - - - -
	 * @param {Partial<RegisterStateProps> | ((oldState: RegisterStateProps) => Partial<RegisterStateProps>)} state The new state values or a function that receives the old state and returns the new state values.
	 */
	setRegisterState(state: Partial<RegisterStateProps> | ((oldState: RegisterStateProps) => Partial<RegisterStateProps>)): void
	/**
	 * Retrieves the values of the entire state, excluding its own functions.
	 * - - - -
	 * @returns {RegisterStateProps}
	 */
	getRegisterState(): RegisterStateProps
	/**
	 * Resets the state to its default values.
	 */
	resetRegisterState(): void
}

export type RegisterStateHook = RegisterStateProps & RegisterStateActions

const defaultState: RegisterStateProps = {
	showPassword: false,
	lastUsernameError: '',
	lastEmailError: '',
	lastPasswordError: '',
	showSuccessModal: false,
}

export const useRegisterState = create<RegisterStateHook>()(
	immer((set, get) => ({
		...defaultState,
		setRegisterState(state) {
			if (typeof state === 'function') return set((s) => state(s))
			return set(() => state)
		},
		getRegisterState() {
			const state = get()
			const map = new Map<keyof RegisterStateProps, unknown>()
			for (const key of Object.keys(state) as (keyof RegisterStateHook)[]) {
				if (typeof state[key] === 'function') continue
				else map.set(key as keyof RegisterStateProps, state[key])
			}

			return Object.fromEntries(map.entries()) as Record<keyof RegisterStateProps, unknown> as RegisterStateProps
		},
		resetRegisterState() {
			return set(() => defaultState)
		},
	})),
)
