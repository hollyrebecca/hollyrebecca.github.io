
var context;

// each are lists of line elements formatted as {sx: , sy: , ex: , ey: }
var danger = [];  // red lines
var platform = [];  // black lines
var bounce = [];  //blue lines

var black = '#000000';
var red = '#F00000';
var blue = '#001eff';
var colour = black;

// TODO: create play button which initialises the game phase
function play() {
	let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
}

// =============================================================================
// Sprites
// =============================================================================

//
// Hero
//

function Hero(game, x, y) {
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');

    // anchor
    this.anchor.set(0.5, 0.5);
    // physics properties
    //this.game.physics.p2.enable(this);
    this.game.physics.enable(this);
    //this.body.setCollisionGroup(PLAYER_GROUP);
    //this.body.collides([PLATFORM_GROUP, BOUNCE_GROUP, ENEMY_GROUP]);
    this.body.collideWorldBounds = true;
    // animations
    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
    this.animations.add('die', [5, 6, 5, 6, 5, 6, 5, 6], 12); // 12fps no loop
    // starting animation
    this.animations.play('stop');
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction) {
    // guard
    if (this.isFrozen) { return; }

    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;

    // update image flipping & animations
    if (this.body.velocity.x < 0) {
        this.scale.x = -1;
    }
    else if (this.body.velocity.x > 0) {
        this.scale.x = 1;
    }
};

Hero.prototype.jump = function () {
    const JUMP_SPEED = 400;
    let canJump = this.body.touching.down && this.alive && !this.isFrozen;

    if (canJump || this.isBoosting) {
        this.body.velocity.y = -JUMP_SPEED;
        this.isBoosting = true;
    }

    return canJump;
};

Hero.prototype.stopJumpBoost = function () {
    this.isBoosting = false;
};

Hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
};

Hero.prototype.update = function () {
    // update sprite animation, if it needs changing
    let animationName = this._getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName);
    }
};

Hero.prototype.freeze = function () {
    this.body.enable = false;
    this.isFrozen = true;
};

Hero.prototype.die = function () {
    this.alive = false;
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

// returns the animation name that should be playing depending on
// current circumstances
Hero.prototype._getAnimationName = function () {
    let name = 'stop'; // default animation

    // dying
    if (!this.alive) {
        name = 'die';
    }
    // frozen & not dying
    else if (this.isFrozen) {
        name = 'stop';
    }
    // jumping
    else if (this.body.velocity.y < 0) {
        name = 'jump';
    }
    // falling
    else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
        name = 'fall';
    }
    else if (this.body.velocity.x !== 0 && this.body.touching.down) {
        name = 'run';
    }

    return name;
};

// =============================================================================
// Loading state
// =============================================================================

LoadingState = {};

LoadingState.init = function () {
    // keep crispy-looking pixels
    this.game.renderer.renderSession.roundPixels = true;
};

LoadingState.preload = function () {
    this.game.load.image('font:numbers', 'images/numbers.png');

    this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
};

LoadingState.create = function () {
    this.game.state.start('play', true, false, {level: 0});
};


// =============================================================================
// Play state
// =============================================================================

PlayState = {};
var world;

const LEVEL_COUNT = 1;

PlayState.init = function (data) {
    /*this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });*/

    this.cursors = this.game.input.keyboard.createCursorKeys();

    this.level = (data.level || 0) % LEVEL_COUNT;

    //world = new p2.World();
};

PlayState.create = function () {
    // fade in (from black)
    //this.camera.flash('#000000');

    // create level entities and decoration
    this.game.add.image(0, 0, 'background');
    
    //this.game.physics.startSystem(Phaser.Physics.P2JS);
    //this.game.physics.p2.gravity.y = -10;

    //game.physics.p2.setImpactEvents(true);

    // TODO: Create level using drawn lines in danger, platform and bounce
    this._createLevel();

    // create UI score boards
    this._createHud();
};

PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();

    // TODO: has escaped???
};

PlayState.shutdown = function () {
    this.bgm.stop();
};

// TODO: write game phase using phaser. use var line = new Phaser.Line(sx, sy, ex, ey) for each line in danger, platform and bounce.
// use var graphics = game.add.graphics(line.start.x, line.start.y)   graphics.lineStyle(width, colour, alpha) for each line
// graphics.drawShape(line)				creates the shape on the canvas
// graphics.beginFill(colour, alpha)	applies settings to everything drawn after this point
// graphics.endFill()					stops the settings applied in begin fill 

var ENEMY_GROUP = 0x01;
var PLATFORM_GROUP = 0x02;
var BOUNCE_GROUP = 0x03;
var PLAYER_GROUP = 0x04;
const HeroX = 300;
const HeroY = 200;

function calcAngle(x, y, x1, y1) {
    return Math.atan2(y1 - y, x1 - x);
}

