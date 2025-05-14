import React, { useState } from 'react';
import ButtonGroup from './ButtonGroup';
import WaitingRooms from './WaitingRooms';
import ActiveRooms from './ActiveRooms';
import Rules from './Rules';
import Settings from './Settings';
import Statistics from './Statistics';
import { State } from '../types';

export const CenteredBox: React.FC<{ state: State }> = ({state}) => {
	const [currentPage, setCurrentPage] = useState<string>('WaitingRooms');

	const handleButtonClick = (page: string) => {
		setCurrentPage(page);
	};

	const renderContent = () => {
		switch (currentPage) {
			case 'WaitingRooms':
				return <WaitingRooms state={state} />;
			case 'ActiveRooms':
				return <ActiveRooms state={state} />;
			case 'Rules':
				return <Rules />;
			case 'Settings':
				return <Settings />;
			case 'Statistics':
				return <Statistics />;
			default:
				return <p>Page non trouvée</p>;
		}
	};

	return (
		<div className="flex justify-center bg-gray-900 text-white h-full">
			<div className="flex items-center space-x-4">
				<ButtonGroup onButtonClick={handleButtonClick} />
				<div className="p-6 border-4 border-blue-600 rounded-md bg-gray-800 shadow-lg w-[30%] h-[80%] min-w-[300px] min-h-[400px] max-w-[90vw] max-h-[90vh]">
					{renderContent()}
				</div>
			</div>
		</div>
	);
};

export default {
	CenteredBox
};
