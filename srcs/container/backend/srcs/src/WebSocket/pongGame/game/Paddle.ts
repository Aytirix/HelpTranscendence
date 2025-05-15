import { Ball } from "./Ball";
import { playerStat } from "../types/playerStat";
import { Ai } from "./pongAi/qLearning";

export class Paddle {
	constructor (
		public pos_x: number, //20
		public pos_y: number, // 250
		private playerInfos?: playerStat,
		private ai?: Ai,
		public readonly height: number = 100,
		public readonly width: number = 10,
		public readonly margin: number = 10,
		public readonly speed: number = 10,
		private score: number = 0

	) {}
	move(cmd: string): void {
	
		switch (cmd) {
		case "up" :
			if (this.pos_y >= 3) {
					this.pos_y -= 5;//5
			}
			break;
		case "down" :
			if (this.pos_y + this.height <= 600) {
					this.pos_y += 5;//5
			}
			break;
		case "center" :
			break ;
		}
	}
	isCollidingWithBall(ball: Ball): boolean {
		const ball_x: number = ball.pos_x + (ball.pos_x > 400 ? ball.radius : -ball.radius);
		const ball_y_top: number = ball.pos_y + ball.radius;
		const ball_y_bottom: number = ball.pos_y - ball.radius;

		const xCollision: boolean = this.pos_x < 400 ? ball_x <= this.pos_x : ball_x >= this.pos_x;

		return xCollision 
			&& ball_y_top >= this.pos_y
			&& ball_y_bottom <= this.pos_y + this.height;
	}
	zoneEffect(ball: Ball): void {
		const y: number = ball.pos_y - this.pos_y;
		if (y < 0) 
			ball.d_y = -1.5;
		else if (y == 0) 
			ball.d_y = -1.25;
		else if (y <= 20) 
			ball.d_y = -1;
		else if (y <= 40) 
			ball.d_y = -0.5;
		else if (y <= 60) 
			ball.d_y = 0;
		else if (y <= 80) 
			ball.d_y = 0.5;
		else if (y < 100) 
			ball.d_y = 1;
		else if (y == 100) 
			ball.d_y = 1.25;
		else 
			ball.d_y = 1.5;
	}
	setScore() : void {
		this.score += 1;
	}
	getScore() : number { return (this.score); }
	getPlayerInfos() : playerStat {return (this.playerInfos); }
	getAi() : Ai { return (this.ai); }
}