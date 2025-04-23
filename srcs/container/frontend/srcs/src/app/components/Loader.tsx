// src/components/Overlay.tsx
import React from 'react'
import { GridLoader } from 'react-spinners'

export interface ErrorDisplayProps {
	message: string
}

/**
 * vrai plein écran, centré au pixel près
 */
const overlayBase = 'fixed inset-0 z-50 flex items-center justify-center'

export const Loader: React.FC = () => (
	<div className={`${overlayBase} bg-white/50`}>
		<GridLoader color="#36d7b7" size={30} margin={10} />
	</div>
)

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center">
		<div className={`${overlayBase} bg-red-50/75`}>
			<div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm mx-4">
				<h1 className="text-3xl font-extrabold text-red-600 mb-4">⚠️ ERREUR ⚠️</h1>
				<p className="text-gray-700 mb-6">{message}</p>
				<button
					onClick={() => window.location.reload()}
					className="mt-2 px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
				>
					Actualiser
				</button>
			</div>
		</div>
	</div>
)

export default { Loader, ErrorDisplay }
