import { Game } from "./Game";
import { Ball } from "./Ball";
import { Paddle } from "./Paddle";
import { WebSocket } from "ws";
import { playerStat } from "../types/playerStat";
import { Ai } from "./pongAi/qLearning";

export function createGame(playerInfos: playerStat, player2Infos?: playerStat) : Game {
	if (playerInfos.mode === "SameKeyboard") {
		const ball = new Ball(20, 271, 1, 0);
		const player1 = new Paddle(780, 250, playerInfos);
		const player2 = new Paddle(20, 250);
		const game: Game = new Game(ball, player1, player2);
		return (game);
	}
	else if (playerInfos.mode === "Multi" && player2Infos.mode === "Multi") {
		const ball = new Ball(20, 271, 1, 0);
		const player1 = new Paddle(780, 250, playerInfos);
		const player2 = new Paddle(20, 250, player2Infos);
		const game: Game = new Game(ball, player1, player2);
		playerInfos.socket.send(JSON.stringify({ type: "assign", value: "player1" }));
		player2Infos.socket.send(JSON.stringify({ type: "assign", value: "player2" }));
		return (game);
	}
	else if (playerInfos.mode === "Solo") {
		const ai =  new Ai(0, 0, 0.9);
		const ball = new Ball(20, 271, 1, 0);
		const player1 = new Paddle(780, 250, playerInfos);
		const player2 = new Paddle(20, 250, playerInfos, ai);
		const game: Game = new Game(ball, player1, player2);
		return (game);
	}
}
