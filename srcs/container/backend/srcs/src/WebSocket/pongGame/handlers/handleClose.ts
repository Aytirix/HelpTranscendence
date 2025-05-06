import { playerStat } from "../types/playerStat";
import { waitingID, waitingMulti } from "../state/serverState";

export function handleClose(playerInfos: playerStat) {
	if (!playerInfos.game) return ;
	playerInfos.game.setStatus("WAITING")
	if (waitingID.has(playerInfos.id) === false && playerInfos.mode === "SameKeyboard")
		waitingID.set(playerInfos.id, playerInfos);
	else if (waitingID.has(playerInfos.id) === false && playerInfos.mode === "Multi")
		waitingID.set(playerInfos.id, playerInfos);
		setTimeout(() => {
		if (playerInfos.mode === "SameKeyboard")
			waitingID.delete(playerInfos.id);
		else if (playerInfos.mode === "Multi")
			waitingID.delete(playerInfos.id);
	}, 5000);
}