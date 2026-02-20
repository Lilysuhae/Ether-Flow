/**
 * [src/UIManager.js]
 * 연구실 UI 컴포넌트 관리자 (상점, 가방, 도감, 서신함 통합)
 */

/* ============================================================
   [🛒 상점 시스템 (Shop)] 
   ============================================================ */

window.currentShopCategory = 'gift'; // 현재 상점 탭 상태 기억

/**
 * 1. 상점 아이템 기본 데이터 정의
 */
window.getShopItems = () => [
    /* --- 🎁 선물 아이템 (Gift) --- */
    { id: "handwritten_letter", rarity: "common", category: "gift", name: "손편지", icon: "assets/images/items/handwritten_letter.png", price: 5, desc: "종이 위에 꾹꾹 눌러 담은 마음이 느껴지는 편지입니다." },
    { id: "red_berry", rarity: "common", category: "gift", name: "붉은 열매", icon: "assets/images/items/red_berry.png", price: 20, desc: "잘 익은 열매에서 은은한 생명력이 느껴집니다." },
    { id: "black_extract", rarity: "common", category: "gift", name: "검은 추출액", icon: "assets/images/items/black_extract.png", price: 30, desc: "쓴맛 뒤에 정신이 맑아지는 기운이 감도는 액체입니다." },
    { id: "old_record", rarity: "common", category: "gift", name: "낡은 기록서", icon: "assets/images/items/old_record.png", price: 60, desc: "누군가의 탐구 흔적이 가득한 오래된 책입니다." },
    { id: "old_instrument", rarity: "common", category: "gift", name: "낡은 악기", icon: "assets/images/items/old_instrument.png", price: 50, desc: "오랜 세월을 견뎠지만, 맑은 소리를 내는 악기입니다." },
    { id: "warm_blanket", rarity: "common", category: "gift", name: "따뜻한 모포", icon: "assets/images/items/warm_blanket.png", price: 60, desc: "결이 곱게 가공된 직물입니다." },
    { id: "ice_shard", rarity: "common", category: "gift", name: "빙결 조각", icon: "assets/images/items/ice_shard.png", price: 30, desc: "과열된 연성로의 열기를 식힐 냉기를 머금은 조각입니다." },
    { id: "gem_shard", rarity: "common", category: "gift", name: "원석 조각", icon: "assets/images/items/gem_shard.png", price: 80, desc: "가공되지 않은 순수한 마력의 결정체입니다." },
    { id: "silent_candle", rarity: "common", category: "gift", name: "침묵의 향초", icon: "assets/images/items/silent_candle.png", price: 25, desc: "타오를수록 주변의 잡음을 지우고 깊은 정적을 불러오는 향입니다." },
    { id: "prism_kaleidoscope", rarity: "common", category: "gift", name: "프리즘 만화경", icon: "assets/images/items/prism_kaleidoscope.png", price: 70, desc: "빛을 산란시켜 평범한 풍경을 수만 갈래의 환상적 색채로 보여주는 도구입니다." },
    { id: "dried_flower", rarity: "common", category: "gift", name: "마른 안개꽃", icon: "assets/images/items/dried_flower.png", price: 15, desc: "화려하진 않지만 책상 위에서 묵묵히 자리를 지킵니다." },
    { id: "old_parchment", rarity: "common", category: "gift", name: "낡은 양피지", icon: "assets/images/items/old_parchment.png", price: 5, desc: "연구 기록을 휘갈기기 좋은 종이입니다." },
    { id: "abyssal_quill", rarity: "common", category: "gift", name: "흑로 깃펜", icon: "assets/images/items/abyssal_quill.png", price: 60, desc: "흑화의 재 속에서 피어오른 깃털로 만든, 날카로운 필기도구입니다." },
    { id: "golden_curd", rarity: "common", category: "gift", name: "황금 커드", icon: "assets/images/items/golden_curd.png", price: 25, desc: "시간의 온기를 담아낸 달콤한 영양 덩어리입니다." },
    { id: "resonance_bell", rarity: "common", category: "gift", name: "공명 방울", icon: "assets/images/items/resonance_bell.png", price: 50, desc: "연금술사의 영혼과 공명하여 잡음을 지우는 맑은 방울입니다." },

    /* --- 🧪 기초 연성 재료 (제한 없음) --- */
    /* --- ⚡ 강화 및 변이 재료 --- */
    { id: 'phosphorescent_wing', rarity: 'uncommon', category: 'material', minLevel: 0, name: '발광하는 날개', icon: 'assets/images/items/insect_wing.png', price: 45, desc: "에테르에 반응하여 미세하게 떨리는 날개입니다." },
    { id: 'chitinous_armor_plate', rarity: 'uncommon', category: 'material', minLevel: 0, name: '키틴질 갑각 조각', icon: 'assets/images/items/chitin.png', price: 50, desc: "외부 충격에 강한 생명력을 부여합니다." },
    { id: 'sharpened_claw', rarity: 'uncommon', category: 'material', minLevel: 0, name: '날카로운 발톱', icon: 'assets/images/items/claw.png', price: 60, desc: "호문클루스에게 민첩성과 야성을 부여합니다." },
    { id: 'venomous_fang', rarity: 'uncommon', category: 'material', minLevel: 0, name: '독기 서린 송곳니', icon: 'assets/images/items/fang.png', price: 75, desc: "치명적인 야성을 심어줄 때 사용합니다." },

    /* --- 💎 희귀 생태 정수 --- */
    { id: 'spectral_fin', rarity: 'rare', category: 'material', minLevel: 15, name: '유령 지느러미', icon: 'assets/images/items/fin.png', price: 120, desc: "수중 생물 연성에 필수적인 형체가 불분명한 지느러미입니다." },
    { id: 'starlight_antler', rarity: 'rare', category: 'material', minLevel: 15, name: '별빛 뿔', icon: 'assets/images/items/antler.png', price: 150, desc: "은은한 빛을 내뿜는 뿔의 조각입니다." },
    { id: 'vibrant_suction_cup', rarity: 'rare', category: 'material', minLevel: 15, name: '선명한 빨판 조각', icon: 'assets/images/items/suction_cup.png', price: 180, desc: "에테르를 고정하는 능력이 탁월합니다." },
    { id: 'cracked_beak', rarity: 'rare', category: 'material', minLevel: 15, name: '금이 간 부리', icon: 'assets/images/items/beak.png', price: 200, desc: "날카로운 지성을 가진 생명을 빚을 때 쓰입니다." },

    /* --- ✨ 신화적 기원 재료 (레벨 30 오픈) --- */
    // { id: 'eternal_cocoon_silk', category: 'material', minLevel: 30, name: '영원의 고치 실', icon: 'assets/images/items/silk.png', price: 350, desc: "시간이 멈춘 고치에서 뽑아낸 실입니다. 진화의 가능성을 무한히 확장합니다." },
    // { id: 'ancient_horn_chip', category: 'material', minLevel: 30, name: '고대 뿔 파편', icon: 'assets/images/items/horn.png', price: 400, desc: "전설 속 영물의 뿔에서 떨어진 조각입니다. 초월적인 힘을 연성하는 데 필수적입니다." },
    // { id: 'crystallized_heartbeat', category: 'material', minLevel: 30, name: '결정화된 고동', icon: 'assets/images/items/heart.png', price: 450, desc: "생명의 박동이 보석으로 굳어진 것입니다. 호문클루스에게 영혼의 무게를 더합니다." },
    // { id: 'nebula_mane_strand', category: 'material', minLevel: 30, name: '성운 갈기', icon: 'assets/images/items/mane.png', price: 500, desc: "우주의 빛을 담은 짐승의 갈기입니다. 환상 속 영물을 연성하는 정점의 재료입니다." },

    /* --- ✨ 소중한 물건 --- */
    { id: "music_seashell", category: "special", name: "음악이 나오는 소라고둥", icon: "assets/images/items/music_seashell.png", price: 0, desc: "소리의 요정이 선물한 신비한 고둥입니다." }
];

