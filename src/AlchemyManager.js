/* ============================================================
   [⚗️ 일반 연성 및 플라스크 시스템]
   ============================================================ */

/**
 * [상태 변수 초기화]
 */
window.cylinderSaturation = window.cylinderSaturation || 0; // 플라스크 에테르 농도
window.lastSedimentTick = Date.now();                        // 마지막 침전물 체크 시간

/**
 * [데이터] 침전물(부산물) 테이블
 * 농도에 따라 획득 가능한 재료들의 정의입니다.
 */
window.byproductTable = [
    { id: 'ether_sludge', category: 'material', name: '에테르 슬러지', icon: 'assets/images/items/sludge.png', price: 20, rarity: 'common', minSat: 50, chance: 0.12 },
    { id: 'bleached_scales', category: 'material', name: '탈색된 비늘', icon: 'assets/images/items/scales.png', price: 20, rarity: 'common', minSat: 50, chance: 0.10 },
    { id: 'petrified_memory', category: 'material', name: '석화된 기억', icon: 'assets/images/items/memory.png', price: 40, rarity: 'uncommon', minSat: 65, chance: 0.08 },
    { id: 'transparent_husk', category: 'material', name: '투명한 허물', icon: 'assets/images/items/husk.png', price: 40, rarity: 'uncommon', minSat: 65, chance: 0.06 },
    { id: 'pulsing_crystal', category: 'material', name: '박동하는 결정', icon: 'assets/images/items/crystal.png', price: 80, rarity: 'rare', minSat: 80, chance: 0.04 },
    { id: 'floating_eye', category: 'material', name: '부유하는 안구', icon: 'assets/images/items/eye.png', price: 80, rarity: 'rare', minSat: 80, chance: 0.03 },
    { id: 'abyssal_dregs', category: 'material', name: '심연의 침전물', icon: 'assets/images/items/dregs.png', price: 160, rarity: 'epic', minSat: 90, chance: 0.015 },
    { id: 'incomplete_fetus', category: 'material', name: '지성이 남은 결정', icon: 'assets/images/items/fetus.png', price: 160, rarity: 'epic', minSat: 95, chance: 0.01 }
];

/**
 * [데이터] 실패한 연성물
 * 조합법이 맞지 않을 때 무작위로 생성되는 잔해들입니다.
 */
window.failedProducts = [
    { id: 'smoldering_ash', rarity: 'common', category: 'material', name: '그을린 재', icon: 'assets/images/items/ash.png', price: 1000, desc: "연성 과정에서 에테르가 과하게 충돌하여 타버린 잔해입니다." },
    { id: 'distorted_slime', rarity: 'uncommon', category: 'material', name: '일그러진 슬라임', icon: 'assets/images/items/slime.png', price: 1200, desc: "형체를 유지하지 못하고 무너져 내린 생명의 원형질입니다." },
    { id: 'petrified_residue', rarity: 'rare', category: 'material', name: '석화된 찌꺼기', icon: 'assets/images/items/residue.png', price: 1500, desc: "에테르가 급격히 식으며 돌처럼 굳어버린 찌꺼기입니다." },
    { id: 'unstable_fragment', rarity: 'epic', category: 'material', name: '불안정한 에테르 조각', icon: 'assets/images/items/fragment.png', price: 1800, desc: "결합에 실패하여 파편화된 에테르 덩어리입니다." },
    { id: 'glowing_dust', rarity: 'legendary', category: 'material', name: '희미하게 빛나는 가루', icon: 'assets/images/items/dust.png', price: 2500, desc: "연성이 흩어지며 남긴 빛의 가루입니다." }
];

/**
 * 통합 아이템 데이터베이스 조회용 함수
 */
const getItemDB = () => [
    ...(window.byproductTable || []), 
    ...window.getShopItems(), 
    ...(window.failedProducts || [])
];

/**
 * 1. 연성소 모달 제어
 */
window.openSedimentModal = () => {
    const modal = document.getElementById('sediment-modal');
    if (modal) {
        window.refreshSedimentUI(); 
        modal.style.display = 'flex';
    }
};

