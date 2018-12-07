//Define direction symbols
const UP = Symbol('UP')
const DOWN = Symbol('DOWN')
const LEFT = Symbol('LEFT')
const RIGHT = Symbol('RIGHT')

const NORMAL = Symbol('NORMAL')
const COLORBLIND = Symbol('COLORBLIND')

//Define colors of snake head, snake body, snake border, food & candy
const COLORMAP = {
	[NORMAL]: {
		"bgcolor": "#ACECDF",
		"headcolor": "#647d34",
		"bodycolor": "#c0c741",
		"bordercolor": "#f5edba",
		"foodcolor": "#e4943a"
	},
	[COLORBLIND]: {
		"bgcolor": "#000",
		"headcolor": "#eee",
		"bodycolor": "#a9a9a9",
		"bordercolor": "#fff",
		"foodcolor": "#000"
	}
}

//The food class should in charge of spawning food, and check if the snake head touch the exisiting food, draw food
class Food {
	constructor (pieceSize) {
		this.x = 0;
		this.y = 0;
		this.pieceSize = pieceSize;
	}

	//check if the snake head touches the food
	touched (snakeHead) {
		return this.x == snakeHead.x && this.y == snakeHead.y;
	}

	//spawn new food, need to make sure the new food is not spawned inside the snake body
	spawn (xRange, yRange, snakeBody) {
		//Try to get the coordinate of the food first;
		//need to /pieceSize to get the correct coordinate
		let tempX = Math.floor(Math.random() * xRange / this.pieceSize);
		let tempY = Math.floor(Math.random() * yRange / this.pieceSize);

		//check if the food is spawned inside the snake body
		let spawnedInBody = snakeBody.findIndex ((element) => {
			return element.x == tempX && element.y == tempY;
		})

		//do a while loop to make sure the food is not inside the snake body
		while (spawnedInBody > -1) {
			tempX = Math.floor(Math.random() * xRange / this.pieceSize);
			tempY = Math.floor(Math.random() * yRange / this.pieceSize);
			spawnedInBody = snakeBody.findIndex ((element) => {
				return element.x == tempX && element.y == tempY;
			});
		}

		//successfully spawn
		this.x = tempX;
		this.y = tempY;
	}

	draw (ctx, colorMode) {
		ctx.beginPath();
		ctx.rect(this.x*this.pieceSize, this.y*this.pieceSize, this.pieceSize, this.pieceSize);
        ctx.fillStyle = COLORMAP[colorMode].foodcolor;
        ctx.strokeStyle = COLORMAP[colorMode].bordercolor;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
	}
}


//Snake class should in charge of spawn snake, check if the snake head touches the food, record the score and check if the snake is dead(if the head touch body or touch the walls)
class Snake {
	constructor (pieceSize) {
		//init the score & direction
		this.score = 0;
		this.direction = UP;
		this.dead = false;
		this.pieceSize = pieceSize;
	}

	spawn (xRange, yRange, body = null) {
		if(!body) {
			this.body = [
				{x: Math.floor(xRange / (2 * this.pieceSize)), y: Math.floor(yRange / (2 * this.pieceSize))},
				{x: Math.floor(xRange / (2 * this.pieceSize)), y: Math.floor(yRange / (2 * this.pieceSize)) - 1},
				{x: Math.floor(xRange / (2 * this.pieceSize)), y: Math.floor(yRange / (2 * this.pieceSize)) - 2},
			]
		}
		else {
			this.body = body;
		}
	}

	changeDirection (direction) {
		this.direction = direction;
	}

	move (xRange, yRange, food) {
		//get the current head position after each move step
		const moveMap = {
			[LEFT]: ({x, y}) => ({x: x - 1, y}),
			[RIGHT]: ({x, y}) => ({x: x + 1, y}),
			[UP]: ({x, y}) => ({x, y: y + 1}),
			[DOWN]: ({x, y}) => ({x, y: y - 1})
		}
		const nowHead = moveMap[this.direction](this.body[0]);
		
		let shouldSpawnFood = false;
		let lastPiece;
		//check if nowHead touches the food, if so, the body length keep the same & need to spawn new food, otherwise the body length - 1
		if(food.touched(nowHead)) {
			shouldSpawnFood = true;
			this.score ++;
		}
		else {
			//need to save the last piece, if the snake dead, should put back the last piece, so the snake body will be visually consistent even if it dead
			lastPiece = this.body.pop();
		}

		//now check if the head touches the walls or its own body, if so the gameover, otherwise add the new head to the body, so the snake looks keep moving
		const touchedBody = this.body.findIndex ((element) => {
			return element.x == nowHead.x && element.y == nowHead.y;
		});

		if(nowHead.x < 0 || nowHead.x > xRange/this.pieceSize - 1 ||
		   nowHead.y < 0 || nowHead.y > yRange/this.pieceSize - 1 ||
		   touchedBody > -1 ) {
			this.dead = true;
			this.body.push(lastPiece);
		}
		else {
			this.body.unshift(nowHead);
			if(shouldSpawnFood) {
				food.spawn(xRange, yRange, this.body);
			}
		}
	}

