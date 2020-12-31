var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

ctx.font = "18px nintendo";

const WIDTH = 8;
const HEIGHT = 16;

const TOPLEFTX = 192;
const TOPLEFTY = 160;
const MARGIN = 4;

const MUSIC = ["adeste.mp3", "noel.mp3", null];

const COPPER = 0;
const SILVER = 1;
const GOLD = 2;

const COLORS = [COPPER, SILVER, GOLD];

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

var topScore = 10000;
var score = 0;

var level = 0;
var speed = 1;
var music = 0;

// choose - choose one item from an array at random
function choose(a) {
  return a[Math.floor(Math.random() * a.length)];
}

// pad - create a string of size "width" where empty spaces are padded with character "z"
function pad(n, width, z = '0') {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function isInBounds(x, y)
{
	return (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT);
}

class SpriteSheet {
	constructor(filename, sheetWidth, sheetHeight) {
		this.sheet = new Image();
		this.sheet.src = filename;

		this.width = sheetWidth;
		this.height = sheetHeight;
	}

	drawSprite(x, y, sx, sy, swidth, sheight)
	{
		if (sx >= 0 && sx < this.width && sy >= 0 && sy < this.height) 
			ctx.drawImage(this.sheet, sx, sy, swidth, sheight, x, y, swidth * 2, sheight * 2);
	}
}

class Sprite {
	constructor(x, y, sx, sy, swidth, sheight, sheet)
	{
		this.sheet = sheet;

		this.x = x;
		this.y = y;

		this.sx = sx;
		this.sy = sy;

		this.w = swidth;
		this.h = sheight;
	}

	update()
	{
	}

	draw(x = -1, y = -1)
	{
		if (x < 0 && y < 0)
			this.sheet.drawSprite(this.x, this.y, this.sx, this.sy, this.w, this.h);
		else
			this.sheet.drawSprite(x, y, this.sx, this.sy, this.w, this.h);
	}
}

class Piece {
	constructor(sheet)
	{
		this.x = 3;
		this.y = 0;

		this.dir = 0;

		// two separate colors for the A and B halves
		this.a = choose(COLORS);
		this.b = choose(COLORS);

		this.asprite = new Sprite(0, 0, 8 * this.a, 0, 8, 8, sheet);
		this.bsprite = new Sprite(0, 0, 8 * this.b, 0, 8, 8, sheet);
	}

	// bpos - calculate the coordinates of the secondary B coin
	bpos()
	{
		return [this.x + DIRS[this.dir][0], this.y + DIRS[this.dir][1]];
	}

	handle(key, grid) {
		switch (key) {
			case LEFT:
				this.move(-1, 0);
				if (!grid.isvalid(this))
					this.move(+1, 0);
				break;

			case RIGHT:
				this.move(+1, 0);
				if (!grid.isvalid(this))
					this.move(-1, 0);
				break;

			case CW_ROTATE:
				this.rotatecw(grid);
				break;

			case CCW_ROTATE:
				this.rotateccw(grid);
				break;
		}
	}

	rotatecw(grid) {
		var olddir = this.dir;

		this.dir = (this.dir + 1) % 4;

		if (!grid.isvalid(this))
			this.dir = olddir;
	}

	rotateccw(grid) {
		var olddir = this.dir;

		this.dir = this.dir - 1;
		if (this.dir < 0)
			this.dir = 3;

		if (!grid.isvalid(this))
			this.dir = olddir;
	}

	move(dx, dy) {
		this.x += dx;
		this.y += dy;
	}

	draw(nx=false) {
		var pos = this.bpos();

		if (nx) {
			this.asprite.draw(365, 155);
			this.bsprite.draw(365 + 16, 155);
		} else {
			this.asprite.draw(TOPLEFTX + this.x * 16, TOPLEFTY + this.y * 16);
			this.bsprite.draw(TOPLEFTX + pos[0] * 16, TOPLEFTY + pos[1] * 16);
		}
	}
}

class Grid {
	constructor(nviruses, width = WIDTH, height = HEIGHT) {
		this.sheet = new SpriteSheet("sprites.png", 392, 288);
		this.grid = new Array(WIDTH);
		this.frame = 0;

		this.lockSound = new Audio("lock.wav");
		this.lockSound.volume = 0.5;

		this.killSound = new Audio("kill.wav");
		this.killSound.volume = 0.5;

        for (var i = 0; i < WIDTH; i++) {
        	this.grid[i] = new Array(HEIGHT);
        	for (var j = 0; j < HEIGHT; j++) 
				this.grid[i][j] = {color: "black", type: "empty"};
        }

		// randomly place nviruses
		for (i = 0; i < nviruses; i++) {
			var x, y;

			do {
				x = Math.floor(Math.random() * WIDTH);
				y = Math.floor(Math.random() * (HEIGHT - MARGIN)) + MARGIN;
			} while (this.grid[x][y].type != "empty");

			this.grid[x][y].type = "virus";
			this.grid[x][y].color = choose(COLORS);
		}

		this.timer = setInterval(function() {
			this.frame = (this.frame == 0) ? 1 : 0;
		}.bind(this), 150);
	}

	isvalid(piece) {
		var pos = piece.bpos();

		if (!isInBounds(piece.x, piece.y) || !isInBounds(pos[0], pos[1]))
			return false;

		// check for empty grid squares
		return (this.grid[piece.x][piece.y].type == "empty"
				&& this.grid[pos[0]][pos[1]].type == "empty");
	}

	isfull() {
		return this.grid[3][0].type != "empty";
	}

	lock(piece) {
		var pos = piece.bpos();

		this.grid[piece.x][piece.y].color = piece.a;
		this.grid[piece.x][piece.y].type = "piece";

		this.grid[pos[0]][pos[1]].color = piece.b;	
		this.grid[pos[0]][pos[1]].type = "piece";	

		this.lockSound.play();
	}

	draw() {
		var sprite;

		for (var i = 0; i < WIDTH; i++)
			for (var j = 0; j < HEIGHT; j++)
				switch(this.grid[i][j].type) {
					case "virus":
						var x = 9 * (this.grid[i][j].color + 3) - 1;
						sprite = new Sprite(TOPLEFTX + 16 * i, TOPLEFTY + 16 * j,
											x, 8 * this.frame, 8, 8, this.sheet);
						sprite.draw();
						break;

					case "piece":
						sprite = new Sprite(TOPLEFTX + 16 * i, TOPLEFTY + 16 * j,
											8 * this.grid[i][j].color, 0, 8, 8, this.sheet);
						sprite.draw();
						break;
				}
	}

	clear(px, py, color) {
		var nviruses = 0;

		// count colors in all directions
		for(var dir of DIRS) {
			var x = px;
			var y = py;

			var dx = dir[0];
			var dy = dir[1];

			var total = 0;
			
			var gravity = [];

			while(isInBounds(x, y) && this.grid[x][y].color == this.grid[px][py].color) {
				// search perpendicular for pieces needing gravity to be applied
				if (isInBounds(x + dy, y + dx) && this.grid[x + dy][y + dx].type == "piece")
					gravity.push([x + dy, y + dx, this.grid[x + dy][y + dx].color]);

				if (isInBounds(x - dy, y - dx) && this.grid[x - dy][y - dx].type == "piece")
					gravity.push([x - dy, y - dx, this.grid[x - dy][y - dx].color]);

				total += 1;
				x += dx;
				y += dy;
			}

			if (total >= 4) {
				x = px;
				y = py;

				// clear out the squares and score
				for (var i = 0; i < total; i++) {
					if(this.grid[x][y].type == "virus") {
						nviruses += 1;
						this.killSound.play();
					}

					this.grid[x][y].color = "black";
					this.grid[x][y].type = "empty";

					x += dx;
					y += dy;
				}

				// apply gravity to left over pieces
				for (var g of gravity) {
					var gx = g[0];
					var gy = g[1];
					var gc = g[2];

					// delete from grid
					this.grid[gx][gy].type = "empty";
					this.grid[gx][gy].color = "black";

					// move down until find floor
					while (gy < HEIGHT - 1 && this.grid[gx][gy + 1].type == "empty")
						gy += 1;

					// lock in new location
					this.grid[gx][gy].type = "piece";
					this.grid[gx][gy].color = gc;
					this.lockSound.play();

					// clear recursively
					nviruses += this.clear(gx, gy, gc);
				}
			}
		}

		return nviruses;
	}
}

class Attract {
	constructor()
	{
		this.sheet = new SpriteSheet("attract.png", 336, 224);

		this.bg = new Sprite(0, 0, 0, 0, 255, 222, this.sheet);

		this.nick = [new Sprite(130, 315, 263, 160, 36, 41, this.sheet),
					 new Sprite(130, 315, 298, 160, 35, 41, this.sheet)];
		this.frame = 0;

		this.music = new Audio("bethlehe.mp3");
		this.music.loop = true;
		this.music.play();

		this.doAttract = function (e) {
			switch(e.key) {
				case START:
					nextState = new Options();
					break;
			}
		}.bind(this);

		this.timer = setInterval(function() {
			this.frame = (this.frame + 1) % this.nick.length;
		}.bind(this), 350);

		document.addEventListener("keydown", this.doAttract);
	}

	update() {
	}

	draw() {
		this.bg.draw();
		this.nick[this.frame].draw();
	}

	destroy() {
		this.music.pause();
		clearInterval(this.timer);
		document.removeEventListener("keydown", this.doAttract);
	}
}

class Options {
	constructor()
	{
		this.choice = 0;

		this.sheet = new SpriteSheet("options.png", 782, 345);

		this.music = new Audio("bethlehe.mp3");
		this.music.loop = true;
		this.music.play();

		// background consists of
		// 1. checkerboard pattern
		// 2. black bordered field
		// 3. scale and box
		// 4. LOW MED HI mesurements
		// 5. GAME OPTIONS heading
		this.bg = [new Sprite(0, 0, 228, 4, 255, 222, this.sheet),
					new Sprite(48, 32, 10, 233, 208, 191, this.sheet),
					new Sprite(176, 168, 52, 42, 115, 20, this.sheet),
					new Sprite(176, 278, 94, 67, 70, 8, this.sheet),
					new Sprite(165, 50, 60, 15, 95, 11, this.sheet)];

		// sprites for both highlighted and unhighlighted versions of LEVEL, SPEED, MUSIC
		this.choices = [new Sprite(80, 110, 7, 150, 103, 21, this.sheet),
						new Sprite(80, 210, 27, 175, 103, 21, this.sheet),
						new Sprite(80, 300, 7, 125, 103, 22, this.sheet),
						new Sprite(80, 110, 115, 150, 103, 21, this.sheet),
						new Sprite(80, 210, 135, 175, 84, 21, this.sheet),
						new Sprite(80, 300, 115, 125, 103, 21, this.sheet)];

		// sprites for both highlighted and unhighlighted versions of music options
		this.musics = [new Sprite(125, 355, 38, 85, 50, 18, this.sheet),
						new Sprite(225, 355, 90, 85, 50, 18, this.sheet),
						new Sprite(325, 355, 142, 85, 34, 18, this.sheet),
						new Sprite(125, 355, 38, 103, 50, 18, this.sheet),
						new Sprite(225, 355, 90, 103, 50, 18, this.sheet),
						new Sprite(325, 355, 142, 103, 34, 18, this.sheet)];

		this.levelArrow = new Sprite(174, 155, 54, 62, 8, 8, this.sheet);
		this.speedArrow = new Sprite(176, 260, 65, 64, 21, 7, this.sheet);

		// FIXME Add music selection sprites

		this.doOptions = function (e) {
			switch(e.key) {
				case START:
					nextState = new Play();
					break;

				case UP:
					if (this.choice > 0)
						this.choice -= 1;
					break;

				case DOWN:
					if (this.choice < 2)
						this.choice += 1;
					break;

				case LEFT:
					switch (this.choice) {
						case 0:
							if (level > 0)
								level -= 1;
							break;

						case 1:
							if (speed > 0)
								speed -= 1;
							break;

						case 2:
							if (music > 0) {
								music -= 1;
								this.music.pause();
								this.music = new Audio(MUSIC[music]);
								this.music.play();
							}
							break;
					}
					break;

				case RIGHT:
					switch (this.choice) {
						case 0:
							if (level < 20)
								level += 1;
							break;

						case 1:
							if (speed < 2)
								speed += 1;
							break;

						case 2:
							if (music < MUSIC.length - 1) {
								music += 1;
								this.music.pause();
								this.music = new Audio(MUSIC[music]);
								this.music.play();
							}
							break;
					}
					break;
			}
		}.bind(this);

		document.addEventListener("keydown", this.doOptions);
		ctx.fillStyle = "white";
	}

	update() {
	}

	draw () {
		for (var sprite of this.bg)
			sprite.draw();

		// draw choice sprites
		for (var i = 0; i < 3; i++) {
			if (i == this.choice)
				this.choices[i].draw();
			else
				this.choices[i + 3].draw();
		}

		// draw virus level meter
		this.levelArrow.draw(this.levelArrow.x + level * 8, this.levelArrow.y);

		// draw virus level value
		ctx.fillText(pad(level, 2), 364, 197);

		// draw speed
		this.speedArrow.draw(this.speedArrow.x + 50 * speed, this.speedArrow.y);

		// draw music choice
		for (var i = 0; i < MUSIC.length; i++) {
			if (i == music)
				this.musics[i].draw();
			else
				this.musics[i + 3].draw();
		}
	}

	destroy() {
		this.music.pause();
		document.removeEventListener("keydown", this.doOptions);
	}
}

class Play {
	constructor() {
		this.fields = new SpriteSheet("fields.png", 256, 240);
		this.sprites = new SpriteSheet("sprites.png", 392, 288);

		this.field = new Sprite(0, 0, 0, 0, 255, 240, this.fields);
		this.nick = new Sprite(375, 140, 72, 18, 38, 39, this.sprites);

		this.nviruses = Math.min(84, (level + 1) * 4);
		this.grid = new Grid(this.nviruses);

		this.current = new Piece(this.sprites);
		this.next = new Piece(this.sprites);

		this.music = new Audio(MUSIC[music]);
		this.music.loop = true;
		this.music.play();

		this.doPlay = function (e) {
			this.current.handle(e.key, this.grid);
		}

		this.change = false;
		setInterval(function() {
			this.current.move(0, +1);

			// Did we hit another piece?
			if (!this.grid.isvalid(this.current)) {
				this.current.move(0, -1);
				this.change = true;
			}
		}.bind(this), (3 - speed) * SPEED);

		document.addEventListener("keydown", this.doPlay.bind(this), true);
		ctx.fillStyle = "black";
	}

	update() {
		var change = false;
		
        if (this.change) {
            this.grid.lock(this.current);
            var nkilled = this.grid.clear(this.current.x, this.current.y, this.current.a);

			var bpos = this.current.bpos();
            nkilled += this.grid.clear(bpos[0], bpos[1], this.current.b);

			if (nkilled > 0) {
	            score += speed * 100 * 2**(nkilled - 1);
				this.nviruses -= nkilled;
			}

			if (score > top)
				top = score;

            this.current = this.next;
            this.next = new Piece(this.sprites);

			if (this.nviruses == 0) {
				level += 1;
				nextState = new Win();
			}

			this.change = false;
		}

		// Is game over?
        if (this.grid.isfull())
			nextState = new Lose();
	}

	draw() {
		var base = 110;
		var line = 20;
		var indent = 42;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// draw background & nick
		this.field.draw();
		this.nick.draw();

		// draw grid
		this.grid.draw();
	
		// draw pieces
		this.current.draw();
		this.next.draw(true);

		// draw text onto scroll
		ctx.fillText("TOP", indent, base);
		ctx.fillText(pad(topScore, 7), indent, base + line);
		ctx.fillText("SCORE", indent, base + 2 * line);
		ctx.fillText(pad(score, 7), indent, base + 3 * line);
		ctx.fillText("LEVEL", indent, base + 4 * line);
		ctx.fillText(pad(level, 7, " "), indent, base + 5 * line);
		ctx.fillText("SPEED", indent, base + 6 * line);
		ctx.fillText(pad(["LOW", "MED", "HI"][speed], 7, " "), indent, base + 7 * line);
		ctx.fillText("CHILD", indent, base + 8 * line);
		ctx.fillText(pad(this.nviruses, 7, " "), indent, base + 9* line);
	}

	destroy() {
		this.music.pause();
		document.removeEventListener("keydown", this.doPlay);
	}
}

class Win {
	constructor() {
		this.fields = new SpriteSheet("fields.png", 256, 240);
		this.field = new Sprite(0, 0, 0, 0, 255, 240, this.fields);

		this.winSound = new Audio("win.wav");
		this.winSound.volume = 0.5;
		this.winSound.play();

		this.doWin = function (e) {
			nextState = new Play();
		}.bind(this);

		document.addEventListener("keydown", this.doWin);
	}

	update() {
	}

	draw() {
		var base = 110;
		var line = 20;
		var indent = 42;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		this.field.draw();

		// announce win
		ctx.fillStyle = "yellow";
		ctx.fillText("STAGE", 225, 200);
		ctx.fillText("CLEAR!", 225, 230);
		ctx.fillText("PRESS", 225, 290);
		ctx.fillText("SPACE", 225, 320);
		ctx.fillStyle = "black";

		// draw text onto scroll
		ctx.fillText("TOP", indent, base);
		ctx.fillText(pad(topScore, 7), indent, base + line);
		ctx.fillText("SCORE", indent, base + 2 * line);
		ctx.fillText(pad(score, 7), indent, base + 3 * line);
		ctx.fillText("LEVEL", indent, base + 4 * line);
		ctx.fillText(pad(level, 7, " "), indent, base + 5 * line);
		ctx.fillText("SPEED", indent, base + 6 * line);
		ctx.fillText(pad(["LOW", "MED", "HI"][speed], 7, " "), indent, base + 7 * line);
		ctx.fillText("CHILD", indent, base + 8 * line);
		ctx.fillText(pad(0, 7, " "), indent, base + 9* line);
	}

	destroy() {
		document.removeEventListener("keydown", this.doWin);
	}
}

class Lose {
	constructor() {
		this.fields = new SpriteSheet("fields.png", 256, 240);
		this.sprites = new SpriteSheet("sprites.png", 392, 288);

		this.loseSound = new Audio("lose.wav");
		this.loseSound.volume = 0.5;
		this.loseSound.play();

		this.field = new Sprite(0, 0, 0, 0, 255, 240, this.fields);
		this.nick = new Sprite(370, 140, 113, 18, 33, 39, this.sprites);

		this.doLose = function (e) {
			nextState = new Attract();
		}.bind(this);

		document.addEventListener("keydown", this.doLose);
	}

	update() {
	}

	draw() {
		var base = 110;
		var line = 20;
		var indent = 42;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		this.field.draw();
		this.nick.draw();

		// announce win
		ctx.fillStyle = "yellow";
		ctx.fillText("GAME", 225, 200);
		ctx.fillText("OVER!", 225, 230);
		ctx.fillText("PRESS", 225, 290);
		ctx.fillText("SPACE", 225, 320);
		ctx.fillStyle = "black";

		// draw text onto scroll
		ctx.fillText("TOP", indent, base);
		ctx.fillText(pad(topScore, 7), indent, base + line);
		ctx.fillText("SCORE", indent, base + 2 * line);
		ctx.fillText(pad(score, 7), indent, base + 3 * line);
		ctx.fillText("LEVEL", indent, base + 4 * line);
		ctx.fillText(pad(level, 7, " "), indent, base + 5 * line);
		ctx.fillText("SPEED", indent, base + 6 * line);
		ctx.fillText(pad(["LOW", "MED", "HI"][speed], 7, " "), indent, base + 7 * line);
		ctx.fillText("CHILD", indent, base + 8 * line);
		ctx.fillText(pad(0, 7, " "), indent, base + 9* line);
	}

	destroy() {
		document.removeEventListener("keydown", this.doLose);
	}
}

function gameLoop()
{
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	currentState.draw();
	currentState.update();

	if (currentState != nextState) {
		currentState.destroy();
		currentState = nextState;
	}

	window.requestAnimationFrame(gameLoop);
}

var currentState = new Attract();
var nextState = currentState;
window.requestAnimationFrame(gameLoop);
