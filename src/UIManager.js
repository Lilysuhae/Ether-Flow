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
    {
        id: "handwritten_letter",
        category: "gift",
        name: window.t('game.items.handwritten_letter_name'),
        icon: "assets/images/items/handwritten_letter.png",
        price: 5,
        desc: window.t('game.items.handwritten_letter_desc')
    },
    {
        id: "red_berry",
        category: "gift",
        name: window.t('game.items.red_berry_name'),
        icon: "assets/images/items/red_berry.png",
        price: 20,
        desc: window.t('game.items.red_berry_desc')
    },
    {
        id: "black_extract",
        category: "gift",
        name: window.t('game.items.black_extract_name'),
        icon: "assets/images/items/black_extract.png",
        price: 30,
        desc: window.t('game.items.black_extract_desc')
    },
    {
        id: "old_record",
        category: "gift",
        name: window.t('game.items.old_record_name'),
        icon: "assets/images/items/old_record.png",
        price: 60,
        desc: window.t('game.items.old_record_desc')
    },
    {
        id: "old_instrument",
        category: "gift",
        name: window.t('game.items.old_instrument_name'),
        icon: "assets/images/items/old_instrument.png",
        price: 50,
        desc: window.t('game.items.old_instrument_desc')
    },
    {
        id: "warm_blanket",
        category: "gift",
        name: window.t('game.items.warm_blanket_name'),
        icon: "assets/images/items/warm_blanket.png",
        price: 60,
        desc: window.t('game.items.warm_blanket_desc')
    },
    {
        id: "ice_shard",
        category: "gift",
        name: window.t('game.items.ice_shard_name'),
        icon: "assets/images/items/ice_shard.png",
        price: 30,
        desc: window.t('game.items.ice_shard_desc')
    },
    {
        id: "gem_shard",
        category: "gift",
        name: window.t('game.items.gem_shard_name'),
        icon: "assets/images/items/gem_shard.png",
        price: 80,
        desc: window.t('game.items.gem_shard_desc')
    },
    {
        id: "silent_candle",
        category: "gift",
        name: window.t('game.items.silent_candle_name'),
        icon: "assets/images/items/silent_candle.png",
        price: 25,
        desc: window.t('game.items.silent_candle_desc')
    },
    {
        id: "prism_kaleidoscope",
        category: "gift",
        name: window.t('game.items.prism_kaleidoscope_name'),
        icon: "assets/images/items/prism_kaleidoscope.png",
        price: 70,
        desc: window.t('game.items.prism_kaleidoscope_desc')
    },
    {
        id: "dried_flower",
        category: "gift",
        name: window.t('game.items.dried_flower_name'),
        icon: "assets/images/items/dried_flower.png",
        price: 15,
        desc: window.t('game.items.dried_flower_desc')
    },
    {
        id: "old_parchment",
        category: "gift",
        name: window.t('game.items.old_parchment_name'),
        icon: "assets/images/items/old_parchment.png",
        price: 5,
        desc: window.t('game.items.old_parchment_desc')
    },
    {
        id: "abyssal_quill",
        category: "gift",
        name: window.t('game.items.abyssal_quill_name'),
        icon: "assets/images/items/abyssal_quill.png",
        price: 60,
        desc: window.t('game.items.abyssal_quill_desc')
    },
    {
        id: "golden_curd",
        category: "gift",
        name: window.t('game.items.golden_curd_name'),
        icon: "assets/images/items/golden_curd.png",
        price: 25,
        desc: window.t('game.items.golden_curd_desc')
    },
    {
        id: "resonance_bell",
        category: "gift",
        name: window.t('game.items.resonance_bell_name'),
        icon: "assets/images/items/resonance_bell.png",
        price: 50,
        desc: window.t('game.items.resonance_bell_desc')
    },
    {
        id: "music_seashell",
        category: "special", 
        name: "음악이 나오는 소라고둥",
        icon: "assets/images/items/music_seashell.png",
        price: 0,
        desc: "소리의 요정이 선물한 신비한 고둥입니다."
    }
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
window.renderShopItems = (category) => {
    const grid = document.getElementById('shop-grid'); 
    if (!grid) return;
    grid.innerHTML = ""; 

    const shopEther = document.getElementById('shop-ether-count');
    if (shopEther && window.collection) {
        shopEther.innerText = window.collection.points.toLocaleString();
    }

    if (category === 'material') {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: rgba(255,255,255,0.4);">
                <i class="fa-solid fa-hammer" style="font-size: 3rem; margin-bottom: 20px; display: block; opacity: 0.3;"></i>
                <div style="font-size: 1.1rem; font-weight: 600;">연구 재료 준비 중</div>
                <div style="font-size: 0.75rem; margin-top: 10px; opacity: 0.6; line-height: 1.6;">
                    새로운 재료들을 가공하고 있습니다.<br>
                    다음 업데이트를 기대해 주세요.
                </div>
            </div>`;
        return; 
    }

    const items = window.getShopItems();
    const filtered = items.filter(item => item.category === category);

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card-glass';
        card.setAttribute('data-tooltip', item.desc);

        const canAfford = window.collection ? window.collection.points >= item.price : false;

        card.innerHTML = `
            <div class="shop-card-icon"><img src="${item.icon}" class="shop-img-icon"></div>
            <div class="shop-card-name">${item.name}</div>
            <div class="shop-card-price">${item.price.toLocaleString()} Et</div>
            <button class="btn-buy-glass" ${canAfford ? '' : 'disabled'} 
                onclick="window.buyItem('${item.id}', ${item.price})">
                ${canAfford ? '구매하기' : '잔액 부족'}
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
    // 우측 상세 정보창 초기 메시지 설정
    if (detailArea) detailArea.innerHTML = `<div class="empty-bag-msg">아이템을 선택해 주세요.</div>`;

    const invItems = masterData.inventory?.items || {};
    const invByproducts = masterData.inventory?.byproducts || {};
    
    // 보유 중인 모든 아이템의 고유 ID 수집
    const allItemIds = [...Object.keys(invItems), ...Object.keys(invByproducts)];
    const uniqueIds = [...new Set(allItemIds)];

    // 현재 탭 카테고리에 맞는 아이템만 필터링
    const filteredItems = uniqueIds.filter(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        if (count <= 0) return false;

        // 상점 데이터 혹은 부산물 테이블에서 정보 탐색
        let info = window.getShopItems().find(i => i.id === id) || 
                   (typeof byproductTable !== 'undefined' ? byproductTable.find(i => i.id === id) : null);
        return info && info.category === window.currentInventoryTab;
    });

    if (filteredItems.length === 0) {
        grid.innerHTML = `<div class="empty-inventory-hint" style="grid-column: 1/-1; margin-top: 40px; color: rgba(255,255,255,0.2);">보유 중인 물품이 없습니다.</div>`;
        return;
    }

    filteredItems.forEach(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        const info = window.getShopItems().find(i => i.id === id) || byproductTable.find(i => i.id === id);

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


/* ============================================================
   [📖 도감(Collection) 시스템]
   ============================================================ */

/**
 * 1. 도감 그리드 렌더링 (보유/미보유/부화중 상태 반영)
 */
window.renderCollection = () => {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    
    grid.innerHTML = charData.characters.map(char => {
        const isOwned = collection.ownedIds.includes(char.id);
        const isActiveEgg = collection.activeEgg && collection.activeEgg.type === char.id;
        
        let spriteSrc = char.stages.egg.sprite; 

        if (isOwned) {
            // [성장 단계 계산]
            const totalSec = charGrowthMap[char.id] || 0;
            const growthMin = totalSec / 60;
            const targetMin = char.evolution_level || EVOLUTION_TARGET_MIN;
            
            // 성장 시간에 따라 'child' 혹은 'adult' 결정
            const currentStage = growthMin >= targetMin ? 'adult' : 'child';
            
            // 해당 단계의 'good' 표정 이미지 사용
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
            spriteSrc = char.stages.egg.sprite;
        }

        const clickAction = (isOwned || isActiveEgg) 
            ? `onclick="if(!window.isHatching) window.showCharDetail('${char.id}'); else window.showToast('탄생의 순간에는 눈을 뗄 수 없습니다.', 'warning');"`
            : "";

        return `
            <div class="char-slot ${statusClass}" ${clickAction}>
                <div class="char-img-box">
                    <img src="${spriteSrc}" style="${isOwned || isActiveEgg ? '' : 'filter: brightness(0) invert(0.3);'}" alt="${char.name}">
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
    // 부화 중에는 도감 열기 차단
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

    // 6. 파트너 선택 버튼 로직
    const selectBtn = document.getElementById('detail-select-btn');
    if (currentPartner && currentPartner.id === char.id) { 
        selectBtn.style.display = 'none'; 
    } else {
        selectBtn.style.display = 'block';
        selectBtn.innerText = isActiveEgg ? "다시 알 품기" : "파트너로 선택하기";
        
        selectBtn.onclick = async () => {
            currentPartner = char; 
            window.currentPartner = char;
            if (!masterData.character) masterData.character = {};
            masterData.character.selectedPartnerId = char.id;

            await refreshCharacterSprite(); 
            window.updateUI(); 
            window.closeCharDetail(); 
            window.toggleCollection(false);

            saveAllData(); 
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
 * 1. 서신 알림 뱃지 갱신
 */
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
window.renderMailList = () => {
    const mb = window.mailbox;
    if (!mb) return;

    const listContainer = document.getElementById('mail-list'); //
    if (!listContainer) return;

    // 1. ✨ [수정] 전역 변수 참조 에러 방지 (기본값 10 설정)
    const limit = window.mailDisplayLimit || 10; 
    const displayMails = mb.receivedMails.slice(0, limit);

    // 2. 목록 생성
    if (displayMails.length === 0) {
        listContainer.innerHTML = '<div class="empty-mail-msg">수신된 서신이 없습니다.</div>';
    } else {
        listContainer.innerHTML = displayMails.map(mail => `
            <div class="mail-item ${mail.isRead ? 'read' : 'unread'}" onclick="window.openLetter('${mail.id}')">
                <div class="mail-icon">
                    <i class="fas ${mail.isRead ? 'fa-envelope-open' : 'fa-envelope'}"></i>
                </div>
                <div class="mail-info">
                    <div class="mail-title">${mail.title}</div>
                    <div class="mail-sender">${mail.sender || '알 수 없는 발신자'}</div>
                </div>
                ${!mail.isRead ? '<div class="unread-dot"></div>' : ''}
                <div class="mail-date">${new Date(mail.receivedDate).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    // 3. ✨ [누락 방지] 리스트를 그릴 때 뱃지도 함께 갱신하여 카운트를 맞춥니다.
    if (window.updateMailNotification) {
        window.updateMailNotification();
    }
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
 * 4. 서신 읽기 (타이핑 연출 및 스킵 기능 복구)
 */
window.openLetter = (mailId) => {
    const mb = window.mailbox || mailbox;
    if (!mb) return;
    
    if (window.mailTypeTimer) { 
        clearInterval(window.mailTypeTimer); 
        window.mailTypeTimer = null; 
    }
    window.playSFX('paper');

    const mail = mb.receivedMails.find(m => String(m.id) === String(mailId));
    if (!mail) return;

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
    
    const mail = window.mailbox.receivedMails.find(m => String(m.id) === String(mailId));
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
            await window.processNewEggAcquisition(reward.id || reward.value, 1800, 'mail');
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
window.renderLetterReward = (mail) => {
    const rewardZone = document.getElementById('letter-reward-zone');
    if (!rewardZone || !mail.reward) return;

    if (mail.isRewardClaimed) {
        rewardZone.innerHTML = `<div class="mail-reward-box claimed"><button class="btn-claim-reward" disabled><i class="fa-solid fa-check"></i> 이미 보상을 수령했습니다</button></div>`;
        return;
    }

    const { type, value, amount, id: rewardId } = mail.reward;
    const val = value || amount || 0;
    
    let faIcon = "fa-gift", displayName = "보상", buttonText = "";

    if (type === 'point' || type === 'ether') {
        faIcon = "fa-coins"; displayName = "에테르"; buttonText = `${val.toLocaleString()} Et 수령하기`;
    } else if (type === 'item') {
        faIcon = "fa-box-open"; 
        displayName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(rewardId) : "연구 재료";
        buttonText = `${val}개 수령하기`;
    } else if (type === 'update') {
        faIcon = "fa-download"; displayName = "업데이트 지원"; buttonText = "최신 버전 다운로드하기";
    }

    rewardZone.innerHTML = `
        <div class="mail-reward-box reward-reveal">
            <span class="reward-label">${displayName} 지원</span>
            <button class="btn-claim-reward" onclick="window.claimMailReward('${mail.id}')">
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

    // 1. ✨ [안전장치] 업적 목록 및 해금 데이터 확보
    const allAchievements = window.achievementList || (window.achievementManager ? window.achievementManager.list : []);
    const unlockedIds = window.masterData?.achievements || [];

    if (allAchievements.length === 0) {
        grid.innerHTML = '<div class="empty-msg">업적 정보를 불러올 수 없습니다.</div>';
        return;
    }

    // 2. 목록 순회 및 렌더링
    allAchievements.forEach(ach => {
        // ✨ [핵심 수정] 숫자/문자열 타입 차이를 무시하고 비교하도록 String() 강제 변환
        const isUnlocked = unlockedIds.some(id => String(id) === String(ach.id));
        
        const slot = document.createElement('div');
        slot.className = `achieve-slot ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        // 해금 여부에 따른 텍스트 및 힌트 분기
        const title = isUnlocked ? ach.name : "???";
        const desc = isUnlocked ? (ach.desc || ach.description) : (ach.hint || "비밀에 싸인 업적입니다.");
        slot.setAttribute('data-tooltip', `[${title}]\n${desc}`);

        // 아이콘 렌더링 (이미지 파일인 경우와 폰트 어썸/텍스트인 경우 대응)
        if (isUnlocked) {
            if (ach.icon && (ach.icon.includes('/') || ach.icon.includes('.'))) {
                slot.innerHTML = `<img src="${ach.icon}" class="achieve-img-icon" onerror="this.src='assets/images/items/default.png'">`;
            } else {
                slot.innerHTML = `<span class="achieve-icon-text">${ach.icon || '🏆'}</span>`;
            }
        } else {
            // 미해금 시 실루엣 처리
            if (ach.icon && (ach.icon.includes('/') || ach.icon.includes('.'))) {
                slot.innerHTML = `<img src="${ach.icon}" class="achieve-img-icon locked-img" style="filter: brightness(0) invert(0.2);">`;
            } else {
                slot.innerHTML = `<span class="achieve-icon-text locked-text">?</span>`;
            }
        }
        
        grid.appendChild(slot);
    });
    
    console.log(`📊 [UI] 업적 그리드 갱신 완료 (총 ${allAchievements.length}개 중 ${unlockedIds.length}개 해금)`);
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