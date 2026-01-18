const charData = require('../assets/data/characters.json');

class CollectionManager {
    constructor(initialData) {
        const data = initialData || {
            ownedIds: [],
            points: 0,
            activeEgg: null
        };
        // 데이터 누락 방지를 위한 기본값 할당 보강
        this.ownedIds = data.ownedIds || [];
        this.points = data.points || 0;
        this.activeEgg = data.activeEgg || null;
    }

    // 1초마다 집중 상태에서 호출됨
    updateHatch() {
        if (!this.activeEgg) return { hatched: false };
        
        // 변수명을 progress/target으로 통일
        this.activeEgg.progress = (this.activeEgg.progress || 0) + 1;
        
        if (this.activeEgg.progress >= this.activeEgg.target) {
            const characterId = this.activeEgg.type;
            if (!this.ownedIds.includes(characterId)) {
                this.ownedIds.push(characterId);
            }
            this.activeEgg = null;
            return { hatched: true, type: characterId };
        }
        return { hatched: false };
    }

    addPoints(amount) { 
        this.points += amount; 
    }

    getSaveData() {
        return { 
            ownedIds: this.ownedIds, 
            points: this.points, 
            activeEgg: this.activeEgg 
        };
    }

    buyEgg(price) {
        if (this.points < price) return { success: false, msg: "포인트가 부족합니다." };
        if (this.activeEgg) return { success: false, msg: "이미 부화 중인 알이 있습니다." };

        const excludedIds = [...this.ownedIds];
        const availableCharacters = charData.characters.filter(c => !excludedIds.includes(c.id));

        if (availableCharacters.length === 0) {
            return { success: false, msg: "더 이상 분양받을 새로운 호문클루스가 없습니다!" };
        }

        const randomChar = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        
        this.points -= price;
        this.activeEgg = {
            type: randomChar.id,
            progress: 0,
            target: 15, // 테스트용 15초
            date: new Date().toISOString()
        };

        return { success: true, egg: this.activeEgg };
    }
}
module.exports = CollectionManager;