/**
 * [AlchemyManager.js] 
 * 연성로 모달을 닫을 때 호출되는 함수입니다.
 * 조합 연성 슬롯(alembic-slots)을 확실하게 비워줍니다.
 */
window.closeSedimentModal = () => {
    const modal = document.getElementById('sediment-modal');
    if (modal) {
        modal.style.display = 'none'; // 모달 숨기기
    }

    // 1. 데이터 초기화: 선택된 재료 ID 배열을 비웁니다.
    window.selectedIngredients = [null, null, null];

    // 2. UI 초기화: index.html의 'alembic-slot' 엘리먼트들을 직접 초기화합니다.
    // AlchemyManager.js 하단에 있는 슬롯 리셋 로직을 그대로 적용했습니다.
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`recipe-slot-${i}`);
        if (slot) {
            slot.innerHTML = '+';                // 글자 복구
            slot.classList.remove('has-item');    // 스타일 제거
            slot.style.backgroundImage = 'none'; // 이미지 제거
        }
    }

    // (참고) 만약 알타르 상태 갱신 함수가 따로 있다면 함께 호출합니다.
    if (typeof window.updateAltarStatus === 'function') {
        window.updateAltarStatus();
    }
};

/**
 * [AlchemyManager.js]
 * 모달 바깥(오버레이) 클릭 시 슬롯을 비우고 닫는 리스너
 */
document.addEventListener('click', (e) => {
    const modal = document.getElementById('sediment-modal');
    
    // 클릭된 대상이 정확히 '모달 배경(overlay)'일 때만 실행합니다.
    // 내부의 '모달 윈도우(window)'를 클릭했을 때는 닫히지 않게 방지합니다.
    if (e.target === modal) {
        if (window.closeSedimentModal) {
            window.closeSedimentModal();
        }
    }
});

/**
 * 연성로 내부 탭 전환 함수 (일반/조합)
 */
