import { writeFile } from "fs";
import { handleFinish } from "../handlers/handleFinish";
import { Ball } from "./Ball";
import { Paddle } from "./Paddle";
import { join } from "path";

export class Game {
	constructor (
		private ball: Ball,
		private player1: Paddle,
		private player2: Paddle,
		private frameRate: number = 0,
		private detectionPaddle: boolean = false,
		private readonly width: number = 800,
		private readonly height: number = 600,
		private status: "PLAYING" | "KICKOFF" | "EXIT" = "PLAYING",
		private jsonWebsocket: string = ""
	) {}
	start(): void{
		const idInterval = setInterval(() => {
			if (this.update())
				clearInterval(idInterval);
			if (this.player1.getPlayerInfos().mode === "Solo") {
				if (this.detectionPaddle === true) {
					this.detectionPaddle = false;
					this.frameRate = 0;
					this.player2.getAi().getStateFromGame(this.ball, this.player1, this.player2);
					this.player2.getAi().updateQtable();
					this.player2.getAi().chooseAction();
					this.player2.getAi().setReward(0);
				}
			}
		}, 1000 / 60)
	}
	update(): boolean {
		this.frameRate++;
		if (this.getStatus() === "KICKOFF") { return false }
		this.ball.move();
		this.detectionCollision();
		this.jsonWebsocket = JSON.stringify({
			ball: {
				pos_x: this.ball.pos_x,
				pos_y: this.ball.pos_y,
				d_x: this.ball.d_x,
				d_y: this.ball.d_y,
				speed: this.ball.speed,
				radius: this.ball.radius
			},
			player1: {
				pos_x: this.player1.pos_x,
				pos_y: this.player1.pos_y,
				height: this.player1.height,
				width: this.player1.width,
				margin: this.player1.margin,
				speed: this.player1.speed,
				score: this.player1.getScore()
			},
			player2: {
				pos_x: this.player2.pos_x,
				pos_y: this.player2.pos_y,
				height: this.player2.height,
				width: this.player2.width,
				margin: this.player2.margin,
				speed: this.player2.speed,
				score: this.player2.getScore()
			}
		});
		if (this.player1.getPlayerInfos().mode === "Multi"
			&& this.player2.getPlayerInfos().mode === "Multi") {
				this.player1.getPlayerInfos().socket.send(this.jsonWebsocket);
				this.player2.getPlayerInfos().socket.send(this.jsonWebsocket);
			}
		else if (this.player1.getPlayerInfos().mode === "SameKeyboard")
			this.player1.getPlayerInfos().socket.send(this.jsonWebsocket);
		else if (this.player1.getPlayerInfos().mode === "Solo") {
			this.player1.getPlayerInfos().socket.send(this.jsonWebsocket);
			if (this.frameRate < this.player2.getAi().getLimitRate()){
				
				this.player2.move(this.player2.getAi().getAction());
			}
		}
		if (this.checkScore(this.player1, this.player2)) {
			if (this.player1.getPlayerInfos().mode === "Multi"
			&& this.player2.getPlayerInfos().mode === "Multi") {
				this.player1.getPlayerInfos().socket.send(JSON.stringify({type: "EXIT"}));
				this.player2.getPlayerInfos().socket.send(JSON.stringify({type: "EXIT"}));
				handleFinish(this.player1.getPlayerInfos())
				handleFinish(this.player2.getPlayerInfos())
				this.resetDisplay("Multi");
			}
			else {
				this.player1.getPlayerInfos().socket.send(JSON.stringify({type: "EXIT"}));
				handleFinish(this.player1.getPlayerInfos());
				this.resetDisplay("SameKeyboard");
			}
			return (true);

		}
		if (this.getStatus() === "EXIT") {
			if (this.player1.getPlayerInfos().mode === "Multi"
			&& this.player2.getPlayerInfos().mode === "Multi") {
				this.player1.getPlayerInfos().socket.send(JSON.stringify({type: "EXIT"}));
				this.player2.getPlayerInfos().socket.send(JSON.stringify({type: "EXIT"}));
				handleFinish(this.player1.getPlayerInfos());
				handleFinish(this.player2.getPlayerInfos());
				this.resetDisplay("Multi");
			}
			else {
				this.player1.getPlayerInfos().socket.send(JSON.stringify({type: "EXIT"}));
				handleFinish(this.player1.getPlayerInfos());
				this.resetDisplay("SameKeyboard");
			}
			return (true);
		}
		return (false);
	};
	detectionCollision(): void {
		if (this.player1.isCollidingWithBall(this.ball)) {
			this.ball.d_x = -1;
			if (this.ball.speed <= 12.5)
				this.ball.speed += 0.5;
			this.player1.zoneEffect(this.ball);
			console.log("ball cote player1 :",this.ball.pos_y)
			if (this.player1.getPlayerInfos().mode === "Solo") {
				this.player2.getAi().updateReward(4);
				this.player2.getAi().getReboundBall(this.ball, this.player2, this.player1);
				this.detectionPaddle = true;
			}
		}
		else if ((this.ball.pos_x + this.ball.radius) <= 0) {
			console.log("player 1 marque ")
			this.player1.setScore();
			this.serviceBall(0, this.ball, this.player1, this.player2);
		}
		else if (this.player2.isCollidingWithBall(this.ball)) {
			this.ball.d_x = 1;
			if (this.ball.speed <= 12.5)
				this.ball.speed += 0.5;
			this.player2.zoneEffect(this.ball);
			console.log("ball cote player2 :",this.ball.pos_y)
			if (this.player1.getPlayerInfos().mode === "Solo") {
				this.player2.getAi().updateReward(3);
				this.player2.getAi().getReboundBall(this.ball, this.player2, this.player1);
				this.detectionPaddle = true;
			}
		}
		else if ((this.ball.pos_x - this.ball.radius) >= this.width ){
			console.log("player 2 marque ")
			this.player2.setScore();
			this.serviceBall(1, this.ball, this.player1, this.player2);
		}
		if ((this.ball.pos_y - this.ball.radius)<= 0) {
			this.ball.d_y = 1;
			if (this.player1.getPlayerInfos().mode === "Solo"&& this.ball.d_x > 0) {
				this.player2.getAi().updateReward(5);
			}
		}
		else if ((this.ball.pos_y  + this.ball.radius)>= this.height) {
			this.ball.d_y = -1;
			if (this.player1.getPlayerInfos().mode === "Solo"&& this.ball.d_x > 0) {
				this.player2.getAi().updateReward(5);
			}
		}
	}
	serviceBall(direction: number, ball: Ball, player1: Paddle, player2: Paddle) : void {
		console.log(`vrai position de la ball en Y avant de sortir du terrain : ${this.ball.pos_y}`)
		ball.pos_x = this.width / 2;
		ball.pos_y = this.height / 2;
		ball.speed = 7 //ici enlever
		this.player1.pos_x = 780;
		this.player1.pos_y = 250;
		this.player2.pos_x = 20;
		this.player2.pos_y = 250;
		this.setStatus("KICKOFF");
		setTimeout(() => {
			switch (direction) {
				case 1 :
					ball.d_x = -1;
					ball.d_y = 0;
					break;
				case 0 :
					ball.d_x = 1;
					ball.d_y = 0;
					break;
			}
			if (this.player1.getPlayerInfos().mode === "Solo") {
				this.player2.getAi().updateReward(1);
				this.player2.getAi().getReboundBall(this.ball, this.player2, this.player1);
				this.detectionPaddle = true;
			}
		}, 2000); //2000
		setTimeout(() => {
			this.setStatus("PLAYING");
		}, 2000); //2000
	}
	checkScore(player1: Paddle, player2: Paddle) : boolean {
		if (player1.getScore() == 21) {
			console.log("Winner is player 1")
			return (true);
		}
		else if (player2.getScore() == 21){
			console.log("Winner is player 2")
			return (true);
		}
		return (false)
	}
	resetDisplay(msg: string) {
		if (msg === "SameKeyboard")
			this.player1.getPlayerInfos().socket.send(JSON.stringify({ type: "reset" }));
		else {
			this.player1.getPlayerInfos().socket.send(JSON.stringify({ type: "reset" }));
			this.player2.getPlayerInfos().socket.send(JSON.stringify({ type: "reset" }));
		}
	}
	getJsonWebsocket() { return (this.jsonWebsocket); } 
	getStatus() : string { return (this.status); }
	getBall() : Ball {return (this.ball); }
	getPlayer1() : Paddle {return (this.player1); }
	getPlayer2() : Paddle {return (this.player2); }
	setStatus(stat: "PLAYING" | "KICKOFF" | "EXIT") { this.status = stat; }
}