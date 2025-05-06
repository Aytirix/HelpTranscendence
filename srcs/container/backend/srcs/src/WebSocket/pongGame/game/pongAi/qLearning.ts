import { Ball } from "../Ball";
import { Game } from "../Game";
import { Paddle } from "../Paddle";



export interface QTable {
	[key: string]: [number, number, number, number, number, number, number, number, number, number, number, number];
}; 

export class Ai {
	constructor (
		public alpha: number, //learning rate
		public epsilon: number,
		public gamma: number, //discount factor -> futur
		public qTable: QTable = qTableConstructor(),
		private previousValue: number = 0,
		private reward: number = 0,
		private limitFrameRate: number = 0,
		private Action: "up" | "center" | "down" = "center",
		private previousScore: number = 0,
		private previousScoreOpponent: number = 0,
		private currentScore: number = 0,
		private currentScoreOpponent: number = 0,
		private previousDirectionBall: number = 0,
		private currentDirectionBall: number = 0,
		private currentState?: string,
		private currentIndex?: number,
		private currentValue?: number,
		private previousState?: string,
		private previousIndex?: number,
	) {}
	actionAi(ball: Ball, paddle: Paddle, opponent: Paddle) {

	}
	afterAction(ball: Ball, paddle: Paddle, opponent: Paddle) {
		// this.currentScore = paddle.getScore();
		// this.currentScoreOpponent = opponent.getScore();
		// this.currentDirectionBall = ball.d_x;
		// this.updateReward(ball, paddle);
		// this.getStateFromGame(ball, paddle);
		// this.updateQtable();
	}
	getStateFromGame(ball: Ball, paddle: Paddle)
	{
		let pos: "UP" | "CENTER" | "DOWN";
		let dir: "UP" | "CENTER" | "DOWN";
		let dis: "FAR" | "NEAR";
		let reb: "YES" | "NO";

		if ((ball.pos_y + ball.radius) < paddle.pos_y) pos = "UP";
		else if ((ball.pos_y - ball.radius) > (paddle.pos_y + paddle.height)) pos = "DOWN";
		else pos = "CENTER";

		if (ball.d_y > 0) dir = "DOWN";
		else if (ball.d_y < 0) dir = "UP";
		else dir = "CENTER"

		const disInfo: number = Math.abs(paddle.pos_x - ball.pos_x);

		disInfo > 100 ? dis = "FAR" : dis = "NEAR";

		const rebInfo: number = (ball.pos_y + ball.radius) + (ball.d_y * 60);

		reb = (rebInfo <= 0 || rebInfo >= 600) ? "YES" : "NO";
		
		this.currentState = `${pos}_${dir}_${dis}_${reb}`;
		console.log(this.currentState);
	}
	chooseAction() {
		const action = this.qTable[this.currentState];
		if (this.epsilon < Math.random()) {
			const value = Math.max(...action);
			this.currentIndex = action.indexOf(value);
		}
		else
			this.currentIndex = Math.floor(Math.random() * 3);
		if (this.currentIndex >= 0 && this.currentIndex <= 5)
			this.Action = "up";
		else if (this.currentIndex >= 6 && this.currentIndex <= 11)
			this.Action = "down";
		else if (this.currentIndex == 12)
			this.Action = "center";
		this.limitMove(this.currentIndex);
		this.previousIndex = this.currentIndex;
		this.previousState = this.currentState;
	}
	updateReward(reward: number) {
		switch (reward) {
			case 1 :
				this.reward = 1; // goal for me
				break ;
			case 2 :
				this.reward = (- 1); //goal for opponent
				break ;
			case 3 :
				this.reward = 0.5; //touch my paddle
				break ;
		}
		console.log("reard : ", this.reward);
	}
	updateQtable() {
		// Q(s, a) = Q(s, a) + α * (r + γ * max(Q(s')) - Q(s, a)) formule de Q-learning

		const qPrev = this.qTable[this.previousState][this.previousIndex];
		const max = Math.max(...this.qTable[this.currentState!]);
		console.log("max : ", max);
		this.qTable[this.previousState][this.previousIndex] = 
			qPrev + this.alpha * (this.reward + this.gamma * max - qPrev);
		console.log("qtable",this.qTable[this.previousState][this.previousIndex]);
	}
	limitMove(lenMove: number) {
		if (lenMove <= 5)
			this.limitFrameRate += (lenMove + 1) * 10;
		else if (lenMove >= 6 && lenMove <= 11) 
			this.limitFrameRate += (lenMove - 5) * 10;
	}
	getLimitRate(): number { return (this.limitFrameRate) ;}
	getAction(): string { return this.Action; }
	setReward(Reward: number) {this.reward = Reward}
	setPreviousScore(score: number) { this.previousScore = score; }
	setPreviousDirectionBall(direction: number) { this.previousDirectionBall = direction; }
}

export function qTableConstructor() : QTable {
	const qtable: QTable = {};
	const POS: string[] = ["UP", "CENTER", "DOWN"];
	const DIR: string[] = ["UP", "CENTER", "DOWN"];
	const DIS: string[] = ["FAR", "NEAR"];
	const REB: string[] = ["YES", "NO"];

	for (const pos of POS) {
		for (const dir of DIR) {
			for (const dis of DIS) {
				for (const reb of REB) {
						const key = `${pos}_${dir}_${dis}_${reb}`;
						qtable[key] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
				}
			}
		}
	}
	return (qtable);
}