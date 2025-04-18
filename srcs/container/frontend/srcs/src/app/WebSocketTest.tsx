import { useEffect, useState, useRef } from 'react';
import { Send } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  lang: string;
  friends: any[];
}

interface Message {
  id: number;
  sender_id: number;
  message: string;
  sent_at: string;
}

interface Group {
  id: number;
  name: string;
  members: User[];
  messages: Message[];
}

export default function WebSocketChat() {
  const [status, setStatus] = useState<'Connecting...' | 'Connected' | 'Closed' | 'Error'>('Connecting...');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friendsConnected, setFriendsConnected] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [duration, setDuration] = useState('0s');
  const [loadingMore, setLoadingMore] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const startRef = useRef<Date | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages or group change
  useEffect(() => {
    if (!loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groups, activeGroupId, loadingMore]);

  // Initialize WebSocket and handlers
  useEffect(() => {
    const socket = new WebSocket('wss://localhost:7000/chat');
    socketRef.current = socket;

    let hbInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    socket.onopen = () => {
      setStatus('Connected');
      startRef.current = new Date();

      // Heartbeat ping
      hbInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'ping' }));
        }
      }, 50000);

      // Session timer
      timerInterval = setInterval(() => {
        if (startRef.current) {
          const diff = Date.now() - startRef.current.getTime();
          const hrs = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setDuration(`${hrs}h ${mins}m ${secs}s`);
        }
      }, 1000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.action) {
          case 'init_connected':
            setCurrentUser(data.user);
            currentUserIdRef.current = data.user.id;
            setFriendsConnected(data.friends_connected || []);
            setGroups(data.groups || []);
            if (data.groups?.length > 0) setActiveGroupId(data.groups[0].id);
            break;
          case 'friend_connected':
            setFriendsConnected(prev => [...prev, data.user]);
            break;
          case 'user_disconnected':
            setFriendsConnected(prev => prev.filter(u => u.id !== data.user));
            break;
          case 'get_message': {
            // prepend older messages
            const { group_id, messages } = data;
            setGroups(prev => prev.map(g =>
              g.id === group_id ? { ...g, messages: [...messages, ...g.messages] } : g
            ));
            setLoadingMore(false);
            break;
          }
          case 'new_message': {
            const { group_id, message } = data;
            if (message.sender_id === currentUserIdRef.current) return;
            setGroups(prev => prev.map(g =>
              g.id === group_id ? { ...g, messages: [...g.messages, message] } : g
            ));
            break;
          }
          default:
            console.warn('Unhandled action:', data.action);
        }
      } catch (e) {
        console.error('Invalid JSON', e);
      }
    };

    socket.onclose = () => {
      setStatus('Closed');
      clearInterval(hbInterval);
      clearInterval(timerInterval);
    };

    socket.onerror = () => {
      setStatus('Error');
      clearInterval(hbInterval);
      clearInterval(timerInterval);
    };

    return () => {
      clearInterval(hbInterval);
      clearInterval(timerInterval);
      socket.close();
    };
  }, []);

  // Send a new message
  const sendMessage = () => {
    if (!activeGroupId || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    const newMsg: Message = {
      id: Date.now(),
      sender_id: currentUserIdRef.current!,
      message: input,
      sent_at: new Date().toISOString(),
    };
    setGroups(prev => prev.map(g =>
      g.id === activeGroupId ? { ...g, messages: [...g.messages, newMsg] } : g
    ));
    socketRef.current.send(JSON.stringify({ action: 'new_message', group_id: activeGroupId, message: input }));
    setInput('');
  };

  // Load older messages
  const loadMore = () => {
    if (!activeGroupId || !socketRef.current) return;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group || group.messages.length === 0) return;
    setLoadingMore(true);
    const lastId = group.messages[0].id;
    socketRef.current.send(JSON.stringify({ action: 'get_message', group_id: activeGroupId, last_message_id: lastId }));
  };

  const activeGroup = groups.find(g => g.id === activeGroupId) || null;
  const hasMore = activeGroup ? activeGroup.messages.length >= 20 : false;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Groups & Friends */}
      <aside className="w-80 bg-white p-6 space-y-8 shadow-lg overflow-y-auto">
        {/* Groups List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">My Groups</h2>
          {groups.length ? (
            <div className="space-y-3">
              {groups.map(g => (
                <div
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-shadow ${g.id === activeGroupId ? 'bg-blue-600 text-white shadow-xl' : 'bg-white hover:shadow-md'}`}
                >
                  <span className="font-semibold text-lg truncate">{g.name}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500">No groups available.</p>}
        </div>

        {/* Friends Online List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Friends Online</h2>
          {friendsConnected.length ? (
            <div className="space-y-3">
              {friendsConnected.map(u => (
                <div key={u.id} className="flex items-center p-3 bg-white rounded-xl shadow hover:shadow-md transition-shadow cursor-default">
                  <div className="w-12 h-12 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mr-4 flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.username} className="w-full h-full rounded-full border-2 border-white object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-gray-500 font-semibold">{u.username.charAt(0)}</div>
                    )}
                  </div>
                  <span className="font-medium text-gray-800">{u.username}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500">No friends online.</p>}
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white p-4 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <h2 className="text-2xl font-semibold truncate">{activeGroup ? activeGroup.name : 'Select a group'}</h2>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{status}</span>
            <span className="text-gray-500">{duration}</span>
          </div>
        </header>

        {/* Messages Container */}
        <div ref={containerRef} className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-white to-gray-100 relative">
          {activeGroup && hasMore && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 mt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
              >
                {loadingMore ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}

          <div className="space-y-4 mt-8">
            {activeGroup ? activeGroup.messages.map(msg => {
              const isOwn = msg.sender_id === currentUserIdRef.current;
              const sender = isOwn ? 'You' : activeGroup.members.find(m => m.id === msg.sender_id)?.username;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>                  
                  <div className={`max-w-[65%] p-5 rounded-2xl shadow-lg ${isOwn ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>  
                    <div className="font-semibold mb-2 text-sm opacity-75">{sender}</div>
                    <div className="break-words text-base">{msg.message}</div>
                    <div className="text-xs text-gray-400 text-right mt-2">{new Date(msg.sent_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              );
            }) : <p className="text-center text-gray-400">Please select a group to start chatting.</p>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        {activeGroup && (
          <div className="bg-white p-4 flex items-center border-t border-gray-200">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full px-5 py-3 mr-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 p-3 rounded-full shadow-md hover:bg-blue-700 transition-shadow"
            >
              <Send size={20} className="text-white" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
