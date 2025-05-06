import { WebSocket, RawData } from 'ws'
import { User } from '@types'
import { sockets, waitingID, waitingMulti } from '../state/serverState';
import { playerStat } from '../types/playerStat';

export function handleReconnection(socket: WebSocket, user: User) : boolean {
	if (waitingID.has(user.id)) {
			const tempPlayer = waitingID.get(user.id);
			if (tempPlayer.mode === "SameKeyboard") {
				sockets.delete(tempPlayer.socket);
				tempPlayer.socket = socket;
				tempPlayer.lastping = Date.now();
				sockets.set(socket, tempPlayer);
				waitingID.delete(user.id);
				tempPlayer.socket.send(JSON.stringify({type: "SameKeyboard"}));
				tempPlayer.game.getPlayer1().getPlayerInfos().socket = socket;
				tempPlayer.game.setStatus("PLAYING");
				return (true);
			}
			else if (tempPlayer.mode === "Multi") {
				const user1 = tempPlayer.game.getPlayer1().getPlayerInfos().id;
				sockets.delete(tempPlayer.socket)
				tempPlayer.socket = socket;
				tempPlayer.lastping = Date.now();
				sockets.set(socket, tempPlayer);
				waitingID.delete(user.id);
				if (user1 === user.id)
					tempPlayer.game.getPlayer1().getPlayerInfos().socket = socket;
				else
					tempPlayer.game.getPlayer2().getPlayerInfos().socket = socket;
				tempPlayer.game.setStatus("PLAYING");
				return (true);
			}
		}
	return (false);
}