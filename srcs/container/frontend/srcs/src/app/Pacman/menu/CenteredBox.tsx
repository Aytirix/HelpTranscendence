import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import WaitingRooms from './WaitingRooms';
import ActiveRooms from './ActiveRooms';
import Rules from './Rules';
import Settings from './Settings';
import Statistics from './Statistics';
import { state } from '../../types/pacmanTypes';
// import '@styles/pacman/CenteredBox.scss';
import '../../assets/styles/pacman/CenteredBox.scss';

const TABS = [
	{ id: 'WaitingRooms', label: 'Parties en attente' },
	{ id: 'ActiveRooms', label: 'Parties en cours' },
	{ id: 'Rules', label: 'Règles' },
	{ id: 'Statistics', label: 'Statistiques' },
	{ id: 'Settings', label: 'Paramètres' },
];

export const CenteredBox: React.FC<{ state: state }> = ({ state }) => {
	const [currentPage, setCurrentPage] = useState<string>('WaitingRooms');

	const renderContent = () => (
		<AnimatePresence mode="wait">
			<motion.div
				key={currentPage}
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 10 }}
				transition={{ duration: 0.3 }}
				className="content-wrapper"
			>
				{{
					WaitingRooms: <WaitingRooms state={state} />,
					ActiveRooms: <ActiveRooms state={state} />,
					Rules: <Rules />,
					Settings: <Settings />,
					Statistics: <Statistics />,
				}[currentPage] || <p>Page non trouvée</p>}
			</motion.div>
		</AnimatePresence>
	);

	return (
		<div className="centered-box">
			<div className="title-container">
				<h1>PACMAN</h1>
			</div>

			<Tab.Group
				selectedIndex={TABS.findIndex(t => t.id === currentPage)}
				onChange={i => setCurrentPage(TABS[i].id)}
				as="div"
				className="tabs-container"
			>
				<Tab.List className="tabs-list">
					{TABS.map(tab => (
						<Tab as={React.Fragment} key={tab.id}>
							{({ selected }) => (
								<button
									role="tab"
									aria-selected={selected}
									className={`tab-button ${selected ? 'selected' : ''}`}
								>
									{tab.label}
								</button>
							)}
						</Tab>
					))}
				</Tab.List>
			</Tab.Group>

			<div className="content-container">
				{renderContent()}
			</div>
		</div>
	);
};

export default CenteredBox;
