console.log("hello!");

class Hero extends Phaser.Sprite {
  constructor(game, x, y) {
    super(game, x, y, "hero");
    this.anchor.set(0.5, 0.5);
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
  }
  // direction => -1 = left, +1 = right
  move(direction) {
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;
  }
  jump() {
    const JUMP_SPEED = 600;
    const canJump = this.body.touching.down;

    if (canJump) {
      this.body.velocity.y = -1 * JUMP_SPEED;
    }

    return canJump;
  }
}

class Spider extends Phaser.Sprite {
  constructor(game, x, y) {
    super(game, x, y, "spider");
    this.anchor.set(0.5, 0.5);

    this.animations.add("crawl", [0, 1, 2], 8, true);
    this.animations.add("die", [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play("crawl");

    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;

    this.SPEED = 100;
    this.body.velocity.x = this.SPEED;
  }
  update() {
    const { touching, blocked } = this.body;
    if (touching.left || blocked.left) {
      // move right
      this.body.velocity.x = this.SPEED;
    }
    if (touching.right || blocked.right) {
      // move left
      this.body.velocity.x = -1 * this.SPEED;
    }
  }
}

PlayState = {
  _loadLevel(data) {
    // console.log(data);
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;

    // create all the groups/layers that we need
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    data.platforms.forEach(this._spawnPlatform, this);
    data.coins.forEach(this._spawnCoin, this);
    this._spawnCharacters({ hero: data.hero, spiders: data.spiders });
  },
  _spawnPlatform(platform) {
    const { x, y, image } = platform;
    // this.game.add.sprite(x, y, image);
    const sprite = this.platforms.create(x, y, image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // spawn enemy walls on edge of platform
    this._spawnEnemyWall(x, y, "left");
    this._spawnEnemyWall(x + sprite.width, y, "right");
  },
  _spawnEnemyWall(x, y, side) {
    const sprite = this.enemyWalls.create(x, y, "invisible-wall");
    sprite.anchor.set(side === "left" ? 1 : 0, 1);

    // physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
  },
  _spawnCharacters({ hero, spiders }) {
    this.hero = new Hero(this.game, hero.x, hero.y);
    this.game.add.existing(this.hero);

    spiders.forEach(spider => {
      const sprite = new Spider(this.game, spider.x, spider.y);
      this.spiders.add(sprite);
    });
  },
  _spawnCoin(coin) {
    const { x, y } = coin;
    const sprite = this.coins.create(x, y, "coin");
    sprite.anchor.set(0.5, 0.5);

    sprite.animations.add("rotate", [0, 1, 2, 1], 6, true); // 6fps, looped
    sprite.animations.play("rotate");
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
  },
  _handleInput() {
    if (this.keys.left.isDown) return this.hero.move(-1);
    if (this.keys.right.isDown) return this.hero.move(1);
    this.hero.move(0);
  },
  _handleCollisions() {
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.overlap(
      this.hero,
      this.coins,
      this._onHeroVsCoin,
      null,
      this
    );
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
  },
  _onHeroVsCoin(hero, coin) {
    coin.kill();
    this.sfx.coin.play();
  },
  init() {
    this.keys = this.game.input.keyboard.addKeys({
      left: Phaser.KeyCode.LEFT,
      right: Phaser.KeyCode.RIGHT,
      up: Phaser.KeyCode.UP
    });

    this.keys.up.onDown.add(() => {
      const didJump = this.hero.jump();
      if (didJump) this.sfx.jump.play();
    });

    this.game.renderer.renderSession.roundPixels = true;
  },
  preload() {
    const platformImages = [
      "background",
      "ground",
      "grass_8x1",
      "grass_6x1",
      "grass_4x1",
      "grass_2x1",
      "grass_1x1"
    ];

    // load platform sprites
    platformImages.forEach(imgName =>
      this.game.load.image(imgName, `images/${imgName}.png`)
    );

    // load hero image
    this.game.load.image("hero", "images/hero_stopped.png");
    this.game.load.audio("sfx_jump", "audio/jump.wav");

    // coins
    this.game.load.spritesheet("coin", "images/coin_animated.png", 22, 22);
    this.game.load.audio("sfx_coin", "audio/coin.wav");

    // spiders
    this.game.load.spritesheet("spider", "images/spider.png", 42, 32);
    this.game.load.audio("sfx_stomp", "audio/stomp.wav");

    // invisible walls too keep spiders in bounds
    this.game.load.image("invisible-wall", "images/invisible_wall.png");

    // load the level data
    this.game.load.json("level_1", "data/level01.json");
  },
  create() {
    this.game.add.image(0, 0, "background");
    this._loadLevel(this.game.cache.getJSON("level_1"));
    this.sfx = {
      jump: this.game.add.audio("sfx_jump"),
      coin: this.game.add.audio("sfx_coin"),
      stomp: this.game.add.audio("sfx_stomp")
    };
  },
  update() {
    this._handleCollisions();
    this._handleInput();
  }
};

window.onload = () => {
  const game = new Phaser.Game(960, 600, Phaser.AUTO, "game");
  game.state.add("play", PlayState);
  game.state.start("play");
};