/**
 * 2. 상점 모달 제어
 */
window.openShop = () => {
    const modal = document.getElementById('shop-modal');
    if (modal) {
        modal.style.display = 'flex';
        window.renderShopItems(window.currentShopCategory);
    }
};

window.closeShop = () => {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'none';
};

window.switchShopTab = (category, btnElement) => {
    window.currentShopCategory = category;
    document.querySelectorAll('.shop-tab-re').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    window.renderShopItems(category);
};

/**
 * 3. 아이템 리스트 렌더링
 */
/**
 * [UIManager.js] 상점 리스트 렌더링 함수 (레벨 잠금 로직 포함)
 * @param {string} category - 선택된 상점 카테고리
 */
window.renderShopItems = (category) => {
    const grid = document.getElementById('shop-grid'); 
    if (!grid) return;
    grid.innerHTML = ""; 

    // 상단 에테르 보유량 갱신
    const shopEther = document.getElementById('shop-ether-count');
    if (shopEther && window.collection) {
        shopEther.innerText = window.collection.points.toLocaleString();
    }

    const items = window.getShopItems();
    const filtered = items.filter(item => item.category === category);
    
    // 현재 연금술사 레벨 확인
    const currentLevel = window.progress ? window.progress.getProgressData().level : 1;

    filtered.forEach(item => {
        // 1. 레벨 잠금 상태 판정
        const isLevelLocked = item.minLevel && currentLevel < item.minLevel;
        const canAfford = window.collection ? window.collection.points >= item.price : false;

        const card = document.createElement('div');
        // 잠금 상태일 경우 'locked' 클래스 추가 (CSS에서 처리)
        card.className = `shop-card-glass ${isLevelLocked ? 'locked' : ''}`;
        
        // 2. 툴팁 텍스트 결정
        const tooltipText = isLevelLocked 
            ? `연금술사 레벨 ${item.minLevel}부터 구매 가능합니다.` 
            : item.desc;
        card.setAttribute('data-tooltip', tooltipText);

        // 3. 버튼 텍스트 및 상태 설정
        let buttonText = '구매하기';
        let isButtonDisabled = false;

        if (isLevelLocked) {
            buttonText = `Lv.${item.minLevel} 필요`;
            isButtonDisabled = true;
        } else if (!canAfford) {
            buttonText = '잔액 부족';
            isButtonDisabled = true;
        }

        card.innerHTML = `
            <div class="shop-card-icon">
                <img src="${item.icon}" class="shop-img-icon">
                ${isLevelLocked ? '<div class="shop-lock-overlay"><i class="fa-solid fa-lock"></i></div>' : ''}
            </div>
            <div class="shop-card-name">${item.name}</div>
            <div class="shop-card-price">${item.price.toLocaleString()} Et</div>
            <button class="btn-buy-glass" ${isButtonDisabled ? 'disabled' : ''} 
                onclick="window.buyItem('${item.id}', ${item.price})">
                ${buttonText}
            </button>
        `;
        grid.appendChild(card);
    });
};


/* ============================================================
   [🎒 가방(인벤토리) 시스템] 
   ============================================================ */

window.currentInventoryTab = 'gift'; // 가방 초기 탭 설정

/**
 * 1. 가방 모달 열기 및 초기화
 */
window.openInventory = () => {
    const modal = document.getElementById('inventory-modal');
    if (modal) {
        // 1. 인벤토리 목록 렌더링
        window.renderInventory();
        
        // ✨ 2. 추가: 아이템 상세 정보 영역 초기화
        const detailArea = document.getElementById('inventory-detail');
        if (detailArea) {
            // 상세 창을 비우거나 기본 안내 문구를 출력합니다.
            detailArea.innerHTML = `
                <div class="empty-detail-msg" style="text-align:center; padding:40px; color:rgba(255,255,255,0.2); font-size:0.8rem;">
                    <i class="fas fa-hand-pointer" style="display:block; font-size:1.5rem; margin-bottom:10px;"></i>
                    조사할 아이템을 선택하세요.
                </div>`;
        }
        
        // 3. 모달 표시
        modal.style.display = 'flex';
    }
};

/**
 * 2. 가방 닫기
 */
window.closeInventory = () => {
    const modal = document.getElementById('inventory-modal');
    if (modal) modal.style.display = 'none'; //
};

/**
 * 3. 인벤토리 내 탭 전환 (선물 / 연구 재료 등)
 */
window.switchInventoryTab = (category, btnElement) => {
    window.currentInventoryTab = category; //
    const modal = document.getElementById('inventory-modal');
    if (modal) {
        modal.querySelectorAll('.shop-tab-re').forEach(btn => btn.classList.remove('active'));
    }
    if (btnElement) btnElement.classList.add('active');
    window.renderInventory(); // 탭 변경 시 리스트 갱신
};

/**
 * 4. 가방 아이템 리스트 렌더링
 */
