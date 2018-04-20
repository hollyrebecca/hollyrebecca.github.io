// each are lists of line elements formatted as {sx: , sy: , ex: , ey: }
var danger = [];  // red lines
var platform = [];  // black lines
var bounce = [];  //blue lines
var lightbounce = [];
var darkbounce = [];

var black = 0x000000;
var red = 0xF00000;
var blue = 0x001eff;
var cadetblue = 0x5F9EA0;
var darkblue = 0x00008B;
var colour = black;
var grav = 980;

// TODO: create play button which initialises the game phase
function playStart() {
    console.log("Play function");
    var obj = JSON.parse(sessionStorage.drawContent);
    danger = obj.danger;
    platform = obj.platform;
    bounce = obj.bounce;
    lightbounce = obj.lightbounce;
    darkbounce = obj.darkbounce;
    console.log(obj);

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
    this.game.physics.arcade.enable(this);
    this.enableBody = true;
    this.alive = true;
    this.body.collideWorldBounds = true;
    this.body.immovable = false;

    this.body.maxVelocity.y = 500;
    // animations
    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
    this.animations.add('die', [5, 6, 5, 6, 5, 6, 5, 6], 12); // 12fps no loop
    var dieAnim = this.animations.getAnimation('die');

    dieAnim.onComplete.add(function () {
        this.kill();
    }, this);

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
    this.animations.play('die');
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
    this.game.load.image('background', 'images/background.png');

    this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
};

LoadingState.create = function () {
    this.game.state.start('play', true, false);
};


// =============================================================================
// Play state
// =============================================================================

PlayState = {};
var world;

PlayState.init = function () {
    this.cursors = this.game.input.keyboard.createCursorKeys();
};

PlayState.create = function () {
    this.game.time.desiredFps = 60;

    // create level entities and decoration
    this.game.add.image(0, 0, 'background');
    
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.world.enableBody = true;

    // TODO: Create level using drawn lines in danger, platform and bounce
    this._createLevel();
};

PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();
    this._updateGravity();

    if (this.hero.body.onFloor()) {
        this._onHeroVsBound();
    }

    //this.game.debug.body(this.hero);

    // TODO: has escaped???
};

PlayState.shutdown = function () {
    this.hero.animations.destroy();
};

// TODO: write game phase using phaser. use var line = new Phaser.Line(sx, sy, ex, ey) for each line in danger, platform and bounce.
// use var graphics = game.add.graphics(line.start.x, line.start.y)   graphics.lineStyle(width, colour, alpha) for each line
// graphics.drawShape(line)             creates the shape on the canvas
// graphics.beginFill(colour, alpha)    applies settings to everything drawn after this point
// graphics.endFill()                   stops the settings applied in begin fill 

var ENEMY_GROUP = 0x01;
var PLATFORM_GROUP = 0x02;
var BOUNCE_GROUP = 0x03;
var PLAYER_GROUP = 0x04;
const HeroX = 300;
const HeroY = 200;

function calcAngle(x, y, x1, y1) {
    return Math.atan2(y1 - y, x1 - x);
};

function calcLength(x, y, x1, y1) {
    var xs = x1 - x,
        ys = y1 - y;

    xs *= xs;
    ys *= ys;

    return Math.sqrt(xs + ys);
};

/*
  padding:14px 0 75px 14px; 
  width:897px; 
  height:532px; 
*/

PlayState._addWorldBounds = function() {
    var boundB = this.game.add.sprite(0, 0);
    var boundT = this.game.add.sprite(0, 0);
    var boundL = this.game.add.sprite(0, 0);
    var boundR = this.game.add.sprite(0, 0);
    boundB.body.setSize(this.game.width, 2);
    boundT.body.setSize(this.game.width, 2);
    boundL.body.setSize(2, this.game.height);
    boundR.body.setSize(2, this.game.height);

    boundB.alignIn(World.bounds, Phaser.BOTTOM_LEFT, 0, 0);
    boundT.alignIn(World.bounds, Phaser.TOP_LEFT, 0, 0);
    boundL.alignIn(World.bounds, Phaser.TOP_LEFT, 0, 0);
    boundR.alignIn(World.bounds, Phaser.TOP_RIGHT, 0, 0);

    this.bounds.add(boundB);
    this.bounds.add(boundT);
    this.bounds.add(boundL);
    this.bounds.add(boundR);

    this.bounds.allowGravity = false;
    this.bounds.immovable = true;
}

