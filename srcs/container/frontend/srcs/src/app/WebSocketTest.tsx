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

// === Theme Context ===
const ThemeContext = createContext<{
	dark: boolean;
	toggle: () => void;
}>({ dark: false, toggle: () => { } });
const useTheme = () => useContext(ThemeContext);

// Pagination constant
const PAGE_SIZE = 20;

type FriendStatus = 'accepted' | 'request_sent' | 'received' | 'blocked';
type Message = { id: number; sender_id: number; message: string; sent_at: string };
type User = {
	id: number;
	username: string;
	email: string;
	avatar: string | null;
	lang: string;
	friendStatus: FriendStatus;
	privmsg_id?: number;      // reçu à l'init
	online?: boolean;         // reçu à l'init
};
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

// on affiche PRIVATE chats avec le nom de l'autre user
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
				// si privé, trouver l'autre user
				let label = g.name;
				if (g.private === 1 && currentUserId != null) {
					const other = g.members.find((m) => m.id !== currentUserId);
					if (other) label = other.username;
				}
				return (
					<button
						key={g.id}
						onClick={() => onSelect(g.id)}
						className={`w-full text-left p-3 rounded-lg mb-2 transition-shadow ${g.id === activeId
								? 'bg-blue-600 text-white shadow-lg'
								: 'bg-white hover:shadow-md'
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
	onAction: (user: User, action: string) => void;
}> = ({ friends, onAction }) => (
	<div>
		<h2 className="text-xl font-bold mb-3">Liste d'amis</h2>
		{friends.length > 0 ? (
			friends.map((u) => (
				<div key={u.id} className="flex items-center justify-between mb-4">
					<div className="flex items-center">
						<Avatar src={u.avatar} alt={u.username} />
						<span className="ml-3 font-medium">{u.username}</span>
					</div>
					<div className="flex space-x-2">
						{u.friendStatus === 'accepted' && (
							<>
								<button
									onClick={() => onAction(u, 'message')}
									className="px-3 py-1 bg-blue-500 text-white rounded"
								>
									Message
								</button>
								<button
									onClick={() => onAction(u, 'block')}
									className="px-3 py-1 bg-red-500 text-white rounded"
								>
									Bloquer
								</button>
							</>
						)}
						{/* autres états… */}
					</div>
				</div>
			))
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
		/>
		<button
			onClick={onSend}
			disabled={!value.trim()}
			className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50"
		>
			<Send />
		</button>
	</div>
);

// === Main component ===
export default function WebSocketChat() {
	const [dark, setDark] = useState(false);
	const toggle = () => setDark((p) => !p);

	const [status, setStatus] = useState<
		'Connecting...' | 'Connected' | 'Closed' | 'Error' | 'Reconnecting'
	>('Connecting...');
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

	const loadHistory = (groupId: number, firstMessageId: number) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		setLoadingHistory(true);
		ws.send(
			JSON.stringify({ action: 'loadMoreMessage', group_id: groupId, firstMessageId })
		);
	};

	const handleMessage = (data: any) => {
		switch (data.action) {
			case 'init_connected': {
				// 1) transformer en array
				const rawGroups = data.groups;
				const groupsArr: any[] = Array.isArray(rawGroups)
					? rawGroups
					: Object.values(rawGroups);

				// 2) currentUser + ref
				setCurrentUser(data.user);
				currentUserIdRef.current = data.user.id;

				// 3) friends avec privmsg_id + online
				setFriends(
					data.friends.map((u: any) => ({
						...u,
						friendStatus: 'accepted' as FriendStatus,
						privmsg_id: u.privmsg_id,
						online: u.online,
					}))
				);

				// 4) groupes intialisés
				setGroups(
					groupsArr.map((g: any) => ({
						id: g.id,
						name: g.name,
						members: g.members,
						messages: g.messages || [],
						owners_id: g.owners_id,
						onlines_id: g.onlines_id,
						private: g.private,
					}))
				);

				// 5) sélection + load history
				if (groupsArr.length > 0) {
					setActiveId(groupsArr[0].id);
					loadHistory(groupsArr[0].id, 0);
				}
				break;
			}

			case 'loadMoreMessage': {
				const { group_id, messages } = data;
				setGroups((prev) =>
					prev.map((g) =>
						g.id === group_id
							? { ...g, messages: [...messages, ...g.messages] }
							: g
					)
				);
				setLoadingHistory(false);
				setHasMoreHistory(messages.length === PAGE_SIZE);
				break;
			}

			case 'new_message': {
				const { group_id, message } = data;
				if (message.sender_id === currentUserIdRef.current) return;
				setGroups((prev) =>
					prev.map((g) =>
						g.id === group_id
							? { ...g, messages: [...g.messages, message] }
							: g
					)
				);
				break;
			}


			case 'friend_connected': {
				const id = data.userId;
				const u = data.friends.find((u: any) => u.id === id);
				if (!u) return;
				setFriends((prev) => [
					...prev,
					{ ...u, friendStatus: 'accepted' as FriendStatus },
				]);
				break;
			}

			case 'user_disconnected': {
				setFriends((prev) => prev.filter((u) => u.id !== data.user));
				break;
			}

			case 'loadMoreMessage': {
				const { group_id, messages } = data;
				setGroups((prev) =>
					prev.map((g) =>
						g.id === group_id
							? { ...g, messages: [...messages, ...g.messages] }
							: g
					)
				);
				setLoadingHistory(false);
				setHasMoreHistory(messages.length === PAGE_SIZE);
				break;
			}

			default:
				break;
		}
	};

	// ouverture du WS
	const { socket: ws } = useSafeWebSocket({
		endpoint: '/chat',
		onMessage: handleMessage,
		onStatusChange: setStatus,
		reconnectDelay: 3000,
	});

	// statut WS
	useEffect(() => {
		setStatus(ws?.readyState === WebSocket.OPEN ? 'Connected' : 'Connecting...');
	}, [ws]);

	// si change de groupe actif, load si vide
	useEffect(() => {
		if (activeId !== null) {
			const grp = groups.find((g) => g.id === activeId);
			if (grp && grp.messages.length === 0) loadHistory(activeId, 0);
		}
	}, [activeId, groups]);

	// envoi d'un message
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
			prev.map((g) =>
				g.id === activeId ? { ...g, messages: [...g.messages, newMsg] } : g
			)
		);
		ws.send(JSON.stringify({ action: 'new_message', group_id: activeId, message: input }));
		setInput('');
		setAtBottom(true);
	};

	// action amis: ouvre le chat privé
	const handleFriendAction = (u: User, action: string) => {
		if (action === 'message' && u.privmsg_id != null) {
			// si le groupe privé n'existe pas encore, on pourrait le créer… 
			setActiveId(u.privmsg_id);
		}
		// … block / accept / etc.
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
					<FriendsList friends={friends} onAction={handleFriendAction} />
				</aside>

				<div className="flex-1 flex flex-col min-h-0">
					<ChatHeader
						title={
							activeGroup.private === 1 && currentUser
								? (activeGroup.members.find((m) => m.id !== currentUser.id)?.username ||
									activeGroup.name)
								: activeGroup.name
						}
						status={status}
						duration={duration}
					/>

					<div className="relative flex-1 flex flex-col min-h-0">
						{hasMoreHistory && activeGroup.messages.length > 0 && (
							<button
								onClick={() =>
									loadHistory(activeGroup.id, activeGroup.messages[0].id)
								}
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
