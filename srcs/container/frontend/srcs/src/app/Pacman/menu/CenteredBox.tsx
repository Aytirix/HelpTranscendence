import React, { useState } from 'react';
import ButtonGroup from './ButtonGroup';
import WaitingRooms from './WaitingRooms';
import ActiveRooms from './ActiveRooms';
import Rules from './Rules';
import Settings from './Settings';
import { State } from '../types';

export const CenteredBox: React.FC<State> = (state) => {
	const [currentPage, setCurrentPage] = useState<string>('WaitingRooms');

	const handleButtonClick = (page: string) => {
		setCurrentPage(page);
	};

	const renderContent = () => {
		switch (currentPage) {
			case 'WaitingRooms':
				return <WaitingRooms rooms={state.rooms.waiting} />;
			case 'ActiveRooms':
				return <ActiveRooms rooms={state.rooms.active} />;
			case 'Rules':
				return <Rules />;
			case 'Settings':
				return <Settings />;
			default:
				return <p>Page non trouvée</p>;
		}
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
			<div className="flex items-center space-x-4">
				<ButtonGroup onButtonClick={handleButtonClick} />

				<div className="p-6 border-4 border-blue-600 rounded-md bg-gray-800 shadow-lg">
					<h1 className="text-2xl font-bold mb-2">Contenu</h1>
					{renderContent()}
				</div>
			</div>
		</div>
	);
};

export default {
	CenteredBox
};
