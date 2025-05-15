import { readFileSync } from "fs";
import { Ball } from "../Ball";
import { Game } from "../Game";
import { Paddle } from "../Paddle";
import { join } from "path";



export interface QTable {
	[key: string]: [number, number , number, number, number, number, number, number, number];
}; 


export function qTableConstructor() : QTable {
	const qtable: QTable = {};
	const SENS: string[] = ["TO_IA", "TO_OPPONENT"];
	const REB: string[] = ["YES","NO"];
	const PRE:string[] = ["PRE_UP", "PRE_CENTER", "PRE_DOWN"];
	const POS_OP: string[] = ["UP", "CENTER", "DOWN"];
		for (const sens of SENS) {
				for (const reb of REB) {
					for(const pre of PRE) {
						for (const pos_op of POS_OP) {
							const key = `${sens}_${reb}_${pre}_${pos_op}`;
							qtable[key] = [0, 0, 0, 0, 0, 0, 0, 0, 0]; 
						}
					}
				}
		}
	qtable["KICKOFF"] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	
	return (qtable);
}
export class Ai {
	constructor (
		public alpha: number, //learning rate
		public epsilon: number,
		public gamma: number, //discount factor -> futur
		public qTable: QTable = qTableConstructor(),
		private reward: number = 0,
		private reb: "YES" | "NO" = "NO", //ici
		private limitFrameRate: number = 0,
		private Action: "up" | "center" | "down"  = "center",
		private predPosBall: number = 0,
		private currentState: string = "",
		private previousState: string = "",
		private previousIndex: number = 0,
		private currentIndex: number = 0,
	) {

			try {
				const filePath = join(__dirname, 'fileJson', 'qLearning.json');;
				const jsonString = readFileSync(filePath, 'utf8');
				this.qTable = JSON.parse(jsonString);
			} catch (err) {
				console.warn("⚠️ Aucune Q-table chargée, IA démarre à zéro.");
				this.qTable = qTableConstructor();
			}
	}
	getStateFromGame(ball: Ball, player1: Paddle ,player2: Paddle)
	{
		let sens: "TO_IA" | "TO_OPPONENT" = "TO_IA";
		let reb: "YES" | "NO";
		let pre: "PRE_UP" | "PRE_CENTER" | "PRE_DOWN";
		let pos_op: "UP" | "CENTER" | "DOWN";
		
		if (player2.getPlayerInfos().game?.getStatus() === "KICKOFF") {
			this.currentState = "KICKOFF";
			return ;
		}
		
		
		if (ball.d_x > 0) sens = "TO_OPPONENT";
		else if (ball.d_x < 0) sens = "TO_IA";
		
		// reb = this.getReboundBall(ball, player1, player2); //ici voir si je fais un objet plutot avec yes ou no et zone
		pos_op = this.getPositionPlayer(player1, ball);
		pre = this.getPredictionZone(player2);
		this.limitMove(player2);
		this.currentState = `${sens}_${this.reb}_${pre}_${pos_op}`;
		// console.log("ia2", this.currentState);
	}
	chooseAction() {
		const array: ["up", "center", "down"] = [
			"up", "center", "down"
		]
		if (this.currentState === "KICKOFF")
			this.Action = "center"; //mid
		const action = this.qTable[this.currentState];
		if (this.epsilon < Math.random()) {
			const value = Math.max(...action);
			this.currentIndex = action.indexOf(value);
		}
		else
			this.currentIndex = Math.floor(Math.random() * 9);
		if (this.currentIndex === 0
			|| this.currentIndex === 3
			|| this.currentIndex === 6)
				this.limitFrameRate -= (Math.floor(Math.random() * 41) / 5); // ne pas oublier si j augmente la vitesse de la raquette de modifier peux le 5 
		else if (this.currentIndex === 1
			|| this.currentIndex === 4
			|| this.currentIndex === 7)
				this.limitFrameRate += 0;
		else if (this.currentIndex === 2
			|| this.currentIndex === 5
			|| this.currentIndex === 8)
				this.limitFrameRate +=  (Math.floor((Math.random() * (100 - 61 + 1)) + 61) / 5)
		if (this.currentIndex <= 2)
			this.Action = array[0];
		else if (this.currentIndex <= 5)
			this.Action = array[1]
		else if (this.currentIndex <= 8)
			this.Action = array[2];
		this.previousIndex = this.currentIndex;
		this.previousState = this.currentState;
		this.limitFrameRate = Math.abs(this.limitFrameRate)
		// console.log(this.currentIndex);
		// console.log(this.Action);
		// console.log(this.limitFrameRate)
	}
	getPredictionZone(player: Paddle): "PRE_UP" | "PRE_CENTER" | "PRE_DOWN" {
		if ((player.pos_y + player.height) < this.predPosBall) return ("PRE_DOWN");
		else if (player.pos_y > this.predPosBall) return ("PRE_UP")
		else return ("PRE_CENTER");
	}
	getPositionPlayer(player: Paddle, ball:Ball) : "UP" | "CENTER" | "DOWN" {
		if ((player.pos_y + player.height) < (this.predPosBall - ball.radius)) return ("DOWN");
		else if (player.pos_y > (this.predPosBall + ball.radius)) return ("UP")
		else return ("CENTER");
	}
	updateReward(reward: number) {
		switch (reward) {
			case 1:
				this.reward += 1.5; // but pour moi
				break;
			case 2:
				this.reward += -1; // but pour l’adversaire
				break;
			case 3:
				this.reward += -0.5; // l’adversaire touche
				break;
			case 4:
				this.reward += 1; // interception 
				break;
			case 5:
				this.reward += 0.1; // si rien ne se passe 
				break;
			}
	}

