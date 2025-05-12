import React, { useState, useEffect, useRef } from 'react';
import useSafeWebSocket from '../../api/useSafeWebSocket';
import GroupList from './GroupList';
import FriendsList from './FriendsList';
import BlockedList from './BlockedList';
import SearchFriends from './SearchFriends';
import PendingRequests from './PendingRequests';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useTheme } from './WebSocketChat';
import { User, Group, Message, Friends, reponse, send_init_connected, res_newMessage, res_createGroup, res_loadMoreMessage, res_add_friend, res_accept_friend, res_refuse_friend, res_block_user, res_remove_friend, res_search_user } from './types';

const PAGE_SIZE = 20;

export default function Chat() {
	const { dark } = useTheme();

	// États
	const [status, setStatus] = useState<'Connecting...' | 'Connected' | 'Closed' | 'Error' | 'Reconnecting'>('Connecting...');
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [friends, setFriends] = useState<User[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [input, setInput] = useState<string>('');
	const [duration, setDuration] = useState<string>('0h 0m 0s');
	const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
	const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(true);
	const [atBottom, setAtBottom] = useState<boolean>(true);
	const [searchResults, setSearchResults] = useState<User[]>([]);
	const [pendingRequests, setPendingRequests] = useState<User[]>([]);
	const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

	const startRef = useRef(Date.now());
	const currentUserIdRef = useRef<number | null>(null);

	// Timer
	useEffect(() => {
		const iv = setInterval(() => {
			const diff = Date.now() - startRef.current;
			const h = Math.floor(diff / 3600000);
			const m = Math.floor((diff % 3600000) / 60000);
			const s = Math.floor((diff % 60000) / 1000);
			setDuration(`${h}h ${m}m ${s}s`);
		}, 1000);
		return () => clearInterval(iv);
	}, []);

	// Historique
	const loadHistory = (groupId: number, firstMessageId: number) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		setLoadingHistory(true);
		ws.send(JSON.stringify({ action: 'loadMoreMessage', group_id: groupId, firstMessageId }));
	};

	// Gestion messages WS
	const handleMessage = (data: any) => {
		switch (data.action) {
			case 'init_connected': {
				setCurrentUser(data.user);
				currentUserIdRef.current = data.user.id;
				setFriends(data.friends);
				setPendingRequests(data.friends.filter((u: User) => u.relation?.status === 'pending'));
				setBlockedUsers(data.friends.filter((u: User) => u.relation?.status === 'blocked'));

				// On transforme chaque groupe pour que messages soit une Map
				const groupsWithMaps: Group[] = Object.values(data.groups).map((g: any) => ({
					...g,
					messages: new Map<number, Message>(
						// si g.messages est un array, mappez-le, sinon, []. Exemple : []
						Array.isArray(g.messages)
							? g.messages.map((m: Message) => [m.id, m])
							: []
					),
				}));
				setGroups(groupsWithMaps);

				if (groupsWithMaps.length > 0) {
					const first = groupsWithMaps[0].id;
					setActiveId(first);
					loadHistory(first, 0);
				}
				break;
			}
			case 'loadMoreMessage': {
				setGroups(prev =>
				  prev.map(g =>
					g.id === data.group_id
					  ? {
						  ...g,
						  messages: new Map<number, Message>(
							(Array.isArray(data.messages) ? data.messages : Object.values(data.messages))
							  .map((m: any) => {
								const date = new Date(m.sent_at);
								return [m.id, { ...m, sent_at: date }];
							  })
						  ),
						}
					  : g
				  )
				);
				// ...
				break;
			  }

			case 'new_message':
				if (data.message.sender_id !== currentUserIdRef.current) {
					const messageWithDate = {
						...data.message,
						sent_at: new Date(data.message.sent_at),
					};
					setGroups((prev) =>
						prev.map((g) =>
							g.id === data.group_id ? { ...g, messages: new Map([...g.messages, [messageWithDate.id, messageWithDate]]) } : g
						)
					);
				}
				break;

			// Amis / demandes / blocages
			case 'search_user':
				setSearchResults(data.users);
				break;
			case 'add_friend': {
				setFriends(prev => [...prev, data.user]);
				setPendingRequests(prev => [...prev, data.user]);
				break;
			}
			case 'accept_friend': {
				// data.user : nouvel ami, data.group : groupe privé créé
				setFriends(prev =>
					prev
						.filter(u => u.id !== data.user.id)    // on retire du pending
						.concat({ ...data.user, relation: { status: 'friend', target: data.user.id, privmsg_id: data.group.id } })
				);
				setPendingRequests(prev => prev.filter(u => u.id !== data.user.id));
				setGroups(prev => [...prev, data.group]);
				break;
			}
			case 'refuse_friend': {
				// data.user est celui qu’on retire du pending
				setFriends(prev => prev.filter(u => u.id !== data.user_id));
				setPendingRequests(prev => prev.filter(u => u.id !== data.user_id));
				setGroups(prev => prev.filter(g => g.id !== data.group_id));
				break;
			}
			case 'cancel_request': {
				// On retire le user annulé du pending et des amis
				setFriends(prev => prev.filter(u => u.id !== data.user.id));
				setPendingRequests(prev => prev.filter(u => u.id !== data.user.id));
				break;
			}
			case 'remove_friend': {
				setFriends(prev => prev.filter(u => u.id !== data.user_id));
				setPendingRequests(prev => prev.filter(u => u.id !== data.user_id));
				setGroups(prev => prev.filter(g => g.id !== data.group_id));
				break;
			}
			case 'block_user': {
				setFriends(prev =>
					prev.map(u =>
						u.id === data.user_id
							? { ...u, relation: { status: 'blocked', target: currentUserIdRef.current! } }
							: u
					)
				);
				setBlockedUsers(prev => {
					const blockedUser = friends.find(u => u.id === data.user_id);
					return blockedUser ? [...prev, { ...blockedUser, relation: { status: 'blocked', target: currentUserIdRef.current! } }] : prev;
				});
				break;
			}
			case 'unblock_user': {
				setFriends(prev =>
					prev.map(u =>
						u.id === data.user_id
							? { ...u, relation: null }
							: u
					)
				);
				setBlockedUsers(prev => prev.filter(u => u.id !== data.user_id));
				break;
			}
			default:
				break;
		}
	};

	const { socket: ws } = useSafeWebSocket({
		endpoint: '/chat',
		onMessage: handleMessage,
		onStatusChange: setStatus,
		reconnectDelay: 3000,
	});

	useEffect(() => {
		setStatus(ws?.readyState === WebSocket.OPEN ? 'Connected' : 'Connecting...');
	}, [ws]);

	useEffect(() => {
		if (activeId !== null) {
			const grp = groups.find((g) => g.id === activeId);
			if (grp && grp.messages.size === 0) loadHistory(activeId, 0);
		}
	}, [activeId, groups]);

	const sendMessage = () => {
		if (activeId == null || !ws || ws.readyState !== WebSocket.OPEN) return;
		const now = Date.now();
		const newMsg: Message = {
			id: now,
			sender_id: currentUserIdRef.current!,
			message: input,
			sent_at: new Date(now),
		};

		// Mise à jour du state
		setGroups(prev =>
			prev.map(g => {
				if (g.id !== activeId) return g;

				// Si ce n'est pas une Map, on la convertit en Map vide
				const oldMap = g.messages instanceof Map ? g.messages : new Map<number, Message>();

				return {
					...g,
					messages: new Map([
						...oldMap.entries(),
						[now, newMsg],
					]),
				};
			})
		);

		// Envoi au serveur
		ws.send(JSON.stringify({ action: 'new_message', group_id: activeId, message: input }));
		setInput('');
		setAtBottom(true);
	};


	const handleFriendAction = (u: any, action: string) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		ws.send(JSON.stringify({ action, user_id: u.id }));
		if (action === 'message' && u.relation?.privmsg_id) {
			setActiveId(u.relation.privmsg_id);
			setAtBottom(true);
		}
	};
	Map<number, Message>
	const emptyGroup: Group = {
		id: -1,
		name: 'Sélectionnez une discussion',
		members: [],
		owners_id: [],
		onlines_id: [],
		messages: new Map<number, Message>(),  // <-- ici, Map vide
		private: 0,
	};
	const activeGroup = groups.find((g) => g.id === activeId) ?? emptyGroup;

	const handleSelectGroup = (groupId: number) => {
		setActiveId(groupId);
		setAtBottom(true);
	};

	return (
		<div className={`flex h-screen ${dark ? 'dark' : ''}`}>
			<aside className="w-80 p-6 bg-white dark:bg-gray-800 overflow-y-auto shadow-lg space-y-8">
				<GroupList groups={groups} activeId={activeId} onSelect={handleSelectGroup} currentUserId={currentUser?.id ?? null} />
				<SearchFriends onSearch={(name) => ws?.send(JSON.stringify({ action: 'search_user', name }))} results={searchResults} onAdd={(u) => handleFriendAction(u, 'add_friend')} onBlock={(u) => handleFriendAction(u, 'block_user')} />
				<PendingRequests requests={pendingRequests} onAccept={(u) => handleFriendAction(u, 'accept_friend')} onRefuse={(u) => handleFriendAction(u, 'refuse_friend')} onCancel={(u) => handleFriendAction(u, 'cancel_request')} />
				<FriendsList
					friends={friends.filter((u) => u?.relation?.status === 'friend')}
					currentUserId={currentUser?.id ?? null}
					onAction={handleFriendAction}
				/>
				<BlockedList blocked={blockedUsers} onUnblock={(u) => handleFriendAction(u, 'unblock_user')} />
			</aside>

			<div className="flex-1 flex flex-col">
				<ChatHeader
					title={activeGroup.private === 1 && currentUser ? activeGroup.members.find((m: any) => m.id !== currentUser.id)?.username || activeGroup.name : activeGroup.name}
					status={status}
					duration={duration}
				/>

				<div className="relative flex-1 flex flex-col">
					{hasMoreHistory && activeGroup.messages instanceof Map && activeGroup.messages.size > 0 && (
						<button
							onClick={() => {
								if (activeGroup.messages instanceof Map) {
									loadHistory(activeGroup.id, Math.min(...Array.from(activeGroup.messages.keys())));
								}
							}}
							disabled={loadingHistory}
							className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-200 p-2 rounded-full z-10 hover:bg-gray-300"
						>
							Charger anciens
						</button>
					)}

					<MessageList messages={
						activeGroup.messages instanceof Map
							? Array.from(activeGroup.messages.values())
								.sort((a, b) => a.sent_at.getTime() - b.sent_at.getTime())
							: null
					} currentUserId={currentUserIdRef.current} isLoading={loadingHistory} onScroll={setAtBottom} />

					{!atBottom && activeGroup.messages instanceof Map && activeGroup.messages.size > 0 && (
						<button onClick={() => setAtBottom(true)} className="absolute bottom-24 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg">
							Nouveaux messages
						</button>
					)}
				</div>

				<MessageInput value={input} onChange={setInput} onSend={sendMessage} />
			</div>
		</div>
	);
}
