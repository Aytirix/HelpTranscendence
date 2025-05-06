export class Ball {
	constructor (
		public pos_x: number,
		public pos_y: number,
		public d_x: number,
		public d_y: number,
		public readonly speed: number = 7,
		public readonly radius: number = 4
	) {}
	move(): void{
		this.pos_x += this.d_x * this.speed;
		this.pos_y += this.d_y * this.speed;
		// console.log(`ball : X = ${this.pos_x}`);
		// console.log(`ball : Y = ${this.pos_y}`);
	}
}