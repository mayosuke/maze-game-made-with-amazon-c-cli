// 迷路脱出ゲーム - Phaser.js実装

const MAZE_SIZE = 20;
const TILE_SIZE = 25;
const CANVAS_WIDTH = MAZE_SIZE * TILE_SIZE;
const CANVAS_HEIGHT = MAZE_SIZE * TILE_SIZE;

// プレイヤーアニメーション状態
const PLAYER_STATES = {
    IDLE: 'idle',
    MOVING: 'moving',
    HIT_WALL: 'hit_wall'
};

// 迷路生成クラス
class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.maze = [];
        this.visited = [];
    }

    // 迷路を初期化（すべて壁）
    initializeMaze() {
        for (let y = 0; y < this.height; y++) {
            this.maze[y] = [];
            this.visited[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.maze[y][x] = 1; // 1 = 壁
                this.visited[y][x] = false;
            }
        }
    }

    // 指定座標が有効かチェック
    isValid(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // 隣接する未訪問セルを取得
    getUnvisitedNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0] // 上、右、下、左（2マス間隔）
        ];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isValid(nx, ny) && !this.visited[ny][nx]) {
                neighbors.push([nx, ny]);
            }
        }
        return neighbors;
    }

    // 深度優先探索で迷路生成
    generateMaze() {
        this.initializeMaze();
        
        const stack = [];
        const startX = 1;
        const startY = 1;
        
        // スタート地点を通路にして訪問済みにする
        this.maze[startY][startX] = 0; // 0 = 通路
        this.visited[startY][startX] = true;
        stack.push([startX, startY]);

        while (stack.length > 0) {
            const [currentX, currentY] = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(currentX, currentY);

            if (neighbors.length > 0) {
                // ランダムに隣接セルを選択
                const [nextX, nextY] = neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // 現在のセルと次のセルの間の壁を除去
                const wallX = currentX + (nextX - currentX) / 2;
                const wallY = currentY + (nextY - currentY) / 2;
                
                this.maze[wallY][wallX] = 0;
                this.maze[nextY][nextX] = 0;
                this.visited[nextY][nextX] = true;
                
                stack.push([nextX, nextY]);
            } else {
                stack.pop();
            }
        }

        return this.maze;
    }

    // スタートとゴール地点を設定
    setStartAndGoal() {
        // スタート地点（左上付近）
        this.startX = 1;
        this.startY = 1;
        
        // ゴール地点（右下付近の通路を探す）
        for (let y = this.height - 2; y > this.height - 5; y--) {
            for (let x = this.width - 2; x > this.width - 5; x--) {
                if (this.maze[y] && this.maze[y][x] === 0) {
                    this.goalX = x;
                    this.goalY = y;
                    return;
                }
            }
        }
        
        // 見つからない場合のフォールバック
        this.goalX = this.width - 2;
        this.goalY = this.height - 2;
        this.maze[this.goalY][this.goalX] = 0;
    }
}