PlayState._addPlatforms = function(lines) {
    if (lines.length == 0){
        return;
    }
    console.log(lines);
    for (i = 0; i < lines.length; i++) {
        var platformGr = this.game.make.graphics();
        platformGr.clear();
        platformGr.lineStyle(lines[i].lw, black, 1);
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        platformGr.boundsPadding = 0;

        var texture = platformGr.generateTexture();

        platformGr.destroy();
        
        var startX = lines[i].sx;
        var startY = lines[i].sy;

        if (lines[i].sy > lines[i].ey) {
            startY = lines[i].ey;
        }

        if (lines[i].sx > lines[i].ex) {
            startX = lines[i].ex;
        }

        var shapeSprite = this.game.add.sprite(startX, startY, texture);

        this.game.physics.enable(shapeSprite, Phaser.Physics.ARCADE);

        shapeSprite.enableBody = true;
        shapeSprite.body.mass = 2500;
        shapeSprite.body.immovable = true;
        shapeSprite.body.allowGravity = false;

        //this.game.debug.body(shapeSprite);

        this.platforms.add(shapeSprite);
    }
};

PlayState._addEnemies = function(lines) {
    if (lines.length == 0){
        return;
    }
    console.log(lines);
    for (i = 0; i < lines.length; i++) {
        var startX = lines[i].sx;
        var startY = lines[i].sy;

        var platformGr = this.game.make.graphics();
        platformGr.clear();
        platformGr.lineStyle(lines[i].lw, red, 1);
        platformGr.moveTo(startX, startY);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        platformGr.boundsPadding = 0;

        var texture = platformGr.generateTexture();

        platformGr.destroy();

        var shapeSprite = this.game.add.sprite(startX, startY, texture);
        //shapeSprite.addChild(platformGr);

        /*// create a group for all the player's hitboxes     
        hitboxes = this.game.add.group();     
        // give all the hitboxes a physics body (I'm using arcade physics btw)     
        hitboxes.enableBody = true;   
        var offsetX = 0;
        var offsetY = 0;              
        // set the size of the hitbox, and its position relative to the player       
        for(var i = 0; i < 8; i++){          
        // if we find the hitbox with the "name" specified          
                // create a "hitbox" (really just an empty sprite with a physics body)     
            var hitbox = hitboxes.create(0,0,null);  
            hitbox.body.setSize(shapeSprite.width/8, shapeSprite.height / 8, startX + offsetX, startY + offsetY);  
            offsetX += shapeSprite.width/8;
            offsetY += shapeSprite.height / 8;
            this.game.debug.body(hitbox);
        }

        //shapeSprite.addChild(hitboxes);*/

        this.game.physics.enable(shapeSprite, Phaser.Physics.ARCADE);

        shapeSprite.body.collideWorldBounds = true;
        shapeSprite.body.immovable = true;
        shapeSprite.body.allowGravity = false;
        shapeSprite.enableBody = true;
        shapeSprite.body.mass = 2500;

        //this.game.debug.body(shapeSprite);

        this.enemies.add(shapeSprite);
    }
};

PlayState._addBounces = function(lines) {
    if (lines.length == 0){
        return;
    }
    console.log(lines);
    for (i = 0; i < lines.length; i++) {
        var platformGr = this.game.make.graphics();
        platformGr.clear();
        platformGr.lineStyle(lines[i].lw, blue, 1);
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        platformGr.boundsPadding = 0;

        var texture = platformGr.generateTexture();

        platformGr.destroy();

        var shapeSprite = this.game.add.sprite(lines[i].sx, lines[i].sy, texture);

        this.game.physics.enable(shapeSprite, Phaser.Physics.ARCADE);

        shapeSprite.enableBody = true;
        shapeSprite.body.mass = 2500;
        shapeSprite.body.immovable = true;
        shapeSprite.body.allowGravity = false;
        shapeSprite.body.bounce.y = 0.5;

        //this.game.debug.body(shapeSprite);

        this.bounces.add(shapeSprite);
    }
};

PlayState._addLightBounces = function(lines) {
    if (lines.length == 0){
        return;
    }
    console.log(lines);
    for (i = 0; i < lines.length; i++) {
        var platformGr = this.game.make.graphics();
        platformGr.clear();
        platformGr.lineStyle(lines[i].lw, cadetblue, 1);
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        platformGr.boundsPadding = 0;

        var texture = platformGr.generateTexture();

        platformGr.destroy();

        var shapeSprite = this.game.add.sprite(lines[i].sx, lines[i].sy, texture);

        this.game.physics.enable(shapeSprite, Phaser.Physics.ARCADE);

        shapeSprite.enableBody = true;
        shapeSprite.body.mass = 2500;
        shapeSprite.body.immovable = true;
        shapeSprite.body.allowGravity = false;
        shapeSprite.body.bounce.y = 0.8;

        //this.game.debug.body(shapeSprite);

        this.lbounces.add(shapeSprite);
    }
};