window.switchAlchemyTab = (tabId, btn) => {
    // 모든 탭 컨텐츠 숨기기
    document.querySelectorAll('.alchemy-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 모든 탭 버튼 활성화 해제
    const tabButtons = btn.parentElement.querySelectorAll('.shop-tab-re');
    tabButtons.forEach(b => b.classList.remove('active'));

    // 선택한 탭과 버튼 활성화
    const targetTab = document.getElementById(`alchemy-tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');
    btn.classList.add('active');
    
    // 효과음 재생
    if (window.playSfx) window.playSfx('click');
};

/**
 * 2. 연성소 UI 갱신 (농도 및 재료 인벤토리)
 */
window.refreshSedimentUI = () => {
    if (!masterData.inventory) masterData.inventory = { byproducts: {} };
    const inventory = masterData.inventory.byproducts || {};
    
    const satValue = Math.floor(window.cylinderSaturation || 0); 
    const satValEl = document.getElementById('sat-value');
    const satBarEl = document.getElementById('sat-bar-fill');
    
    if (satValEl) satValEl.innerText = `${satValue}%`;
    if (satBarEl) satBarEl.style.width = `${satValue}%`;
    
    const grid = document.getElementById('sediment-grid');
    if (grid) {
        grid.innerHTML = window.byproductTable.map(item => {
            const count = inventory[item.id] || 0;
            const hasItem = count > 0;
            return `
                <div class="sediment-slot ${hasItem ? 'has-item' : ''}">
                    <div class="sediment-icon">
                        ${hasItem ? `<img src="${item.icon}" class="sediment-img">` : '<i class="fas fa-question"></i>'}
                    </div>
                    <div class="sediment-name">${hasItem ? item.name : '???'}</div>
                    <div class="sediment-count">${hasItem ? 'x' + count : ''}</div>
                </div>`;
        }).join('');
    }
    if (window.updateAltarStatus) window.updateAltarStatus(); 
};

/**
 * 3. 플라스크 시스템 업데이트 (매 초 루프에서 호출)
 */
window.updateCylinderSystem = () => {
    // 농도 변화 계산: 집중 중이면 +0.15, 아니면 -0.07
    if (isActuallyWorking && !isIdle && !isDistraction) {
        window.cylinderSaturation = Math.min(100, window.cylinderSaturation + 0.15);
    } else {
        window.cylinderSaturation = Math.max(0, window.cylinderSaturation - 0.07);
    }

    masterData.cylinderSaturation = window.cylinderSaturation;

    const satValEl = document.getElementById('sat-value');
    const satBarEl = document.getElementById('sat-bar-fill');
    if (satValEl && satBarEl) {
        satValEl.innerText = `${Math.floor(window.cylinderSaturation)}%`;
        satBarEl.style.width = `${window.cylinderSaturation}%`;
    }

    // 1분(60,000ms)마다 침전물 발생 여부 체크
    const now = Date.now();
    if (now - window.lastSedimentTick >= 60000) {
        window.lastSedimentTick = now;
        if (window.cylinderSaturation >= 50 && !collection.activeEgg) {
            window.processSedimentation();
        }
    }
};

/**
 * 4. 침전물 발생 로직
 */
window.processSedimentation = () => {
    if (collection.activeEgg) return;
    const item = window.getSedimentDrop(); 
    if (!item) return;

    masterData.inventory.byproducts[item.id] = (masterData.inventory.byproducts[item.id] || 0) + 1;
    saveAllData();

    // 설정 모달의 알림 활성화 여부 확인 (기본값 true)
    const settings = window.masterData.settings || {};
    const showToastSetting = settings.showCylinderToast !== false;

    if (showToastSetting) {
        const charName = currentPartner ? currentPartner.name : "호문클루스";
        const particle = window.getKoreanParticle(charName, "이/가");
        window.showToast(`${charName}${particle} 플라스크에서 '${item.name}'을 건져 올렸습니다!`, "info");
    }

    window.refreshSedimentUI();
};

/**
 * 침전물 드랍 판정 로직
 */
window.getSedimentDrop = () => {
    const currentSat = window.cylinderSaturation;
    // 현재 농도 조건(minSat)을 만족하는 아이템들만 필터링
    const possibleItems = window.byproductTable.filter(item => currentSat >= item.minSat);
    if (possibleItems.length === 0) return null;

    // 확률이 낮은 순서대로 검사 (희귀한 것이 먼저 우선순위를 가짐)
    const sortedPool = [...possibleItems].sort((a, b) => a.chance - b.chance);
    for (const item of sortedPool) {
        if (Math.random() < item.chance) return item;
    }
    return null;
};

/**
 * 한국어 조사(이/가, 을/를) 자동 선택 유틸리티
 */
window.getKoreanParticle = (word, type) => {
    if (!word) return type;
    const lastChar = word.charCodeAt(word.length - 1);
    // 한글 여부 및 받침 존재 여부 체크
    const hasBatchim = (lastChar - 0xAC00) % 28 > 0;
    return hasBatchim ? type.split('/')[0] : type.split('/')[1];
};

/**
 * 5. 연성 비용 계산
 */
window.calculateNextEggCost = () => {
    // 10회차 이후로는 10으로 고정하여 요구사항 유지
    const count = masterData.hatchCount || 1;
    const c = Math.min(count, 10); 

    // 💰 에테르 비용: 1회(5천), 2회(2만), 3회(8만) 이후 8만 고정
    const etherCost = c <= 3 ? 5000 * Math.pow(4, c - 1) : 80000;

    // ⚗️ 재료 비용: c(최대 10) 값에 따라 모든 부산물 요구량 산출
    return {
        ether: etherCost,
        materials: {
            // [Common]
            'ether_sludge': 10 * c,                               // 최대 100개
            'bleached_scales': c > 3 ? 10 * (c - 3) : 0,          // 최대 70개
            // [Uncommon]
            'petrified_memory': c > 1 ? 5 * (c - 1) : 0,          // 최대 45개
            'transparent_husk': c > 4 ? 5 * (c - 4) : 0,          // 최대 30개
            // [Rare]
            'pulsing_crystal': c > 2 ? 2 * (c - 2) : 0,           // 최대 16개
            'floating_eye': c > 5 ? 2 * (c - 5) : 0,              // 최대 10개
            // [Epic]
            'abyssal_dregs': c > 7 ? 1 * (c - 7) : 0,             // 최대 3개
            'incomplete_fetus': c > 9 ? 1 : 0                     // 최대 1개
        }
    };
};

/**
 * 6. 제단 UI 및 버튼 상태 업데이트
 */
window.updateAltarStatus = () => {
    const cost = window.calculateNextEggCost();
    const inv = window.masterData.inventory.byproducts || {};
    const recipeContainer = document.querySelector('.recipe-check');
    if (!recipeContainer) return;

    // 현재 알이 있거나 부화 연출 중인지 판정
    const hasEgg = !!window.collection.activeEgg;
    const isLocked = hasEgg || window.isHatching; 

    let isReady = true;
    let html = "";

    // 에테르 조건 체크
    const currentEther = window.collection.points;
    const etherMet = currentEther >= cost.ether;
    if (!etherMet) isReady = false;

    html += `<div class="req-item ${etherMet ? 'met' : ''}"><span class="dot"></span> 에테르: <span class="val">${currentEther.toLocaleString()} / ${cost.ether.toLocaleString()} Et</span></div>`;

    // 재료 조건 체크
    for (const [id, amount] of Object.entries(cost.materials)) {
        if (amount <= 0) continue;
        const has = inv[id] || 0;
        const isMet = has >= amount;
        if (!isMet) isReady = false;
        const itemInfo = window.byproductTable.find(t => t.id === id);
        html += `<div class="req-item ${isMet ? 'met' : ''}"><span class="dot"></span> ${itemInfo ? itemInfo.name : id}: <span class="val">${has} / ${amount}</span></div>`;
    }

    recipeContainer.innerHTML = html;
    
    const btn = document.getElementById('btn-abyss-craft');
    if (btn) {
        // 이미 알이 있거나 연성 중이면 버튼 비활성화
        btn.disabled = isLocked || !isReady;
        
        if (hasEgg) {
            btn.innerText = "이미 알이 플라스크에 있습니다";
            btn.className = "btn-craft-large disabled";
        } else if (window.isHatching) {
            btn.innerText = "연성 중...";
            btn.className = "btn-craft-large disabled";
        } else {
            btn.innerText = isReady ? "호문클루스 연성하기" : "재료가 부족합니다";
            btn.className = `btn-craft-large ${isReady ? 'ready' : 'disabled'}`;
        }
    }
};

/**
 * 7. 실제로 호문클루스 연성을 실행하는 함수
 */
window.startAbyssCrafting = async () => {
    // ✨ [추가] 중복 연성 방지: 이미 연성 연출 중이라면 함수를 즉시 종료합니다.
    if (window.isHatching) return;

    // 1. 통합 비용 계산 (에테르 + 재료)
    const costData = window.calculateNextEggCost(); 
    
    // 2. 기본 검증 (에테르 및 알 존재 여부)
    if (window.collection.points < costData.ether) {
        window.showToast("에테르가 부족합니다.", "error");
        return;
    }
    if (window.collection.activeEgg) {
        window.showToast("이미 실린더에 부화 중인 알이 있습니다.", "error");
        return;
    }

    // 3. 연성 가능한 후보군 필터링
    const excludedIds = [...window.collection.ownedIds];
    const availableCharacters = window.charData.characters.filter(c => {
        if (excludedIds.includes(c.id)) return false;
        const methods = Array.isArray(c.obtainMethod) ? c.obtainMethod : [c.obtainMethod];
        return methods.includes("random");
    });

    if (availableCharacters.length === 0) {
        window.showToast("새롭게 발견할 수 있는 생명이 없습니다.", "info");
        return;
    }

    // ✨ [핵심] 연성 시퀀스 잠금: 자산 차감 직전에 플래그를 true로 설정합니다.
    window.isHatching = true;

    // 4. 차감할 자원 데이터 구성
    const itemUpdates = {};
    for (const [id, amount] of Object.entries(costData.materials)) {
        if (amount > 0) itemUpdates[id] = -amount; 
    }

    const transaction = {
        ether: -costData.ether,
        items: itemUpdates
    };

    // 5. 자산 통합 차감 실행
    const result = await window.processResourceTransaction(transaction);

    if (result && result.success) {
        const randomChar = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
        
        // 6. 알 획득 및 연출
        const success = await window.processNewEggAcquisition(randomChar.id, 1800, 'abyss');
        
        if (success) {
            // 슈퍼노바 연출 실행 (연출 종료 시 window.isHatching이 false로 돌아갑니다)
            if (window.triggerSupernovaEffect) window.triggerSupernovaEffect(randomChar);
            if (window.updateUI) window.updateUI();
            
            const particle = window.getKoreanParticle(randomChar.egg_name, "을/를");
            window.showToast(`'${randomChar.egg_name}'${particle} 연성해냈습니다!`, "success");
        } else {
            // 알 획득 실패 시 잠금 해제
            window.isHatching = false;
            window.showToast("알을 실린더에 담는 데 실패했습니다.", "error");
        }
    } else {
        // 자산 차감 실패 시 잠금 해제
        window.isHatching = false;
        window.showToast("연성 재료가 부족하거나 에너지가 불안정합니다.", "error");
    }
};

/**
 * 8. 연성 애니메이션 (슈퍼노바)
 */
window.triggerSupernovaEffect = (newChar) => {
    let overlay = document.getElementById('supernova-overlay') || document.createElement('div');
    if (!overlay.id) { 
        overlay.id = 'supernova-overlay'; 
        document.body.appendChild(overlay); 
    }
    overlay.style.background = '#000'; 
    overlay.style.opacity = '1'; 
    overlay.classList.add('active');

    setTimeout(async () => {
        overlay.style.background = '#fff';
        window.currentStage = 'egg';
        
        if (window.renderer && newChar.stages?.egg) {
            window.renderer.expressions = {}; 
            await window.renderer.loadCharacter(newChar.stages.egg);
            window.renderer.currentState = "egg";
        }
        window.updateUI(); 

        overlay.innerHTML = `
            <div class="reveal-container" style="text-align:center;">
                <div class="new-egg-name" style="color:#000; font-weight:800; font-size:2.5rem; margin-bottom:20px;">${newChar.egg_name || "알"}</div>
                <img src="${newChar.stages.egg.sprite}" id="reveal-img" class="new-egg-reveal" style="width:280px; opacity:0; transform:scale(0.7);">
            </div>`;
        
        const revealImg = document.getElementById('reveal-img');
        if (revealImg) { 
            setTimeout(() => { 
                revealImg.style.transform = 'scale(1.1)'; 
                revealImg.style.opacity = '1'; 
            }, 100); 
        }

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => { 
                overlay.classList.remove('active'); 
                overlay.innerHTML = ""; 
                window.isHatching = false; 
            }, 2000);
        }, 3500);
    }, 800);
};


/* ============================================================
   [⚗️ 조합 연성(비밀 조합) 시스템 - 출처별 차등 소모 버전]
   ============================================================ */

/**
 * [도움 함수] 해당 아이템이 '플라스크 부산물'인지 판별합니다.
 */
window.isByproductItem = (id) => {
    return window.byproductTable && window.byproductTable.some(p => p.id === id);
};

/**
 * 1. 일괄 재료 선택 팝업 열기 (재료별 필요 수량 표시)
 */
window.openIngredientPicker = () => {
    const invItems = (window.masterData && window.masterData.inventory?.items) || {};
    const invByproducts = (window.masterData && window.masterData.inventory?.byproducts) || {};
    const itemDB = [...(window.byproductTable || []), ...window.getShopItems()];
    const allOwnedIds = [...new Set([...Object.keys(invItems), ...Object.keys(invByproducts)])];

    const materials = allOwnedIds.map(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        const info = itemDB.find(dbItem => dbItem.id === id);
        return { ...info, count: count };
    }).filter(item => item && item.category === 'material' && item.count > 0);
    
    if (materials.length === 0) {
        window.showToast("연성에 사용할 수 있는 재료가 가방에 없습니다.", "error");
        return;
    }

    window.tempSelectedIngredients = [];

    const pickerOverlay = document.createElement('div');
    pickerOverlay.className = 'ingredient-picker-overlay';
    pickerOverlay.id = 'bulk-picker-overlay';
    pickerOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:1000001; display:flex; align-items:center; justify-content:center;';
    
    pickerOverlay.innerHTML = `
        <div class="picker-modal-container" onclick="event.stopPropagation()">
            <div class="picker-header">
                <h4 style="margin-bottom:5px;">조합 재료 선택 (<span id="pick-count">0</span>/3)</h4>
                <p>부산물은 20개, 상점 재료는 1개가 투입됩니다.<br><b>호문클루스 연성에는 부산물 1칸, 상점 재료 2칸</b>이 투입됩니다.</p>
            </div>
            <div class="picker-grid-area" id="bulk-picker-grid">
                ${materials.map(item => {
                    const required = window.isByproductItem(item.id) ? 20 : 1; // ✨ 출처별 요구량 설정
                    const isShort = item.count < required;
                    
                    return `
                    <div class="picker-item-card ${isShort ? 'insufficient' : ''}" 
                         id="picker-item-${item.id}" 
                         onclick="window.toggleIngredientSelection('${item.id}')"
                         style="${isShort ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                        <div class="picker-item-icon"><img src="${item.icon}"></div>
                        <div class="picker-item-count ${isShort ? 'warning' : ''}">x${item.count}</div>
                        <div class="picker-item-name">${item.name}</div>
                        <div class="selection-order" style="display:none;"></div>
                        <div class="req-label">
                            ${isShort ? '수량 부족' : ``}
                        </div>
                    </div>
                `}).join('')}
            </div>
            <div class="picker-footer">
                <button class="btn btn-close" onclick="this.closest('.ingredient-picker-overlay').remove()">취소</button>
                <button id="btn-confirm-recipe" class="btn btn-confirm-selection" disabled onclick="window.confirmIngredientSelection()">재료 넣기</button>
            </div>
        </div>
    `;
    document.body.appendChild(pickerOverlay);
};

/**
 * 2. 아이템 선택 토글 처리 (출처별 수량 검증)
 */
window.toggleIngredientSelection = (itemId) => {
    const idx = window.tempSelectedIngredients.indexOf(itemId);
    const card = document.getElementById(`picker-item-${itemId}`);
    
    // ✨ [핵심] 부산물 여부에 따라 20개 또는 1개 검증
    const required = window.isByproductItem(itemId) ? 20 : 1;
    const inv = window.masterData.inventory;
    const owned = (inv.byproducts[itemId] || 0) + (inv.items[itemId] || 0);

    if (idx === -1) {
        if (owned < required) {
            window.showToast(`${required}개 이상의 재료가 필요합니다.`, "warning");
            return;
        }
        if (window.tempSelectedIngredients.length >= 3) {
            window.showToast("최대 3개까지만 선택 가능합니다.", "warning");
            return;
        }
        window.tempSelectedIngredients.push(itemId);
        card.classList.add('selected');
    } else {
        window.tempSelectedIngredients.splice(idx, 1);
        card.classList.remove('selected');
        card.querySelector('.selection-order').style.display = 'none';
    }

    window.tempSelectedIngredients.forEach((id, i) => {
        const orderBadge = document.getElementById(`picker-item-${id}`).querySelector('.selection-order');
        if (orderBadge) {
            orderBadge.innerText = i + 1;
            orderBadge.style.display = 'flex';
        }
    });

    const countDisplay = window.tempSelectedIngredients.length;
    document.getElementById('pick-count').innerText = countDisplay;
    document.getElementById('btn-confirm-recipe').disabled = (countDisplay === 0);
    if (window.playSfx) window.playSfx('click');
};

/**
 * 3. 최종 선택 확정 및 슬롯 반영
 */
window.confirmIngredientSelection = () => {
    // 전역 선택 배열 초기화 및 복사
    window.selectedIngredients = [null, null, null];
    const itemDB = [...(window.byproductTable || []), ...window.getShopItems()];

    window.tempSelectedIngredients.forEach((id, i) => {
        window.selectedIngredients[i] = id;
        const item = itemDB.find(d => d.id === id);
        const slot = document.getElementById(`recipe-slot-${i}`);
        
        if (slot && item) {
            // ✨ [핵심] 부산물 여부 판별 및 배지 HTML 생성
            const isByproduct = window.isByproductItem(id);
            const qtyBadge = isByproduct 
                ? `<div class="slot-qty-badge" style="position:absolute; bottom:2px; right:4px; background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:1px 4px; border-radius:4px; font-weight:bold; pointer-events:none; border:1px solid rgba(255,255,255,0.2);">x20</div>` 
                : '';

            // 슬롯 내용물 삽입 (배지 포함)
            slot.style.position = 'relative'; // 배지 위치 고정용
            slot.innerHTML = `
                <img src="${item.icon}" style="width:100%; height:100%; object-fit:contain; display:block;">
                ${qtyBadge}
            `;
            slot.style.borderStyle = 'solid';
        }
    });

    // 팝업 제거 및 알림
    const overlay = document.getElementById('bulk-picker-overlay');
    if (overlay) overlay.remove();
    window.showToast("재료가 슬롯에 투입되었습니다.", "success");
};

/**
 * [AlchemyManager.js] 비밀 조합 실행 (UI 초기화 보강 버전)
 */
window.startRecipeSynthesis = async () => {
    // 1. [검증] 실린더 가동 가능 여부 체크
    if (window.isHatching || (window.collection && window.collection.activeEgg)) {
        window.showToast("이미 실린더에 고동치는 생명이 안착해 있습니다.", "warning");
        return;
    }

    const slots = window.selectedIngredients;

    // 2. [검증] 슬롯 투입 여부 확인
    if (!slots || slots.every(s => s === null)) {
        window.showToast("조합할 재료가 선택되지 않았습니다.", "warning");
        return;
    }

    // 3. [규칙] 부산물 포함 여부 검사
    const hasByproduct = slots.some(id => id !== null && window.isByproductItem(id));
    if (!hasByproduct) {
        window.showToast("연성을 시작하려면 최소 한 종류의 '심연 부산물'이 필요합니다.", "warning");
        return;
    }

    // 4. 통합 차감 데이터 구성
    const itemUpdates = {};
    slots.forEach(id => {
        if (!id) return;
        const amount = window.isByproductItem(id) ? 20 : 1;
        itemUpdates[id] = (itemUpdates[id] || 0) - amount; 
    });

    // 5. 레시피 판정 준비
    const currentInput = [...slots].filter(s => s !== null).sort();
    const recipes = {
        'char_09': ['calcified_shell_fragment', 'starlight_antler', 'ether_sludge'].sort(),
        'char_11': ['soft_down_feather', 'incomplete_fetus', 'cracked_beak'].sort(),
    };

    let resultCharId = null;
    for (const [charId, ingredients] of Object.entries(recipes)) {
        if (JSON.stringify(currentInput) === JSON.stringify(ingredients)) {
            resultCharId = charId;
            break;
        }
    }

    // 연성 프로세스 잠금 (연출 시작)
    window.isHatching = true;

    if (resultCharId) {
        // --- [성공 케이스] ---
        if (window.collection.ownedIds.includes(resultCharId)) {
            window.isHatching = false;
            window.showToast("이미 연성해본 경험이 있는 생명입니다. 다른 조합을 시도해 보세요.", "info");
            return;
        }

        const result = await window.processResourceTransaction({ items: itemUpdates });
        if (result && result.success) {
            const success = await window.processNewEggAcquisition(resultCharId, 1800, 'recipe');
            if (success) {
                const char = window.charData.characters.find(c => c.id === resultCharId);
                if (window.triggerSupernovaEffect) window.triggerSupernovaEffect(char);
                window.showToast("비밀스러운 조합에 성공했습니다!", "success");
            } else {
                window.isHatching = false;
            }
        } else {
            window.isHatching = false;
            window.showToast("재료가 부족하여 연성에 실패했습니다.", "error");
        }
    } else {
        // --- [실패 케이스] ---
        const result = await window.processResourceTransaction({ items: itemUpdates });
        if (result && result.success) {
            const itemDB = [...(window.byproductTable || []), ...window.getShopItems()];
            const inputRarities = currentInput.map(id => itemDB.find(i => i.id === id)?.rarity || 'common');

            let dominantRarity = 'common';
            let maxCount = 0;
            const counts = {};
            inputRarities.forEach(r => {
                counts[r] = (counts[r] || 0) + 1;
                if (counts[r] > maxCount) {
                    maxCount = counts[r];
                    dominantRarity = r;
                }
            });

            const possibleFails = window.failedProducts.filter(p => p.rarity === dominantRarity);
            const randomProduct = possibleFails.length > 0 ? possibleFails[Math.floor(Math.random() * possibleFails.length)] : window.failedProducts[0];

            const inv = window.masterData.inventory.byproducts;
            inv[randomProduct.id] = (inv[randomProduct.id] || 0) + 1;

            const particle = window.getKoreanParticle(randomProduct.name, "을/를");
            window.showToast(`조합 실패... '${randomProduct.name}'${particle} 획득했습니다.`, "info");
            
            await window.saveAllData();
            if (window.renderInventory) window.renderInventory();
            window.isHatching = false; 
        } else {
            window.isHatching = false;
            window.showToast("재료가 부족합니다.", "error");
        }
    }

    // ✨ [UI 및 데이터 초기화] 토스트 출력 시점에 슬롯 비우기
    window.selectedIngredients = [null, null, null]; // 데이터 초기화
    
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`recipe-slot-${i}`);
        if (slot) {
            slot.innerHTML = '+';                // 글자 복구
            slot.classList.remove('has-item');    // 스타일 제거
            slot.style.backgroundImage = 'none'; // 이미지 제거
            slot.style.borderStyle = 'dashed';   // 점선 테두리로 복구
        }
    }

    if (window.updateAltarStatus) window.updateAltarStatus(); // 제단 UI 갱신
};

// [AlchemyManager.js]
window.startHatchMonitor = () => {
    // 이전 인터벌이 있다면 제거 (중복 방지)
    if (window.hatchInterval) clearInterval(window.hatchInterval);

    window.hatchInterval = setInterval(async () => {
        // 데이터 로드 확인 방어 코드
        if (!window.collection || !window.collection.activeEgg) return;
        
        const egg = window.collection.activeEgg;
        
        // 연성 연출 중(isHatching)이 아닐 때만 체크
        if (!window.isHatching) {
            const now = Date.now();
            
            if (now >= egg.hatchTime) {
                console.log("🐣 [System] 부화 시간이 도달했습니다:", egg.type);
                window.isHatching = true; // 잠금

                try {
                    // 1. 데이터 처리 (알 제거 및 캐릭터 추가)
                    const success = await window.completeHatching(egg.type);
                    
                    if (success) {
                        // 2. ✨ 핵심: 즉시 파일 저장 (재시작 시 안정성 확보)
                        if (window.saveAllData) await window.saveAllData();
                        
                        // 3. ✨ 핵심: UI 및 캐릭터 캔버스 강제 리프레시
                        if (window.renderCollection) window.renderCollection();
                        
                        // 4. 부화 성공 연출 (연출 함수가 없으면 알림만)
                        if (window.triggerHatchSequence) {
                            await window.triggerHatchSequence(egg);
                        } else {
                            window.showToast("새로운 생명이 깨어났습니다!", "success");
                            // 연출이 없으면 즉시 파트너 업데이트
                            if (window.CharacterManager) window.CharacterManager.init(); 
                        }
                    }
                } catch (err) {
                    console.error("부화 프로세스 중 오류:", err);
                } finally {
                    window.isHatching = false; // ✨ 어떤 상황에서든 잠금 해제
                }
            }
        }
    }, 2000); // 2초 간격으로 체크 (부하 최적화)
};

// 페이지 로드 시 감시 시작
window.startHatchMonitor();