window.renderInventory = () => {
    const grid = document.getElementById('inventory-grid');
    const detailArea = document.getElementById('inventory-detail');
    if (!grid) return;

    grid.innerHTML = "";
    const invItems = (window.masterData && window.masterData.inventory?.items) || {};
    const invByproducts = (window.masterData && window.masterData.inventory?.byproducts) || {};
    
    const uniqueIds = [...new Set([...Object.keys(invItems), ...Object.keys(invByproducts)])];
    const itemDB = [...(window.byproductTable || []), ...window.getShopItems(), ...(window.failedProducts || [])];

    const filteredItems = uniqueIds.filter(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        const info = itemDB.find(i => i.id === id);
        return count > 0 && info && info.category === window.currentInventoryTab;
    });

    if (filteredItems.length === 0) {
        grid.innerHTML = `<div class="empty-inventory-hint" style="grid-column: 1/-1; margin-top: 40px; color: rgba(255,255,255,0.2); text-align:center;">보유 중인 물품이 없습니다.</div>`;
        return;
    }

    filteredItems.forEach(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        const info = itemDB.find(i => i.id === id);

        const slot = document.createElement('div');
        slot.className = 'inventory-slot-glass';
        slot.id = `inv-slot-${id}`; // ✨ 추적을 위한 ID 부여
        slot.innerHTML = `
            <div class="slot-icon"><img src="${info.icon}" class="inventory-img-icon" onerror="this.src='assets/images/items/default.png'"></div>
            <div class="slot-count">${count}</div>
        `;
        slot.onclick = () => window.selectInventoryItem(id, info);
        grid.appendChild(slot);
    });
};

/**
 * [UIManager.js] 인벤토리 아이템 차감 및 UI 갱신 (누락 복구)
 * @param {string} itemId - 차감할 아이템 ID
 * @param {number} count - 차감할 수량
 */
window.removeItemFromInventory = (itemId, count) => {
    if (!window.masterData || !window.masterData.inventory) return;
    
    const inv = window.masterData.inventory;
    
    // 부산물(byproducts) 혹은 일반 아이템(items) 양쪽에서 확인하여 차감
    if (inv.byproducts && inv.byproducts[itemId] !== undefined) {
        inv.byproducts[itemId] = Math.max(0, inv.byproducts[itemId] - count);
    } else if (inv.items && inv.items[itemId] !== undefined) {
        inv.items[itemId] = Math.max(0, inv.items[itemId] - count);
    }
    
    // UI 즉시 갱신 및 데이터 영구 저장
    if (window.renderInventory) window.renderInventory();
    if (window.saveAllData) window.saveAllData();
};

/**
 * 5. 아이템 선택 시 상세 정보 표시
 */
window.selectInventoryItem = (id, info) => {
    // 1. 시각적 포커스 유지
    document.querySelectorAll('.inventory-slot-glass').forEach(s => s.classList.remove('active'));
    const targetSlot = document.getElementById(`inv-slot-${id}`);
    if (targetSlot) targetSlot.classList.add('active');

    const detailArea = document.getElementById('inventory-detail');
    if (!detailArea) return;

    // 2. 현재 보유량 및 분해 가능 여부 판별
    const inv = window.masterData.inventory;
    const currentCount = (inv.byproducts[id] || 0) + (inv.items[id] || 0);
    const isDecomposable = (window.failedProducts && window.failedProducts.some(p => p.id === id)) || 
                           (window.byproductTable && window.byproductTable.some(p => p.id === id));

    const isGift = info.category === 'gift';
    const sellPrice = info.price || 0;
    const totalSellPrice = sellPrice * currentCount;
    const rawDesc = info.desc || info.description || '';
    const formattedDesc = rawDesc.replace(/\. /g, '.\n').replace(/\./g, '.\n');

    // ✨ [복구] 오늘 남은 선물 횟수 계산 로직
    let remainingText = '';
    if (isGift && window.currentPartner) {
        const molipToday = window.getMolipDate();
        const giftData = window.dailyGiftCountMap[window.currentPartner.id];
        const usedToday = (giftData?.date === molipToday) ? giftData.count : 0;
        remainingText = `<div style="font-size:0.75rem; color:var(--primary-gold); margin-bottom:10px;">오늘 남은 선물 횟수: ${3 - usedToday} / 3</div>`;
    }

    detailArea.innerHTML = `
        <div id="detail-info-area">
            <div id="inventory-detail-icon">
                <img src="${info.icon}" class="inventory-img-large" onerror="this.src='assets/images/items/default.png'">
            </div>
            <div class="detail-name-lg">${info.name}</div>
            <div class="detail-desc-lg">${formattedDesc}</div>
            
            <div class="detail-tab-hint" style="font-size: 0.8rem; color: var(--text-secondary); margin: 10px 0;">
                ${isDecomposable ? `연성 잔해입니다. 분해하여 에테르를 추출할 수 있습니다.` : `가방에 보관 중인 물품입니다.`}
            </div>

            ${remainingText} <div class="inventory-action-group" style="display:flex; flex-direction:column; gap:8px; margin-top:5px;">
                ${isGift ? `
                    <button class="btn-inventory-action" onclick="window.useInventoryItem('${id}')">호문클루스에게 선물하기</button>
                ` : ''}

                ${isDecomposable && currentCount > 0 ? `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-inventory-action btn-sell" 
                                style="flex:1; background:rgba(255,107,107,0.1); color:#ff6b6b; border:1px solid rgba(255,107,107,0.3);" 
                                onclick="window.sellInventoryItem('${id}', 1)">
                            낱개 분해 (+${sellPrice}Et)
                        </button>
                        <button class="btn-inventory-action btn-sell-all" 
                                style="flex:1.2; background:rgba(255,107,107,0.2); color:#ff6b6b; border:1px solid rgba(255,107,107,0.5); font-weight:bold;" 
                                onclick="window.sellInventoryItem('${id}', ${currentCount})">
                            일괄 분해 (+${totalSellPrice}Et)
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};


/**
 * [UIManager.js] 아이템 판매(분해) 처리 (수량 지정 가능)
 * @param {string} itemId - 아이템 ID
 * @param {number} count - 분해할 수량
 */
/**
 * [UIManager.js] 아이템 분해 및 포커스 유지 로직
 */
