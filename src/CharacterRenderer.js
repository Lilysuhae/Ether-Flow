// src/characterRenderer.js
class CharacterRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.img = new Image();
        this.expressions = {}; 
        this.currentState = ""; 
        this.currentData = null;
        this.frameWidth = 0;
        this.frameHeight = 0;
        this.totalFrames = 0;
        this.currentFrame = 0;
        this.lastUpdateTime = 0;
        this.fps = 6;
        
        // ★ 추가: 배율 변수 (기본 1배)
        this.scale = 1; 
    }

    // 유아기/성체기용: 배율을 2배로 설정
    async loadExpressions(expressionMap) {
        this.expressions = expressionMap;
        this.currentState = ""; 
        this.scale = 2; // ★ 배율 상향
        await this.setExpression('good'); 
    }

    // 알 전용: 배율을 1배로 설정
    async loadCharacter(charData) {
        return new Promise((resolve) => {
            this.img.onload = () => {
                this.frameWidth = charData.frameWidth;
                this.frameHeight = charData.frameHeight;
                this.totalFrames = charData.totalFrames;
                this.fps = charData.fps || 6;
                this.currentFrame = 0;
                
                this.scale = 1; // ★ 알은 원본 크기

                // 캔버스 크기를 배율에 맞춰 설정
                this.canvas.width = this.frameWidth * this.scale;
                this.canvas.height = this.frameHeight * this.scale;

                this.ctx.imageSmoothingEnabled = false;
                this.render(0);
                resolve();
            };
            this.img.src = charData.sprite;
        });
    }

    async setExpression(state) {
        if (this.currentState === state) return;
        const data = this.expressions[state];
        if (!data) return;

        return new Promise((resolve) => {
            const nextImg = new Image();
            nextImg.onload = () => {
                this.img = nextImg;
                this.currentData = data;
                this.currentState = state;
                this.frameWidth = data.frameWidth;
                this.frameHeight = data.frameHeight;
                this.totalFrames = data.totalFrames;
                this.fps = data.fps || 6;
                this.currentFrame = 0;

                // 캔버스 크기 갱신
                this.canvas.width = this.frameWidth * this.scale;
                this.canvas.height = this.frameHeight * this.scale;

                this.ctx.imageSmoothingEnabled = false;
                resolve();
            };
            nextImg.src = data.sprite;
        });
    }

    render(timestamp) {
        if (!this.img.complete || (this.frameWidth === 0 && !this.currentData)) return;
        
        if (timestamp - this.lastUpdateTime > 1000 / this.fps) {
            this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
            this.lastUpdateTime = timestamp;
        }

        const sx = this.currentFrame * this.frameWidth;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ★ 배율을 적용하여 그리기
        this.ctx.drawImage(
            this.img, 
            sx, 0, this.frameWidth, this.frameHeight, 
            0, 0, this.frameWidth * this.scale, this.frameHeight * this.scale
        );
    }

    startLoop() {
        const loop = (t) => { this.render(t); requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    }
}
module.exports = CharacterRenderer;