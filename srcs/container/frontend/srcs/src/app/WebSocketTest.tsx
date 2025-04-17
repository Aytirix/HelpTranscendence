import { useEffect, useState, useRef } from 'react';

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

const WebSocketChat = () => {
  const [status, setStatus] = useState('Connecting...');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usersConnected, setUsersConnected] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [duration, setDuration] = useState('0s');

  const socketRef = useRef<WebSocket | null>(null);
  const startRef = useRef<Date | null>(null);
  const currentUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = new WebSocket('wss://localhost:7000/chat');
    socketRef.current = socket;

    let hbInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    socket.onopen = () => {
      setStatus('Connected');
      startRef.current = new Date();

      hbInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'ping' }));
        }
      }, 50000);

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
          case 'connected':
            setCurrentUser(data.user);
            currentUserIdRef.current = data.user.id;
            setUsersConnected(data.users_connected);
            setGroups(data.groups);
            if (data.groups.length > 0) setActiveGroupId(data.groups[0].id);
            break;
          case 'pong':
            break;
          case 'new_message': {
            const { group_id, message } = data;
            if (message.sender_id === currentUserIdRef.current) return;
            setGroups(prev => prev.map(g =>
              g.id === group_id ? { ...g, messages: [...g.messages, message] } : g
            ));
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.error('Invalid JSON', e);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed', event.code, event.reason);
      setStatus('Closed');
      clearInterval(hbInterval);
      clearInterval(timerInterval);
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setStatus('Error');
      clearInterval(hbInterval);
      clearInterval(timerInterval);
    };

    return () => {
      clearInterval(hbInterval);
      clearInterval(timerInterval);
      socket.close();
    };
  }, []); // run once

  const sendMessage = () => {
    const socket = socketRef.current;
    if (!activeGroupId || !socket || socket.readyState !== WebSocket.OPEN) return;

    const newMsg: Message = {
      id: Date.now(),
      sender_id: currentUserIdRef.current!,
      message: input,
      sent_at: new Date().toISOString(),
    };

    setGroups(prev => prev.map(g =>
      g.id === activeGroupId ? { ...g, messages: [...g.messages, newMsg] } : g
    ));

    socket.send(JSON.stringify({ action: 'new_message', group_id: activeGroupId, message: input }));
    setInput('');
  };

  const activeGroup = groups.find(g => g.id === activeGroupId) || null;

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Groups</h2>
        {groups.length ? groups.map(g => (
          <div
            key={g.id}
            onClick={() => setActiveGroupId(g.id)}
            className={`p-2 mb-2 rounded-lg cursor-pointer transition-colors ${
              g.id === activeGroupId ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
            }`}
          >
            {g.name}
          </div>
        )) : <p className="text-gray-500">No groups</p>}
      </aside>

      <section className="flex flex-col flex-1">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{activeGroup ? activeGroup.name : 'Select a group'}</h2>
          <span className="text-sm text-gray-500">{status} · {duration}</span>
        </header>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeGroup ? activeGroup.messages.map(msg => {
            const isOwn = msg.sender_id === currentUserIdRef.current;
            const sender = isOwn ? 'You' : activeGroup.members.find(m => m.id === msg.sender_id)?.username;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2/3 p-3 rounded-2xl shadow ${isOwn ? 'bg-green-100' : 'bg-white'}`}>  
                  <div className="font-medium mb-1">{sender}</div>
                  <div className="break-words">{msg.message}</div>
                  <div className="text-xs text-gray-400 text-right mt-1">{new Date(msg.sent_at).toLocaleTimeString()}</div>
                </div>
              </div>
            );
          }) : <p className="text-center text-gray-500">No chat loaded.</p>}
        </div>

        {activeGroup && (
          <div className="bg-white border-t border-gray-200 p-4 flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 mr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition"
            >Send</button>
          </div>
        )}
      </section>

      <aside className="w-48 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Online</h2>
        {usersConnected.length ? usersConnected.map(u => (
          <div key={u.id} className="py-1 text-gray-800">{u.username}</div>
        )) : <p className="text-gray-500">No one online</p>}
      </aside>
    </div>
  );
};

export default WebSocketChat;
