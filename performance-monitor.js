// パフォーマンス監視クラス
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.audioNodeCount = 0;
        
        // 表示用UI要素
        this.createUI();
        
        // 計測開始
        this.startMonitoring();
    }

    createUI() {
        // パフォーマンス表示用のUI作成
        this.perfDisplay = document.createElement('div');
        this.perfDisplay.id = 'performance-display';
        this.perfDisplay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            min-width: 200px;
        `;
        document.body.appendChild(this.perfDisplay);
    }

    startMonitoring() {
        this.monitorLoop();
        
        // メモリ使用量を定期的に記録
        setInterval(() => {
            this.recordMemoryUsage();
        }, 1000);
    }

    monitorLoop() {
        const currentTime = performance.now();
        this.frameCount++;
        
        // FPS計算（1秒ごと）
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.fpsHistory.push(this.fps);
            
            // 履歴は最新100件まで保持
            if (this.fpsHistory.length > 100) {
                this.fpsHistory.shift();
            }
            
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            this.updateDisplay();
        }
        
        requestAnimationFrame(() => this.monitorLoop());
    }

    recordMemoryUsage() {
        if (performance.memory) {
            const memInfo = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
                timestamp: Date.now()
            };
            
            this.memoryHistory.push(memInfo);
            
            // 履歴は最新60件まで保持（1分間）
            if (this.memoryHistory.length > 60) {
                this.memoryHistory.shift();
            }
        }
    }

    updateDisplay() {
        const avgFps = this.fpsHistory.length > 0 ? 
            Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length) : 0;
        
        const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
        const maxFps = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;
        
        const latestMemory = this.memoryHistory[this.memoryHistory.length - 1];
        
        let displayText = `
            <strong>🎮 Game Performance</strong><br>
            FPS: ${this.fps} (avg: ${avgFps})<br>
            FPS Range: ${minFps} - ${maxFps}<br>
        `;
        
        if (latestMemory) {
            displayText += `
                Memory: ${latestMemory.used}MB / ${latestMemory.total}MB<br>
                Memory Limit: ${latestMemory.limit}MB<br>
            `;
        }
        
        displayText += `
            Audio Nodes: ${this.audioNodeCount}<br>
            <small>Press 'P' to toggle display</small>
        `;
        
        this.perfDisplay.innerHTML = displayText;
    }

    // オーディオノード数を更新
    updateAudioNodeCount(count) {
        this.audioNodeCount = count;
    }

    // パフォーマンスレポートを生成
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            fps: {
                current: this.fps,
                average: this.fpsHistory.length > 0 ? 
                    Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length) : 0,
                min: this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0,
                max: this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0,
                history: [...this.fpsHistory]
            },
            memory: {
                current: this.memoryHistory[this.memoryHistory.length - 1],
                history: [...this.memoryHistory]
            },
            audioNodes: this.audioNodeCount
        };
        
        return report;
    }

    // レポートをダウンロード
    downloadReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `game-performance-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 表示の切り替え
    toggleDisplay() {
        this.perfDisplay.style.display = 
            this.perfDisplay.style.display === 'none' ? 'block' : 'none';
    }
}

// キーボードショートカット
document.addEventListener('keydown', (event) => {
    if (event.key === 'p' || event.key === 'P') {
        if (window.performanceMonitor) {
            window.performanceMonitor.toggleDisplay();
        }
    }
    
    if (event.key === 'r' && event.ctrlKey) {
        if (window.performanceMonitor) {
            window.performanceMonitor.downloadReport();
        }
        event.preventDefault();
    }
});