function calcLength(x, y, x1, y1) {
    var xs = x1 - x,
        ys = y1 - y;

    xs *= xs;
    ys *= ys;

    return Math.sqrt(xs + ys);
}

PlayState._addPlatforms = function(platformGr, lines) {
    for (i = 0; i < lines.length; i++) {
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        var shapeSprite = this.game.add.sprite(0,0);
        shapeSprite.addChild(platformGr);
        console.log(shapeSprite);
        this.platforms.add(shapeSprite);

        this.game.physics.enable(shapeSprite);
        //game.physics.p2.enable(shapeSprite);

        shapeSprite.body.immovable = true;
        shapeSprite.body.allowGravity = false;

        console.log(this.platforms);
    }
}

PlayState._addEnemies = function(platformGr, lines) {
    for (i = 0; i < lines.length; i++) {
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        var shapeSprite = this.game.add.sprite(0,0);
        shapeSprite.addChild(platformGr);
        this.enemies.add(shapeSprite);

        this.game.physics.enable(shapeSprite);
        //game.physics.p2.enable(shapeSprite);

        shapeSprite.body.collideWorldBounds = true;
        sprite.body.immovable = true;
        sprite.body.allowGravity = false;
    }
}

PlayState._addBounces = function(platformGr, lines) {
    for (i = 0; i < lines.length; i++) {
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        var shapeSprite = this.game.add.sprite(0,0);
        shapeSprite.addChild(platformGr);
        this.bounces.add(shapeSprite);

        this.game.physics.enable(shapeSprite);
        //game.physics.p2.enable(shapeSprite);

        shapeSprite.body.allowGravity = false;
        shapeSprite.body.bounce.y = 0.5;
    }
}


PlayState._addLines = function(platformGr, lines, groupL) {
	for (i = 0; i < lines.length; i++) {
        console.log(lines[i]);
        console.log(lines[i].sx);
		platformGr.moveTo(lines[i].sx, lines[i].sy);
		platformGr.lineTo(lines[i].ex, lines[i].ey);
        console.log(platformGr);
		var shapeSprite = this.game.add.sprite(0,0);
		shapeSprite.addChild(platformGr);
		groupL.add(shapeSprite);

        this.game.physics.enable(shapeSprite);
        //game.physics.p2.enable(shapeSprite);

        console.log(groupL);

        switch (groupL) {
            case platforms:
                shapeSprite.body.immovable = true;
                shapeSprite.body.allowGravity = false;
                //console.log("platforms");
            case enemies:
                shapeSprite.body.collideWorldBounds = true;
                //console.log("enemies");
            case bounces:
                shapeSprite.body.allowGravity = false;
                shapeSprite.body.bounce.y = 0.5;
                //console.log("bounces");
            default:
                throw Error("Unexpected line type");
        }

        /*var lineAng = calcAngle(lines[i][0], lines[i][1], lines[i][2], lines[i][3]);
        var lineLen = calcLength(lines[i][0], lines[i][1], lines[i][2], lines[i][3]);

        var lineBody = new p2.Body({
            mass: 0,  //static
            position: [lines[i][0], lines[i][1]],
            angle: lineAng
        });
        var lineShape = new p2.Line({
            collisionGroup: groupL,
            collisionMask: PLAYER_GROUP,
            length: lineLen
        });

        lineBody.addShape(lineShape);
        world.addBody(lineBody);*/
	}
}

PlayState._createLevel = function() {
	this.enemies = this.game.add.group();
	this.platforms = this.game.add.group();
	this.bounces = this.game.add.group();

    this.enemies.enableBody = true;
    //enemies.physicsBodyType = Phaser.Physics.P2JS;
    this.platforms.enableBody = true;
    //platforms.physicsBodyType = Phaser.Physics.P2JS;
    this.bounces.enableBody = true;
    //bounces.physicsBodyType = Phaser.Physics.P2JS;

	var line = new Phaser.Line();
	platformGr = this.game.add.graphics();

    console.log("adding platforms");
	this._addPlatforms(platformGr, platform);
    console.log("adding enemies");
	this._addEnemies(platformGr, danger);
    console.log("adding bounces");
	this._addBounces(platformGr, bounce);

    /*addLines(platform, PLATFORM_GROUP);
    addLines(danger, ENEMY_GROUP);
    addLines(bounce, BOUNCE_GROUP);

	this.game.physics.p2.updateBoundsCollisionGroup();*/

    this.hero = new Hero(this.game, HeroX, HeroY);
    this.game.add.existing(this.hero);

    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;

    console.log(this.platforms);
};