window.sellInventoryItem = async (itemId, count) => {
    const itemDB = [...(window.byproductTable || []), ...(window.failedProducts || [])];
    const item = itemDB.find(p => p.id === itemId);
    if (!item) return;

    const transaction = { ether: item.price * count, items: { [itemId]: -count } };
    const result = await window.processResourceTransaction(transaction);

    if (result.success) {
        if (window.playSFX) window.playSFX('coin');
        
        // 1. 리스트를 먼저 다시 그립니다.
        window.renderInventory();

        // 2. 남은 수량 확인
        const inv = window.masterData.inventory;
        const remainingCount = (inv.byproducts[itemId] || 0) + (inv.items[itemId] || 0);

        if (remainingCount > 0) {
            // ✨ 수량이 남았다면 포커싱 유지 (상세창 자동 갱신)
            window.selectInventoryItem(itemId, item);
        } else {
            // 수량이 0이면 상세창 초기화
            const detailArea = document.getElementById('inventory-detail');
            if (detailArea) detailArea.innerHTML = `<div class="empty-bag-msg">아이템을 선택해 주세요.</div>`;
        }

        const particle = window.getKoreanParticle(item.name, "을/를");
        window.showToast(`${item.name}${particle} 분해하여 에테르를 획득했습니다.`, "success");
    }
};

/**
 * [UIManager.js] 가방 아이템 사용(선물하기) 처리 함수
 */
window.useInventoryItem = async (itemId) => {
    // 1. 기본 검증 (파트너 존재 여부 및 알 상태 체크)
    if (!window.currentPartner || window.currentStage === 'egg') {
        window.showToast("지금은 선물을 줄 수 있는 상태가 아닙니다.", "warning");
        return;
    }

    const partner = window.currentPartner;
    const charId = partner.id;
    const today = window.getMolipDate(); // renderer.js의 논리적 날짜 함수

    // 2. ✨ 캐릭터별 선물 횟수 제한 체크 (하루 최대 3회)
    if (!window.dailyGiftCountMap[charId]) {
        window.dailyGiftCountMap[charId] = { date: today, count: 0 };
    }
    
    const giftData = window.dailyGiftCountMap[charId];

    // 날짜가 바뀌었다면 해당 캐릭터의 카운트 리셋
    if (giftData.date !== today) {
        giftData.date = today;
        giftData.count = 0;
    }

    if (giftData.count >= 3) {
        window.showToast(`${partner.name}은(는) 이미 선물을 충분히 받았습니다. (3/3)`, "info");
        return;
    }

    // 3. 아이템 정보 확인
    const itemInfo = window.getShopItems().find(i => i.id === itemId);
    if (!itemInfo) return;

    // 4. 자산 차감 처리 (통합 거래 모듈 사용)
    const transaction = { items: { [itemId]: -1 } };
    const result = await window.processResourceTransaction(transaction);

    if (result.success) {
        // 5. ✨ [수정] 선호도 판별 및 수치 적용 (Favorite: 5 / Normal: 2.5 / Dislike: 1)
        const prefs = partner.preferences || { favorite: [], dislike: [] };
        let reactionType = 'normal';
        let intimacyBoost = 2.5;
        
        if (prefs.favorite.includes(itemInfo.name)) {
            reactionType = 'favorite';
            intimacyBoost = 5.0;
        } else if (prefs.dislike.includes(itemInfo.name)) {
            reactionType = 'dislike';
            intimacyBoost = 1.0;
        }

        // 6. ✨ 현재 단계(child/adult)에 맞는 전용 대사 추출
        const stage = window.currentStage; 
        const giftResponses = partner.stages[stage].gift_responses;
        const dialogueText = giftResponses[reactionType];

        // 7. ✨ 호감도 및 기록 업데이트
        if (!window.charIntimacyMap[charId]) window.charIntimacyMap[charId] = 0;
        window.charIntimacyMap[charId] = Math.min(100, window.charIntimacyMap[charId] + intimacyBoost);

        giftData.count += 1; // 해당 캐릭터의 선물 횟수 증가

        // 도감 선호도 해금을 위한 기록
        if (!window.givenGiftsMap[charId]) window.givenGiftsMap[charId] = [];
        if (!window.givenGiftsMap[charId].includes(itemInfo.name)) {
            window.givenGiftsMap[charId].push(itemInfo.name);
        }

        // 8. ✨ [대사 출력] 기존 대사를 밀어내고 즉시 출력
        if (window.dialogueTimeout) clearTimeout(window.dialogueTimeout); 
        window.dialogueLockUntil = 0; 
        if (window.showDialogue) {
            window.showDialogue(dialogueText, 2); // 우선순위 2로 출력
        }

        // 9. ✨ [피드백] 조사 체크 토스트 및 모달 닫기
        const particle = window.getKoreanParticle(itemInfo.name, "을/를"); 
        window.playSFX('success'); 
        window.showToast(`${itemInfo.name}${particle} 선물했습니다! (오늘 ${giftData.count}/3)`, "success");
        
        if (window.closeInventory) {
            window.closeInventory(); 
        }

        // 10. 데이터 영구 저장 및 UI 갱신
        await window.saveAllData(); 
        window.updateUI(); 
        
    } else {
        window.showToast("아이템을 사용할 수 없습니다.", "error");
    }
};

/* ============================================================
   [📖 도감(Collection) 시스템]
   ============================================================ */

/**
 * 1. 도감 그리드 렌더링 (보유/미보유/부화중 상태 반영)
 */
