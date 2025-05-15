import React, { useState, useEffect, useMemo } from 'react';
import {
	DndContext,
	DragOverlay,
	useDraggable,
	useDroppable,
	closestCenter,
	DragEndEvent,
	DragStartEvent
} from '@dnd-kit/core';
import './assets/styles/ModuleManager.scss';
import modulesDataImport from './assets/ListeModules.json';

interface ModuleItem {
	id: string;
	title: string;
	description: string;
	major: boolean;
}

const modulesData: ModuleItem[] = Array.isArray(modulesDataImport)
	? modulesDataImport.map(item => ({
		...item,
		major: typeof item.major === 'string'
			? item.major.toLowerCase() === 'majeur'
			: Boolean(item.major)
	}))
	: (modulesDataImport.untouched || []).map(item => ({
		...item,
		major: typeof item.major === 'string'
			? item.major.toLowerCase() === 'majeur'
			: Boolean(item.major)
	}));

type ColumnKey = 'untouched' | 'rejected' | 'undecided' | 'accepted';
type ModuleColumns = Record<ColumnKey, ModuleItem[]>;

enum SubKey {
	major = 'majeur',
	minor = 'mineur'
}

const DroppableArea: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
	const { isOver, setNodeRef } = useDroppable({ id });
	return (
		<div ref={setNodeRef} className={`droppable-area ${isOver ? 'over' : ''}`}>
			{children}
		</div>
	);
};

const DraggableItem: React.FC<ModuleItem & { onContextMenu: (id: string) => void }> = ({
	id,
	title,
	onContextMenu
}) => {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
	const style: React.CSSProperties = {
		...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}),
		position: 'relative'
	};
	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onContextMenu={e => {
				e.preventDefault();
				onContextMenu(id);
			}}
			className="module-item"
		>
			{title}
		</div>
	);
};

const Modal: React.FC<{ item: ModuleItem; onClose: () => void }> = ({ item, onClose }) => (
	<>
		<div className="modal-backdrop" onClick={onClose} />
		<div className="modal-content-center">
			<h2>{item.title}</h2>
			<pre>{item.description}</pre>
			<button onClick={onClose}>Fermer</button>
		</div>
	</>
);