	updateQtable() {
		// if (this.currentState === "KICKOFF")
		// 	return ;
		// Q(s, a) = Q(s, a) + α * (r + γ * max(Q(s')) - Q(s, a)) formule de Q-learning

		// const qPrev = this.qTable[this.previousState][this.previousIndex];
		// const max = Math.max(...this.qTable[this.currentState!]);
		// this.qTable[this.previousState][this.previousIndex] = 
		// 	qPrev + this.alpha * (this.reward + this.gamma * max - qPrev);


			if (!this.previousState
				|| this.previousState === "KICKOFF"
				|| this.currentState  === "KICKOFF") {
				return;
			  }
		  
			// si on n’a pas encore de previousState valide, on sort tout de suite
			if (!this.previousState || !(this.previousState in this.qTable)) {
			  return;
			}
		  
			const qPrev    = this.qTable[this.previousState][this.previousIndex];
			const maxNext  = Math.max(...this.qTable[this.currentState!]);
			this.qTable[this.previousState][this.previousIndex] =
			  qPrev + this.alpha * (this.reward + this.gamma * maxNext - qPrev);
	}
	limitMove(paddle: Paddle) {
		let len: number = 0
		if (this.predPosBall < 550 && this.predPosBall > 50) {
			len = Math.abs((paddle.pos_y + 50) - this.predPosBall);
		}
		else if (this.predPosBall <= 50 || this.predPosBall >= 550)
			len = Math.abs(paddle.pos_y - this.predPosBall);
		this.limitFrameRate = (len  / 5)
	}
	getReboundBall(ball: Ball, paddleLeft: Paddle, paddleRight: Paddle): void {
		let TempX: number = ball.pos_x;
		let TempY: number = ball.pos_y;
		let TempDx: number = ball.d_x;
		let TempDy: number = ball.d_y;
		// console.log("Depart ball Y:", ball.pos_x);
		// console.log("Depart ball Y :", ball.pos_y);
		// console.log("Direction ball X:", ball.d_x);
		// console.log("Direction ball Y:", ball.d_y)

		while (TempX > 0 && TempX < 800) {
			TempX += TempDx * ball.speed;
			if (TempY >= 0 && TempY <= 600) {
				TempY += TempDy * ball.speed;
				// console.log(`TempY ${TempY} TempX ${TempX}`);
			}
			else {
				if (TempY < 0) {
					// console.log("rebon haut")
					this.reb = "YES";
					TempDy = 1;
					TempY = 0;
				}
				else {
					this.reb = "YES";
					TempDy = -1;
					TempY = 600;
				}
			}
		}
		this.predPosBall = TempY;
			// console.log(`PredictionX : ${TempX}`);
			// console.log(`PredictionY : ${TempY}`);
	  }
	  
	getLimitRate(): number { return (this.limitFrameRate) ;}
	getAction(): string { return this.Action; }
	setReward(Reward: number) {this.reward = Reward}
	getQtable(): QTable { return (this.qTable); }
	getCurrentState(): string {
		return this.currentState;
	}
}
