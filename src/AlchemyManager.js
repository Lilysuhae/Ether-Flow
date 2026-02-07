/* ============================================================
   [⚗️ 일반 연성 및 실린더 시스템]
   ============================================================ */

/**
 * [상태 변수 초기화]
 */
window.cylinderSaturation = window.cylinderSaturation || 0; // 실린더 에테르 농도
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

window.closeSedimentModal = () => {
    const modal = document.getElementById('sediment-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

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
 * 3. 실린더 시스템 업데이트 (매 초 루프에서 호출)
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
        window.showToast(`${charName}${particle} 실린더에서 '${item.name}'을 건져 올렸습니다!`, "info");
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
    const count = masterData.hatchCount || 1;
    // 공식: 5,000 * 4^(횟수 - 1)
    return {
        ether: 5000 * Math.pow(4, count - 1),
        materials: {
            'ether_sludge': 10 * count,
            'petrified_memory': count > 1 ? 5 * (count - 1) : 0,
            'pulsing_crystal': count > 2 ? 2 * (count - 2) : 0
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
            btn.innerText = "이미 알이 실린더에 있습니다";
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
    // 최종 논리 체크 (중복 클릭 차단)
    if (window.collection.activeEgg || window.isHatching) {
        console.warn("🚫 [Alchemy] 이미 연성 중이거나 알이 존재합니다.");
        return;
    }

    const cost = window.calculateNextEggCost();
    if (window.collection.points < cost.ether) {
        window.showToast("에테르가 부족합니다.", "error");
        return;
    }

    // 연성 시작 플래그 가동 및 UI 잠금
    window.isHatching = true; 
    window.updateAltarStatus();

    // 거래 데이터 구성
    const transaction = { ether: -cost.ether, items: {} };
    for (const [id, amount] of Object.entries(cost.materials)) {
        transaction.items[id] = -amount;
    }

    // 통합 거래 모듈 호출
    const result = await window.processResourceTransaction(transaction);

    if (result.success) {
        // 연성 횟수 증가 및 저장
        window.masterData.hatchCount = (window.masterData.hatchCount || 0) + 1;
        await window.saveAllData();

        // 중복 당첨 방지 필터링 로직
        const allChars = window.charData.characters;
        const ownedIds = window.collection.ownedIds || [];
        const currentPartnerId = window.currentPartner?.id;

        // 후보군: (이미 보유 제외) AND (현재 파트너 제외)
        const candidateChars = allChars.filter(c => 
            !ownedIds.includes(c.id) && c.id !== currentPartnerId
        );

        // 전체 수집 시 전체에서 랜덤, 아니면 후보군에서 선택
        const pool = candidateChars.length > 0 ? candidateChars : allChars;
        const randomChar = pool[Math.floor(Math.random() * pool.length)];

        console.log(`⚗️ [Alchemy] 새 생명 연성 성공: ${randomChar.id} (${randomChar.name})`);

        // 새 알 데이터 등록 및 연출 실행
        await window.processNewEggAcquisition(randomChar.id, 1800, 'alchemy'); 

        if (window.triggerSupernovaEffect) {
            window.triggerSupernovaEffect(randomChar);
        }
        
        window.closeSedimentModal();
    } else {
        // 실패 시 복구
        window.isHatching = false; 
        window.updateAltarStatus();
        window.showToast("연성 과정 중 에테르 흐름이 불안정해 실패했습니다.", "error");
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
 * [도움 함수] 해당 아이템이 '실린더 부산물'인지 판별합니다.
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
                <p>부산물은 20개, 상점 재료는 1개가 투입됩니다.</p>
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
 * [AlchemyManager.js] 비밀 조합 실행 (최종 통합 버전)
 */
window.startRecipeSynthesis = async () => {
    const slots = window.selectedIngredients;

    // 1. [검증] 슬롯 투입 여부 확인
    if (!slots || slots.every(s => s === null)) {
        window.showToast("조합할 재료가 선택되지 않았습니다.", "warning");
        return;
    }

    // 2. [규칙] 부산물 1종류 이상 포함 여부 검사 (상점 재료로만 조합 방지)
    const hasByproduct = slots.some(id => id !== null && window.isByproductItem(id));
    if (!hasByproduct) {
        window.showToast("조합연성할 때 부산물을 1종류 이상 집어넣지 않으면 조합이 불가능합니다.", "warning");
        return;
    }

    // 3. [상태] 현재 실린더 가동 가능 여부 체크
    if (window.collection.activeEgg || window.isHatching) {
        window.showToast("이미 실린더에 고동치는 생명이 있습니다.", "warning");
        return;
    }

    // 4. [매칭] 레시피 데이터베이스 대조 (재료 정렬 후 비교)
    const currentInput = [...slots].filter(s => s !== null).sort();
    const recipes = {
        'char_09': ['calcified_shell_fragment', 'starlight_antler', 'ether_sludge'].sort(),// 염소
    };

    let resultCharId = null;
    for (const [id, ingredients] of Object.entries(recipes)) {
        if (JSON.stringify(currentInput) === JSON.stringify(ingredients)) {
            resultCharId = id;
            break;
        }
    }

    // 연성 프로세스 시작 (플래그 잠금)
    window.isHatching = true;

    /**
     * [내부 로직] 재료 차감 (부산물 20개 / 상점 재료 1개 차등 적용)
     */
    const consumeIngredients = () => {
        slots.forEach(id => {
            if (id) {
                const amount = window.isByproductItem(id) ? 20 : 1;
                window.removeItemFromInventory(id, amount);
            }
        });
    };

    if (resultCharId) {
        // --- [성공 판정] ---
        const targetChar = window.charData.characters.find(c => c.id === resultCharId);
        if (targetChar) {
            // 중복 연성 방지: 이미 도감에 등록된 캐릭터인지 확인 
            const isAlreadyOwned = window.collection.ownedIds.includes(resultCharId);
            if (isAlreadyOwned) {
                window.showToast(`이미 연성해본 경험이 있는 '${targetChar.egg_name || '알'}'의 연성식입니다.`, "info");
                window.isHatching = false;
                return;
            }

            // 재료 소모 및 데이터 등록
            consumeIngredients();
            window.charGrowthMap[resultCharId] = window.charGrowthMap[resultCharId] || 0;
            window.currentPartner = targetChar;
            window.masterData.character.selectedPartnerId = resultCharId;

            // 알 획득 시퀀스 실행
            await window.processNewEggAcquisition(resultCharId, 1800, 'recipe'); 
            if (window.triggerSupernovaEffect) window.triggerSupernovaEffect(targetChar);
            
            window.closeSedimentModal();
            window.showToast(`${targetChar.egg_name || '알'} 연성 성공!`, "success");
            if (window.saveAllData) await window.saveAllData();
        }
    } else {
        // --- [실패 판정] 등급 결정 및 조사(을/를) 처리 ---
        window.isHatching = false;

        const itemDB = [...(window.byproductTable || []), ...window.getShopItems()];
        const usedRarities = slots
            .filter(id => id !== null)
            .map(id => {
                const info = itemDB.find(item => item.id === id);
                return info?.rarity || 'common'; // 상점 재료는 common 취급
            });

        // 다수 등급 판정 로직 (가장 많은 등급, 동률 시 높은 등급)
        const rarityWeights = { 'common': 1, 'uncommon': 2, 'rare': 3, 'epic': 4, 'legendary': 5 };
        const counts = {};
        usedRarities.forEach(r => counts[r] = (counts[r] || 0) + 1);

        let dominantRarity = 'common';
        let maxCount = 0;
        Object.entries(counts).forEach(([rarity, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantRarity = rarity;
            } else if (count === maxCount) {
                if (rarityWeights[rarity] > rarityWeights[dominantRarity]) {
                    dominantRarity = rarity;
                }
            }
        });

        // 결과 실패물 결정 및 지급
        const possibleFails = window.failedProducts.filter(p => p.rarity === dominantRarity);
        const randomProduct = possibleFails.length > 0 ? possibleFails[Math.floor(Math.random() * possibleFails.length)] : window.failedProducts[0];

        consumeIngredients(); // 실패해도 재료 소모
        const inv = window.masterData.inventory.byproducts;
        inv[randomProduct.id] = (inv[randomProduct.id] || 0) + 1;

        // ✨ [핵심] 조사(을/를) 자동 구분 적용
        const particle = window.getKoreanParticle(randomProduct.name, "을/를");
        window.showToast(`조합 실패... ${dominantRarity.toUpperCase()} 등급의 '${randomProduct.name}'${particle} 획득했습니다.`, "info");
        
        if (window.saveAllData) await window.saveAllData();
        if (window.renderInventory) window.renderInventory();
    }

    // [슬롯 초기화] 시각 효과 및 데이터 리셋
    window.selectedIngredients = [null, null, null];
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`recipe-slot-${i}`);
        if (slot) {
            slot.innerHTML = '+';
            slot.style.borderStyle = 'dashed';
            slot.style.position = ''; 
        }
    }
};