	draw (ctx, colorMode) {
		this.body.forEach(({x, y}, index) => {
			ctx.beginPath();
			ctx.rect(x*this.pieceSize, y*this.pieceSize, this.pieceSize, this.pieceSize);
			let color = COLORMAP[colorMode].bodycolor;
			if(index == 0) {
				color = COLORMAP[colorMode].headcolor;
			}
			ctx.fillStyle = color;
          	ctx.strokeStyle = COLORMAP[colorMode].bordercolor;
          	ctx.fill();
          	ctx.stroke();
          	ctx.closePath();
		});
	}
}


//GameManager is in charge of game setup, rendering the canvas, all the control bindings, checking high score etc
class GameManager {
	constructor (canvas, speed, pieceSize = 10) {
		//basic setup
		this.xRange = canvas.width;
		this.yRange = canvas.height;
		this.pieceSize = pieceSize;

		//game states related
		this.gameOvered = false;
		this.gamePaused = true;
		this.timer = null;

		//rendering part, make sure the canvas drawing is not blurred in retina screen
		this.canvas = canvas;
		let dpr = window.devicePixelRatio || 1;
	  	let rect = this.canvas.getBoundingClientRect();
	  	this.canvas.width = rect.width * dpr;
	  	this.canvas.height = rect.height * dpr;
	  	if(dpr == 2) {
	  		this.canvas.style.width = this.canvas.width / 2 + "px";
	  		this.canvas.style.height = this.canvas.height / 2 + "px";
	  	}
		this.ctx = canvas.getContext("2d");
		this.ctx.scale(dpr, dpr);
		
		//game options
		this.speed = speed;
		this.colorMode = NORMAL;
		this.scoreText = document.getElementById("score-text");
		this.highText = document.getElementById("high-text");
		this.highScore = localStorage.getItem("snakescore-vivi") ? localStorage.getItem("snakescore-vivi") : 0;

		//and then, bind all the user inputs
		this.keyBinding();
	}

	//init the game objects, and render once so that player can see the begining screen
	init() {
		this.startText.className = "start-text";
		this.endText.className = "end-text hide";
		this.snake = new Snake(this.pieceSize);
		this.snake.spawn(this.xRange, this.yRange);
		this.food = new Food(this.pieceSize);
		this.food.spawn(this.xRange, this.yRange, this.snake.body);
		this.render();
	}

	//rendering all objects
	render () {
		//clear first
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		//draw canvas background
		this.ctx.fillStyle = COLORMAP[this.colorMode].bgcolor;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		//draw the snake body
		this.snake.draw(this.ctx, this.colorMode);

		//draw the food
		this.food.draw(this.ctx, this.colorMode);

		//update score
		if(this.snake.score > this.highScore) {
			this.highScore = this.snake.score;
		}
		this.scoreText.innerHTML = this.snake.score;
		this.highText.innerHTML = this.highScore;
	}

	//this this core animating function
	update () {
		this.snake.move(this.xRange, this.yRange, this.food);
		this.render();

		if(this.snake.dead) {
			return this.gameOver();
		}

		//the speed is actually the fps, the default fps will be 10, and fast will be 16
		this.timer = setTimeout(() => {
			this.animation = window.requestAnimationFrame(this.update.bind(this));
		}, 1000/this.speed);
	}

	//use this function to start/pause game
	toggleGame() {
		if(this.gameOvered) return;
		if(this.gamePaused) {
			this.gamePaused = false;
			this.startBtn.className = "start-btn pause";
			this.pauseScreen.className = "pause-container hide";
			this.update();
		}
		else {
			this.gamePaused = true;
			this.pauseScreen.className = "pause-container";
			this.startBtn.className = "start-btn start";
			window.cancelAnimationFrame(this.anim);
			clearTimeout(this.timer);
		}
	}

	//this will reset the game to init & restart the game
	restartGame() {
		this.gameOvered = false;
		this.gamePaused = false;
		this.pauseScreen.className = "pause-container hide";
		this.startBtn.className = "start-btn pause";
		this.init();
		this.update();
	}

	//this will pop up the end screen, and stop the animations
	gameOver() {
		this.gameOvered = true;
		this.pauseScreen.className = "pause-container";
		this.startText.className = "start-text hide";
		this.endText.className = "end-text";
		this.startBtn.className = "start-btn restart";
		window.cancelAnimationFrame(this.anim);
		clearTimeout(this.timer);
		localStorage.setItem("snakescore-vivi", this.highScore);
	}

