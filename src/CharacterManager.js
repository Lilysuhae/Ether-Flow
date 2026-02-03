/**
 * [src/CharacterManager.js]
 * 캐릭터의 성장 상태를 감시하고, 상황에 맞는 스프라이트를 렌더러에 로드하는 관리자 클래스입니다.
 */
class CharacterManager {
    constructor(options = {}) {
        this.charData = options.charData; 
        this.EVOLUTION_TARGET_MIN = 300;  
        this.PET_COOLDOWN = 300;         
        this.lastPetTime = 0; 
        this.lastLoadedId = null; 
        this.lastLoadedStage = null; 
    }

    /**
     * [핵심] 현재 파트너의 상태를 판별하여 그래픽을 리프레시합니다.
     */
    async refreshSprite(force = false) {
        const r = window.renderer;
        const partner = window.currentPartner;
        if (!partner || !r) return;

        const gameView = document.getElementById('game-view');
        if (gameView && partner.background) {
            gameView.style.backgroundImage = `url('${partner.background}')`;
        }

        const activeEgg = window.collection.activeEgg;
        const isActuallyEgg = activeEgg && String(partner.id) === String(activeEgg.type);

        if (isActuallyEgg) {
            window.currentStage = 'egg';
            r.currentState = 'egg';
            r.expressions = {}; 
            await r.loadCharacter(partner.stages.egg);
            this.lastLoadedStage = 'egg';
        } else {
            const growthMap = window.masterData.character.growthMap || {};
            const totalSec = growthMap[partner.id] || 0;
            const newStage = (totalSec / 60) >= (partner.evolution_level || this.EVOLUTION_TARGET_MIN) ? 'adult' : 'child';
            
            if (force || this.lastLoadedStage !== newStage || this.lastLoadedId !== partner.id) {
                window.currentStage = newStage;
                this.lastLoadedStage = newStage;
                this.lastLoadedId = partner.id;
                window.lastCharacterState = null; 

                const stageData = partner.stages[newStage];
                if (stageData && stageData.expressions) {
                    await r.loadExpressions(stageData.expressions);
                    r.setExpression('good');
                } else if (stageData) {
                    await r.loadCharacter(stageData);
                }
            }
        }
        if (r.draw) r.draw();
    }

    /**
     * ✨ [수정] 캐릭터 쓰다듬기 처리 및 10회 카운트 알림 로직
     */
    pet(event) {
        const now = Date.now();
        if (now - this.lastPetTime < this.PET_COOLDOWN) return;
        this.lastPetTime = now;

        // 1. ✨ [추가] 쓰다듬기 횟수 추적 및 토스트 알림
        if (window.currentPartner && window.getMolipDate) {
            const date = window.getMolipDate();
            const charId = window.currentPartner.id;
            const petKey = `${charId}_${date}`;

            // 횟수 증가
            if (!window.dailyPetCountMap) window.dailyPetCountMap = {};
            window.dailyPetCountMap[petKey] = (window.dailyPetCountMap[petKey] || 0) + 1;

            const currentCount = window.dailyPetCountMap[petKey];
            
            // 10회 달성 시 토스트 출력
            if (currentCount === 10) {
                window.showToast(`${window.currentPartner.name}이(가) 당신의 애정을 듬뿍 느끼고 있습니다! (10회 완료)`, "success");
            }
        }

        if (window.processInteraction) {
            window.processInteraction('pet', { event: event });
        }
    }

    /**
     * 클릭 위치에 하트 입자 생성
     */
    createHeartEffect(x, y) {
        const layer = document.getElementById('effect-layer');
        if (!layer) return; 
        
        const heart = document.createElement('i');
        heart.className = 'fas fa-heart floating-heart';
        const rect = document.getElementById('main-canvas').getBoundingClientRect();
        
        heart.style.left = `${x - rect.left}px`;
        heart.style.top = `${y - rect.top}px`;
        
        layer.appendChild(heart);
        setTimeout(() => heart.remove(), 800);
    }

    checkHatching() {
        const col = window.collection;
        if (!col || !col.activeEgg || window.isHatching) return;
        const hatchStartTime = new Date(col.activeEgg.date).getTime();
        const elapsedSeconds = (Date.now() - hatchStartTime) / 1000;
        if (elapsedSeconds >= (col.activeEgg.target || 1800)) {
            if (window.processGrowthTransition) window.processGrowthTransition('hatch', col.activeEgg.type);
        }
    }

    checkEvolution() {
        const partner = window.currentPartner;
        if (!partner || window.currentStage !== 'child' || window.isHatching) return;
        const growthMap = window.masterData.character.growthMap || {};
        const growthMin = (growthMap[partner.id] || 0) / 60;
        if (growthMin >= (partner.evolution_level || this.EVOLUTION_TARGET_MIN)) {
            if (window.processGrowthTransition) window.processGrowthTransition('evolve', partner.id);
        }
    }
}

module.exports = CharacterManager;