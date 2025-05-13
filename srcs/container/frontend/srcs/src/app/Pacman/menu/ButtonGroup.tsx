import React from 'react';

interface ButtonGroupProps {
	onButtonClick: (page: string) => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ onButtonClick }) => {
	return (
		<div className="flex flex-col space-y-2">
			<button
				className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
				onClick={() => onButtonClick('WaitingRooms')}>
				Partie en attente
			</button>
			<button
				className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
				onClick={() => onButtonClick('ActiveRooms')}>
				Partie en cours
			</button>
			<button
				className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
				onClick={() => onButtonClick('Rules')}>
				Règles du jeu
			</button>
			<button
				className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
				onClick={() => onButtonClick('Settings')}>
				Paramètres
			</button>
		</div>
	);
};

export default ButtonGroup;
