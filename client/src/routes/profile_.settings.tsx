import { createFileRoute, redirect } from '@tanstack/react-router'
import { HomeHeader } from '../components'
import { useTranslation } from 'react-i18next'
import { useServerQuery } from '../hooks/useServerQuery'
import { PageLoadComponent } from '../components/pages/PageLoadComponent'
import { useEffect, useMemo, useRef } from 'react'
import { useProfileSettingsState } from '../store/pages/profileSettings'
import { useShallow } from 'zustand/shallow'
import clsx from 'clsx'
import { TokenExpiredComponent } from '../components/pages/TokenExpiredComponent'
import { motion } from 'motion/react'
import { LoadingSpinIcon } from '../assets/icons'
import { BannedUserModalComponent } from '../components/pages/BannedUserComponent'
import { type CountryCodeWithUnselected } from 'rockshelf-core/schemas'
import { countries } from '../constants'
import { getFlagURL } from '../assets/flags'

export const Route = createFileRoute('/profile_/settings')({
	component: RouteComponent,
	beforeLoad: () => {
		const token = localStorage.getItem('token')
		if (!token) throw redirect({ to: '/' })
	},
})

function RouteComponent() {
	const { t } = useTranslation()
	const { avatarUrl, getMyUserDetails, putMyAvatar, verifyToken, deleteMyAvatar, updateMyUser, queryClient } = useServerQuery()
	const { selectedAvatar, file, country, isCountryModalOpened, hasUserDetailsChange, selAvatar, unselAvatar, setProfileSettingsState, resetProfileSettingsState } = useProfileSettingsState(useShallow((x) => x))
	const selAvatarInput = useRef<HTMLInputElement>(null)

	const selContry = useMemo(() => {
		return countries.find((val) => val.code.toLowerCase() === country) ?? { code: '', name: 'Not Specified', languages: [] }
	}, [country])

	useEffect(() => {
		return () => {
			resetProfileSettingsState()
		}
	}, [])

	useEffect(() => {
		if (putMyAvatar.data) {
			if (putMyAvatar.data.statusCode !== 200) {
				return
			}
		}
	}, [putMyAvatar.data])

	useEffect(() => {
		if (getMyUserDetails.data?.data) {
			setProfileSettingsState({ country: getMyUserDetails.data.data.user.country })
		}
	}, [getMyUserDetails.data])

	if ((verifyToken.isPending && !verifyToken.data) || (getMyUserDetails.isPending && !verifyToken.data)) return <PageLoadComponent />
	else if (verifyToken.data?.statusCode === 403) return <BannedUserModalComponent />
	else if (!verifyToken.data || verifyToken.data?.statusCode !== 200) return <TokenExpiredComponent />
	return (
		<>
			<motion.div className="absolute z-50 h-screen w-full justify-center bg-black/96 px-8 backdrop-blur-lg" initial={{ display: 'none', opacity: 0 }} animate={isCountryModalOpened ? { display: 'flex', opacity: 1 } : { display: 'none', opacity: 0 }}>
				<h1 className="mb-4 uppercase">{t('select_country')}</h1>
				<div className="h-[90%] w-full overflow-y-auto">
					{countries.map((val) => {
						return (
							<button
								type="button"
								key={`country_code_${val.code}`}
								className="itens-center mb-1 w-full flex-row! rounded-sm bg-transparent text-neutral-600 duration-100 last:mb-0 hover:bg-white/5 hover:text-neutral-400"
								onClick={(ev) => {
									ev.preventDefault()
									setProfileSettingsState({ country: val.code.toLowerCase() as CountryCodeWithUnselected, isCountryModalOpened: false, hasUserDetailsChange: true })
								}}
							>
								<img src={getFlagURL(val.code)} className="mr-2 w-9 min-w-9" />
								{val.name}
							</button>
						)
					})}
				</div>
			</motion.div>
			<section>
				<HomeHeader />
				<div className="mt-6 px-3">
					<div className="mb-2 w-full flex-row! items-center border-b border-neutral-700 pb-1">
						<h1 className="mr-auto uppercase">{t('user_details')}</h1>
						{hasUserDetailsChange && (
							<button
								type="button"
								className="flex-row! items-center rounded-sm border border-neutral-700 p-1 text-xs font-bold text-neutral-500 uppercase duration-100 hover:border-neutral-600 hover:text-neutral-300"
								onClick={(ev) => {
									ev.preventDefault()
									updateMyUser.mutate({ country })
									setProfileSettingsState({ hasUserDetailsChange: false })
								}}
							>
								<motion.div initial={{ opacity: 0, width: '0', scaleX: 0 }} animate={updateMyUser.isPending ? { opacity: 1, width: 'auto', scaleX: 1 } : { opacity: 0, width: '0', scaleX: 0 }} className="origin-left">
									<LoadingSpinIcon className="mr-2 animate-spin" />
								</motion.div>
								<p>{t('save_settings')}</p>
							</button>
						)}
					</div>

					<div className="mb-1 flex-row! items-center">
						<label className="mr-auto">{t('username')}</label>
						<p>{getMyUserDetails.data?.data?.user.username}</p>
					</div>

					<div className="mb-6 flex-row! items-center">
						<label className="mr-auto">{t('country')}</label>
						<button
							type="button"
							className="flex-row! items-center"
							onClick={(ev) => {
								ev.preventDefault()
								setProfileSettingsState({ isCountryModalOpened: true })
							}}
						>
							{country !== '' && <img className="mr-2 w-9 min-w-9" src={getFlagURL(country)} />}
							<p className={clsx(!selContry.code && 'text-neutral-400 italic')}>{selContry.name}</p>
						</button>
					</div>
					<h1 className="mb-2 border-b border-neutral-700 pb-1 uppercase">{t('login_details')}</h1>
					<form className="mb-6">
						<div className="mb-1 flex-row! items-center">
							<h3 className="mr-auto">{t('email')}</h3>
							<p>{getMyUserDetails.data?.data?.user.email}</p>
						</div>
						{!getMyUserDetails.data?.data?.user.verified && <p className="mb-4 text-xs text-red-600 italic">{t('email_not_verified_text')}</p>}
					</form>

					<div className="mb-2 w-full flex-row! items-center border-b border-neutral-700 pb-1">
						<h1 className="mr-auto uppercase">{t('avatar')}</h1>
						{selectedAvatar && (
							<button
								type="button"
								className="flex-row! items-center rounded-sm border border-neutral-700 p-1 text-xs font-bold text-neutral-500 uppercase duration-100 hover:border-neutral-600 hover:text-neutral-300"
								onClick={(ev) => {
									ev.preventDefault()
									if (file) {
										const formData = new FormData()
										formData.append('avatar', file)
										putMyAvatar.mutate(formData)
										unselAvatar()
									}
								}}
							>
								<motion.div initial={{ opacity: 0, width: '0', scaleX: 0 }} animate={putMyAvatar.isPending ? { opacity: 1, width: 'auto', scaleX: 1 } : { opacity: 0, width: '0', scaleX: 0 }} className="origin-left">
									<LoadingSpinIcon className="mr-2 animate-spin" />
								</motion.div>
								<p>{t('save_settings')}</p>
							</button>
						)}
					</div>

					<form encType="multipart/form-data" className="mb-6 flex-row!">
						<div className="w-fit">
							<img src={avatarUrl} className="mr-2 h-24 min-h-24 w-24 min-w-24 rounded-full" />
							{selectedAvatar && <img src={selectedAvatar} className="absolute right-0 bottom-0 mr-2 h-8 min-h-8 w-8 min-w-8 rounded-full" />}
						</div>
						<div>
							<input
								hidden
								type="file"
								accept="image/*"
								onChange={(ev) => {
									if (ev.target.files) selAvatar(ev.target.files[0])
								}}
								ref={selAvatarInput}
							/>
							<p className={clsx('mb-2', file ? '' : 'text-neutral-700 italic')}>{file?.name || t('no_file_selected')}</p>
							<button
								className="mb-2 rounded-sm border border-neutral-700 p-1 text-xs font-bold text-neutral-500 uppercase duration-100 hover:border-neutral-600 hover:text-neutral-300"
								type="button"
								onClick={(ev) => {
									ev.preventDefault()
									if (selAvatarInput.current) {
										selAvatarInput.current.click()
									}
								}}
							>
								{t('select_avatar')}
							</button>
							{(getMyUserDetails.data?.data?.user.avatarVer ?? 0) > 0 && (
								<button
									className="rounded-sm border border-red-700 p-1 text-xs font-bold text-red-700 uppercase duration-100 hover:border-red-600 hover:text-red-500"
									type="button"
									onClick={(ev) => {
										ev.preventDefault()
										deleteMyAvatar.mutate()
										queryClient.invalidateQueries({ queryKey: ['me'] })
									}}
								>
									{t('remove_avatar')}
								</button>
							)}
						</div>
					</form>
				</div>
			</section>
		</>
	)
}
