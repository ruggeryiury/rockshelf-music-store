import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useServerQuery } from '../hooks/useServerQuery'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userLoginBodySchema, userRegisterBodySchema } from 'rockshelf-core/schemas'
import { useShallow } from 'zustand/shallow'
import { EyesOffIcon, EyesOnIcon, LoadingSpinIcon } from '../assets/icons'
import { useEffect } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { TransComponent } from '../app/locale/TransComponent'
import { rockshelfIcon } from '../assets/images'
import { useRegisterState } from '../store/pages/register'

export const Route = createFileRoute('/register')({
	component: RouteComponent,
	beforeLoad: async () => {
		const token = localStorage.getItem('token')
		if (token) throw redirect({ to: '/home' })
	},
})

function RouteComponent() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { showPassword, lastUsernameError, lastEmailError, lastPasswordError, showSuccessModal, setRegisterState, resetRegisterState } = useRegisterState(useShallow((x) => x))
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(
			userRegisterBodySchema.extend({
				password: userLoginBodySchema.shape.password.refine((val) => /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*(),.?":{}|<>_-]/.test(val)),
			}),
		),
	})
	const {
		register: { mutate, data: registerData, status, error: fetchError, reset },
	} = useServerQuery()

	useEffect(() => {
		return () => {
			resetRegisterState()
		}
	}, [])

	useEffect(() => {
		if (errors.username) setRegisterState({ lastUsernameError: `error_username_${errors.username.type}` })
		if (errors.email) setRegisterState({ lastEmailError: `error_email_${errors.email.type}` })
		if (errors.password) setRegisterState({ lastPasswordError: `error_password_${errors.password.type}` })
	}, [errors, setRegisterState])

	useEffect(() => {
		const timeouts: number[] = []
		if (fetchError) {
			const t1 = setTimeout(() => {
				reset()
			}, 5000)
			timeouts.push(t1)
		}

		return () => {
			for (const timeout of timeouts) clearTimeout(timeout)
		}
	}, [fetchError, reset])

	useEffect(() => {
		if (registerData) {
			if (registerData.statusCode !== 201) {
				if (registerData.code === 'DUPLICATED_USERNAME') {
					setRegisterState({ lastUsernameError: registerData.code.toLowerCase() })
					setError('username', new Error(), { shouldFocus: true })
				} else if (registerData.code === 'DUPLICATED_EMAIL') {
					setRegisterState({ lastEmailError: registerData.code.toLowerCase() })
					setError('email', new Error(), { shouldFocus: true })
				} else if (registerData.code === 'USER_LOGIN_WRONG_CREDENTIALS') {
					setRegisterState({ lastPasswordError: registerData.code.toLowerCase() })
					setError('password', new Error(), { shouldFocus: true })
				}
				return
			}

			setRegisterState({ showSuccessModal: true })
			return
		}
	}, [registerData, setError, setRegisterState, navigate])

	return (
		<>
			<motion.div initial={{ opacity: 0, display: 'none' }} animate={showSuccessModal ? { opacity: 1, display: 'flex' } : { opacity: 0, display: 'none' }} className="absolute z-1 h-screen w-full items-center justify-center bg-black/90 p-8 text-center backdrop-blur-lg">
				<h1 className="mb-1 text-3xl uppercase">{t('register_success_title')}</h1>
				<p className="mb-4">{t('register_success_desc')}</p>
				<button
					type="button"
					className="font-pentatonic rounded-sm border border-neutral-500 p-1 text-neutral-500 uppercase duration-100 hover:border-neutral-300 hover:text-neutral-300"
					onClick={() => {
						navigate({ to: '/' })
						resetRegisterState()
					}}
				>
					{t('goto_login')}
				</button>
			</motion.div>
			<section className="h-screen w-full items-center justify-center px-6">
				<img src={rockshelfIcon} width={48} className="mb-1" />
				<h1 className="mb-4 uppercase">{t('title')}</h1>
				<div className="rounded-sm bg-linear-0 from-neutral-300 to-neutral-400 p-4 text-neutral-800">
					<h1 className="uppercase">{t('register')}</h1>
					<h2>{t('register_desc')}</h2>
					<div className="my-2 h-0.5 w-full bg-neutral-800" />
					<form
						onSubmit={handleSubmit(async (data) => {
							mutate(data)
						})}
					>
						<label htmlFor="username" className="mb-1 text-xs font-bold uppercase">
							{t('username')}
						</label>
						<input type="text" {...register('username')} className={clsx('mb-2 rounded-sm border p-1 duration-200', errors.username ? 'border-red-500 hover:border-red-600 focus:border-red-700' : 'border-neutral-500 hover:border-neutral-600 focus:border-neutral-700')} />

						<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={errors.username ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
							<p className="text-xs text-red-600">{t(lastUsernameError)}</p>
							<div className="mb-2" />
						</motion.div>

						<label htmlFor="email" className="mb-1 text-xs font-bold uppercase">
							{t('email')}
						</label>
						<input type="email" {...register('email')} className={clsx('mb-2 rounded-sm border p-1 duration-200', errors.email ? 'border-red-500 hover:border-red-600 focus:border-red-700' : 'border-neutral-500 hover:border-neutral-600 focus:border-neutral-700')} />

						<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={errors.email ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
							<p className="text-xs text-red-600">{t(lastEmailError)}</p>
							<div className="mb-2" />
						</motion.div>

						<label htmlFor="password" className="mb-1 text-xs font-bold uppercase">
							{t('password')}
						</label>
						<div className="mb-2 flex-row! items-center">
							<input type={showPassword ? 'text' : 'password'} {...register('password')} className={clsx('mr-2 w-full rounded-sm border p-1 duration-200', errors.password ? 'border-red-500 hover:border-red-600 focus:border-red-700' : 'border-neutral-500 hover:border-neutral-600 focus:border-neutral-700')} />
							<button
								type="button"
								className="h-full w-fit justify-center rounded-sm border border-neutral-500 px-2 text-xl duration-200 hover:border-neutral-600 focus:border-neutral-700"
								onClick={(ev) => {
									ev.preventDefault()
									setRegisterState((prev) => ({ showPassword: !prev.showPassword }))
								}}
							>
								{!showPassword ? <EyesOnIcon /> : <EyesOffIcon />}
							</button>
						</div>

						<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={errors.password ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
							<p className="text-xs text-red-600">{t(lastPasswordError)}</p>
							<div className="mb-2" />
						</motion.div>
						<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={fetchError ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
							<p className="text-xs">{t('cant_connect_error')}</p>
							<div className="h-2 w-full" />
						</motion.div>
						<div className="flex-row! items-center">
							<button type="submit" className="mr-2 flex-row! items-center rounded-sm border border-neutral-500 bg-transparent p-1 font-semibold uppercase duration-200 hover:border-neutral-600 focus:border-neutral-700" disabled={status === 'pending'}>
								<motion.div initial={{ opacity: 0, width: '0', scaleX: 0 }} animate={status === 'pending' ? { opacity: 1, width: 'auto', scaleX: 1 } : { opacity: 0, width: '0', scaleX: 0 }} className="origin-left">
									<LoadingSpinIcon className="mr-2 animate-spin" />
								</motion.div>
								<p>{t('register')}</p>
							</button>
							<p className="text-xs">
								<TransComponent i18nKey="user_login_call" components={{ a: <Link className="duration-100 hover:text-cyan-800" to="/" /> }} />
							</p>
						</div>
					</form>
				</div>
			</section>
		</>
	)
}