	//binding all keyboard controls(for PC) & buttons controls (for mobile devices)
	//all binding functions starts from line261 - line398
	keyBinding () {
		this.pauseScreen = document.getElementById("pause-screen");
		this.startText = document.getElementById("start-text");
		this.endText = document.getElementById("end-text");

		//bind options keys & control keys
		const colorBtns = document.getElementsByClassName("choose-color");
		for(let i = 0; i < colorBtns.length; i++) {
			//for mouse
			colorBtns[i].addEventListener('click', (e) => {
				e.preventDefault();
				this.colorBtnListener(colorBtns, colorBtns[i]);
			});
		}

		const speedBtns = document.getElementsByClassName("choose-speed");
		for(let i = 0; i < speedBtns.length; i++) {
			speedBtns[i].addEventListener('click', (e) => {
				e.preventDefault();
				this.speedBtnListener(speedBtns, speedBtns[i]);
			});
		}

		this.startBtn = document.getElementById("start-btn");
		this.startBtn.addEventListener('click', (e) => {
			e.preventDefault();
			this.startBtnListener();
		});

		//bind the arrow keys, since the canvas origin point start from left top cornor, the y-axis controls should be flipped
		const keyMap = {
			ArrowUp: DOWN,
			ArrowLeft: LEFT,
			ArrowDown: UP,
			ArrowRight: RIGHT
		}

		//this is used to check if the input and current snake direciton is in the same axis, if so, ignore user input
		const sameAxis = [
			{input: UP, snake: UP},
			{input: UP, snake: DOWN},
			{input: DOWN, snake: DOWN},
			{input: DOWN, snake: UP},
			{input: LEFT, snake: LEFT},
			{input: LEFT, snake: RIGHT},
			{input: RIGHT, snake: RIGHT},
			{input: RIGHT, snake: LEFT}
		]

		//add event listener to the user input, and change the direction accordingly
		document.addEventListener('keydown', (event) => {
			event.preventDefault();
			const keyName = event.key;

			//make sure the snake object is instantiated
			if(this.snake) {
				if(keyMap[keyName]) {
					this.playBtnListener(keyMap[keyName], sameAxis);
				}

				if(event.code == "Space") {
					this.startBtnListener();
				}
			}
		});

		//the play btns control binding, for mobile users
		const playBtns = document.getElementsByClassName("play-btn");
		const btnMap = {
			"UP": UP,
			"RIGHT": RIGHT,
			"DOWN": DOWN,
			"LEFT": LEFT
		};
		for(let i = 0; i < playBtns.length; i++) {
			playBtns[i].addEventListener('click', () => {
				const chosenDirection = btnMap[playBtns[i].getAttribute("data-direction")];
				this.playBtnListener(chosenDirection, sameAxis);
			});
		}

		//the left hand side & right hand side buttons binding
		const controlBtns = document.getElementsByClassName("choose-control");
		const mainContainer = document.getElementById("main-container");
		for(let i = 0; i < controlBtns.length; i++) {
			const currentBtn = controlBtns[i];
			currentBtn.addEventListener('click', (e) => {
				e.preventDefault();
				this.resetClassName(controlBtns, "choose-control");
				currentBtn.className += " selected";
				const chosenControl = currentBtn.getAttribute("data-mode");
				mainContainer.className = "container " + chosenControl;
			});
		}
	}

	colorBtnListener (btns, currentBtn) {
		this.resetClassName(btns, "choose-color");
		currentBtn.className += " selected";
		const chosenMode = currentBtn.getAttribute("data-mode");
		if(chosenMode == "normal") {
			this.colorMode = NORMAL;
		}
		else {
			this.colorMode = COLORBLIND;
		}

		this.render();
	}

	speedBtnListener (btns, currentBtn) {
		this.resetClassName(btns, "choose-speed");
		currentBtn.className += " selected";
		const chosenSpeed = Number(currentBtn.getAttribute("data-speed"));
		this.speed = chosenSpeed;
	}

	startBtnListener () {
		if(this.gameOvered) {
			this.restartGame();
		}
		else {
			this.toggleGame();
		}
	}

	playBtnListener (chosenDirection, sameAxis) {
		const checkSameAxis = sameAxis.findIndex((element) => {
			return element.input == chosenDirection && element.snake == this.snake.direction;
		})

		//if the user input is not at the same axis of the current snake moving direction, accept the user input & update the snake moving direction, only accept the input when the game still going on
		if(checkSameAxis == -1 && !this.gamePaused && !this.gameOvered) {
			this.snake.changeDirection(chosenDirection);
		}
	}

	resetClassName(elements, className) {
		for(let i = 0; i < elements.length; i++) {
			elements[i].className = className;
		}
	}
}

//Yeah finally start the game
(function () {
  'use strict'

  //start with 10 fps
  const SPEED = 10;

  const CANVAS = document.getElementById('canvas');
  const game = new GameManager(CANVAS, SPEED, 15);

  game.init();

})()










