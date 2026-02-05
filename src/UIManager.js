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
    { id: "handwritten_letter", category: "gift", name: window.t('game.items.handwritten_letter_name'), icon: "assets/images/items/handwritten_letter.png", price: 5, desc: window.t('game.items.handwritten_letter_desc') },
    { id: "red_berry", category: "gift", name: window.t('game.items.red_berry_name'), icon: "assets/images/items/red_berry.png", price: 20, desc: window.t('game.items.red_berry_desc') },
    { id: "black_extract", category: "gift", name: window.t('game.items.black_extract_name'), icon: "assets/images/items/black_extract.png", price: 30, desc: window.t('game.items.black_extract_desc') },
    { id: "old_record", category: "gift", name: window.t('game.items.old_record_name'), icon: "assets/images/items/old_record.png", price: 60, desc: window.t('game.items.old_record_desc') },
    { id: "old_instrument", category: "gift", name: window.t('game.items.old_instrument_name'), icon: "assets/images/items/old_instrument.png", price: 50, desc: window.t('game.items.old_instrument_desc') },
    { id: "warm_blanket", category: "gift", name: window.t('game.items.warm_blanket_name'), icon: "assets/images/items/warm_blanket.png", price: 60, desc: window.t('game.items.warm_blanket_desc') },
    { id: "ice_shard", category: "gift", name: window.t('game.items.ice_shard_name'), icon: "assets/images/items/ice_shard.png", price: 30, desc: window.t('game.items.ice_shard_desc') },
    { id: "gem_shard", category: "gift", name: window.t('game.items.gem_shard_name'), icon: "assets/images/items/gem_shard.png", price: 80, desc: window.t('game.items.gem_shard_desc') },
    { id: "silent_candle", category: "gift", name: window.t('game.items.silent_candle_name'), icon: "assets/images/items/silent_candle.png", price: 25, desc: window.t('game.items.silent_candle_desc') },
    { id: "prism_kaleidoscope", category: "gift", name: window.t('game.items.prism_kaleidoscope_name'), icon: "assets/images/items/prism_kaleidoscope.png", price: 70, desc: window.t('game.items.prism_kaleidoscope_desc') },
    { id: "dried_flower", category: "gift", name: window.t('game.items.dried_flower_name'), icon: "assets/images/items/dried_flower.png", price: 15, desc: window.t('game.items.dried_flower_desc') },
    { id: "old_parchment", category: "gift", name: window.t('game.items.old_parchment_name'), icon: "assets/images/items/old_parchment.png", price: 5, desc: window.t('game.items.old_parchment_desc') },
    { id: "abyssal_quill", category: "gift", name: window.t('game.items.abyssal_quill_name'), icon: "assets/images/items/abyssal_quill.png", price: 60, desc: window.t('game.items.abyssal_quill_desc') },
    { id: "golden_curd", category: "gift", name: window.t('game.items.golden_curd_name'), icon: "assets/images/items/golden_curd.png", price: 25, desc: window.t('game.items.golden_curd_desc') },
    { id: "resonance_bell", category: "gift", name: window.t('game.items.resonance_bell_name'), icon: "assets/images/items/resonance_bell.png", price: 50, desc: window.t('game.items.resonance_bell_desc') },

    /* --- 🧪 기초 연성 재료 (제한 없음) --- */
    /* --- 기초 생태계 재료 (15 Et) --- */
    { id: 'soft_down_cotton', category: 'material', minLevel: 0, name: '부드러운 솜털', price: 15, icon: 'assets/images/items/cotton.png', desc: '부드럽고 푹신한 촉감의 솜털입니다. 따뜻한 체온을 가진 생명체를 연성하는 기초 재료가 됩니다.' },
    { id: 'soft_down_feather', category: 'material', minLevel: 0, name: '부드러운 깃털', icon: 'assets/images/items/feather.png', price: 15, desc: "작은 새의 온기가 느껴지는 깃털입니다. 비행형 호문클루스의 기초 재료가 됩니다." },
    { id: 'glistening_mucus_bead', category: 'material', minLevel: 0, name: '반짝이는 점액 방울', icon: 'assets/images/items/mucus.png', price: 18, desc: "양서류의 피부에서 추출한 듯한 점액입니다. 습한 환경을 선호하는 생명 연성에 쓰입니다." },
    { id: 'torn_leather_scrap', category: 'material', minLevel: 0, name: '찢어진 가죽', icon: 'assets/images/items/leather.png', price: 20, desc: "질긴 생명력을 머금은 가죽입니다. 포유류 형태의 골격을 잡는 데 사용됩니다." },
    { id: 'calcified_shell_fragment', category: 'material', minLevel: 0, name: '석회화된 껍데기', icon: 'assets/images/items/shell.png', price: 25, desc: "작은 조개나 달팽이의 흔적입니다. 호문클루스에게 견고한 외피를 형성해 줍니다." },

    /* --- ⚡ 강화 및 변이 재료 (제한 없음) --- */
    { id: 'phosphorescent_wing', category: 'material', minLevel: 0, name: '발광하는 날개', icon: 'assets/images/items/insect_wing.png', price: 45, desc: "곤충의 날개처럼 얇고 단단합니다. 에테르에 반응하여 미세하게 떨립니다." },
    { id: 'chitinous_armor_plate', category: 'material', minLevel: 0, name: '키틴질 갑각 조각', icon: 'assets/images/items/chitin.png', price: 50, desc: "갑각류의 단단한 외피입니다. 외부 충격에 강한 생명력을 부여합니다." },
    { id: 'sharpened_claw', category: 'material', minLevel: 0, name: '날카로운 발톱', icon: 'assets/images/items/claw.png', price: 60, desc: "포식자의 기운이 서린 발톱입니다. 호문클루스에게 민첩성을 부여합니다." },
    { id: 'venomous_fang', category: 'material', minLevel: 0, name: '독기 서린 송곳니', icon: 'assets/images/items/fang.png', price: 75, desc: "파충류의 날카로운 송곳니입니다. 치명적인 야성을 심어줄 때 사용합니다." },

    /* --- 💎 희귀 생태 정수 (레벨 15 오픈) --- */
    { id: 'spectral_fin', category: 'material', minLevel: 15, name: '유령 지느러미', icon: 'assets/images/items/fin.png', price: 120, desc: "형체가 불분명한 지느러미입니다. 수중 생물 연성에 필수적입니다." },
    { id: 'starlight_antler', category: 'material', minLevel: 15, name: '별빛 뿔', icon: 'assets/images/items/antler.png', price: 150, desc: "은은한 빛을 내뿜는 뿔의 조각입니다. 고결한 숲의 영물을 떠올리게 합니다." },
    { id: 'vibrant_suction_cup', category: 'material', minLevel: 15, name: '선명한 빨판 조각', icon: 'assets/images/items/suction_cup.png', price: 180, desc: "심해 두족류의 흔적에서 남은 빨판입니다. 에테르를 고정하는 능력이 탁월합니다." },
    { id: 'cracked_beak', category: 'material', minLevel: 15, name: '금이 간 부리', icon: 'assets/images/items/beak.png', price: 200, desc: "풍파를 견딘 부리입니다. 날카로운 지성을 가진 생명을 빚을 때 쓰입니다." },

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
        modal.style.display = 'flex';
        
        // 열 때 항상 '선물' 탭이 활성화되도록 UI 초기화
        const tabs = modal.querySelectorAll('.shop-tab-re');
        tabs.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === 0);
        });
        
        window.currentInventoryTab = 'gift'; 
        window.renderInventory(); // 목록 렌더링 시작
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
    if (detailArea) detailArea.innerHTML = `<div class="empty-bag-msg">아이템을 선택해 주세요.</div>`;

    // 마스터 데이터에서 수량 정보 가져오기
    const invItems = (window.masterData && window.masterData.inventory?.items) || {};
    const invByproducts = (window.masterData && window.masterData.inventory?.byproducts) || {};
    
    const allItemIds = [...Object.keys(invItems), ...Object.keys(invByproducts)];
    const uniqueIds = [...new Set(allItemIds)];

    // ✨ 통합 아이템 데이터베이스 (조회용)
    const itemDB = [
        ...(window.byproductTable || []), 
        ...window.getShopItems(), 
        ...(window.failedProducts || []) // window 객체에 등록된 실패물 참조
    ];

    const filteredItems = uniqueIds.filter(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        if (count <= 0) return false;

        const info = itemDB.find(i => i.id === id);
        // 현재 선택된 탭(gift, material, special)과 일치하는지 확인
        return info && info.category === window.currentInventoryTab;
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
        slot.innerHTML = `
            <div class="slot-icon">
                <img src="${info.icon}" class="inventory-img-icon" onerror="this.src='assets/images/items/default.png'">
            </div>
            <div class="slot-count">${count}</div>
        `;
        slot.onclick = () => window.selectInventoryItem(id, info);
        grid.appendChild(slot);
    });
};

