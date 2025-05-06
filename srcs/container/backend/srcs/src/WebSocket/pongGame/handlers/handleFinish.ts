import { playerStat } from "../types/playerStat";

export function handleFinish(playerInfos: playerStat) {
	playerInfos.inGame = false;
	playerInfos.game.setStatus("EXIT");
}