import { create } from 'zustand/react'
import { immer } from 'zustand/middleware/immer'

export interface IndexStateProps {
	showPassword: boolean
	lastEmailError: string
	lastPasswordError: string
	lastRequestError: string
}

export interface IndexStateActions {
	/**
	 * Sets new values to the state.
	 * - - - -
	 * @param {Partial<IndexStateProps> | ((oldState: IndexStateProps) => Partial<IndexStateProps>)} state The new state values or a function that receives the old state and returns the new state values.
	 */
	setIndexState(state: Partial<IndexStateProps> | ((oldState: IndexStateProps) => Partial<IndexStateProps>)): void
	/**
	 * Retrieves the values of the entire state, excluding its own functions.
	 * - - - -
	 * @returns {IndexStateProps}
	 */
	getIndexState(): IndexStateProps
	/**
	 * Resets the state to its default values.
	 */
	resetIndexState(): void
}

export type IndexStateHook = IndexStateProps & IndexStateActions

const defaultState: IndexStateProps = {
	showPassword: false,
	lastEmailError: '',
	lastPasswordError: '',
	lastRequestError: '',
}

export const useIndexState = create<IndexStateHook>()(
	immer((set, get) => ({
		...defaultState,
		setIndexState(state) {
			if (typeof state === 'function') return set((s) => state(s))
			return set(() => state)
		},
		getIndexState() {
			const state = get()
			const map = new Map<keyof IndexStateProps, unknown>()
			for (const key of Object.keys(state) as (keyof IndexStateHook)[]) {
				if (typeof state[key] === 'function') continue
				else map.set(key as keyof IndexStateProps, state[key])
			}

			return Object.fromEntries(map.entries()) as Record<keyof IndexStateProps, unknown> as IndexStateProps
		},
		resetIndexState() {
			return set(() => defaultState)
		},
	})),
)
