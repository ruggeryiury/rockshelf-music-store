import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerQuery } from '../hooks/useServerQuery'
import { HomeHeader } from '../components'
import { PageLoadComponent } from '../components/pages/PageLoadComponent'
import { TokenExpiredComponent } from '../components/pages/TokenExpiredComponent'
import { BannedUserModalComponent } from '../components/pages/BannedUserComponent'

export const Route = createFileRoute('/home')({
	component: RouteComponent,
	beforeLoad: () => {
		const token = localStorage.getItem('token')
		if (!token) throw redirect({ to: '/' })
	},
})

function RouteComponent() {
	const { getMyUserDetails, verifyToken } = useServerQuery()
	if ((verifyToken.isPending && !verifyToken.data) || (getMyUserDetails.isPending && !verifyToken.data)) return <PageLoadComponent />
	else if (verifyToken.data?.statusCode === 403) return <BannedUserModalComponent />
	else if (verifyToken.data?.statusCode !== 200 || !verifyToken.data) return <TokenExpiredComponent />
	return (
		<section>
			<HomeHeader />
		</section>
	)
}
