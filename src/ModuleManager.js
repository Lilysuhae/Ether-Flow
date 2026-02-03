/**
 * [src/ModuleManager.js]
 * 연구실 통합 관리 모듈 (에테르플로우 코어 엔진)
 * 자산 거래, 알 획득, 상호작용, 성장 시스템을 통합 관리합니다.
 */

// 1. ✨ [자산 거래 모듈] 에테르 및 아이템 변동 통합 처리
window.processResourceTransaction = async (changes) => {
    if (!window.masterData || !window.collection) return { success: false, reason: "system_not_ready" };

    const { ether = 0, items = {} } = changes;
    const inv = window.masterData.inventory || { items: {}, byproducts: {} };
    
    // 검증: 자산 부족 여부 체크
    if (ether < 0 && window.collection.points < Math.abs(ether)) return { success: false, reason: "insufficient_ether" };
    for (const [id, count] of Object.entries(items)) {
        if (count < 0) {
            const currentCount = (inv.items?.[id] || 0) + (inv.byproducts?.[id] || 0);
            if (currentCount < Math.abs(count)) return { success: false, reason: "insufficient_items", itemId: id };
        }
    }

    // 반영: 자산 변동 실행
    if (ether !== 0) {
        window.collection.points += ether;
        if (window.masterData.collection) window.masterData.collection.points = window.collection.points;
    }
    for (const [id, count] of Object.entries(items)) {
        const isByproduct = byproductTable.some(b => b.id === id);
        const category = isByproduct ? 'byproducts' : 'items';
        if (!inv[category]) inv[category] = {};
        inv[category][id] = (inv[category][id] || 0) + count;
    }

    // 후처리: 저장 및 UI 갱신
    await window.saveAllData();
    window.updateUI();
    if (window.refreshSedimentUI) window.refreshSedimentUI();
    if (window.renderInventory) window.renderInventory();
    if (window.renderShopItems && window.currentShopCategory) window.renderShopItems(window.currentShopCategory);

    return { success: true };
};

// 2. 🥚 [알 획득 모듈] 인트로/연성/코드/서신 통합
window.processNewEggAcquisition = async (charId, hatchTimeSeconds = 1800, source = "unknown") => {
    const targetChar = charData.characters.find(c => c.id === charId);
    if (!targetChar) return null;

    // 기존 알 백업
    if (collection.activeEgg) {
        const oldEggId = collection.activeEgg.type;
        if (!collection.ownedIds.includes(oldEggId)) {
            collection.ownedIds.push(oldEggId);
            if (!masterData.character.growthMap) masterData.character.growthMap = {};
            if (masterData.character.growthMap[oldEggId] === undefined) masterData.character.growthMap[oldEggId] = 0;
        }
    }

    // 새 알 등록
    if (!collection.ownedIds.includes(charId)) collection.ownedIds.push(charId);
    if (!masterData.character.growthMap) masterData.character.growthMap = {};
    masterData.character.growthMap[charId] = 0;

    collection.activeEgg = { type: charId, progress: 0, target: hatchTimeSeconds, date: new Date().toISOString() };

    // 상태 동기화
    window.currentPartner = targetChar;
    window.currentStage = 'egg';
    window.lastCharacterState = null;
    if (!masterData.character) masterData.character = {};
    masterData.character.selectedPartnerId = charId;
    
    if (source === 'craft') {
        masterData.hatchCount = (masterData.hatchCount || 0) + 1;
        cylinderSaturation = 0;
        masterData.cylinderSaturation = 0;
    }

    await window.saveAllData();
    if (window.characterManager) await window.characterManager.refreshSprite();
    window.updateUI();
    if (window.renderCollection) window.renderCollection();

    if (source !== 'intro' && window.triggerSupernovaEffect) window.triggerSupernovaEffect(targetChar);
    return targetChar;
};

