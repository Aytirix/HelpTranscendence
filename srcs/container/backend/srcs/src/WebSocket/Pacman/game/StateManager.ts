import { player, room, GameState } from "@Pacman/TypesPacman";
import { WebSocket } from 'ws'

class RoomManager {
	private static instance: RoomManager;
	private rooms: Map<number, room> = new Map();
	private constructor() { }

	static getInstance(): RoomManager {
		if (!RoomManager.instance) {
			RoomManager.instance = new RoomManager();
		}
		return RoomManager.instance;
	}

	public createRoom(player: player, name: string): room {
		if (this.PlayerInRoom(player.id)) return;
		const game: room = {
			id: Date.now() + Math.floor(Math.random() * 1000),
			name: name,
			owner_id: player.id,
			owner_username: player.username,
			players: [player],
			state: 'waiting',
		};
		this.rooms.set(game.id, game);
		return game;
	}

	public joinRoom(player: player, roomId: number): void {
		if (this.PlayerInRoom(player.id)) return;
		const game = this.getRoom(roomId);
		console.log('Player joined room:', game);
		if (game && game.players.length < 5) {
			game.players.push(player);
			this.rooms.set(roomId, game);
		}
	}

	public PlayerInRoom(playerId: number): boolean {
		for (const game of this.rooms.values()) {
			if (game.players.some(p => p.id === playerId)) {
				return true;
			}
		}
		return false;
	}

	public addPlayerToRoom(roomId: number, player: player): void {
		if (this.PlayerInRoom(player.id)) return;
		const game = this.getRoom(roomId);
		if (game && game.players.length < 5) {
			game.players.push(player);
			this.rooms.set(roomId, game);
		}
	}

	public setRoomOwner(roomId: number, playerId: number): void {
		const game = this.getRoom(roomId);
		if (game) {
			const player = game.players.find(player => player.id === playerId);
			if (player) {
				game.owner_id = playerId;
				game.owner_username = player.username;
				this.rooms.set(roomId, game);
			}
		}
	}

	public removePlayerFromRoom(roomId: number, playerId: number): void {
		const game = this.getRoom(roomId);
		if (game) {
			if (game.owner_id === playerId) {
				const newOwner = game.players.find(player => player.id !== playerId);
				if (!newOwner) return this.removeGame(roomId);
				game.owner_id = newOwner.id;
				game.owner_username = newOwner.username;
			}
			game.players = game.players.filter(player => player.id !== playerId);
			this.rooms.set(roomId, game);
		}
	}

	public removePlayerFromAllRoom(playerId: number): void {
		for (const game of this.rooms.values()) {
			this.removePlayerFromRoom(game.id, playerId);
		}
	}

	public updateRoomState(roomId: number, state: GameState): void {
		const game = this.rooms.get(roomId);
		if (game) {
			game.state = state;
			this.rooms.set(roomId, game);
		}
	}

	public removeGame(roomId: number): void {
		this.rooms.delete(roomId);
	}

	public getRoom(roomId: number): room | undefined {
		return this.rooms.get(roomId);
	}

	public getWaitingGames(): room[] {
		return Array.from(this.rooms.values()).filter(game => game.state === 'waiting');
	}

	public getActiveGames(): room[] {
		return Array.from(this.rooms.values()).filter(game => game.state === 'active');
	}

	public getRoomById(id: number): room | undefined {
		for (const game of this.rooms.values()) {
			if (game.id === id) {
				return game;
			}
		}
		return undefined;
	}


	public getRoomByName(name: string): room | undefined {
		for (const game of this.rooms.values()) {
			if (game.name === name) {
				return game;
			}
		}
		return undefined;
	}

	public sendRooms(playerws: Map<number, WebSocket>): void {
		const waitingGames = this.getWaitingGames();
		const activeGames = this.getActiveGames();
		for (const [id, ws] of playerws) {
			let rooms = {
				action: 'getrooms',
				waiting: waitingGames,
				active: activeGames,
			};
			if (this.PlayerInRoom(id)) {
				rooms.waiting = rooms.waiting.filter(room => room.players.some(player => player.id === id));
			} else {
				rooms.waiting = rooms.waiting.map(room => ({
					...room,
					numberOfPlayers: room.players.length,
					players: [],
				}));
				rooms.active = rooms.active.map(room => ({
					...room,
					numberOfPlayers: room.players.length,
					players: [],
				}));
			}
			ws.send(JSON.stringify(rooms));
		}
	}
}

class StateManager {
	private static instance: StateManager;
	private PlayerRoom: Map<number, player> = new Map();
	private PlayerGame: Map<number, player> = new Map();
	private Playerws: Map<number, WebSocket> = new Map();
	public RoomManager: RoomManager = RoomManager.getInstance();

	private constructor() { }

	static getInstance(): StateManager {
		if (!StateManager.instance) {
			StateManager.instance = new StateManager();
		}
		return StateManager.instance;
	}

	public sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	public addPlayer(ws: WebSocket, player: player): void {
		this.PlayerRoom.set(player.id, player);
		this.Playerws.set(player.id, ws);
	}

	public removePlayer(playerId: number): void {
		this.PlayerRoom.delete(playerId);
		this.RoomManager.removePlayerFromAllRoom(playerId);
		this.Playerws.delete(playerId);
	}

	public async loopRooms(): Promise<void> {
		while (true) {
			const waitingRooms = this.RoomManager.getWaitingGames();
			const now = Date.now();

			for (const player of this.PlayerRoom.values()) {
				if (now - player.updateAt > 10000) {
					this.RoomManager.removePlayerFromAllRoom(player.id);
					this.removePlayer(player.id);
				}
			}

			for (const room of waitingRooms) {
				for (const player of room.players) {
					if (now - player.updateAt > 10000) {
						if (room.players.length > 1 && player.id === room.owner_id) {
							this.RoomManager.setRoomOwner(room.id, room.players[1].id);
							this.RoomManager.removePlayerFromRoom(room.id, room.owner_id);
						} else this.RoomManager.removePlayerFromRoom(room.id, player.id);
					}
				}
			}
			this.RoomManager.sendRooms(this.Playerws);
			await this.sleep(250);
		}
	}
}

export default StateManager.getInstance();