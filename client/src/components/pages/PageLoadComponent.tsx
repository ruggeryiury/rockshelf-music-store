import { LoadingSpinIcon } from '../../assets/icons'

export function PageLoadComponent() {
	return (
		<div className="absolute h-screen w-full justify-center items-center z-50 bg-black/96 backdrop-blur-lg">
			<LoadingSpinIcon className="animate-spin text-5xl" />
		</div>
	)
}
