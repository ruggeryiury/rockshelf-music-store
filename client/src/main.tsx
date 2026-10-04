import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'

import './assets/styles/index.css'
import { queryClient, router } from './router'
import { i18nextInit } from './app/locale/i18nextInit'

i18nextInit()

createRoot(document.getElementById('root')!).render(
	<QueryClientProvider client={queryClient}>
		<RouterProvider router={router} />
	</QueryClientProvider>,
)