window.renderCollection = () => {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    
    // 1. 기초 데이터 및 사용자 권한 확인
    const characters = (window.charData && window.charData.characters) ? window.charData.characters : [];
    const currentUserId = window.molipUserId; // 현재 접속 유저 고유 ID
    const ownedIds = window.collection.ownedIds || []; // 보유 중인 캐릭터 목록

    // ✨ 2. 특별 관리 캐릭터 및 허용된 VIP 유저 ID 정의
    const specialCharIds = ['char_hidden_0104', 'char_hidden_0613'];
    const allowedVips = ["7q7EUXaNgEqPQrGdglOt", "ZssWPRcPICGBAE6Xd9AF"]; // 실제 유저 ID 2개를 여기에 입력하세요.

    // 3. 도감 표시 목록 필터링
    const displayCharacters = characters.filter(char => {
        // 해당 캐릭터가 특별 캐릭터인 경우
        if (specialCharIds.includes(char.id)) {
            // 허용된 VIP 유저이거나, 이미 획득(owned)한 경우에만 목록에 노출
            return allowedVips.includes(currentUserId) || ownedIds.includes(char.id);
        }
        // 일반 캐릭터는 조건 없이 모두 표시
        return true;
    });

    // 4. 필터링된 목록을 바탕으로 그리드 HTML 생성
    grid.innerHTML = displayCharacters.map(char => {
        const isOwned = ownedIds.includes(char.id);
        const isActiveEgg = window.collection.activeEgg && window.collection.activeEgg.type === char.id;
        
        // 이미지 소스 결정 (기본값: 알)
        let spriteSrc = (char.stages && char.stages.egg) ? char.stages.egg.sprite : 'assets/images/items/default_egg.png'; 

        // 보유 중인 경우 성장 단계에 맞는 스프라이트 로드
        if (isOwned) {
            const totalSec = window.charGrowthMap[char.id] || 0;
            const growthMin = totalSec / 60;
            const targetMin = char.evolution_level || 1440; 
            
            const currentStage = growthMin >= targetMin ? 'adult' : 'child';
            const stageData = char.stages[currentStage];
            if (stageData && stageData.expressions && stageData.expressions.good) {
                spriteSrc = stageData.expressions.good.sprite;
            }
        }

        // 상태 클래스 및 텍스트 설정
        let statusClass = 'locked';
        let statusText = '???';
        
        if (isOwned) { 
            statusClass = 'unlocked'; 
            statusText = char.name; 
        } else if (isActiveEgg) { 
            statusClass = 'hatching'; 
            statusText = '부화 중...'; 
            if (char.stages && char.stages.egg) spriteSrc = char.stages.egg.sprite;
        }

        // 클릭 액션 (보유 혹은 부화 중일 때만 상세 보기 가능)
        const clickAction = (isOwned || isActiveEgg) 
            ? `onclick="if(!window.isHatching) window.showCharDetail('${char.id}'); else window.showToast('탄생의 순간에는 눈을 뗄 수 없습니다.', 'warning');"`
            : "";

        // 미해금 캐릭터 실루엣 처리 스타일
        const imgStyle = (isOwned || isActiveEgg) 
            ? "user-select: none; -webkit-user-drag: none;" 
            : "filter: brightness(0) invert(0.4); opacity: 0.4; user-select: none; -webkit-user-drag: none;"; 

        return `
            <div class="char-slot ${statusClass}" ${clickAction}>
                <div class="char-img-box">
                    <img src="${spriteSrc}" 
                         style="${imgStyle}" 
                         alt="${char.name}"
                         draggable="false"
                         oncontextmenu="return false;"
                         onerror="this.src='assets/images/items/default.png'">
                </div>
                <span>${statusText}</span>
            </div>
        `;
    }).join('');
};

/**
 * 2. 도감 모달 토글 (열기/닫기)
 */
window.toggleCollection = (show) => { 
    // 부화 시퀀스(Supernova) 진행 중에는 도감 열기 자체를 차단
    if (show && window.isHatching) {
        window.showToast("지금은 탄생의 순간입니다. 집중하십시오!", "warning");
        return;
    }

    const modal = document.getElementById('collection-modal');
    if (modal) { 
        modal.style.display = show ? 'flex' : 'none'; 
        if (show) window.renderCollection(); 
    }
};

/**
 * 3. 도감 상세 정보 보기 (시간/퍼센트/해금 정보)
 */
window.showCharDetail = (id) => {
    const char = charData.characters.find(c => c.id === id);
    if (!char) return;
    
    const isActiveEgg = collection.activeEgg && collection.activeEgg.type === id;
    const modal = document.getElementById('char-detail-modal');
    if (!modal) return;

    // 1. 성장 데이터 및 시간 계산
    const totalSec = charGrowthMap[char.id] || 0; 
    const growthMin = totalSec / 60; 
    const targetMin = char.evolution_level || EVOLUTION_TARGET_MIN;
    
    const compHours = Math.floor(totalSec / 3600);
    const compMins = Math.floor((totalSec % 3600) / 60);
    const compSecs = totalSec % 60;

    const stage = growthMin >= targetMin ? 'adult' : 'child';
    const percent = Math.min(100, (growthMin / targetMin) * 100);

    // 2. UI 기본 정보 텍스트 적용
    document.getElementById('detail-char-name').innerText = isActiveEgg ? "부화 중인 알" : char.name;
    document.getElementById('detail-char-stage').innerText = isActiveEgg ? "알 (부화 대기)" : (stage === 'child' ? "유아기" : "성체기");

    // 3. 이미지 스프라이트 결정
    let spriteSrc = "";
    if (isActiveEgg) {
        spriteSrc = char.stages.egg.sprite;
    } else {
        const stageData = char.stages[stage] || char.stages['adult'];
        spriteSrc = (stageData.expressions && stageData.expressions.good) ? stageData.expressions.good.sprite : (stageData.sprite || "");
    }
    const detailImg = document.getElementById('detail-char-img');
    if (detailImg) detailImg.src = spriteSrc;

    // 4. 수치 정보 렌더링
    const companionshipEl = document.getElementById('detail-total-companionship');
    if (companionshipEl) { 
        companionshipEl.innerText = `${compHours}시간 ${compMins}분 ${compSecs}초`; 
    }
    const growthBar = document.getElementById('detail-growth-bar');
    const growthText = document.getElementById('detail-growth-text');
    if (growthBar) growthBar.style.width = `${percent}%`;
    if (growthText) { growthText.innerText = `${percent.toFixed(1)}%`; }

    // 5. 선물 선호도 아이콘 렌더링 함수
    const renderPrefItems = (container, items) => {
        if (!container) return;
        if (items.length === 0) { 
            container.innerHTML = '<span style="font-size:12px; color:#666; padding-left:5px;">(정보 없음)</span>'; 
            return; 
        }
        container.innerHTML = items.map(itemName => {
            const isUnlocked = givenGiftsMap[char.id]?.includes(itemName);
            const itemInfo = shopItems.find(i => i.name === itemName);
            let iconContent = '<i class="fas fa-question"></i>';
            if (isUnlocked) { 
                if (itemInfo && itemInfo.icon) { 
                    iconContent = `<img src="${itemInfo.icon}" class="pref-item-img" onerror="this.src='assets/images/items/default.png'">`; 
                } else { 
                    iconContent = '<i class="fas fa-box"></i>'; 
                } 
            }
            const displayName = isUnlocked ? itemName : "???";
            return `<div class="pref-item ${isUnlocked ? '' : 'locked'}" data-tooltip="${isUnlocked ? '' : '선물을 주어 정보를 해금하세요'}"><div class="pref-item-icon-wrapper">${iconContent}</div><span class="pref-item-name">${displayName}</span></div>`;
        }).join('');
    };

    const favListContainer = document.getElementById('list-favorite');
    const disListContainer = document.getElementById('list-dislike');
    renderPrefItems(favListContainer, char.preferences.favorite);
    renderPrefItems(disListContainer, char.preferences.dislike);

    document.getElementById('detail-char-desc').innerText = isActiveEgg ? "당신의 몰입을 기다리고 있는 알입니다." : (char.description || "");

    const selectBtn = document.getElementById('detail-select-btn');
    if (currentPartner && currentPartner.id === char.id) { 
        selectBtn.style.display = 'none'; 
    } else {
        selectBtn.style.display = 'block';
        selectBtn.innerText = isActiveEgg ? "다시 알 품기" : "파트너로 선택하기";
        
        selectBtn.onclick = async () => {
            // ✨ [추가] 알 부화 중 파트너 변경 차단 체크
            if (window.collection && window.collection.activeEgg) {
                // 현재 선택하려는 대상이 플라스크에 있는 바로 그 '알'이 아니라면 차단합니다.
                if (window.collection.activeEgg.type !== char.id) {
                    window.showToast("알이 부화하기 전에 파트너를 변경할 수 없습니다.", "warning");
                    return; // 함수 종료
                }
            }

            // 선택 로직 실행
            currentPartner = char; 
            window.currentPartner = char;
            if (!masterData.character) masterData.character = {};
            masterData.character.selectedPartnerId = char.id;

            if (window.refreshCharacterSprite) await window.refreshCharacterSprite(); 
            window.updateUI(); 
            window.closeCharDetail(); 
            window.toggleCollection(false);

            if (window.saveAllData) await window.saveAllData(); 
            window.showToast(`${char.name}와 다시 몰입을 시작합니다.`, "success");
        };
    }
    modal.style.display = 'flex';
};

