import { Game } from "../game/Game";
import { WebSocket } from "ws";

export interface playerStat {
	game?: Game;
	avatar?: string;
	email: string;
	name: string;
	id: number;
	mode?: "Multi" | "Solo" | "SameKeyboard" | "Tournament" | "Undefined" | "Move" | "EXIT" | "Ping";
	inGame : boolean;
	socket: WebSocket;
	lastping?: number;
};