// TODO: Edit to make enemies anything in red.
PlayState._handleCollisions = function () {
    //this.game.physics.arcade.collide(this.spiders, this.platforms);
    //this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.hero, this.platforms);

    this.game.physics.arcade.collide(this.hero, this.bounces);

    //hero.body.collides([ENEMY_GROUP, BOUNCE_GROUP, PLATFORM_GROUP]);


    // hero vs coins (pick up)
    //this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin,
        //null, this);
    // hero vs key (pick up)
    //this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey,
        //null, this);
    // hero vs door (end level)
    //this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
        // ignore if there is no key or the player is on air
        //function (hero, door) {
        //    return this.hasKey && hero.body.touching.down;
        //}, this);
    //collision: hero vs enemies (kill or die)
    this.game.physics.arcade.overlap(this.hero, this.enemies,
        this._onHeroVsEnemy, null, this);
};

PlayState._handleInput = function () {
    if (this.cursors.left.isDown) { // move hero left
        this.hero.move(-1);
    }
    else if (this.cursors.right.isDown) { // move hero right
        this.hero.move(1);
    }
    else { // stop
        this.hero.move(0);
    }

    // handle jump
    const JUMP_HOLD = 200; // ms
    if (this.cursors.up.isDown) {
        let didJump = this.hero.jump();
        if (didJump) { this.sfx.jump.play(); }
    }
    else {
        this.hero.stopJumpBoost();
    }
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
    // game over -> play dying animation and restart the game
    hero.die();
    this.sfx.stomp.play();
    hero.events.onKilled.addOnce(function () {
        this.game.state.restart(true, false, {level: this.level});
    }, this);

    // NOTE: bug in phaser in which it modifies 'touching' when
    // checking for overlaps. This undoes that change so enemies don't
    // 'bounce' agains the hero
    enemy.body.touching = enemy.body.wasTouching;
};

// TODO: Modify as an exit of the platform
PlayState._onHeroVsDoor = function (hero, door) {
    // 'open' the door by changing its graphic and playing a sfx
    door.frame = 1;
    this.sfx.door.play();

    // play 'enter door' animation and change to the next level when it ends
    hero.freeze();
    this.game.add.tween(hero)
        .to({x: this.door.x, alpha: 0}, 500, null, true)
        .onComplete.addOnce(this._goToNextLevel, this);
};

// TODO: Congratulate on level completion
PlayState._goToNextLevel = function () {
    this.camera.fade('#000000');
    this.camera.onFadeComplete.addOnce(function () {
        // change to next level
        this.game.state.restart(true, false, {
            level: this.level + 1
        });
    }, this);
};

// TODO: Modify to match game creation
PlayState._loadLevel = function (data) {
    // create all the groups/layers that we need
    this.bgDecoration = this.game.add.group();
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    // spawn hero and enemies
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // spawn level decoration
    data.decoration.forEach(function (deco) {
        this.bgDecoration.add(
            this.game.add.image(deco.x, deco.y, 'decoration', deco.frame));
    }, this);

    // spawn platforms
    data.platforms.forEach(this._spawnPlatform, this);

    // spawn important objects
    data.coins.forEach(this._spawnCoin, this);
    this._spawnKey(data.key.x, data.key.y);
    this._spawnDoor(data.door.x, data.door.y);

    // enable gravity
    const GRAVITY = 1200;
    //this.game.physics.arcade.gravity.y = GRAVITY;
};

// TODO: Spawn Bouncy platforms
PlayState._spawnCharacters = function (data) {
    // spawn spiders
    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);

    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);
};

// TODO: Spawn platforms
PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(
        platform.x, platform.y, platform.image);

    // physics for platform sprites
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // spawn invisible walls at each side, only detectable by enemies
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

// TODO: Spawn enemy
PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    // anchor and y displacement
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);
    // physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};

// TODO: Modify to fit the created game
PlayState._createHud = function () {
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR, 6);

    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
        coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.add(this.keyIcon);
    this.hud.position.set(10, 10);
};



// =============================================================================
// Draw state
// =============================================================================


function red_click() {
	context.strokeStyle = red;
	colour = red;
}

function blue_click() {
	context.strokeStyle = blue;
	colour = blue;
}

function black_click() {
	context.strokeStyle = black;
	colour = black;
}

// TODO: Edit to return true if click on line passed
function intersection(x1, y1, x2, y2, x3, y3, x4, y4){
	var ia, ib;
	var denominator = (y4-y3)*(x2-x1) - (x4-x3)*(y2-y1);
	if (denominator == 0) {
		return null;
	}
	ia = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3))/denominator;
	ib = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3))/denominator;
	return {
		x: x1 + ia*(x2-x1),
		y: y1 + ia*(y2-y1),
		seg1: ia >= 0 && ia <= 1,
		seg2: ib >= 0 && ib <= 1
	};
}