/**
 * 4. 도감 상세 닫기
 */
window.closeCharDetail = () => { 
    document.getElementById('char-detail-modal').style.display = 'none'; 
};


/* ============================================================
   [📨 편지함(Mailbox) & 업적(Achievement) 시스템]
   ============================================================ */

window.mailTypeTimer = null; // 타이핑 효과 제어용 변수
const sessionUnlockedAchievements = new Set(); // 세션 내 중복 알림 방지

/**
 * 1. 서신 알림 뱃지 갱신 (방어 로직 강화)
 */
window.updateMailNotification = () => {
    const badge = document.getElementById('mail-badge'); //
    const mailBtn = badge?.closest('.btn-game'); 
    
    // window.mailbox가 아직 로드되지 않았으면 중단
    const mb = window.mailbox;
    if (!badge || !mb) return;

    // ✨ [수정] getUnreadCount 함수가 없어도 직접 계산하여 에러 방지
    let unreadCount = 0;
    if (typeof mb.getUnreadCount === 'function') {
        unreadCount = mb.getUnreadCount();
    } else {
        // 직접 필터링 (isRead가 false인 서신 카운트)
        unreadCount = (mb.receivedMails || []).filter(m => !m.isRead).length;
    }

    if (unreadCount > 0) {
        badge.innerText = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = 'flex'; //
        if (mailBtn) mailBtn.setAttribute('data-tooltip', `서신함 (읽지 않은 서신 ${unreadCount}통)`);
    } else {
        badge.style.display = 'none'; //
        if (mailBtn) mailBtn.setAttribute('data-tooltip', '서신함');
    }
};

/**
 * 2. 서신 목록 렌더링 (무한 스크롤 지원)
 */
/**
 * [MailboxManager 확장] 탭별 필터링 로직
 */
window.currentMailTab = 'unread'; // 기본 탭 설정

window.switchMailTab = function(tab, btn) {
    window.currentMailTab = tab;

    // 버튼 활성화 상태 변경
    document.querySelectorAll('#mailbox-modal .shop-tab-re').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // 리스트 갱신
    window.renderMailList();
    if (window.playSFX) window.playSFX('click'); //
};

/**
 * [UIManager.js] 서신 리스트 렌더링 (클릭 함수명 수정 완료)
 */
window.renderMailList = function() {
    const listContainer = document.getElementById('mail-list');
    if (!listContainer || !window.mailbox) return;

    const allMails = window.mailbox.receivedMails || [];
    let filteredMails = [];

    // 1. 현재 선택된 탭에 따른 필터링
    switch (window.currentMailTab) {
        case 'unread': // 읽지 않음
            filteredMails = allMails.filter(m => !m.isRead && !m.isArchived);
            break;
        case 'reward': // 보상 미수령 (읽었지만 보상이 남은 것)
            filteredMails = allMails.filter(m => m.isRead && m.reward && !m.isRewardClaimed && !m.isArchived);
            break;
        case 'read': // 일반 읽음 (보상까지 받았거나 보상이 없는 것)
            filteredMails = allMails.filter(m => m.isRead && (!m.reward || m.isRewardClaimed) && !m.isArchived);
            break;
        case 'archive': // 보관함
            filteredMails = allMails.filter(m => m.isArchived);
            break;
    }

    if (filteredMails.length === 0) {
        listContainer.innerHTML = `<div class="empty-msg" style="text-align:center; padding:40px; opacity:0.3;">해당하는 서신이 없습니다.</div>`;
        return;
    }

    // 2. ✨ [핵심 수정] onclick="window.openMail"을 "window.openLetter"로 변경
    listContainer.innerHTML = filteredMails.map(mail => {
        return `
            <div class="mail-item ${mail.isRead ? 'read' : 'unread'}" 
                 onclick="window.openLetter('${mail.id}')"> 
                <div class="mail-icon">
                    <i class="fas ${mail.isRead ? 'fa-envelope-open' : 'fa-envelope'}"></i>
                </div>
                <div class="mail-info">
                    <div class="mail-title">${mail.title}</div>
                    <div class="mail-sender">${mail.sender}</div>
                </div>
                ${mail.reward && !mail.isRewardClaimed ? '<div class="reward-badge"><i class="fas fa-gift"></i></div>' : ''}
                <div class="mail-date">${new Date(mail.receivedDate).toLocaleDateString()}</div>
            </div>
        `;
    }).join('');
};

/**
 * 3. 서신함 열기 및 닫기
 */
window.toggleMailbox = (show) => {
    const modal = document.getElementById('mailbox-modal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        if (show) {
            mailDisplayLimit = 10;
            window.renderMailList();
            const listContainer = document.getElementById('mail-list');
            listContainer.onscroll = () => {
                if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 20) {
                    window.loadMoreMails();
                }
            };
        }
    }
};

window.loadMoreMails = () => {
    if (mailDisplayLimit >= mailbox.receivedMails.length) return;
    mailDisplayLimit += 10;
    window.renderMailList();
};