// ゲームシーン
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.playerState = PLAYER_STATES.IDLE;
        this.isMoving = false;
        this.bgmEnabled = true; // BGMの状態
    }

    preload() {
        // テクスチャ用のグラフィックスを作成
        this.createTextures();
        
        // サウンドは Web Audio API で生成
        this.createSounds();
    }

    createTextures() {
        // 壁のテクスチャ（石のパターン）
        const wallTexture = this.add.graphics();
        wallTexture.fillStyle(0x34495e);
        wallTexture.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        wallTexture.fillStyle(0x2c3e50);
        wallTexture.fillRect(2, 2, TILE_SIZE-4, TILE_SIZE-4);
        wallTexture.fillStyle(0x34495e);
        wallTexture.fillRect(4, 4, TILE_SIZE-8, TILE_SIZE-8);
        wallTexture.generateTexture('wall', TILE_SIZE, TILE_SIZE);
        wallTexture.destroy();

        // 通路のテクスチャ（タイルパターン）
        const floorTexture = this.add.graphics();
        floorTexture.fillStyle(0xecf0f1);
        floorTexture.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        floorTexture.lineStyle(1, 0xbdc3c7);
        floorTexture.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
        floorTexture.fillStyle(0xd5dbdb);
        floorTexture.fillRect(TILE_SIZE/4, TILE_SIZE/4, TILE_SIZE/2, TILE_SIZE/2);
        floorTexture.generateTexture('floor', TILE_SIZE, TILE_SIZE);
        floorTexture.destroy();

        // プレイヤーテクスチャ（アイドル状態）
        const playerIdleTexture = this.add.graphics();
        playerIdleTexture.fillStyle(0x3498db);
        playerIdleTexture.fillCircle(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/3);
        playerIdleTexture.fillStyle(0xffffff);
        playerIdleTexture.fillCircle(TILE_SIZE/2 - 3, TILE_SIZE/2 - 3, 2);
        playerIdleTexture.fillCircle(TILE_SIZE/2 + 3, TILE_SIZE/2 - 3, 2);
        playerIdleTexture.generateTexture('player_idle', TILE_SIZE, TILE_SIZE);
        playerIdleTexture.destroy();

        // プレイヤーテクスチャ（移動中）
        const playerMovingTexture = this.add.graphics();
        playerMovingTexture.fillStyle(0x2980b9);
        playerMovingTexture.fillCircle(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/3);
        playerMovingTexture.fillStyle(0xffffff);
        playerMovingTexture.fillCircle(TILE_SIZE/2 - 3, TILE_SIZE/2 - 3, 2);
        playerMovingTexture.fillCircle(TILE_SIZE/2 + 3, TILE_SIZE/2 - 3, 2);
        playerMovingTexture.fillStyle(0xf39c12);
        playerMovingTexture.fillRect(TILE_SIZE/2 - 8, TILE_SIZE/2 + 5, 16, 3);
        playerMovingTexture.generateTexture('player_moving', TILE_SIZE, TILE_SIZE);
        playerMovingTexture.destroy();

        // プレイヤーテクスチャ（壁にぶつかった時）
        const playerHitTexture = this.add.graphics();
        playerHitTexture.fillStyle(0xe74c3c);
        playerHitTexture.fillCircle(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/3);
        playerHitTexture.fillStyle(0xffffff);
        playerHitTexture.fillCircle(TILE_SIZE/2 - 3, TILE_SIZE/2 - 3, 1);
        playerHitTexture.fillCircle(TILE_SIZE/2 + 3, TILE_SIZE/2 - 3, 1);
        playerHitTexture.lineStyle(2, 0xffffff);
        playerHitTexture.strokeCircle(TILE_SIZE/2, TILE_SIZE/2 + 3, 3);
        playerHitTexture.generateTexture('player_hit', TILE_SIZE, TILE_SIZE);
        playerHitTexture.destroy();
    }

    createSounds() {
        // Web Audio APIを使用してサウンドを生成
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.activeAudioNodes = 0;
        
        // BGM用のオシレーター（ループ）
        this.startBGM();
    }

    startBGM() {
        if (!this.bgmEnabled) return;
        
        if (this.bgmOscillator) {
            this.bgmOscillator.stop();
        }
        
        this.bgmOscillator = this.audioContext.createOscillator();
        this.bgmGain = this.audioContext.createGain();
        
        this.bgmOscillator.type = 'sine';
        this.bgmOscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        this.bgmGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        
        this.bgmOscillator.connect(this.bgmGain);
        this.bgmGain.connect(this.audioContext.destination);
        
        this.bgmOscillator.start();
        
        // 簡単なメロディーパターン
        const notes = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00];
        let noteIndex = 0;
        
        this.bgmInterval = setInterval(() => {
            if (this.bgmOscillator && this.bgmEnabled) {
                this.bgmOscillator.frequency.setValueAtTime(notes[noteIndex], this.audioContext.currentTime);
                noteIndex = (noteIndex + 1) % notes.length;
            }
        }, 800);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        if (this.bgmOscillator) {
            this.bgmOscillator.stop();
            this.bgmOscillator = null;
        }
    }

    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        
        if (this.bgmEnabled) {
            this.startBGM();
        } else {
            this.stopBGM();
        }
        
        return this.bgmEnabled;
    }

    playSound(type) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        this.activeAudioNodes += 2; // oscillator + gainNode
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // パフォーマンス監視に通知
        if (window.performanceMonitor) {
            window.performanceMonitor.updateAudioNodeCount(this.activeAudioNodes);
        }
        
        switch(type) {
            case 'move':
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                
                // 終了時にカウントを減らす
                setTimeout(() => {
                    this.activeAudioNodes -= 2;
                    if (window.performanceMonitor) {
                        window.performanceMonitor.updateAudioNodeCount(this.activeAudioNodes);
                    }
                }, 100);
                break;
                
            case 'hit':
                oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                
                setTimeout(() => {
                    this.activeAudioNodes -= 2;
                    if (window.performanceMonitor) {
                        window.performanceMonitor.updateAudioNodeCount(this.activeAudioNodes);
                    }
                }, 300);
                break;
                
            case 'goal':
                // ゴール音（上昇音階）
                const frequencies = [523.25, 659.25, 783.99, 1046.50];
                frequencies.forEach((freq, index) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    this.activeAudioNodes += 2;
                    
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.4, this.audioContext.currentTime + index * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.1 + 0.3);
                    osc.start(this.audioContext.currentTime + index * 0.1);
                    osc.stop(this.audioContext.currentTime + index * 0.1 + 0.3);
                    
                    setTimeout(() => {
                        this.activeAudioNodes -= 2;
                        if (window.performanceMonitor) {
                            window.performanceMonitor.updateAudioNodeCount(this.activeAudioNodes);
                        }
                    }, (index * 0.1 + 0.3) * 1000);
                });
                break;
        }
    }

    create() {
        this.generateNewMaze();
        this.setupInput();
        
        // パーティクルシステムの準備
        this.setupParticles();
    }

    setupParticles() {
        // ゴール到達時のパーティクルエフェクト用（メッセージエリア用に調整）
        this.particles = this.add.particles(0, 0, 'player_idle', {
            speed: { min: 100, max: 200 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1500,
            quantity: 5,
            frequency: 50,
            emitting: false,
            blendMode: 'ADD',
            tint: [0xffd700, 0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57],
            angle: { min: 0, max: 360 },
            gravityY: -100
        });
    }

    generateNewMaze() {
        // 既存の要素をクリア
        if (this.mazeGroup) {
            this.mazeGroup.destroy();
        }
        if (this.player) {
            this.player.destroy();
        }
        if (this.goal) {
            this.goal.destroy();
        }
        if (this.victoryGroup) {
            this.victoryGroup.destroy();
        }

        // 新しい迷路を生成
        const generator = new MazeGenerator(MAZE_SIZE, MAZE_SIZE);
        this.maze = generator.generateMaze();
        generator.setStartAndGoal();
        
        this.startX = generator.startX;
        this.startY = generator.startY;
        this.goalX = generator.goalX;
        this.goalY = generator.goalY;

        this.createMazeVisuals();
        this.createPlayer();
        this.createGoal();
        
        // プレイヤー状態をリセット
        this.playerState = PLAYER_STATES.IDLE;
        this.isMoving = false;
    }

    createMazeVisuals() {
        this.mazeGroup = this.add.group();

        for (let y = 0; y < MAZE_SIZE; y++) {
            for (let x = 0; x < MAZE_SIZE; x++) {
                const tileX = x * TILE_SIZE;
                const tileY = y * TILE_SIZE;

                if (this.maze[y][x] === 1) {
                    // 壁（テクスチャ使用）
                    const wall = this.add.image(tileX + TILE_SIZE/2, tileY + TILE_SIZE/2, 'wall');
                    this.mazeGroup.add(wall);
                } else {
                    // 通路（テクスチャ使用）
                    const floor = this.add.image(tileX + TILE_SIZE/2, tileY + TILE_SIZE/2, 'floor');
                    this.mazeGroup.add(floor);
                }
            }
        }
    }

    createPlayer() {
        const playerX = this.startX * TILE_SIZE + TILE_SIZE/2;
        const playerY = this.startY * TILE_SIZE + TILE_SIZE/2;
        
        this.player = this.add.image(playerX, playerY, 'player_idle');
        
        this.playerGridX = this.startX;
        this.playerGridY = this.startY;
        this.playerState = PLAYER_STATES.IDLE;
    }

    createGoal() {
        const goalX = this.goalX * TILE_SIZE + TILE_SIZE/2;
        const goalY = this.goalY * TILE_SIZE + TILE_SIZE/2;
        
        this.goal = this.add.circle(goalX, goalY, TILE_SIZE/3, 0x27ae60);
        this.goal.setStrokeStyle(2, 0x229954);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    }

    update() {
        this.handleInput();
    }

    handleInput() {
        // 移動中は入力を受け付けない
        if (this.isMoving) return;
        
        let newX = this.playerGridX;
        let newY = this.playerGridY;
        let inputDetected = false;

        // キー入力チェック
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || 
            Phaser.Input.Keyboard.JustDown(this.wasd.A)) {
            newX--;
            inputDetected = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || 
                   Phaser.Input.Keyboard.JustDown(this.wasd.D)) {
            newX++;
            inputDetected = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || 
                   Phaser.Input.Keyboard.JustDown(this.wasd.W)) {
            newY--;
            inputDetected = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || 
                   Phaser.Input.Keyboard.JustDown(this.wasd.S)) {
            newY++;
            inputDetected = true;
        }

        if (inputDetected) {
            // 移動可能かチェック
            if (this.canMoveTo(newX, newY)) {
                this.movePlayer(newX, newY);
                
                // ゴール到達チェック
                if (newX === this.goalX && newY === this.goalY) {
                    this.showVictory();
                }
            } else {
                // 壁にぶつかった時のアニメーション
                this.hitWall();
            }
        }
    }

    canMoveTo(x, y) {
        // 境界チェック
        if (x < 0 || x >= MAZE_SIZE || y < 0 || y >= MAZE_SIZE) {
            return false;
        }
        
        // 壁チェック
        return this.maze[y][x] === 0;
    }

    movePlayer(newX, newY) {
        this.isMoving = true;
        this.playerState = PLAYER_STATES.MOVING;
        this.player.setTexture('player_moving');
        
        this.playerGridX = newX;
        this.playerGridY = newY;
        
        const pixelX = newX * TILE_SIZE + TILE_SIZE/2;
        const pixelY = newY * TILE_SIZE + TILE_SIZE/2;
        
        // 移動音を再生
        this.playSound('move');
        
        // スムーズな移動アニメーション
        this.tweens.add({
            targets: this.player,
            x: pixelX,
            y: pixelY,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.isMoving = false;
                this.playerState = PLAYER_STATES.IDLE;
                this.player.setTexture('player_idle');
            }
        });
    }

    hitWall() {
        this.playerState = PLAYER_STATES.HIT_WALL;
        this.player.setTexture('player_hit');
        
        // 壁にぶつかった音を再生
        this.playSound('hit');
        
        // 少し震えるアニメーション
        this.tweens.add({
            targets: this.player,
            x: this.player.x + 3,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.playerState = PLAYER_STATES.IDLE;
                this.player.setTexture('player_idle');
            }
        });
    }

    showVictory() {
        // ゴール音を再生
        this.playSound('goal');
        
        // 勝利メッセージグループを作成
        this.victoryGroup = this.add.group();

        // 背景を半透明にする
        const overlay = this.add.rectangle(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.7);
        
        // 勝利メッセージ
        const victoryText = this.add.text(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 'クリア！', {
            fontSize: '32px',
            fill: '#27ae60',
            fontWeight: 'bold'
        });
        victoryText.setOrigin(0.5);
        
        const restartText = this.add.text(CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 50, '新しい迷路で再スタートボタンを押してください', {
            fontSize: '16px',
            fill: '#ecf0f1'
        });
        restartText.setOrigin(0.5);

        // すべての勝利メッセージ要素をグループに追加
        this.victoryGroup.add(overlay);
        this.victoryGroup.add(victoryText);
        this.victoryGroup.add(restartText);
        
        // パーティクルエフェクトをメッセージエリア上で開始（「クリア！」テキストの周辺）
        this.particles.setPosition(CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 30);
        this.particles.start();
        
        // 勝利テキストにも輝くエフェクトを追加
        this.tweens.add({
            targets: victoryText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 500,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
        });
        
        // パーティクルを数秒後に停止
        this.time.delayedCall(3000, () => {
            this.particles.stop();
        });
    }

    restart() {
        // BGMを停止して再開
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
        }
        if (this.bgmOscillator) {
            this.bgmOscillator.stop();
        }
        
        // パーティクルを停止
        if (this.particles) {
            this.particles.stop();
        }
        
        this.scene.restart();
    }
}