/*function erase() {
	var x, y;  // TODO: current position

	for (var i = 0; i < danger.length; i++){
		for (var j = 0; j < danger[i].length; j++){
			if intersection(danger[i][j][0], danger[i][j][1], danger[i][j][2], danger[i][j][3], x, y, x, y):

		}
	}
	for (var i = 0; i < platform.length; i++){

	}
	for (var i = 0; i < bounce.length; i++){

	}
}*/

// TODO: check if this is the right syntax
function draw() {
	var contexto, canvas, canvaso;
	var tool;
	var tool_default = 'pen';
	
	function init() {
		canvaso = document.getElementById('drawingCanvas');
		if (!canvaso) {
			alert('Error! THe canvas element was not found!');
			return;
		}

		if (!canvaso.getContext) {
			alert('Error! No canvas.getContext!');
			return;
		}

		contexto = canvaso.getContext('2d');
		if (!contexto) {
			alert('Error! Failed to getContext!');
			return;
		}

		var container = canvaso.parentNode;
		canvas = document.createElement('canvas');
		if (!canvas) {
			alert('Error! Cannot create a new canvas element!');
			return;
		}

		canvas.id = "tempCanvas";
		canvas.width = canvaso.width;
		canvas.height = canvaso.height;
		container.appendChild(canvas);
		context = canvas.getContext('2d');
		context.strokeStyle = "#000000";   // default to black for platforms
		context.lineWidth = 1.0;

		//context.fillStyle = "#424242";
		//context.fillRect(0,0,897,532);
		

		var tool_select = document.getElementById('selector');
		if (!tool_select) {
			alert('Error! Failed to get the select element!');
			return;
		}

		tool_select.addEventListener('change', ev_tool_change, false);

		if (tools[tool_default]) {
			tool = new tools[tool_default]();
			tool_select.value = tool_default;
		}

		canvas.addEventListener('mousedown', ev_canvas, false);
		canvas.addEventListener('mousemove', ev_canvas, false);
		canvas.addEventListener('mouseup', ev_canvas, false);
	}

	function ev_canvas (ev) {
		if (ev.layerX || ev.layerX == 0) {
			ev._x = ev.layerX;
			ev._y = ev.layerY;
		} else if (ev.offsetX || ev.offsetX == 0) {
			ev._x = ev.offsetX;
			ev._y = ev.offsetY;
		}

		var func = tool[ev.type];
		if (func) {
			func(ev);
		}
	} 
	
    function ev_tool_change (ev) { 
	    if (tools[this.value]) { 
	   		tool = new tools[this.value](); 
	    } 
    }

	function img_update() {
		contexto.drawImage(canvas, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);
	}

	var tools = {};
	var lineList = [];

	tools.pen = function() {
		var tool = this;
		var startx;
		var starty;
		this.started = false;
		this.mousedown = function (ev) {
			context.beginPath();
			context.moveTo(ev._x, ev._y);
			startx = ev._x;
			starty = ev._y;
			tool.started = true;
		};
		this.mousemove = function (ev) {
			if (tool.started) {
				context.lineTo(ev._x, ev._y);
				context.stroke();
				subline = {sx: startx, sy: starty, ex: ev._x, ey: ev._y};
				lineList.push(subline);
				startx = ev._x;
				starty = ev._y;
			}
		};
		this.mouseup = function (ev) {
			if (tool.started) {
				tool.mousemove(ev);
				tool.started = false;
				img_update();

				switch (colour) {
					case red: 
                        danger = danger.concat(lineList);
                        break
                    case black:
                        platform = platform.concat(lineList);
                        break
                    case blue:
                        bounce = bounce.concat(lineList);
						break
					default:
						throw Error("Unexpected colour detected");
				}
				/*
				if colour == red {
					danger.concat(lineList);
				} else if colour == blue {
					bounce.concat(lineList);
				} else if colour == black {
					platform.concat(lineList);
				}*/
			}
		};
	};

	tools.line = function () {
		var tool = this;
		this.started = false;
		this.mousedown = function (ev) {
			tool.started = true;
			tool.x0 = ev._x;
			tool.y0 = ev._y;

            console.log(colour);
		}
		this.mousemove = function (ev) {
			if (!tool.started) {
				return;
			}
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.beginPath();
			context.moveTo(tool.x0, tool.y0);
			context.lineTo(ev._x, ev._y);
			context.stroke();
			context.closePath();
			subline = {sx: tool.x0, sy: tool.y0, ex: ev._x, ey: ev._y};
			lineList.push(subline);
		};
		this.mouseup = function (ev) {
			if (tool.started) {
				tool.mousemove(ev);
				tool.started = false;
				img_update();

                console.log(colour);

				switch (colour) {
					case red: 
						danger = danger.concat(lineList);
						break
					case black:
						platform = platform.concat(lineList);
						break
					case blue:
						bounce = bounce.concat(lineList);
						break
					default:
						throw Error("Unexpected colour detected");
				}
			}
		};
	};

init();

}



window.onload = function () {
	draw();
}