// src/components/chat/SearchFriends.tsx
import React, { useState } from 'react';
import { User } from './GroupList';
import Avatar from './Avatar';

type Props = {
	onSearch: (name: string) => void;
	results: User[];
	onAdd: (user: User) => void;
	onBlock: (user: User) => void;
};

export default function SearchFriends({ onSearch, results, onAdd, onBlock }: Props) {
	const [query, setQuery] = useState('');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (query.trim()) {
			onSearch(query.trim());
			setQuery('');
		}
	};

	return (
		<div>
			<h2 className="text-xl font-bold mb-3">Rechercher des amis</h2>
			<form onSubmit={handleSubmit} className="flex mb-4">
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Nom d'utilisateur..."
					className="flex-1 p-2 border rounded-l-lg focus:outline-none"
				/>
				<button
					type="submit"
					className="px-4 bg-blue-500 text-white rounded-r-lg"
				>
					Rechercher
				</button>
			</form>
			{results.length > 0 && (
				<div className="space-y-3">
					{results.map((u) => (
						<div key={u.id} className="flex items-center justify-between">
							<div className="flex items-center">
								<Avatar src={(u as any).avatar || null} alt={u.username} />
								<span className="ml-3">{u.username}</span>
							</div>
							<button
								onClick={() => onAdd(u)}
								className="px-3 py-1 bg-blue-500 text-white rounded"
							>
								Ajouter
							</button>
							<button
								onClick={() => onBlock(u)}
								className="ml-2 px-3 py-1 bg-red-500 text-white rounded"
							>
								Bloquer
							</button>
						</div>
					))}
				</div>
			)}
			{results.length === 0 && (
				<p className="text-gray-500">Aucun résultat</p>
			)}
		</div>
	);
}
