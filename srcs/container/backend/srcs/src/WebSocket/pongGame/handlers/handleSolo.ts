import { playerStat } from "../types/playerStat";
import { webMsg } from "../types/webMsg";
import { createGame } from "../game/initGame";
import { Ai } from "../game/pongAi/qLearning";

export function handleSolo(playerInfos: playerStat, msg: webMsg) {
	if (!playerInfos) return;
	playerInfos.mode = msg.type;
	if (playerInfos.inGame === false) {
		playerInfos.inGame = true;
		playerInfos.game = createGame(playerInfos);
		console.log(`start game solo with ia for ${playerInfos.name}`);
		playerInfos.game.start();
	}
}