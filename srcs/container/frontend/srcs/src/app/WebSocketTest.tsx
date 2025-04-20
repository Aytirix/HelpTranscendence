import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import useSafeWebSocket from '../api/useSafeWebSocket';

// === Theme Context ===
const ThemeContext = createContext({ dark: false, toggle: () => {} });
const useTheme = () => useContext(ThemeContext);

// Pagination constant
const PAGE_SIZE = 20;

// === Sub-components ===
const Skeleton: React.FC<{ height?: string }> = ({ height = '1rem' }) => (
  <div className="animate-pulse bg-gray-200 rounded" style={{ height, width: '100%' }} />
);

const Avatar: React.FC<{ src: string | null; alt: string }> = ({ src, alt }) => (
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
  )
);

const GroupList: React.FC<{ groups: Group[]; activeId: number | null; onSelect: (id: number) => void }> = ({ groups, activeId, onSelect }) => (
  <div>
    <h2 className="text-xl font-bold mb-3">Mes groupes</h2>
    {groups.length > 0 ? (
      groups.map(g => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className={`w-full text-left p-3 rounded-lg mb-2 transition-shadow ${
            g.id === activeId ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:shadow-md'
          }`}
        >
          {g.name}
        </button>
      ))
    ) : (
      <p className="text-gray-500">Aucun groupe</p>
    )}
  </div>
);

const FriendsList: React.FC<{ friends: User[] }> = ({ friends }) => (
  <div>
    <h2 className="text-xl font-bold mb-3">Amis en ligne</h2>
    {friends.length > 0 ? (
      friends.map(u => (
        <div key={u.id} className="flex items-center mb-3">
          <Avatar src={u.avatar} alt={u.username} />
          <span className="ml-3 font-medium">{u.username}</span>
        </div>
      ))
    ) : (
      <p className="text-gray-500">Aucun ami</p>
    )}
  </div>
);

const ChatHeader: React.FC<{ title: string; status: string; duration: string }> = ({ title, status, duration }) => {
  const { dark, toggle } = useTheme();
  return (
    <header
      className={`p-4 flex justify-between items-center border-b ${
        dark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
      }`}
    >
      <h2 className="text-2xl font-semibold truncate">{title}</h2>
      <div className="flex items-center space-x-4">
        <button onClick={toggle} aria-label="Toggle theme">
          {dark ? '☀️' : '🌙'}
        </button>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {status}
        </span>
        <span className="text-gray-500">{duration}</span>
      </div>
    </header>
  );
};

type Message = { id: number; sender_id: number; message: string; sent_at: string };
type User = { id: number; username: string; email: string; avatar: string | null; lang: string; friends: any[] };
type Group = { id: number; name: string; members: User[]; messages: Message[] };