/**
 * [src/UIManager.js] 서신 보관 시스템 보강
 */

// 현재 상세 보기에서 열린 서신 ID 추적
window.currentOpeningMailId = null;

/**
 * ✨ 서신 보관 상태 토글 (버그 수정본)
 */
window.toggleArchive = async function(mailId) {
    // 1. 대상 ID 파악 (인자가 없으면 현재 열린 서신 사용)
    const id = mailId || window.currentOpeningMailId;
    if (!id || !window.mailbox) return;

    // 2. 전체 서신함에서 해당 서신 객체 찾기
    const mails = window.mailbox.receivedMails || [];
    const mail = mails.find(m => String(m.id) === String(id));
    if (!mail) return;

    // 3. 상태 반전 및 효과음
    mail.isArchived = !mail.isArchived;
    if (window.playSFX) window.playSFX('click');

    // 4. ✨ UI 즉시 갱신 (상세 보기 창의 별 아이콘)
    const archiveBtn = document.getElementById('btn-mail-archive');
    if (archiveBtn && String(id) === String(window.currentOpeningMailId)) {
        archiveBtn.innerHTML = mail.isArchived ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        archiveBtn.classList.toggle('is-archived', mail.isArchived);
    }

    // 5. 데이터 영구 저장 (await로 저장 완료 보장)
    if (window.saveAllData) await window.saveAllData();

    // 6. 목록 갱신 (보관됨에 따라 현재 탭에서 사라지거나 나타남)
    window.renderMailList();
    
    // 7. 토스트 알림
    const msg = mail.isArchived ? "중요 서신으로 보관했습니다." : "보관을 해제했습니다.";
    if (window.showToast) window.showToast(msg, mail.isArchived ? "success" : "info");
};

/**
 * 4. 서신 읽기 (타이핑 연출 및 스킵 기능 복구)
 */

window.currentOpeningMailId = null;

window.openLetter = (mailId) => {
    const mb = window.mailbox || mailbox;
    if (!mb) return;

    const mail = window.mailbox.receivedMails.find(m => String(m.id) === String(mailId));
    if (!mail) return;
    
    // ✨ [핵심 수정] 현재 열린 서신의 ID를 반드시 기록해야 보관 토글이 작동합니다.
    window.currentOpeningMailId = mailId;
    
    if (window.mailTypeTimer) { 
        clearInterval(window.mailTypeTimer); 
        window.mailTypeTimer = null; 
    }
    window.playSFX('paper');

    const modal = document.getElementById('letter-view-modal');
    const titleEl = document.getElementById('letter-detail-title');
    const senderEl = document.getElementById('letter-detail-sender');
    const contentEl = document.getElementById('letter-view-content');
    const rewardZone = document.getElementById('letter-reward-zone');

    if (!modal) return;

    modal.style.display = 'flex';
    if (titleEl) titleEl.innerText = mail.title;
    if (senderEl) senderEl.innerText = `${mail.sender || '연금술 길드'}`;
    if (rewardZone) rewardZone.innerHTML = ""; 

    const formattedContent = mail.content.replace(/(?<![.!?])([.!?])(?![.!?])\s*/g, '$1\n');

    // ✨ [복구] 타이핑 도중 클릭 시 스킵 처리 함수
    const handleLetterSkip = () => {
        if (window.mailTypeTimer) {
            clearInterval(window.mailTypeTimer);
            window.mailTypeTimer = null; 
            if (contentEl) {
                contentEl.innerHTML = formattedContent.replace(/\n/g, '<br>');
            }
            window.renderLetterReward(mail);
            modal.removeEventListener('click', handleLetterSkip);
        }
    };

    // 기존 핸들러 제거 후 새로 등록
    modal.removeEventListener('click', modal._currentSkipHandler);
    modal._currentSkipHandler = handleLetterSkip;
    modal.addEventListener('click', handleLetterSkip);

    mail.isRead = true;

    const archiveBtn = document.getElementById('btn-mail-archive');
    if (archiveBtn) {
        archiveBtn.innerHTML = mail.isArchived ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        archiveBtn.classList.toggle('is-archived', !!mail.isArchived);
    }

    if (contentEl) {
        window.startTypewriter(formattedContent, contentEl, () => {
            window.renderLetterReward(mail);
            window.mailTypeTimer = null;
            modal.removeEventListener('click', handleLetterSkip);
        });
    }

    saveAllData();
    if (window.renderMailList) window.renderMailList();
    if (window.updateMailNotification) window.updateMailNotification();
};

/**
 * ✨ [누락 복구] 서신 보상 수령 처리 (자산 거래 통합 모듈 연동)
 */
window.claimMailReward = async (mailId) => {
    if (!window.mailbox || !window.collection) return;
    window.currentOpeningMailId = mailId; // 현재 열린 ID 기록

    const mail = window.mailbox.receivedMails.find(m => String(m.id) === String(mailId));

    // ✨ 보관 버튼 상태 초기화
    const archiveBtn = document.getElementById('btn-mail-archive');
    if (archiveBtn && mail) {
        archiveBtn.innerHTML = mail.isArchived ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        archiveBtn.classList.toggle('is-archived', mail.isArchived);
    }
    
    if (!mail || mail.isRewardClaimed) return;

    const reward = window.mailbox.claimReward(mailId);
    if (!reward) return;

    let toastMsg = "";
    let transaction = { ether: 0, items: {} };
    let isModuleHandled = false;

    switch (reward.type) {
        case 'update':
            transaction.ether = Number(reward.value || 1000);
            if (reward.downloadUrl) require('electron').shell.openExternal(reward.downloadUrl);
            toastMsg = `${transaction.ether.toLocaleString()} Et 수령 및 업데이트 페이지로 이동합니다.`;
            break;
        case 'point':
        case 'ether':
            transaction.ether = Number(reward.value || reward.amount || 0);
            toastMsg = `${transaction.ether.toLocaleString()} 에테르를 수령했습니다!`;
            break;
        case 'item':
            const amount = Number(reward.value || reward.amount || 1);
            transaction.items[reward.id] = amount;
            toastMsg = `아이템 보상을 획득했습니다.`;
            break;
        case 'egg':
            isModuleHandled = true;
            // ✨ [핵심] processNewEggAcquisition의 반환값(성공 여부)을 확인합니다.
            const eggClaimed = await window.processNewEggAcquisition(reward.id || reward.value, 1800, 'mail');
            
            // 알이 이미 있어 거부되었다면 메일을 '수령 완료' 상태로 만들지 않고 종료합니다.
            if (!eggClaimed) return; 
            break;
        case 'achievement':
            isModuleHandled = true;
            window.unlockAchievement(reward.value || reward.id);
            break;
    }

    if (!isModuleHandled) {
        await window.processResourceTransaction(transaction);
    }

    if (toastMsg) window.showToast(toastMsg, "success");
    mail.isRewardClaimed = true; 
    await saveAllData(); 
    window.renderLetterReward(mail);
    window.updateMailNotification();
};

