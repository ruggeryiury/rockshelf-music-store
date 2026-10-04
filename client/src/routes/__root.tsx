import * as React from 'react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '../router'
import { i18nextInit } from '../app/locale/i18nextInit'
import { QueryClientProvider } from '@tanstack/react-query'
import { useServerQuery } from '../hooks/useServerQuery'
import { NotFoundComponent } from '../components/pages/NotFoundComponent'

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
})

function RootComponent() {
	i18nextInit()
	const { queryClient } = useServerQuery()

	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	)
}