PlayState._addDarkBounces = function(lines) {
    if (lines.length == 0){
        return;
    }
    console.log(lines);
    for (i = 0; i < lines.length; i++) {
        var platformGr = this.game.make.graphics();
        platformGr.clear();
        platformGr.lineStyle(lines[i].lw, darkblue, 1);
        platformGr.moveTo(lines[i].sx, lines[i].sy);
        platformGr.lineTo(lines[i].ex, lines[i].ey);
        platformGr.boundsPadding = 0;

        var texture = platformGr.generateTexture();

        platformGr.destroy();

        var shapeSprite = this.game.add.sprite(lines[i].sx, lines[i].sy, texture);

        this.game.physics.enable(shapeSprite, Phaser.Physics.ARCADE);

        shapeSprite.enableBody = true;
        shapeSprite.body.mass = 2500;
        shapeSprite.body.immovable = true;
        shapeSprite.body.allowGravity = false;
        shapeSprite.body.bounce.y = 0.2;

        //this.game.debug.body(shapeSprite);

        this.dbounces.add(shapeSprite);
    }
};

PlayState._createLevel = function() {
    this.enemies = this.game.add.group();
    this.platforms = this.game.add.group();
    this.bounces = this.game.add.group()
    this.lbounces = this.game.add.group();
    this.dbounces = this.game.add.group();
    this.bounds = this.game.add.group();

    this.enemies.enableBody = true;
    this.platforms.enableBody = true;
    this.bounces.enableBody = true;
    this.lbounces.enableBody = true;
    this.dbounces.enableBody = true;
    this.bounds.enableBody = true;

    var line = new Phaser.Line();
    

    console.log("adding platforms");
    this._addPlatforms(platform);
    console.log("adding enemies");
    this._addEnemies(danger);
    console.log(danger);
    console.log("adding bounces");
    this._addBounces(bounce);
    console.log("adding lbounce");
    this._addLightBounces(lightbounce);
    console.log("adding dbounces");
    this._addDarkBounces(darkbounce);
    console.log(bounce);

    //this._addWorldBounds();

    this.hero = new Hero(this.game, HeroX, HeroY);
    this.game.add.existing(this.hero);

    const GRAVITY = 980;  // Earth gravity
    this.game.physics.arcade.gravity.y = GRAVITY;
};

// TODO: Edit to make enemies anything in red.
PlayState._handleCollisions = function () {
    //this.game.physics.arcade.collide(this.spiders, this.platforms);
    //this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.hero, this.platforms);

    this.game.physics.arcade.collide(this.hero, this.bounces, this._onHeroVsBounce, null, this);
    this.game.physics.arcade.collide(this.hero, this.lbounces, this._onHeroVsLBounce, null, this);
    this.game.physics.arcade.collide(this.hero, this.dbounces, this._onHeroVsDBounce, null, this);
    
    this.game.physics.arcade.collide(this.hero, this.bounds, this._onHeroVsBound, null, this);

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

PlayState._onHeroVsBound = function () {
    alert('You won the game, congratulations!');
    this.game.state.restart(true, false);
}

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
    if (this.cursors.up.isDown && this.hero.body.touching.down) {
        //let didJump = this.hero.jump();
        //if (didJump) { this.sfx.jump.play(); }
        this.hero.jump();
    }
};

PlayState._onHeroVsPlatform = function (hero, platform) {
    // game over -> play dying animation and restart the game
    console.log("collided with platform");
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
    // game over -> play dying animation and restart the game
    console.log("Enemy Collision");
    hero.die();
    hero.events.onKilled.addOnce(function () {
        this.game.state.restart(true, false);
    }, this);

    // NOTE: bug in phaser in which it modifies 'touching' when
    // checking for overlaps. This undoes that change so enemies don't
    // 'bounce' agains the hero
    enemy.body.touching = enemy.body.wasTouching;
};


// TODO: Congratulate on level completion
PlayState._onHeroVsBounce = function (hero, bounce) {
    console.log("Bounce Collision");
    hero.body.velocity.y = -800;
};

PlayState._onHeroVsLBounce = function (hero, bounce) {
    console.log("Bounce Collision");
    hero.body.velocity.y = -1400;
};

PlayState._onHeroVsDBounce = function (hero, bounce) {
    console.log("Bounce Collision");
    hero.body.velocity.y = -200;
};

PlayState._updateGravity = function () {
    this.hero.body.gravity.y = grav;

};

function newDraw() {
    window.location.replace("index.html");
};

function change_gravity() {
    var newGrav = document.getElementById('Gravity Value').value;
    /*var re = /^\d+(\.)\d+$/;
    if (!re.exec(newGrav)) {
        return; //TODO: show message on screen of invalid value
    }
    var par = parseFloat(newGrav);
    if (par != NaN){
        grav = newGrav * 100;
    }
    else
    {
        return; //TODO: show message on screen of invalid value
    }  */
    var gravVal = parseInt(newGrav);
    switch (gravVal) {
        case 1:
            grav = 980;
            break;
        case 2:
            grav = 370;
            break;
        case 3:
            grav = 162;
            break;
        case 4:
            grav = 371;
            break;
        case 5:
            grav = 887;
            break;
        case 6:
            grav = 2500;
            break;
        case 7:
            grav = 1044;
            break;
        case 8:
            grav = 869;
            break;
        case 9:
            grav = 1115;
            break;
        default:
           grav = 980;
    }
};


window.onload = function () {
    playStart();
};
