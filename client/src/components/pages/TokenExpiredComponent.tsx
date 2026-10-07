import { useTranslation } from 'react-i18next'
import { TransComponent } from '../../app/locale/TransComponent'
import { Link } from '@tanstack/react-router'
import { useServerQuery } from '../../hooks/useServerQuery'

export function TokenExpiredComponent() {
	const { t } = useTranslation()
	const { removeToken } = useServerQuery()
	return (
		<div className="absolute z-50 h-screen w-full items-center justify-center bg-black/96 px-6 text-center backdrop-blur-lg">
			<h1 className="mb-2 text-4xl uppercase">{t('token_expired')}</h1>
			<h2>
				<TransComponent
					i18nKey="token_expired_desc"
					components={{
						a: (
							<Link
								to="/"
								onClick={() => {
									removeToken()
								}}
							/>
						),
					}}
				/>
			</h2>
		</div>
	)
}