/**
 * 5. 아이템 선택 시 상세 정보 표시
 */
window.selectInventoryItem = (id, info) => {
    // 이전 선택 표시 제거 및 현재 선택 표시 추가
    document.querySelectorAll('.inventory-slot-glass').forEach(s => s.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    const detailArea = document.getElementById('inventory-detail');
    if (!detailArea) return;

    // 설명문 줄바꿈 처리
    const rawDesc = info.desc || info.description || '';
    const formattedDesc = rawDesc.replace(/\. /g, '.\n').replace(/\./g, '.\n');

    // 카테고리별 안내 문구
    let tabDetailDesc = ""; 
    switch (window.currentInventoryTab) {
        case 'gift': tabDetailDesc = "호문클루스에게 마음을 전할 수 있는 소중한 선물입니다."; break;
        case 'material': tabDetailDesc = "연성재료로 분류되어 연성로에서 사용 가능합니다."; break;
        case 'special': tabDetailDesc = "소중한 추억이나 특별한 힘이 깃든 비매품입니다."; break;
        default: tabDetailDesc = "가방에 보관 중인 소중한 물품입니다.";
    }

    const isGift = info.category === 'gift';
    let remainingText = '';
    
    // 선물 가능 횟수 표시
    if (isGift && currentPartner) {
        const molipToday = window.getMolipDate(); 
        const giftData = dailyGiftCountMap[currentPartner.id];
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
                ${tabDetailDesc}
            </div>
            ${remainingText}
            ${isGift ? `
                <button class="btn-inventory-action" onclick="window.useInventoryItem('${id}')">
                    호문클루스에게 선물하기
                </button>
            ` : ``}
        </div>
    `;
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
    
    const characters = (window.charData && window.charData.characters) ? window.charData.characters : [];

    grid.innerHTML = characters.map(char => {
        const isOwned = window.collection.ownedIds.includes(char.id);
        const isActiveEgg = window.collection.activeEgg && window.collection.activeEgg.type === char.id;
        
        let spriteSrc = (char.stages && char.stages.egg) ? char.stages.egg.sprite : 'assets/images/items/default_egg.png'; 

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

        const clickAction = (isOwned || isActiveEgg) 
            ? `onclick="if(!window.isHatching) window.showCharDetail('${char.id}'); else window.showToast('탄생의 순간에는 눈을 뗄 수 없습니다.', 'warning');"`
            : "";

        // 실루엣 시인성 개선 필터
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
                // 현재 선택하려는 대상이 실린더에 있는 바로 그 '알'이 아니라면 차단합니다.
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



/* ============================================================
   [⚗️ 연금술 시스템: 농도, 침전물, 연성]
   ============================================================ */

// [상태 변수 초기화]
window.cylinderSaturation = window.cylinderSaturation || 0; 
window.lastSedimentTick = Date.now();

// [데이터] 침전물(부산물) 테이블
window.byproductTable = [
    { id: 'ether_sludge', category: 'material', name: '에테르 슬러지', icon: 'assets/images/items/sludge.png', rarity: 'common', minSat: 50, chance: 0.12 },
    { id: 'bleached_scales', category: 'material', name: '탈색된 비늘', icon: 'assets/images/items/scales.png', rarity: 'common', minSat: 50, chance: 0.10 },
    { id: 'petrified_memory', category: 'material', name: '석화된 기억', icon: 'assets/images/items/memory.png', rarity: 'uncommon', minSat: 65, chance: 0.08 },
    { id: 'transparent_husk', category: 'material', name: '투명한 허물', icon: 'assets/images/items/husk.png', rarity: 'uncommon', minSat: 65, chance: 0.06 },
    { id: 'pulsing_crystal', category: 'material', name: '박동하는 결정', icon: 'assets/images/items/crystal.png', rarity: 'rare', minSat: 80, chance: 0.04 },
    { id: 'floating_eye', category: 'material', name: '부유하는 안구', icon: 'assets/images/items/eye.png', rarity: 'rare', minSat: 80, chance: 0.03 },
    { id: 'abyssal_dregs', category: 'material', name: '심연의 침전물', icon: 'assets/images/items/dregs.png', rarity: 'epic', minSat: 90, chance: 0.015 },
    { id: 'incomplete_fetus', category: 'material', name: '지성이 남은 결정', icon: 'assets/images/items/fetus.png', rarity: 'epic', minSat: 95, chance: 0.01 }
];

// 실패한 연성물
window.failedProducts = [
    { id: 'smoldering_ash', category: 'material', name: '그을린 재', icon: 'assets/images/items/ash.png', price: 5, desc: "연성 과정에서 에테르가 과하게 충돌하여 타버린 잔해입니다. 고온의 성질이 남아있어 화염 계열 생명체의 연성을 보조하는 재료로 활용될 수 있습니다." },
    { id: 'distorted_slime', category: 'material', name: '일그러진 슬라임', icon: 'assets/images/items/slime.png', price: 8, desc: "형체를 유지하지 못하고 무너져 내린 생명의 원형질입니다. 유연한 조직을 가진 수중 생물이나 연체 동물 연성 시 기초 틀로 재사용하기에 적합합니다." },
    { id: 'petrified_residue', category: 'material', name: '석화된 찌꺼기', icon: 'assets/images/items/residue.png', price: 10, desc: "에테르가 급격히 식으며 돌처럼 굳어버린 찌꺼기입니다. 매우 단단한 성질을 가지고 있습니다." },
    { id: 'unstable_fragment', category: 'material', name: '불안정한 에테르 조각', icon: 'assets/images/items/fragment.png', price: 12, desc: "결합에 실패하여 파편화된 에테르 덩어리입니다. 불안정하지만 순수한 에너지를 품고 있습니다." },
    { id: 'glowing_dust', category: 'material', name: '희미하게 빛나는 가루', icon: 'assets/images/items/dust.png', price: 15, desc: "연성이 흩어지며 남긴 빛의 가루입니다. 환상적인 기운을 머금고 있어, 신비로운 특징을 가진 조류나 환상종의 색채를 선명하게 만드는 데 도움을 줍니다." }
];

const getItemDB = () => [
    ...(window.byproductTable || []), 
    ...window.getShopItems(), 
    ...(window.failedProducts || []) // 아티스트님이 선언한 배열을 여기에 포함시킵니다.
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
    document.getElementById('sediment-modal').style.display = 'none';
};

window.switchAlchemyTab = (tabId, btn) => {
    // 모든 탭 컨텐츠 숨기기
    document.querySelectorAll('.alchemy-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 모든 탭 버튼 활성화 해제
    const tabButtons = btn.parentElement.querySelectorAll('.shop-tab-re');
    tabButtons.forEach(b => b.classList.remove('active'));

    // 선택한 탭과 버튼 활성화
    document.getElementById(`alchemy-tab-${tabId}`).classList.add('active');
    btn.classList.add('active');
    
    // 효과음 재생 (선택 사항)
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
 * 3. 실린더 시스템 업데이트 (매 초 호출)
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

    const charName = currentPartner ? currentPartner.name : "호문클루스";
    const particle = window.getKoreanParticle(charName, "이/가");
    window.showToast(`${charName}${particle} 실린더에서 '${item.name}'을 건져 올렸습니다!`, "info");

    window.refreshSedimentUI();
};

window.getSedimentDrop = () => {
    const currentSat = window.cylinderSaturation;
    const possibleItems = window.byproductTable.filter(item => currentSat >= item.minSat);
    if (possibleItems.length === 0) return null;

    const sortedPool = [...possibleItems].sort((a, b) => a.chance - b.chance);
    for (const item of sortedPool) {
        if (Math.random() < item.chance) return item;
    }
    return null;
};

window.getKoreanParticle = (word, type) => {
    if (!word) return type;
    const lastChar = word.charCodeAt(word.length - 1);
    const hasBatchim = (lastChar - 0xAC00) % 28 > 0;
    return hasBatchim ? type.split('/')[0] : type.split('/')[1];
};

window.processSedimentation = () => {
    if (collection.activeEgg) return;
    const item = window.getSedimentDrop(); 
    if (!item) return;

    masterData.inventory.byproducts[item.id] = (masterData.inventory.byproducts[item.id] || 0) + 1;
    saveAllData();

    // ✨ [수정] 설정 모달의 알림 활성화 여부 확인 (기본값 true)
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
 * 5. 연성 비용 계산 및 제단 UI
 */
window.calculateNextEggCost = () => {
    const count = masterData.hatchCount || 1;
    // 공식: $5000 \times 4^{(count - 1)}$
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
 * 1. 연성소 버튼 상태 제어 (UI 차단)
 */
window.updateAltarStatus = () => {
    const cost = window.calculateNextEggCost();
    const inv = window.masterData.inventory.byproducts || {};
    const recipeContainer = document.querySelector('.recipe-check');
    if (!recipeContainer) return;

    // ✨ [방어 1] 현재 알이 있거나 부화 연출 중인지 판정
    const hasEgg = !!window.collection.activeEgg;
    const isLocked = hasEgg || window.isHatching; 

    let isReady = true;
    let html = "";

    const currentEther = window.collection.points;
    const etherMet = currentEther >= cost.ether;
    if (!etherMet) isReady = false;

    html += `<div class="req-item ${etherMet ? 'met' : ''}"><span class="dot"></span> 에테르: <span class="val">${currentEther.toLocaleString()} / ${cost.ether.toLocaleString()} Et</span></div>`;

    for (const [id, amount] of Object.entries(cost.materials)) {
        if (amount <= 0) continue;
        const has = inv[id] || 0;
        const isMet = has >= amount;
        if (!isMet) isReady = false;
        const itemInfo = window.byproductTable.find(t => t.id === id);
        html += `<div class="req-item ${isMet ? 'met' : ''}"><span class="dot"></span> ${itemInfo ? itemInfo.name : id}: <span class="val">${has} / ${amount}</span></div>`;
    }

    recipeContainer.innerHTML = html;
    
    const btn = document.getElementById('btn-abyss-craft'); //
    if (btn) {
        // ✨ [방어 2] 이미 알이 있으면 아예 버튼을 비활성화하고 문구 변경
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
 * [수정본] 실제로 호문클루스 연성을 실행하는 함수입니다.
 * 현재 파트너 및 이미 보유한 캐릭터가 중복으로 연성되지 않도록 필터링 로직이 추가되었습니다.
 */
window.startAbyssCrafting = async () => {
    // 1. ✨ [방어] 실행 직전 최종 논리 체크 (중복 클릭 및 중복 생성 원천 차단)
    if (window.collection.activeEgg || window.isHatching) {
        console.warn("🚫 [Alchemy] 이미 연성 중이거나 알이 존재합니다.");
        return;
    }

    // 2. 비용 및 재료 검증
    const cost = window.calculateNextEggCost();
    const inv = window.masterData.inventory.byproducts || {};
    
    if (window.collection.points < cost.ether) {
        window.showToast("에테르가 부족합니다.", "error");
        return;
    }

    // 3. 연성 시작과 동시에 '연성 중' 플래그 가동 및 UI 잠금
    window.isHatching = true; 
    window.updateAltarStatus(); // 버튼 즉시 비활성화

    // 4. 거래 데이터 구성 (에테르 및 부산물 차감)
    const transaction = { ether: -cost.ether, items: {} };
    for (const [id, amount] of Object.entries(cost.materials)) {
        transaction.items[id] = -amount;
    }

    // 5. 통합 거래 모듈 호출
    const result = await window.processResourceTransaction(transaction);

    if (result.success) {
        // 6. 연성 횟수 증가 및 저장
        window.masterData.hatchCount = (window.masterData.hatchCount || 0) + 1;
        await window.saveAllData();

        // 7. ✨ [핵심 수정] 중복 당첨 방지 필터링 로직
        const allChars = window.charData.characters;
        const ownedIds = window.collection.ownedIds || [];
        const currentPartnerId = window.currentPartner?.id;

        // 후보군 생성: 전체 캐릭터 중 (이미 보유한 ID 제외) AND (현재 파트너 ID 제외)
        const candidateChars = allChars.filter(c => 
            !ownedIds.includes(c.id) && c.id !== currentPartnerId
        );

        // 만약 모든 캐릭터를 수집했다면 전체에서 랜덤, 남은 캐릭터가 있다면 후보군에서 랜덤 선택
        const pool = candidateChars.length > 0 ? candidateChars : allChars;
        const randomChar = pool[Math.floor(Math.random() * pool.length)];

        console.log(`⚗️ [Alchemy] 새 생명 연성 성공: ${randomChar.id} (${randomChar.name})`);

        // 8. 새 알 데이터 등록 및 연출 실행
        await window.processNewEggAcquisition(randomChar.id, 1800, 'alchemy'); 

        if (window.triggerSupernovaEffect) {
            window.triggerSupernovaEffect(randomChar);
        }
        
        window.closeSedimentModal();
    } else {
        // 9. 실패 시 복구 로직
        window.isHatching = false; 
        window.updateAltarStatus();
        window.showToast("연성 과정 중 에테르 흐름이 불안정해 실패했습니다.", "error");
    }
};

/**
 * 6. 연성 애니메이션 (슈퍼노바)
 */
window.triggerSupernovaEffect = (newChar) => {
    let overlay = document.getElementById('supernova-overlay') || document.createElement('div');
    if (!overlay.id) { overlay.id = 'supernova-overlay'; document.body.appendChild(overlay); }
    overlay.style.background = '#000'; overlay.style.opacity = '1'; overlay.classList.add('active');

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
        if (revealImg) { setTimeout(() => { revealImg.style.transform = 'scale(1.1)'; revealImg.style.opacity = '1'; }, 100); }

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.classList.remove('active'); overlay.innerHTML = ""; window.isHatching = false; }, 2000);
        }, 3500);
    }, 800);
};

// [UIManager.js] 조합 연성 상태 관리 변수
window.selectedIngredients = [null, null, null]; // 3개의 슬롯 상태

/**
 * 1. 재료 선택 팝업 (z-index 수정 및 마스터 데이터 참조)
 */
window.tempSelectedIngredients = [];

/**
 * 1. 일괄 재료 선택 팝업 열기
 */
/**
 * [UIManager.js] 일괄 재료 선택 팝업 (텍스트 수정 완료)
 */
window.openIngredientPicker = () => {
    // ... (데이터 확보 로직은 이전과 동일)
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
                <h4>조합 재료 선택 (<span id="pick-count">0</span>/3)</h4>
            </div>
            <div class="picker-grid-area" id="bulk-picker-grid">
                ${materials.map(item => `
                    <div class="picker-item-card" id="picker-item-${item.id}" onclick="window.toggleIngredientSelection('${item.id}')">
                        <div class="picker-item-icon"><img src="${item.icon}"></div>
                        <div class="picker-item-count">x${item.count}</div>
                        <div class="picker-item-name">${item.name}</div>
                        <div class="selection-order" style="display:none;"></div>
                    </div>
                `).join('')}
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
 * 2. 아이템 선택 토글 처리
 */
window.toggleIngredientSelection = (itemId) => {
    const idx = window.tempSelectedIngredients.indexOf(itemId);
    const card = document.getElementById(`picker-item-${itemId}`);
    
    if (idx > -1) {
        // 이미 선택된 경우 제거
        window.tempSelectedIngredients.splice(idx, 1);
        card.classList.remove('selected');
        card.querySelector('.selection-order').style.display = 'none';
    } else {
        // 새로 선택하는 경우 (최대 3개 제한)
        if (window.tempSelectedIngredients.length >= 3) {
            window.showToast("최대 3개까지만 선택 가능합니다.", "warning");
            return;
        }
        window.tempSelectedIngredients.push(itemId);
        card.classList.add('selected');
    }

    // 선택 순서 배지 업데이트
    window.tempSelectedIngredients.forEach((id, i) => {
        const orderBadge = document.getElementById(`picker-item-${id}`).querySelector('.selection-order');
        orderBadge.innerText = i + 1;
        orderBadge.style.display = 'flex';
    });

    // 카운트 및 확인 버튼 상태 갱신
    const count = window.tempSelectedIngredients.length;
    document.getElementById('pick-count').innerText = count;
    document.getElementById('btn-confirm-recipe').disabled = (count === 0);
    if (window.playSfx) window.playSfx('click');
};

/**
 * 3. 최종 선택 확정 및 슬롯 반영
 */
window.confirmIngredientSelection = () => {
    // 전역 선택 배열에 복사
    window.selectedIngredients = [null, null, null];
    const itemDB = [...(window.byproductTable || []), ...window.getShopItems()];

    window.tempSelectedIngredients.forEach((id, i) => {
        window.selectedIngredients[i] = id;
        const item = itemDB.find(d => d.id === id);
        const slot = document.getElementById(`recipe-slot-${i}`);
        if (slot && item) {
            slot.innerHTML = `<img src="${item.icon}" style="width:100%; height:100%; object-fit:contain;">`;
            slot.style.borderStyle = 'solid';
        }
    });

    // 팝업 제거
    document.getElementById('bulk-picker-overlay').remove();
    window.showToast(`${window.tempSelectedIngredients.length}개의 재료를 투입했습니다.`, "success");
};

/**
 * 2. 아이템 차감 함수 (masterData 구조 대응)
 */
window.removeItemFromInventory = (itemId, count) => {
    if (!window.masterData || !window.masterData.inventory) return;
    
    const inv = window.masterData.inventory;
    // 부산물(byproducts) 혹은 일반 아이템(items) 양쪽에서 확인하여 차감합니다.
    if (inv.byproducts && inv.byproducts[itemId] !== undefined) {
        inv.byproducts[itemId] = Math.max(0, inv.byproducts[itemId] - count);
    } else if (inv.items && inv.items[itemId] !== undefined) {
        inv.items[itemId] = Math.max(0, inv.items[itemId] - count);
    }
    
    // UI 갱신 및 데이터 저장
    if (window.renderInventory) window.renderInventory();
    if (window.saveAllData) window.saveAllData();
};

/**
 * 재료 선택 처리 함수
 */
window.selectIngredientForSlot = (slotIndex, itemId) => {
    const item = byproductTable.find(i => i.id === itemId) || window.getShopItems().find(i => i.id === itemId);
    if (!item) return;

    // 상태 저장 및 UI 업데이트
    window.selectedIngredients[slotIndex] = itemId;
    const slotElement = document.getElementById(`recipe-slot-${slotIndex}`);
    slotElement.innerHTML = `<img src="${item.icon}" style="width:100%; height:100%; object-fit:contain;">`;
    slotElement.style.borderStyle = 'solid';

    // 팝업 닫기
    document.querySelector('.ingredient-picker-overlay').remove();
    if (window.playSfx) window.playSfx('click');
};

/**
 * 2. 비밀 조합 실행 (연성 판정)
 */

/**
 * [UIManager.js] 비밀 조합 실행 (기존 failedProducts 배열 활용 버전)
 */
window.startRecipeSynthesis = async () => {
    const slots = window.selectedIngredients;
    if (!slots || slots.every(s => s === null)) {
        window.showToast("조합할 재료가 선택되지 않았습니다.", "warning");
        return;
    }
    if (window.collection.activeEgg || window.isHatching) {
        window.showToast("이미 연성 중입니다.", "warning");
        return;
    }

    const currentInput = [...slots].filter(s => s !== null).sort();
    const recipes = {
        'char_01': ['ether_sludge', 'soft_down_cotton', 'torn_leather_scrap'].sort(),
        'char_02': ['petrified_memory', 'sharpened_claw', 'soft_down_cotton'].sort(),
        'char_04': ['bleached_scales', 'transparent_husk', 'venomous_fang'].sort(),
        'char_05': ['soft_down_cotton', 'cracked_beak', 'glistening_mucus_bead'].sort(),
        'char_06': ['pulsing_crystal', 'spectral_fin', 'glistening_mucus_bead'].sort(),
        'char_07': ['floating_eye', 'torn_leather_scrap', 'sharpened_claw'].sort(),
        // 'char_07': ['calcified_shell_fragment', 'starlight_antler', 'ether_sludge'].sort(),
        // 'char_08': ['floating_eye', 'soft_down_cotton', 'cracked_beak'].sort(),
        // 'char_09': ['starlight_antler', 'torn_leather_scrap', 'petrified_memory'].sort(),
        // 'char_10': ['ether_sludge', 'torn_leather_scrap', 'calcified_shell_fragment'].sort(),
        // 'char_11': ['phosphorescent_wing', 'chitinous_armor_plate', 'transparent_husk'].sort(),
        // 'char_12': ['vibrant_suction_cup', 'spectral_fin', 'floating_eye'].sort(),
        // 'char_13': ['petrified_memory', 'cracked_beak', 'soft_down_cotton'].sort()
    };

    let resultCharId = null;
    for (const [id, ingredients] of Object.entries(recipes)) {
        if (JSON.stringify(currentInput) === JSON.stringify(ingredients)) {
            resultCharId = id;
            break;
        }
    }

    window.isHatching = true;

    if (resultCharId) {
        // --- 성공 로직 ---
        const targetChar = window.charData.characters.find(c => c.id === resultCharId);
        if (targetChar) {
            slots.forEach(id => { if(id) window.removeItemFromInventory(id, 1); });
            window.charGrowthMap[resultCharId] = window.charGrowthMap[resultCharId] || 0;
            window.currentPartner = targetChar;
            window.masterData.character.selectedPartnerId = resultCharId;
            await window.processNewEggAcquisition(resultCharId, 1800, 'recipe'); 
            if (window.triggerSupernovaEffect) window.triggerSupernovaEffect(targetChar);
            window.closeSedimentModal();
            window.showToast(`${targetChar.egg_name || '알'} 연성 성공!`, "success");
            if (window.saveAllData) await window.saveAllData();
        }
    } else {
        // --- ✨ 실패 로직 (기존 failedProducts 배열 연동) ---
        // 아티스트님이 선언한 failedProducts 배열에서 무작위 객체 하나를 선택합니다.
        const randomProduct = failedProducts[Math.floor(Math.random() * failedProducts.length)];
        const resultId = randomProduct.id;

        window.isHatching = false;
        slots.forEach(id => { if(id) window.removeItemFromInventory(id, 1); });

        // 인벤토리(byproducts)에 결과물 ID로 개수 추가
        const inv = window.masterData.inventory.byproducts;
        inv[resultId] = (inv[resultId] || 0) + 1;

        window.showToast(`조합 실패... '${randomProduct.name}'을(를) 획득했습니다.`, "info");
        
        if (window.saveAllData) await window.saveAllData();
        if (window.renderInventory) window.renderInventory(); // 가방 즉시 갱신
    }

    // 슬롯 초기화
    window.selectedIngredients = [null, null, null];
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`recipe-slot-${i}`);
        if (slot) { slot.innerHTML = '+'; slot.style.borderStyle = 'dashed'; }
    }
};