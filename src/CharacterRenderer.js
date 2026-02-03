/**
 * [src/CharacterRenderer.js]
 * 캐릭터의 스프라이트 애니메이션과 표정 변화를 캔버스에 렌더링하는 엔진입니다.
 */
class CharacterRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId); //
        this.ctx = this.canvas.getContext('2d'); //
        this.img = new Image(); //
        this.expressions = {}; // 표정 데이터 맵
        this.currentState = ""; // 현재 출력 중인 상태 키
        this.currentData = null; // 현재 프레임 데이터
        this.frameWidth = 0; //
        this.frameHeight = 0; //
        this.totalFrames = 0; //
        this.currentFrame = 0; //
        this.lastUpdateTime = 0; //
        this.fps = 6; // 기본 애니메이션 속도
        this.scale = 1; // 렌더링 배율
        this.loadCount = 0; // 비동기 로딩 순서 제어용 카운터
    }

    /**
     * [내부 함수] 이미지 로드 및 캔버스 설정을 통합 처리합니다.
     * @param {string} src - 이미지 경로
     * @param {Object} data - 프레임 및 속도 정보
     * @param {number} newScale - 변경할 배율 (null일 경우 유지)
     */
    async _loadImage(src, data, newScale = null) {
        const currentLoadId = ++this.loadCount; // 요청 번호 생성으로 최신 요청 판별
        
        return new Promise((resolve) => {
            const tempImg = new Image();
            tempImg.onload = () => {
                // ✨ 마지막 요청이 아니면 무시하여 비동기 겹침(잔상) 방지
                if (currentLoadId !== this.loadCount) return;

                this.img = tempImg; //
                this.currentData = data; //
                this.frameWidth = data.frameWidth; //
                this.frameHeight = data.frameHeight; //
                this.totalFrames = data.totalFrames; //
                this.fps = data.fps || 6; //
                this.currentFrame = 0; //
                
                if (newScale !== null) this.scale = newScale; // 배율 갱신

                this.canvas.width = this.frameWidth * this.scale; //
                this.canvas.height = this.frameHeight * this.scale; //

                this.ctx.imageSmoothingEnabled = false; // 픽셀 아트 선명도 유지
                this.draw(); // 즉시 첫 프레임 렌더링
                resolve();
            };
            tempImg.src = src;
        });
    }

    /**
     * 캐릭터의 전체 표정 맵을 로드하고 기본 표정을 설정합니다.
     */
    async loadExpressions(expressionMap) {
        this.expressions = expressionMap; //
        this.currentState = ""; //
        await this.setExpression('good'); // 초기 로드 시 'good' 표정 우선 적용
    }

    /**
     * 단일 스프라이트(알 등)를 로드합니다.
     */
    async loadCharacter(charData) {
        // 단일 로드 시에는 배율 1을 기본으로 사용합니다.
        await this._loadImage(charData.sprite, charData, 1);
    }

    /**
     * 특정 표정 상태로 전환합니다.
     */
    async setExpression(state) {
        if (this.currentState === state) return; // 동일 상태 중복 로드 방지
        
        const data = this.expressions[state]; //
        if (!data) return;

        this.currentState = state; //
        // 표정 전환 시에는 배율 2를 적용하여 가독성을 높입니다.
        await this._loadImage(data.sprite, data, 2);
    }

    /**
     * 현재 프레임을 강제로 캔버스에 그립니다.
     */
    draw() {
        this.render(performance.now()); //
    }

    /**
     * 애니메이션 루프에 의해 매 프레임 호출되는 렌더링 함수입니다.
     */
    render(timestamp) {
        // 이미지 미로드 혹은 데이터 부재 시 렌더링 건너뜀
        if (!this.img.complete || (this.frameWidth === 0 && !this.currentData)) return;
        
        // FPS 설정에 따른 프레임 전환 계산
        if (timestamp - this.lastUpdateTime > 1000 / this.fps) {
            this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
            this.lastUpdateTime = timestamp;
        }

        const sx = this.currentFrame * this.frameWidth; //
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); //
        
        // 캔버스에 프레임 그리기
        this.ctx.drawImage(
            this.img, 
            sx, 0, this.frameWidth, this.frameHeight, 
            0, 0, this.frameWidth * this.scale, this.frameHeight * this.scale
        );
    }

    /**
     * 브라우저 프레임에 맞춘 애니메이션 루프를 시작합니다.
     */
    startLoop() {
        const loop = (t) => { 
            this.render(t); 
            requestAnimationFrame(loop); 
        };
        requestAnimationFrame(loop); //
    }
}

module.exports = CharacterRenderer; //