// src/components/WebSocketChat.tsx
import React, {
	useState,
	useEffect,
	useRef,
	createContext,
	useContext,
	ReactNode,
} from 'react';
import { Send, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import useSafeWebSocket from '../api/useSafeWebSocket';
import { User } from './types/userTypes';

// === Theme Context ===
const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({
	dark: false,
	toggle: () => { },
});
const useTheme = () => useContext(ThemeContext);

// Pagination constant
const PAGE_SIZE = 20;

type Message = { id: number; sender_id: number; message: string; sent_at: string };
type Group = {
	id: number;
	name: string;
	members: User[];
	messages: Message[];
	owners_id: number[];
	onlines_id: number[];
	private: 0 | 1;
};

// === Sub-components ===
const Skeleton: React.FC<{ height?: string }> = ({ height = '1rem' }) => (
	<div className="animate-pulse bg-gray-200 rounded" style={{ height, width: '100%' }} />
);

const Avatar: React.FC<{ src: string | null; alt: string }> = ({ src, alt }) =>
	src ? (
		<img
			src={src}
			alt={alt}
			loading="lazy"
			className="w-12 h-12 rounded-full object-cover border-2 border-white"
		/>
	) : (
		<div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
			{alt.charAt(0)}
		</div>
	);

const GroupList: React.FC<{
	groups: Group[];
	activeId: number | null;
	onSelect: (id: number) => void;
	currentUserId: number | null;
}> = ({ groups, activeId, onSelect, currentUserId }) => (
	<div>
		<h2 className="text-xl font-bold mb-3">Mes discussions</h2>
		{groups.length > 0 ? (
			groups.map((g) => {
				let label = g.name;
				if (g.private === 1 && currentUserId != null) {
					const other = g.members.find((m) => m.id !== currentUserId);
					if (other) label = other.username;
				}
				return (
					<button
						key={g.id}
						onClick={() => onSelect(g.id)}
						className={`w-full text-left p-3 rounded-lg mb-2 transition-shadow ${g.id === activeId ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:shadow-md'
							}`}
					>
						<span className="font-medium">{label}</span>
						<span className="text-sm text-gray-500 ml-2">({g.members.length})</span>
					</button>
				);
			})
		) : (
			<p className="text-gray-500">Aucune discussion</p>
		)}
	</div>
);

const FriendsList: React.FC<{
	friends: User[];
	currentUserId: number | null;
	onAction: (user: User, action: string) => void;
}> = ({ friends, currentUserId, onAction }) => (
	<div>
		<h2 className="text-xl font-bold mb-3">Liste d'amis</h2>
		{friends.length > 0 ? (
			friends.map((u) => {
				const rel = u.relation;
				let buttons: ReactNode = null;

				if (rel) {
					if (rel.status === 'pending' && rel.target !== currentUserId) {
						// J'ai envoyé la demande
						buttons = (
							<button
								onClick={() => onAction(u, 'cancel_request')}
								className="px-3 py-1 bg-yellow-500 text-white rounded"
							>
								Annuler la demande
							</button>
						);
					} else if (rel.status === 'pending' && rel.target === currentUserId) {
						// Je suis la cible
						buttons = (
							<>
								<button
									onClick={() => onAction(u, 'accept_friend')}
									className="px-3 py-1 bg-green-500 text-white rounded mr-2"
								>
									Accepter
								</button>
								<button
									onClick={() => onAction(u, 'refuse_friend')}
									className="px-3 py-1 bg-red-500 text-white rounded"
								>
									Refuser
								</button>
							</>
						);
					} else if (rel.status === 'friend') {
						buttons = (
							<>
								<button
									onClick={() => onAction(u, 'message')}
									className="px-3 py-1 bg-blue-500 text-white rounded mr-2"
								>
									Message
								</button>
								<button
									onClick={() => onAction(u, 'remove_friend')}
									className="px-3 py-1 bg-red-500 text-white rounded"
								>
									Retirer
								</button>
							</>
						);
					} else if (rel.status === 'blocked' && rel.target !== currentUserId) {
						buttons = (
							<button
								onClick={() => onAction(u, 'unblock')}
								className="px-3 py-1 bg-green-500 text-white rounded"
							>
								Débloquer
							</button>
						);
					}
				} else {
					buttons = (
						<>
							<button
								onClick={() => onAction(u, 'send_request')}
								className="px-3 py-1 bg-blue-500 text-white rounded mr-2"
							>
								Ajouter
							</button>
							<button
								onClick={() => onAction(u, 'block')}
								className="px-3 py-1 bg-red-500 text-white rounded"
							>
								Bloquer
							</button>
						</>
					);
				}

				return (
					<div key={u.id} className="flex items-center justify-between mb-4">
						<div className="flex items-center">
							<Avatar src={u.avatar} alt={u.username} />
							<span className="ml-3 font-medium">{u.username}</span>
						</div>
						<div className="flex space-x-2">{buttons}</div>
					</div>
				);
			})
		) : (
			<p className="text-gray-500">Aucun ami</p>
		)}
	</div>
);

const ChatHeader: React.FC<{ title: string; status: string; duration: string }> = ({
	title,
	status,
	duration,
}) => {
	const { dark, toggle } = useTheme();
	return (
		<header
			className={`p-4 flex justify-between items-center border-b ${dark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
				}`}
		>
			<h2 className="text-2xl font-semibold truncate max-w-xs">{title}</h2>
			<div className="flex items-center space-x-4">
				<button onClick={toggle} aria-label="Toggle theme">
					{dark ? '☀️' : '🌙'}
				</button>
				<span
					className={`px-3 py-1 rounded-full text-sm ${status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
						}`}
				>
					{status}
				</span>
				<span className="text-gray-500">{duration}</span>
			</div>
		</header>
	);
};

const MessageItem: React.FC<{ msg: Message; isOwn: boolean }> = ({ msg, isOwn }) => (
	<div
		className={`${isOwn ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-100 text-gray-800'
			} p-3 rounded-xl max-w-xs`}
	>
		<p>{msg.message}</p>
		<span className="text-xs block text-right text-gray-400 mt-1">
			{format(new Date(msg.sent_at), 'HH:mm')}
		</span>
	</div>
);

const MessageList: React.FC<{
	messages: Message[];
	currentUserId: number | null;
	isLoading: boolean;
	onScroll: (atBottom: boolean) => void;
}> = ({ messages, currentUserId, isLoading, onScroll }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const grouped = React.useMemo(() => {
		return messages.reduce((acc: Record<string, Message[]>, msg) => {
			const date = new Date(msg.sent_at);
			const key = isToday(date)
				? "Aujourd’hui"
				: isYesterday(date)
					? 'Hier'
					: format(date, 'dd MMM yyyy');
			; (acc[key] = acc[key] || []).push(msg);
			return acc;
		}, {});
	}, [messages]);

	const handleScroll = () => {
		const el = containerRef.current;
		if (!el) return;
		onScroll(Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5);
	};

	useEffect(() => {
		const el = containerRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

	if (isLoading) {
		return (
			<div className="p-4 space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} height="60px" />
				))}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
		>
			{Object.entries(grouped).map(([day, msgs]) => (
				<div key={day}>
					<div className="text-center text-gray-500 my-2">{day}</div>
					{msgs.map((msg) => (
						<MessageItem key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} />
					))}
				</div>
			))}
		</div>
	);
};

