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
     * [CharacterManager.js]
     * 캐릭터 이름과 조사를 포함한 토스트 알림 로직
     */
    pet(event) {
        const now = Date.now();
        if (now - this.lastPetTime < this.PET_COOLDOWN) return;
        this.lastPetTime = now;

        if (window.currentPartner && window.getMolipDate) {
            const date = window.getMolipDate();
            const charId = window.currentPartner.id;
            const charName = window.currentPartner.name; // ✨ 캐릭터 이름 획득
            const petKey = `${charId}_${date}`;

            if (!window.dailyPetCountMap) window.dailyPetCountMap = {};
            
            const PET_LIMIT = 5; 
            const currentCount = window.dailyPetCountMap[petKey] || 0;

            if (currentCount >= PET_LIMIT) {
                if (window.showToast) {
                    // ✨ [조사 판별] 이름의 받침 유무에 따라 '을' 또는 '를' 선택
                    const particle = window.getKoreanParticle(charName, "을/를");
                    window.showToast(`오늘은 ${charName}${particle} 충분히 쓰다듬어주었습니다.`, "info");
                }
                return; 
            }

            window.dailyPetCountMap[petKey] = currentCount + 1;

            if (window.playSFX && window.currentStage !== 'egg') {
                window.playSFX('pet'); 
            }

            if (window.processInteraction) {
                window.processInteraction('pet', { event: event });
            }
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
            if (window.playSFX) window.playSFX('hatch');
            if (window.processGrowthTransition) window.processGrowthTransition('hatch', col.activeEgg.type);
        }
    }

    checkEvolution() {
        const partner = window.currentPartner;
        if (!partner || window.currentStage !== 'child' || window.isHatching) return;
        const growthMap = window.masterData.character.growthMap || {};
        const growthMin = (growthMap[partner.id] || 0) / 60;
        if (growthMin >= (partner.evolution_level || this.EVOLUTION_TARGET_MIN)) {
            if (window.playSFX) window.playSFX('evolve');
            if (window.processGrowthTransition) window.processGrowthTransition('evolve', partner.id);
        }
    }
}

module.exports = CharacterManager;