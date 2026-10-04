import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useServerQuery } from '../hooks/useServerQuery'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userLoginBodySchema } from 'rockshelf-core/schemas'
import { useShallow } from 'zustand/shallow'
import { EyesOffIcon, EyesOnIcon, LoadingSpinIcon } from '../assets/icons'
import { useEffect } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { useIndexState } from '../store/pages'
import { TransComponent } from '../app/locale/TransComponent'
import { rockshelfIcon } from '../assets/images'

export const Route = createFileRoute('/')({
	component: RouteComponent,
	beforeLoad: async () => {
		const token = localStorage.getItem('token')
		if (token) throw redirect({ to: '/home' })
	},
})

function RouteComponent() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { showPassword, setIndexState, lastEmailError, lastPasswordError, lastRequestError, resetIndexState } = useIndexState(useShallow((x) => x))
	const {
		register,
		handleSubmit,
		setError,
		reset,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(
			userLoginBodySchema.extend({
				password: userLoginBodySchema.shape.password.refine((val) => /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*(),.?":{}|<>_-]/.test(val)),
			}),
		
		),
		defaultValues: {email: 'ruggeryiury@gmail.com', password: '@AAAaaa123'}
	})
	const { login, setNewToken } = useServerQuery()

	useEffect(() => {
		
		return () => {
			resetIndexState()
		}
	}, [])

	useEffect(() => {
		if (errors.email) setIndexState({ lastEmailError: `error_email_${errors.email.type}` })
		if (errors.password) setIndexState({ lastPasswordError: `error_password_${errors.password.type}` })
	}, [errors, setIndexState])

	useEffect(() => {
		const timeouts: number[] = []
		if (login.error) {
			const t1 = setTimeout(() => {
				login.reset()
			}, 5000)
			timeouts.push(t1)
		}

		return () => {
			for (const timeout of timeouts) clearTimeout(timeout)
		}
	}, [login.error, login.reset])

	useEffect(() => {
		if (login.data) {
			if (login.data.statusCode !== 200) {
				if (login.data.code === 'USER_LOGIN_EMAIL_NOT_REGISTERED') {
					setIndexState({ lastEmailError: login.data.code.toLowerCase() })
					setError('email', new Error(), { shouldFocus: true })
				} else if (login.data.code === 'USER_LOGIN_WRONG_CREDENTIALS') {
					setIndexState({ lastPasswordError: login.data.code.toLowerCase() })
					setError('password', new Error(), { shouldFocus: true })
				} else if (login.data.code === 'FORBIDDEN_BANNED_USER') {
					setIndexState({ lastRequestError: login.data.code.toLowerCase() })
					reset()
				}
				return
			}
			if (login.data?.data) setNewToken(login.data.data.token)
			navigate({ to: '/home' })
		}
	}, [login.data, setError, setIndexState, navigate])

	return (
		<section className="h-screen w-full items-center justify-center px-6">
			<img src={rockshelfIcon} width={48} className="mb-1" />
			<h1 className="mb-4 uppercase">{t('title')}</h1>
			<div className="rounded-sm bg-linear-0 from-neutral-300 to-neutral-400 p-4 text-neutral-800">
				<h1 className="uppercase">{t('login')}</h1>
				<h2>{t('login_desc')}</h2>
				<div className="my-2 h-0.5 w-full bg-neutral-800" />
				<form
					onSubmit={handleSubmit(async (data) => {
						login.mutate(data)
					})}
				>
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
								setIndexState((prev) => ({ showPassword: !prev.showPassword }))
							}}
						>
							{!showPassword ? <EyesOnIcon /> : <EyesOffIcon />}
						</button>
					</div>

					<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={errors.password ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
						<p className="text-xs text-red-600">{t(lastPasswordError)}</p>
						<div className="mb-2" />
					</motion.div>
					<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={login.error ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
						<p className="text-xs">{t('cant_connect_error')}</p>
						<div className="h-2 w-full" />
					</motion.div>

					<motion.div initial={{ opacity: 0, height: '0', scaleY: 0 }} animate={lastRequestError ? { opacity: 1, height: 'auto', scaleY: 1 } : { opacity: 0, height: '0', scaleY: 0 }} className="origin-top">
						<p className="text-xs text-red-600">{t(lastRequestError)}</p>
						<div className="mb-2" />
					</motion.div>
					<div className="flex-row! items-center">
						<button type="submit" className="mr-2 flex-row! items-center rounded-sm border border-neutral-500 bg-transparent p-1 font-semibold uppercase duration-200 hover:border-neutral-600 focus:border-neutral-700" disabled={login.isPending}>
							<motion.div initial={{ opacity: 0, width: '0', scaleX: 0 }} animate={login.isPending ? { opacity: 1, width: 'auto', scaleX: 1 } : { opacity: 0, width: '0', scaleX: 0 }} className="origin-left">
								<LoadingSpinIcon className="mr-2 animate-spin" />
							</motion.div>
							<p>{t('login')}</p>
						</button>
						<p className="text-xs">
							<TransComponent i18nKey="user_register_call" components={{ a: <Link className="duration-100 hover:text-cyan-800" to="/register" /> }} />
						</p>
					</div>
				</form>
			</div>
		</section>
	)
}
