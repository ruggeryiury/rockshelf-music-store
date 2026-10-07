import { useTranslation } from 'react-i18next'
import { useServerQuery } from '../hooks/useServerQuery'
import { create } from 'zustand/react'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/shallow'
import { motion } from 'motion/react'
import { CloseTabIcon, SearchIcon } from '../assets/icons'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { rockshelfIcon } from '../assets/images'

export interface HomeHeaderStateProps {
	isMenuOpened: boolean
	isSearchMenuOpened: boolean
}

export interface HomeHeaderStateActions {
	/**
	 * Sets new values to the state.
	 * - - - -
	 * @param {Partial<HomeHeaderStateProps> | ((oldState: HomeHeaderStateProps) => Partial<HomeHeaderStateProps>)} state The new state values or a function that receives the old state and returns the new state values.
	 */
	setHomeHeaderState(state: Partial<HomeHeaderStateProps> | ((oldState: HomeHeaderStateProps) => Partial<HomeHeaderStateProps>)): void
	/**
	 * Retrieves the values of the entire state, excluding its own functions.
	 * - - - -
	 * @returns {HomeHeaderStateProps}
	 */
	getHomeHeaderState(): HomeHeaderStateProps
	/**
	 * Resets the state to its default values.
	 */
	resetHomeHeaderState(): void
}

export type HomeHeaderStateHook = HomeHeaderStateProps & HomeHeaderStateActions

const defaultState: HomeHeaderStateProps = {
	isMenuOpened: false,
	isSearchMenuOpened: false,
}

export const useHomeHeaderState = create<HomeHeaderStateHook>()(
	immer((set, get) => ({
		...defaultState,
		setHomeHeaderState(state) {
			if (typeof state === 'function') return set((s) => state(s))
			return set(() => state)
		},
		getHomeHeaderState() {
			const state = get()
			const map = new Map<keyof HomeHeaderStateProps, unknown>()
			for (const key of Object.keys(state) as (keyof HomeHeaderStateHook)[]) {
				if (typeof state[key] === 'function') continue
				else map.set(key as keyof HomeHeaderStateProps, state[key])
			}

			return Object.fromEntries(map.entries()) as Record<keyof HomeHeaderStateProps, unknown> as HomeHeaderStateProps
		},
		resetHomeHeaderState() {
			return set(() => defaultState)
		},
	})),
)

export function HomeHeader() {
	const { avatarUrl, getMyUserDetails, removeToken } = useServerQuery()
	const { t } = useTranslation()
	const { isMenuOpened, isSearchMenuOpened, setHomeHeaderState, resetHomeHeaderState } = useHomeHeaderState(useShallow((x) => x))
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const location = useLocation()
	console.log(location)
	return (
		<>
			<motion.div initial={{ left: '100%' }} animate={isSearchMenuOpened ? { left: '0' } : { left: '100%' }} className="absolute z-2 h-screen w-full flex-row! bg-black/90 p-8 backdrop-blur-lg"></motion.div>
			<motion.div initial={{ left: '100%' }} animate={isMenuOpened ? { left: '0' } : { left: '100%' }} className="absolute z-1 h-screen w-full flex-row! bg-black/90 p-8 backdrop-blur-lg">
				<div className="mr-auto w-fit">
					<div className="mb-4 flex-row! items-center">
						<img src={avatarUrl} className="mr-2 h-12 min-h-12 w-12 min-w-12 rounded-full border border-neutral-500" />
						<div>
							{getMyUserDetails.data?.data && (
								<>
									<h1 className="text-xl">{getMyUserDetails.data.data.user.username}</h1>
								</>
							)}
						</div>
					</div>
					<nav
						className="cursor-pointer underline-offset-2 hover:underline"
						onClick={() => {
							navigate({ to: '/songs/register' })
							resetHomeHeaderState()
						}}
					>
						{t('upload_new_song')}
					</nav>
					<nav
						className="cursor-pointer underline-offset-2 hover:underline"
						onClick={() => {
							navigate({ to: '/profile/settings' })
							resetHomeHeaderState()
						}}
					>
						{t('profile_settings')}
					</nav>
					<nav
						className="cursor-pointer underline-offset-2 hover:underline"
						onClick={() => {
							removeToken()
							queryClient.invalidateQueries({ queryKey: ['me'] })
							navigate({ to: '/' })
							resetHomeHeaderState()
						}}
					>
						{t('logout')}
					</nav>
				</div>
				<div className="w-fit">
					<button className="mb-1 h-fit w-fit last:mb-0 hover:text-neutral-200" onClick={() => setHomeHeaderState((prev) => ({ isMenuOpened: !prev.isMenuOpened }))}>
						<CloseTabIcon className="text-2xl" />
					</button>
					<button className="mb-1 h-fit w-fit last:mb-0 hover:text-neutral-200" onClick={() => setHomeHeaderState((prev) => ({ isSearchMenuOpened: !prev.isSearchMenuOpened }))}>
						<SearchIcon className="text-2xl" />
					</button>
				</div>
			</motion.div>
			<header className="flex-row! items-center bg-neutral-800 px-3 py-2">
				<button
					type="button"
					className="font-pentatonic flex-row! items-center uppercase"
					onClick={() => {
						navigate({ to: '/home' })
					}}
				>
					<img src={rockshelfIcon} className="mr-2 w-8 min-w-8" />
					{t('rockshelf')}
				</button>
				<img onClick={() => setHomeHeaderState((prev) => ({ isMenuOpened: !prev.isMenuOpened }))} src={avatarUrl} className="ml-auto h-8 min-h-8 w-8 min-w-8 cursor-pointer rounded-full border border-transparent duration-200 hover:border-neutral-300" />
			</header>
		</>
	)
}
