import { WebSocket, RawData } from 'ws'
import { User } from '@types'
import { webMsg } from './types/webMsg';
import { isJson } from './utils/isJson';
import { sockets, waitingID } from './state/serverState';
import { handleMove } from './handlers/handleMove';
import { handleSameKeyboard } from './handlers/handleSameKeyboard';
import { handleMulti } from './handlers/handleMulti';
import { handleClose } from './handlers/handleClose';
import { handlePing, startingPing } from './handlers/handlePing';
import { playerStat } from './types/playerStat';
import { handleReconnection } from './handlers/handleReconnection';
import { handleFinish } from './handlers/handleFinish';
import { handleSolo } from './handlers/handleSolo';

export let pingMonitoring: boolean = false;

export function pongWebSocket(socket: WebSocket, user: User) {
	if (handleReconnection(socket, user)){}
	else {
		const playerInfos: playerStat = {
				avatar: user.avatar,
				email: user.email,
				name: user.username,
				id: user.id,
				mode: "Undefined",
				inGame: false,
				socket: socket,
				lastping: Date.now()
			};
			sockets.set(socket, playerInfos);
	}
	if (!pingMonitoring) {
		pingMonitoring = true;
		startingPing(sockets);
	}
	socket.on('message', (data: RawData) => {
		const playerInfos = sockets.get(socket);
		if (!playerInfos || !isJson(data.toString())) return ;
		const msg: webMsg = JSON.parse(data.toString());
		switch (msg.type) {
			case "SameKeyboard" :
				handleSameKeyboard(playerInfos, msg);
				break ;
			case "Multi" :
				handleMulti(playerInfos, msg);
				break ;
			case "Solo" :
				handleSolo(playerInfos, msg);
				break ;
			case "Tournament" :
				break ;
			case "Move" :
				handleMove(playerInfos, msg.value);
				break ;
			case "EXIT" :
				handleFinish(playerInfos);
				break ;
			case "Ping" :
				handlePing(playerInfos);
				break;
		}
	});
	socket.on('close', () => {
		const playerInfos = sockets.get(socket);
		console.log("close");
		if (playerInfos) handleClose(playerInfos);
	});
}