// 3. 💖 [상호작용 모듈] 쓰다듬기/선물/클릭 통합
window.processInteraction = async (type, data = {}) => {
    const partner = window.currentPartner;
    const stage = window.currentStage;
    if (!partner || stage === 'egg') {
        if (type === 'click') window.showDialogue("...", 1);
        return { success: false, reason: "is_egg" };
    }

    const charId = partner.id;
    const molipToday = window.getMolipDate();
    let intimacyPoints = 0, responseCategory = 'idle', forceText = null;

    if (type === 'pet') {
        const petKey = `${charId}_${molipToday}`;
        if (!masterData.character.dailyPetCountMap[petKey]) masterData.character.dailyPetCountMap[petKey] = 0;
        if (masterData.character.dailyPetCountMap[petKey] < 10) {
            intimacyPoints = 0.5;
            masterData.character.dailyPetCountMap[petKey]++;
            if (data.event) window.characterManager.createHeartEffect(data.event.clientX, data.event.clientY);
        }
    } else if (type === 'gift') {
        const item = data.item;
        if (!item) return { success: false };
        if (!dailyGiftCountMap[charId]) dailyGiftCountMap[charId] = { date: molipToday, count: 0 };
        if (dailyGiftCountMap[charId].count >= 3) return { success: false, reason: "gift_limit" };

        dailyGiftCountMap[charId].count++;
        if (!givenGiftsMap[charId]) givenGiftsMap[charId] = [];
        if (!givenGiftsMap[charId].includes(item.name)) givenGiftsMap[charId].push(item.name);

        const stageData = partner.stages[stage] || partner.stages['adult'];
        const res = stageData.gift_responses || { normal: "고마워요.", favorite: "정말 기뻐요!", dislike: "으음..." };
        if (partner.preferences.favorite.includes(item.name)) { intimacyPoints = 10; forceText = res.favorite; }
        else if (partner.preferences.dislike.includes(item.name)) { intimacyPoints = -5; forceText = res.dislike; }
        else { intimacyPoints = 5; forceText = res.normal; }
    } else if (type === 'click') {
        responseCategory = window.currentStatus === 'working' ? 'work' : (window.currentStatus === 'distracting' ? 'distract' : 'idle');
    }

    if (intimacyPoints !== 0) charIntimacyMap[charId] = Math.min(100, Math.max(0, (charIntimacyMap[charId] || 0) + intimacyPoints));
    if (type !== 'click' && window.renderer) {
        window.renderer.setExpression('good');
        setTimeout(() => window.renderer.setExpression(window.isDistraction ? 'distracting' : (window.isIdle ? 'away' : 'working')), 3000);
    }
    if (forceText) window.showDialogue(forceText, 2); else window.showRandomDialogue(responseCategory);

    window.updateUI();
    await window.saveAllData();
    return { success: true };
};

// 4. 🌱 [성장 관리 모듈] 부화 및 진화 통합
window.processGrowthTransition = async (type, charId) => {
    const targetChar = charData.characters.find(c => c.id === charId);
    if (!targetChar || window.isHatching) return { success: false };

    window.isHatching = true;
    try {
        if (type === 'hatch') {
            if (!collection.ownedIds.includes(charId)) collection.ownedIds.push(charId);
            collection.activeEgg = null;
            window.currentStage = 'child';
            const flash = document.getElementById('hatch-flash');
            if (flash) { flash.style.display = 'block'; flash.classList.add('flash-trigger'); await new Promise(r => setTimeout(r, 800)); flash.style.display = 'none'; }
        } else if (type === 'evolve') {
            const container = document.getElementById('character-container');
            if (container) container.classList.add('evolving-act');
            window.showDialogue("앗...!", 2);
            await new Promise(r => setTimeout(r, 2500));
            window.currentStage = 'adult';
            if (container) { container.classList.remove('evolving-act'); container.classList.add('evolved-new'); setTimeout(() => container.classList.remove('evolved-new'), 2000); }
            window.showDialogue(targetChar.stages.child.evolution_text || "저, 조금 더 어른이 된 것 같아요!", 2);
        }

        window.currentPartner = targetChar;
        window.masterData.character.selectedPartnerId = charId;
        window.lastCharacterState = null;
        if (window.characterManager) await window.characterManager.refreshSprite();
        window.updateUI();
        if (window.renderCollection) window.renderCollection();
        await window.saveAllData();
        return { success: true };
    } finally {
        setTimeout(() => { window.isHatching = false; }, 1000);
    }
};