// ゲーム設定
const config = {
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    parent: 'gameContainer',
    backgroundColor: '#ecf0f1',
    scene: GameScene,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

// ゲーム開始
const game = new Phaser.Game(config);

// パフォーマンス監視を開始
window.performanceMonitor = new PerformanceMonitor();

// 再スタート関数
function restartGame() {
    const gameScene = game.scene.getScene('GameScene');
    
    // 勝利メッセージを非表示にする
    if (gameScene.victoryGroup) {
        gameScene.victoryGroup.destroy();
        gameScene.victoryGroup = null;
    }
    
    // パーティクルを停止
    if (gameScene.particles) {
        gameScene.particles.stop();
    }
    
    // 新しい迷路を生成
    gameScene.generateNewMaze();
}

// BGM制御関数
function toggleBGM() {
    const gameScene = game.scene.getScene('GameScene');
    const button = document.getElementById('bgmToggle');
    
    if (gameScene && gameScene.toggleBGM) {
        const isEnabled = gameScene.toggleBGM();
        
        // ボタンの表示を更新
        if (isEnabled) {
            button.textContent = '🎵 BGM ON';
            button.className = 'bgm-button on';
        } else {
            button.textContent = '🔇 BGM OFF';
            button.className = 'bgm-button';
        }
    }
}
