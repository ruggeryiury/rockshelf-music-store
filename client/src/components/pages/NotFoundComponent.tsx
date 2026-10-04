import { useTranslation } from 'react-i18next'
import { TransComponent } from '../../app/locale/TransComponent'
import { Link } from '@tanstack/react-router'

export function NotFoundComponent() {
	const { t } = useTranslation()
	return (
		<section className="h-screen w-full items-center justify-center px-6 text-center">
			<h1 className="mb-2 text-4xl uppercase">{t('page_not_found')}</h1>
			<h2>
				<TransComponent i18nKey="page_not_found_desc" components={{ a: <Link to="/home" /> }} />
			</h2>
		</section>
	)
}