window.startTypewriter = (text, element, onComplete) => {
    let index = 0;
    element.innerHTML = ""; 
    window.mailTypeTimer = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text[index] === '\n' ? '<br>' : text[index];
            index++;
            element.scrollTop = element.scrollHeight;
        } else {
            clearInterval(window.mailTypeTimer);
            if (onComplete) onComplete(); 
        }
    }, 30);
};

/**
 * 5. 보상 버튼 렌더링
 */
/**
 * [src/UIManager.js] 서신 보상 버튼 렌더링 (업적/알 텍스트 추가)
 */
window.renderLetterReward = (mail) => {
    const rewardZone = document.getElementById('letter-reward-zone');
    if (!rewardZone || !mail.reward) return;

    if (mail.isRewardClaimed) {
        rewardZone.innerHTML = `
            <div class="mail-reward-box claimed">
                <button class="btn-claim-reward" disabled>
                    <i class="fa-solid fa-check"></i> 이미 보상을 수령했습니다
                </button>
            </div>`;
        return;
    }

    const { type, value, amount, id: rewardId } = mail.reward;
    const val = value || amount || 0;
    
    let faIcon = "fa-gift", displayName = "보상", buttonText = "";

    // ✨ 보상 타입에 따른 아이콘 및 텍스트 분기
    if (type === 'point' || type === 'ether') {
        faIcon = "fa-coins"; 
        displayName = "에테르"; 
        buttonText = `${val.toLocaleString()} Et 수령하기`;
    } else if (type === 'item') {
        faIcon = "fa-box-open"; 
        displayName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(rewardId) : "연구 재료";
        buttonText = `${val}개 수령하기`;
    } else if (type === 'achievement') {
        // ✨ [추가] 업적 보상 텍스트 표시
        faIcon = "fa-medal"; 
        displayName = "특별 업적"; 
        buttonText = "업적 기록하기";
    } else if (type === 'egg') {
        // ✨ [추가] 알 보상 텍스트 표시
        faIcon = "fa-egg"; 
        displayName = "새로운 생명"; 
        buttonText = "알 수령하기";
    } else if (type === 'update') {
        faIcon = "fa-download"; 
        displayName = "업데이트 지원"; 
        buttonText = "최신 버전 다운로드하기";
    }

    rewardZone.innerHTML = `
        <div class="mail-reward-box reward-reveal">
            <span class="reward-label">${displayName}</span> <button class="btn-claim-reward" onclick="window.claimMailReward('${mail.id}')">
                <i class="fa-solid ${faIcon}"></i> ${buttonText}
            </button>
        </div>`;
};

/**
 * 6. 업적 시스템 UI 렌더링 (ID 타입 불일치 및 참조 오류 수정본)
 */
window.renderAchievementGrid = () => {
    const grid = document.getElementById('achievement-grid');
    if (!grid) return;
    grid.innerHTML = ""; 

    // 1. 업적 목록 및 해금 데이터 확보
    const allAchievements = window.achievementList || (window.achievementManager ? window.achievementManager.list : []);
    const unlockedIds = window.masterData?.achievements || [];

    if (allAchievements.length === 0) {
        grid.innerHTML = '<div class="empty-msg">업적 정보를 불러올 수 없습니다.</div>';
        return;
    }

    // 2. 목록 순회 및 렌더링
    allAchievements.forEach(ach => {
        const isUnlocked = unlockedIds.some(id => String(id) === String(ach.id));
        
        const slot = document.createElement('div');
        slot.className = `achieve-slot ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        // 해금 여부에 따른 텍스트 및 힌트 분기
        const title = isUnlocked ? ach.name : "???";
        const desc = isUnlocked ? (ach.desc || ach.description) : (ach.hint || "비밀에 싸인 업적입니다.");
        slot.setAttribute('data-tooltip', `[${title}]\n${desc}`);

        // ✨ 보안 요소: 선택 및 우클릭 차단
        slot.style.userSelect = 'none';
        slot.oncontextmenu = () => false;

        // 아이콘 렌더링 (드래그 차단 속성 추가)
        if (isUnlocked) {
            if (ach.icon && (ach.icon.includes('/') || ach.icon.includes('.'))) {
                // 잠금 해제된 이미지 아이콘
                slot.innerHTML = `<img src="${ach.icon}" class="achieve-img-icon" 
                                       draggable="false" 
                                       style="-webkit-user-drag: none;" 
                                       onerror="this.src='assets/images/items/default.png'">`;
            } else {
                // 텍스트/이모지 아이콘
                slot.innerHTML = `<span class="achieve-icon-text" style="pointer-events: none;">${ach.icon || '🏆'}</span>`;
            }
        } else {
            // 미해금 시 실루엣 및 드래그 차단
            if (ach.icon && (ach.icon.includes('/') || ach.icon.includes('.'))) {
                slot.innerHTML = `<img src="${ach.icon}" class="achieve-img-icon locked-img" 
                                       draggable="false" 
                                       style="filter: brightness(0) invert(0.2); -webkit-user-drag: none; opacity: 0.5;">`;
            } else {
                slot.innerHTML = `<span class="achieve-icon-text locked-text" style="pointer-events: none;">?</span>`;
            }
        }
        
        grid.appendChild(slot);
    });
};

window.toggleAchievementModal = (show) => {
    const modal = document.getElementById('achievement-modal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        if (show) window.renderAchievementGrid();
    }
};

window.unlockAchievement = (achievementId) => {
    const id = String(achievementId);
    if (masterData.achievements.includes(id) || sessionUnlockedAchievements.has(id)) return;

    sessionUnlockedAchievements.add(id);
    masterData.achievements.push(id);
    saveAllData();

    setTimeout(() => {
        const ach = (window.achievementList || []).find(a => a.id === id);
        window.showToast(`업적 달성: ${ach ? ach.name : "새로운 업적"}`, "achievement");
    }, 1500);
};

window.closeLetterView = () => {
    if (window.mailTypeTimer) { clearInterval(window.mailTypeTimer); window.mailTypeTimer = null; }
    document.getElementById('letter-view-modal').style.display = 'none';
};