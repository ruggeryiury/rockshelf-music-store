import { useTranslation } from 'react-i18next'
import { TransComponent } from '../../app/locale/TransComponent'
import { Link } from '@tanstack/react-router'
import { useServerQuery } from '../../hooks/useServerQuery'

export function BannedUserModalComponent() {
	const { t } = useTranslation()
	const { queryClient, removeToken } = useServerQuery()
	return (
		<div className="absolute z-50 h-screen w-full items-center justify-center bg-black/96 px-8 text-center backdrop-blur-lg px-6">
			<h1 className="mb-2 text-4xl uppercase">{t('banned_user_title')}</h1>
			<h2>
				<TransComponent
					i18nKey="banned_user_desc"
					components={{
						a: (
							<Link
								to="/"
								onClick={() => {
									removeToken()
									queryClient.invalidateQueries({ queryKey: ['me'] })
								}}
							/>
						),
					}}
				/>
			</h2>
		</div>
	)
}