const MessageItem: React.FC<{ msg: Message; isOwn: boolean }> = ({ msg, isOwn }) => (
  <div
    className={`${
      isOwn ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-100 text-gray-800'
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
        ? 'Aujourd’hui'
        : isYesterday(date)
        ? 'Hier'
        : format(date, 'dd MMM yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(msg);
      return acc;
    }, {});
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop === el.clientHeight;
    onScroll(atBottom);
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
          {msgs.map(msg => (
            <MessageItem key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} />
          ))}
        </div>
      ))}
    </div>
  );
};

const MessageInput: React.FC<{ value: string; onChange: (v: string) => void; onSend: () => void }> = ({ value, onChange, onSend }) => (
  <div className="p-4 border-t flex items-center space-x-3 bg-white">
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
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

export default function WebSocketChat() {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark(prev => !prev);

  const [status, setStatus] = useState<'Connecting...'|'Connected'|'Closed'|'Error'|'Reconnecting'>('Connecting...');
  const [currentUser, setCurrentUser] = useState<User|null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId] = useState<number|null>(null);
  const [input, setInput] = useState('');
  const [duration, setDuration] = useState('0h 0m 0s');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [atBottom, setAtBottom] = useState(true);

  const startRef = useRef(Date.now());
  const currentUserIdRef = useRef<number|null>(null);

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
    ws.send(JSON.stringify({ action: 'loadMoreMessage', group_id: groupId, firstMessageId }));
  };

  const handleMessage = (data: any) => {
    const { action } = data;
    switch (action) {
      case 'init_connected': {
        setCurrentUser(data.user);
        currentUserIdRef.current = data.user.id;
        setFriends(data.friends_connected || []);
        setGroups(data.groups || []);
        if (data.groups.length) {
          setActiveId(data.groups[0].id);
          loadHistory(data.groups[0].id, 0);
        }
        break;
      }
      case 'friend_connected':
        setFriends(prev => [...prev, data.user]);
        break;
      case 'user_disconnected':
        setFriends(prev => prev.filter(u => u.id !== data.user));
        break;
      case 'typing': {
        if (!typingUsers.includes(data.username)) {
          setTypingUsers(prev => [...prev, data.username]);
          setTimeout(() => setTypingUsers(u => u.filter(n => n !== data.username)), 2500);
        }
        break;
      }
      case 'loadMoreMessage': {
        const { group_id, messages } = data;
        setGroups(prev => prev.map(g => g.id === group_id ? { ...g, messages: [...messages, ...g.messages] } : g));
        setLoadingHistory(false);
        setHasMoreHistory(messages.length === PAGE_SIZE);
        break;
      }
      case 'new_message': {
        const { group_id, message } = data;
        if (message.sender_id === currentUserIdRef.current) return;
        setGroups(prev => prev.map(g => {
          if (g.id !== group_id) return g;
          return { ...g, messages: [...g.messages, message] };
        }));
        break;
      }
      default:
        break;
    }
  };

  const { socket: ws, status: wsStatus } = useSafeWebSocket({ endpoint: '/chat', onMessage: handleMessage, onStatusChange: setStatus, reconnectDelay: 3000 });
  useEffect(() => setStatus(wsStatus), [wsStatus]);

  useEffect(() => {
    if (activeId !== null) {
      const grp = groups.find(g => g.id === activeId);
      if (grp && grp.messages.length === 0) loadHistory(activeId, 0);
    }
  }, [activeId]);

  const sendTyping = () => {
    if (activeId !== null && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'typing', group_id: activeId, username: currentUser?.username }));
    }
  };

  const sendMessage = () => {
    if (activeId === null || !ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    const newMsg: Message = { id: now, sender_id: currentUserIdRef.current!, message: input, sent_at: new Date(now).toISOString() };
    setGroups(prev => prev.map(g => g.id === activeId ? { ...g, messages: [...g.messages, newMsg] } : g));
    ws.send(JSON.stringify({ action: 'new_message', group_id: activeId, message: input, sent_at: newMsg.sent_at }));
    setInput('');
  };

  const activeGroup = groups.find(g => g.id === activeId) || { name: 'Sélectionnez un groupe', messages: [] };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={`${dark ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex h-screen`}>        
        <aside className="w-80 p-6 space-y-8 shadow-lg overflow-y-auto bg-white dark:bg-gray-800">
          <GroupList groups={groups} activeId={activeId} onSelect={id => { setActiveId(id); setAtBottom(true); }} />
          <FriendsList friends={friends} />
        </aside>

        <div className="flex-1 flex flex-col min-h-0">          
          <ChatHeader title={activeGroup.name} status={status} duration={duration} />

          <div className="relative flex-1 flex flex-col min-h-0">
            {hasMoreHistory && (
              <button
                onClick={() => loadHistory(activeId!, activeGroup.messages[0]?.id || 0)}
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

            {typingUsers.length > 0 && (
              <div className="absolute bottom-16 left-6 italic text-sm text-gray-500">
                {typingUsers.join(', ')} écrit...
              </div>
            )}
          </div>

          <MessageInput value={input} onChange={v => { setInput(v); sendTyping(); }} onSend={sendMessage} />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