const MessageInput: React.FC<{
	value: string;
	onChange: (v: string) => void;
	onSend: () => void;
}> = ({ value, onChange, onSend }) => (
	<div className="p-4 border-t flex items-center space-x-3 bg-white">
		<input
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder="Tapez un message..."
			className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
			aria-label="Message input"
			onKeyDown={(e) => {
				if (e.key === 'Enter') onSend();
			}}
		/>
		<button onClick={onSend} disabled={!value.trim()} className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50">
			<Send />
		</button>
	</div>
);

export default function WebSocketChat() {
	const [dark, setDark] = useState(false);
	const toggle = () => setDark((p) => !p);

	const [status, setStatus] = useState<'Connecting...' | 'Connected' | 'Closed' | 'Error' | 'Reconnecting'>(
		'Connecting...'
	);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [friends, setFriends] = useState<User[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [input, setInput] = useState('');
	const [duration, setDuration] = useState('0h 0m 0s');
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [hasMoreHistory, setHasMoreHistory] = useState(true);
	const [atBottom, setAtBottom] = useState(true);

	const startRef = useRef(Date.now());
	const currentUserIdRef = useRef<number | null>(null);

	// Timer for duration
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

	// Load more history
	const loadHistory = (groupId: number, firstMessageId: number) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		setLoadingHistory(true);
		ws.send(JSON.stringify({ action: 'loadMoreMessage', group_id: groupId, firstMessageId }));
	};

	// Handle incoming messages/actions
	const handleMessage = (data: any) => {
		switch (data.action) {
			case 'init_connected': {
				const rawGroups = data.groups;
				const groupsArr: any[] = Array.isArray(rawGroups) ? rawGroups : Object.values(rawGroups);
				setCurrentUser(data.user);
				currentUserIdRef.current = data.user.id;
				setFriends(
					data.friends.map((u: any) => ({
						...u,
						relation: u.relation ? { ...u.relation } : undefined,
						online: u.online,
					}))
				);
				setGroups(
					groupsArr.map((g: any) => {
						const msgs: Message[] = Array.isArray(g.messages)
							? g.messages
							: Object.values(g.messages || {});
						return {
							id: g.id,
							name: g.name,
							members: g.members,
							messages: msgs,
							owners_id: g.owners_id,
							onlines_id: g.onlines_id,
							private: g.private,
						};
					})
				);
				if (groupsArr.length > 0) {
					setActiveId(groupsArr[0].id);
					loadHistory(groupsArr[0].id, 0);
				}
				break;
			}
			case 'loadMoreMessage': {
				const { group_id, messages } = data;
				// messages peut arriver en objet ou tableau
				const newMsgs: Message[] = Array.isArray(messages)
					? messages
					: Object.values(messages || {});
				setGroups(prev =>
					prev.map(g =>
						g.id === group_id
							? { ...g, messages: [...newMsgs, ...g.messages] }
							: g
					)
				);
				setLoadingHistory(false);
				setHasMoreHistory(newMsgs.length === PAGE_SIZE);
				break;
			}
			case 'new_message': {
				const { group_id, message } = data;
				if (message.sender_id === currentUserIdRef.current) return;
				setGroups(prev =>
					prev.map(g =>
						g.id === group_id
							? { ...g, messages: [...g.messages, message] }
							: g
					)
				);
				break;
			}
			case 'friend_request':
			case 'cancel_request':
			case 'accept_friend':
			case 'refuse_friend':
			case 'remove_friend':
			case 'block_user':
			case 'unblock_user': {
				// Backend renvoie toujours liste à jour
				setFriends(data.friends.map((u: any) => ({
					...u,
					relation: u.relation ? { ...u.relation } : undefined,
					online: u.online,
				})));
				break;
			}
			default:
				break;
		}
	};

	const ws = useSafeWebSocket({
		endpoint: '/chat',
		onMessage: handleMessage,
		onStatusChange: setStatus,
		reconnectDelay: 3000,
	});

	// Update status label
	useEffect(() => {
		setStatus(ws?.readyState === WebSocket.OPEN ? 'Connected' : 'Connecting...');
	}, [ws]);

	// Reload history if switching group
	useEffect(() => {
		if (activeId !== null) {
			const grp = groups.find((g) => g.id === activeId);
			if (grp && grp.messages.length === 0) loadHistory(activeId, 0);
		}
	}, [activeId, groups]);

	// Send a new chat message
	const sendMessage = () => {
		if (activeId == null || !ws || ws.readyState !== WebSocket.OPEN) return;
		const now = Date.now();
		const newMsg: Message = {
			id: now,
			sender_id: currentUserIdRef.current!,
			message: input,
			sent_at: new Date(now).toISOString(),
		};
		setGroups((prev) =>
			prev.map((g) => (g.id === activeId ? { ...g, messages: [...g.messages, newMsg] } : g))
		);
		ws.send(JSON.stringify({ action: 'new_message', group_id: activeId, message: input }));
		setInput('');
		setAtBottom(true);
	};

	// Handle friend actions
	const handleFriendAction = (u: User, action: string) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		switch (action) {
			case 'send_request':
				ws.send(JSON.stringify({ action: 'friend_request', user_id: u.id }));
				break;
			case 'cancel_request':
				ws.send(JSON.stringify({ action: 'cancel_request', user_id: u.id }));
				break;
			case 'accept_friend':
				ws.send(JSON.stringify({ action: 'accept_friend', user_id: u.id }));
				break;
			case 'refuse_friend':
				ws.send(JSON.stringify({ action: 'refuse_friend', user_id: u.id }));
				break;
			case 'remove_friend':
				ws.send(JSON.stringify({ action: 'remove_friend', user_id: u.id }));
				break;
			case 'block':
				ws.send(JSON.stringify({ action: 'block_user', user_id: u.id }));
				break;
			case 'unblock':
				ws.send(JSON.stringify({ action: 'unblock_user', user_id: u.id }));
				break;
			case 'message':
				if (u.relation?.privmsg_id) setActiveId(u.relation.privmsg_id);
				break;
			default:
				break;
		}
	};

	const activeGroup: Group = groups.find((g) => g.id === activeId) || {
		id: -1,
		name: 'Sélectionnez une discussion',
		members: [],
		messages: [],
		owners_id: [],
		onlines_id: [],
		private: 0,
	};

	return (
		<ThemeContext.Provider value={{ dark, toggle }}>
			<div className={`${dark ? 'dark bg-gray-900' : 'bg-gray-50'} flex h-screen`}>
				<aside className="w-80 p-6 space-y-8 shadow-lg overflow-y-auto bg-white dark:bg-gray-800">
					<GroupList
						groups={groups}
						activeId={activeId}
						onSelect={(id) => {
							setActiveId(id);
							setAtBottom(true);
						}}
						currentUserId={currentUser?.id ?? null}
					/>
					<FriendsList
						friends={friends}
						currentUserId={currentUser?.id ?? null}
						onAction={handleFriendAction}
					/>
				</aside>

				<div className="flex-1 flex flex-col min-h-0">
					<ChatHeader
						title={
							activeGroup.private === 1 && currentUser
								? activeGroup.members.find((m) => m.id !== currentUser.id)?.username ||
								activeGroup.name
								: activeGroup.name
						}
						status={status}
						duration={duration}
					/>

					<div className="relative flex-1 flex flex-col min-h-0">
						{hasMoreHistory && activeGroup.messages.length > 0 && (
							<button
								onClick={() => loadHistory(activeGroup.id, activeGroup.messages[0].id)}
								disabled={loadingHistory}
								className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-gray-200 p-2 rounded-full hover:bg-gray-300 z-10"
							>
								{loadingHistory ? <Loader2 className="animate-spin" /> : 'Charger anciens'}
							</button>
						)}

						<MessageList
							messages={activeGroup.messages}
							currentUserId={currentUserIdRef.current}
							isLoading={loadingHistory}
							onScroll={setAtBottom}
						/>

						{!atBottom && activeGroup.messages.length > 0 && (
							<button
								onClick={() => setAtBottom(true)}
								className="absolute bottom-24 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg"
							>
								Nouveaux messages
							</button>
						)}
					</div>

					<MessageInput value={input} onChange={setInput} onSend={sendMessage} />
				</div>
			</div>
		</ThemeContext.Provider>
	);
}