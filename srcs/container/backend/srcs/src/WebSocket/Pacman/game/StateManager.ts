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

	public createRoom(player: player): room {
		if (this.PlayerIsRoom(player)) return;
		const game: room = {
			id: Date.now() + Math.floor(Math.random() * 1000),
			owner_id: player.id,
			players: [player],
			state: 'waiting',
		};
		this.rooms.set(game.id, game);
		return game;
	}

	public PlayerIsRoom(player: player): boolean {
		for (const game of this.rooms.values()) {
			if (game.players.some(p => p.id === player.id)) {
				return true;
			}
		}
		return false;
	}

	public addPlayerToRoom(roomId: number, player: player): void {
		if (this.PlayerIsRoom(player)) return;
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
				this.rooms.set(roomId, game);
			}
		}
	}

	public removePlayerFromRoom(roomId: number, playerId: number): void {
		const game = this.getRoom(roomId);
		if (game) {
			if (game.owner_id === playerId) {
				console.log('Owner left the game');
				const newOwner = game.players.find(player => player.id !== playerId);
				if (!newOwner) return this.removeGame(roomId);
				game.owner_id = newOwner.id;
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

	public sendRooms(ws: WebSocket[]): void {
		const waitingRooms = this.getWaitingGames();
		const activeRooms = this.getActiveGames();
		const rooms = {
			action: 'getrooms',
			waiting: waitingRooms,
			active: activeRooms,
		};
		for (const socket of ws) {
			socket.send(JSON.stringify(rooms));
		}
	}
}

class StateManager {
	private static instance: StateManager;
	private Player: Map<number, player> = new Map();
	private Playerws: Map<number, WebSocket> = new Map();
	private RoomManager: RoomManager = RoomManager.getInstance();

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

	public addPlayer(player: player, ws: WebSocket): void {
		this.Player.set(player.id, player);
		this.Playerws.set(player.id, ws);
		// Si pas de room existante, on en crée une
		if (!this.RoomManager.getWaitingGames().length) this.RoomManager.createRoom(player);
		else {
			const room = this.RoomManager.getWaitingGames()[0];
			this.RoomManager.addPlayerToRoom(room.id, player);
		}
	}

	public removePlayer(playerId: number): void {
		this.Player.delete(playerId);
		this.RoomManager.removePlayerFromAllRoom(playerId);
		this.Playerws.delete(playerId);
	}

	public async loopRooms(): Promise<void> {
		while (true) {
			const waitingRooms = this.RoomManager.getWaitingGames();
			const now = Date.now();

			for (const player of this.Player.values()) {
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
			this.RoomManager.sendRooms(Array.from(this.Playerws.values()));
			await this.sleep(250);
		}
	}
}

export default StateManager.getInstance();