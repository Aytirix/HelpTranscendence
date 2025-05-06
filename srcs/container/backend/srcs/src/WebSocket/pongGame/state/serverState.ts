import { playerStat } from "../types/playerStat";
import { WebSocket } from "ws";

//information general : Map -> socket , players information
export const sockets = new Map<WebSocket, playerStat>();

//information : Map -> id.player, players waiting reconnection
export const waitingID = new Map<number, playerStat>();

//information : set -> player waiting for multi
export const waitingMulti = new Set<playerStat>();