const DragAndDropModules: React.FC = () => {
	const modulesDataHash = useMemo(() => JSON.stringify(modulesData), []);

	const [showInfo, setShowInfo] = useState(() => {
		const stored = localStorage.getItem('moduleInfoClosed');
		return stored !== 'true';
	});

	const [columns, setColumns] = useState<ModuleColumns>(() => {
		const savedColsStr = localStorage.getItem('moduleColumns');
		const savedHash = localStorage.getItem('modulesDataHash');
		const savedCols: ModuleColumns | null = savedColsStr
			? JSON.parse(savedColsStr)
			: null;

		if (!savedCols || savedHash !== modulesDataHash) {
			const mapSaved: Record<string, ColumnKey> = {};
			if (savedCols) {
				(Object.keys(savedCols) as ColumnKey[]).forEach(col => {
					savedCols[col].forEach(item => {
						mapSaved[item.id] = col;
					});
				});
			}

			const merged: ModuleColumns = {
				untouched: [],
				rejected: [],
				undecided: [],
				accepted: []
			};

			modulesData.forEach(item => {
				const target: ColumnKey = mapSaved[item.id] || 'untouched';
				merged[target].push(item);
			});

			localStorage.setItem('modulesDataHash', modulesDataHash);
			localStorage.setItem('moduleColumns', JSON.stringify(merged));
			return merged;
		}

		return savedCols;
	});

	const [activeId, setActiveId] = useState<string | null>(null);
	const [modalItem, setModalItem] = useState<ModuleItem | null>(null);

	const closeInfo = () => {
		setShowInfo(false);
		localStorage.setItem('moduleInfoClosed', 'true');
	};

	useEffect(() => {
		localStorage.setItem('moduleColumns', JSON.stringify(columns));
	}, [columns]);

	const handleDragStart = ({ active }: DragStartEvent) => {
		setActiveId(String(active.id));
	};

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		setActiveId(null);
		if (!over) return;
		const draggedId = String(active.id);
		const [toCol] = String(over.id).split(':') as [ColumnKey, SubKey];

		let sourceCol: ColumnKey | null = null;
		for (const col of Object.keys(columns) as ColumnKey[]) {
			if (columns[col].some(item => item.id === draggedId)) {
				sourceCol = col;
				break;
			}
		}

		if (sourceCol === toCol) return;

		let moved: ModuleItem | undefined;
		const colsSans = (Object.keys(columns) as ColumnKey[]).reduce((acc, col) => {
			const filtered = columns[col].filter(item => {
				if (item.id === draggedId) {
					moved = item;
					return false;
				}
				return true;
			});
			acc[col] = filtered;
			return acc;
		}, {} as ModuleColumns);

		if (!moved) return;
		if (colsSans[toCol].some(i => i.id === moved!.id)) return;

		const dest = colsSans[toCol];
		const majorList = dest.filter(i => i.major);
		const minorList = dest.filter(i => !i.major);

		if (moved.major) majorList.unshift(moved);
		else minorList.unshift(moved);

		setColumns({ ...colsSans, [toCol]: [...majorList, ...minorList] });
	};

	const handleExportData = () => {
		try {
			const data = {
				columns: columns,
				modulesDataHash: modulesDataHash,
				moduleInfoClosed: !showInfo
			};
			
			const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = 'Transcendence-Module-Export.json';
			document.body.appendChild(a);
			a.click();
			
			URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Erreur lors de l\'export:', error);
			alert('Échec de l\'export des données');
		}
	};

	const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const importedData = JSON.parse(event.target?.result as string);
				
				if (importedData.columns) {
					setColumns(importedData.columns);
					localStorage.setItem('moduleColumns', JSON.stringify(importedData.columns));
				}
				
				if (importedData.modulesDataHash) {
					localStorage.setItem('modulesDataHash', importedData.modulesDataHash);
				}
				
				if (importedData.hasOwnProperty('moduleInfoClosed')) {
					setShowInfo(!importedData.moduleInfoClosed);
					localStorage.setItem('moduleInfoClosed', String(importedData.moduleInfoClosed));
				}
				
				alert('Import réussi !');
			} catch (error) {
				console.error('Erreur lors de l\'import:', error);
				alert('Échec de l\'import des données');
			}
		};
		reader.readAsText(file);
		
		e.target.value = '';
	};

	const handleResetData = () => {
		if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les modules ? Cette action déplacera tous les modules vers la colonne "untouched".')) {
			const allItems = Object.values(columns).flat();
			const resetColumns: ModuleColumns = {
				untouched: allItems,
				rejected: [],
				undecided: [],
				accepted: []
			};
			setColumns(resetColumns);
			localStorage.setItem('moduleColumns', JSON.stringify(resetColumns));
		}
	};

	const splitSubColumns = (list: ModuleItem[]) => ({
		major: list.filter(i => i.major),
		minor: list.filter(i => !i.major)
	});

	const activeItem = activeId
		? Object.values(columns).flat().find(i => i.id === activeId)
		: null;

	const handleContextMenu = (id: string) =>
		setModalItem(Object.values(columns).flat().find(i => i.id === id) || null);


	const allModules = Object.values(columns).flat();
	const totalMinor = allModules.filter(m => !m.major).length;
	const totalMajor = allModules.filter(m => m.major).length;

	const acceptedModules = columns.accepted;
	const acceptedMajor = acceptedModules.filter(m => m.major).length;
	const acceptedMinor = acceptedModules.filter(m => !m.major).length;

	const points = 30 + acceptedMajor * 10 + acceptedMinor * 5;
	const majorEquivalent = acceptedMajor + Math.floor(acceptedMinor / 2);
	const percentage = Math.round((points / 100) * 100);

	const isValid = majorEquivalent >= 7;

	const getColorByPercentage = (p: number) => {
		if (p >= 140) return '#38bdf8'; // bleu clair
		if (p >= 125) return '#15803d'; // vert foncé
		if (p >= 100) return '#22c55e'; // vert clair
		return '#dc2626'; // rouge
	};

	return (
		<DndContext
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="module-manager">
				<div className="export-import-buttons">
					<button 
						className="export-btn" 
						onClick={handleExportData} 
						title="Exporter les données"
					>
						 📤 Exporter
					</button>
					
					<label className="import-btn" title="Importer des données">
						📥 Importer
						<input 
							type="file" 
							accept=".json" 
							onChange={handleImportData} 
							style={{ display: 'none' }} 
						/>
					</label>
					
					<button 
						className="reset-btn" 
						onClick={handleResetData} 
						title="Réinitialiser les modules"
					>
						 🔄 Réinitialiser
					</button>
				</div>

				{showInfo && (
					<div className="info-box">
						<div className="info-message">
							 ℹ️ Clique droit sur un module pour afficher ses détails
							<button
								className="close-info-btn"
								onClick={closeInfo}
								aria-label="Fermer le message d'information"
							>
								×
							</button>
						</div>
					</div>
				)}

				<div
					className="stats"
					style={{
						backgroundColor: getColorByPercentage(percentage),
						color: '#fff',
						textAlign: 'center',
						borderRadius: '0.5rem',
						padding: '1rem',
						fontWeight: 'bold',
						marginBottom: '1rem'
					}}
				>
					<div>Mineur : {acceptedMinor} / {totalMinor}</div>
					<div>Majeur : {acceptedMajor} / {totalMajor}</div>
					<div>Total de points : {points} / 100</div>
					{!isValid && (
						<div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
							 ❌ Projet non valide : il faut au moins 7 modules majeurs (2 mineurs = 1 majeur)
						</div>
					)}
				</div>


				{modalItem && <Modal item={modalItem} onClose={() => setModalItem(null)} />}

				<div className="lists">
					{(Object.keys(columns) as ColumnKey[]).map(col => {
						const subs = splitSubColumns(columns[col]);
						return (
							<div key={col} className="list-box">
								<h3>{col.toUpperCase()}</h3>
								<div className="sublists">
									<DroppableArea id={`${col}:${SubKey.minor}`}>
										<div className="sublist minor">
											<h3>Mineurs</h3>
											{subs.minor.map(item => (
												<DraggableItem
													key={item.id}
													{...item}
													onContextMenu={handleContextMenu}
												/>
											))}
										</div>
									</DroppableArea>

									<DroppableArea id={`${col}:${SubKey.major}`}>
										<div className="sublist major">
											<h3>Majeurs</h3>
											{subs.major.map(item => (
												<DraggableItem
													key={item.id}
													{...item}
													onContextMenu={handleContextMenu}
												/>
											))}
										</div>
									</DroppableArea>
								</div>
							</div>
						);
					})}
				</div>

				<DragOverlay>
					{activeItem && (
						<div className="module-item dragging-overlay">
							{activeItem.title}
						</div>
					)}
				</DragOverlay>
			</div>
		</DndContext>
	);
};

export default DragAndDropModules;
