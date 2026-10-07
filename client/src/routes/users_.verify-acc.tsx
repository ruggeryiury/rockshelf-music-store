import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerQuery } from '../hooks/useServerQuery'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLoadComponent } from '../components/pages/PageLoadComponent'
import { userVerifyAccBodySchema } from 'rockshelf-core/schemas'

function ErrorComponent() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { token } = useServerQuery()
	return (
		<div className="absolute z-1 h-screen w-full items-center justify-center bg-black/90 p-8 text-center backdrop-blur-lg">
			<h1 className="mb-1 text-3xl uppercase">{t('invalid_verification_token')}</h1>
			<p className="mb-4">{t('invalid_verification_token_desc')}</p>
			<button
				type="button"
				className="font-pentatonic rounded-sm border border-neutral-500 p-1 text-neutral-500 uppercase duration-100 hover:border-neutral-300 hover:text-neutral-300"
				onClick={() => {
					navigate({ to: '/' })
				}}
			>
				{token ? t('goto_home') : t('goto_login')}
			</button>
		</div>
	)
}

export const Route = createFileRoute('/users_/verify-acc')({
	component: RouteComponent,
	validateSearch: userVerifyAccBodySchema,
	errorComponent: ErrorComponent,
})
function RouteComponent() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { token } = Route.useSearch()
	const { queryClient, verifyAcc, token: userToken } = useServerQuery()

	useEffect(() => {
		verifyAcc.mutate(token)
	}, [token])

	useEffect(() => {
		console.log('aksdjskjdaksj:', verifyAcc.data)
	}, [verifyAcc.data])

	if (verifyAcc.isPending) return <PageLoadComponent />
	else if (verifyAcc.data) {
		if (verifyAcc.data.statusCode !== 200) throw Error()
		queryClient.invalidateQueries({ queryKey: ['details'] })
		return (
			<div className="absolute z-1 h-screen w-full items-center justify-center bg-black/90 p-8 text-center backdrop-blur-lg">
				<h1 className="mb-1 text-3xl uppercase">{t('acc_verified')}</h1>
				<p className="mb-4">{t('acc_verified_desc')}</p>
				<button
					type="button"
					className="font-pentatonic rounded-sm border border-neutral-500 p-1 text-neutral-500 uppercase duration-100 hover:border-neutral-300 hover:text-neutral-300"
					onClick={() => {
						navigate({ to: '/' })
					}}
				>
					{userToken ? t('goto_home') : t('goto_login')}
				</button>
			</div>
		)
	}
}
