import { createFileRoute } from '@tanstack/react-router'
import { BannedUserModalComponent } from '../components/pages/BannedUserComponent'
import { PageLoadComponent } from '../components/pages/PageLoadComponent'
import { TokenExpiredComponent } from '../components/pages/TokenExpiredComponent'
import { useServerQuery } from '../hooks/useServerQuery'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSongRegisterState } from '../store/pages/songsRegister'
import { useShallow } from 'zustand/shallow'

export const Route = createFileRoute('/songs_/register')({
	component: RouteComponent,
})

function RouteComponent() {
	const { t } = useTranslation()
	const { selectedPackageFile, setSongRegisterState, resetSongRegisterState } = useSongRegisterState(useShallow((x) => x))
	const { getMyUserDetails, verifyToken } = useServerQuery()
	const packageFileInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		return () => {
			resetSongRegisterState()
		}
	}, [])

	if ((verifyToken.isPending && !verifyToken.data) || (getMyUserDetails.isPending && !verifyToken.data)) return <PageLoadComponent />
	else if (verifyToken.data?.statusCode === 403) return <BannedUserModalComponent />
	else if (!verifyToken.data || verifyToken.data?.statusCode !== 200) return <TokenExpiredComponent />
	return (
		<section>
			<h2>File</h2>
			<input
				type="file"
				hidden
				ref={packageFileInputRef}
				accept=".rb3"
				onChange={(ev) => {
					if (ev.target.files && 0 in ev.target.files) setSongRegisterState({ selectedPackageFile: ev.target.files[0] })
				}}
			/>
			<button
				onClick={() => {
					packageFileInputRef.current!.click()
				}}
			>
				SELECT
			</button>
			{selectedPackageFile && <p>{selectedPackageFile.name}</p>}
			<p>At the moment, only Rock Band 3 Song Package files (.rb3) are compatible</p>
			<button onClick={(ev) => {}}>REGISTER</button>
		</section>
	)
}
