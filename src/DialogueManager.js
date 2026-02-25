/**
 * [src/DialogueManager.js]
 * 캐릭터의 대사 출력, 타이핑 연출 및 자동 소멸 로직 전문 매니저입니다.
 */

/* ============================================================
   [1] 내부 상태 관리 변수
   ============================================================ */
let dialogueTimeout = null;     // 타이핑용 인터벌
let autoHideTimeout = null;     // 자동 소멸용 타이머
let currentPriority = 0;        
let dialogueLockUntil = 0;      
let lastDialogue = "";          

/* ============================================================
   [2] 핵심 엔진: 대사 출력 (showDialogue)
   ============================================================ */
window.showDialogue = (overrideText, priority = 1) => {
    const partner = window.currentPartner;
    const now = Date.now();

    // 1. 파트너 체크 (시스템 메시지는 통과)
    if (!partner && priority !== 2) return; 

    // 2. 중요 대사 출력 중 하위 대사 차단
    if (priority < currentPriority && now < dialogueLockUntil) return;

    let fullText = overrideText;
    
    // 3. 랜덤 대사 추출 (구조 분석 강화)
    if (!fullText && partner) {
        const category = window.getCurrentStatusCategory();
        const list = window.getDialoguesFromJSON(category);
        
        if (list && list.length > 0) {
            const available = list.length > 1 ? list.filter(t => t !== lastDialogue) : list;
            fullText = available[Math.floor(Math.random() * available.length)];
        }
    }

    if (!fullText) return;

    // 4. 상태 업데이트
    lastDialogue = fullText;
    currentPriority = priority;
    dialogueLockUntil = now + (priority === 2 ? 8500 : 3500); 

    // 5. 엘리먼트 타겟팅
    const bubble = document.getElementById('dialogue-bubble');
    const textEl = document.getElementById('dialogue-text');
    const introTextEl = document.getElementById('letter-content');
    const targetEl = (priority === 2 && introTextEl) ? introTextEl : textEl;

    if (targetEl) {
        // ✨ 타이머 초기화
        if (dialogueTimeout) clearInterval(dialogueTimeout);
        if (autoHideTimeout) clearTimeout(autoHideTimeout);

        // 가시성 및 띄어쓰기 강제 보정
        targetEl.style.whiteSpace = 'pre-wrap'; 
        
        if (priority === 2) {
            targetEl.style.color = '#333333';
            targetEl.style.zIndex = '1000001';
            targetEl.style.opacity = '1';
            targetEl.style.visibility = 'visible';
        } else {
            // 일반 대사: 말풍선 가시성 확보 (style.css 무시용)
            if (bubble) {
                bubble.style.display = 'block'; 
                bubble.style.zIndex = '99999';  
                bubble.style.opacity = '1';     
                bubble.style.visibility = 'visible';
                bubble.classList.add('active');
            }
        }

        window.typeText(targetEl, fullText, priority);
    }
};

/* ============================================================
   [3] 데이터 구조 정밀 분석 (characters.json 대응)
   ============================================================ */
window.getDialoguesFromJSON = (category) => {
    const partner = window.currentPartner;
    // ✨ [수정] partner.dialogues 대신 stages 존재 여부를 먼저 확인
    if (!partner || !partner.stages) return [];
    
    const stage = window.currentStage || 'egg';
    const stageData = partner.stages[stage];
    
    // dialogues가 stage 내부에 있는지 확인
    if (!stageData || !stageData.dialogues) return [];

    const categoryData = stageData.dialogues[category];
    if (!categoryData) return [];

    // ✨ 호감도(Intimacy) 기반 최종 리스트 추출
    if (!Array.isArray(categoryData) && typeof categoryData === 'object') {
        // 전역 친밀도 데이터 참조 (renderer.js에서 관리하는 변수)
        const intimacyMap = window.charIntimacyMap || (window.masterData && window.masterData.character && window.masterData.character.intimacyMap) || {};
        const intimacy = intimacyMap[partner.id] || 0;
        
        let level = 'low';
        if (intimacy >= 300 && categoryData.max) level = 'max';
        else if (intimacy >= 100 && categoryData.high) level = 'high';
        
        const result = categoryData[level] || categoryData['low'] || [];
        return Array.isArray(result) ? result : [];
    }

    return Array.isArray(categoryData) ? categoryData : [];
};

window.getCurrentStatusCategory = () => {
    if (window.isIdle) return 'idle';
    if (window.isActuallyWorking) return 'work';
    if (window.isDistraction) return 'distract';
    return 'idle';
};

/* ============================================================
   [4] 타이핑 및 자동 소멸 (typeText)
   ============================================================ */
window.typeText = (el, text, priority = 1) => {
    if (!el || !text) return;
    el.innerText = "";
    let i = 0;
    const speed = (priority === 2) ? 60 : 45;

    dialogueTimeout = setInterval(() => {
        if (i < text.length) {
            el.innerText += text[i];
            i++;
        } else {
            clearInterval(dialogueTimeout);
            dialogueTimeout = null;
            
            // ✨ [자동 소멸] 일반 대사(0, 1)라면 4.5초 뒤에 닫습니다.
            if (priority < 2) {
                autoHideTimeout = setTimeout(() => {
                    window.hideDialogue();
                }, 4500);
            }
        }
    }, speed);
};

/* ============================================================
   [5] 제어 및 바인딩
   ============================================================ */
window.hideDialogue = () => {
    const bubble = document.getElementById('dialogue-bubble');
    if (bubble) {
        bubble.classList.remove('active');
        
        // CSS transition 종료 후 완전 숨김
        setTimeout(() => {
            if (!bubble.classList.contains('active')) {
                bubble.style.opacity = '0';
                bubble.style.visibility = 'hidden';
            }
        }, 400); 
    }
    currentPriority = 0;
};

window.processInteraction = (type) => {
    if (!window.currentPartner) return;
    
    let category = type; 
    if (type === 'click') {
        const status = window.getCurrentStatusCategory();
        category = (status === 'work') ? 'work' : 'click';
    }

    const list = window.getDialoguesFromJSON(category);
    if (list && list.length > 0) {
        const text = list[Math.floor(Math.random() * list.length)];
        window.showDialogue(text, 1);
    }
};

window.showRandomDialogue = (eventType) => {
    window.processInteraction(eventType);
};

window.dialogueManager = {
    show: window.showDialogue,
    hide: window.hideDialogue,
    trigger: window.showRandomDialogue,
    reset: () => {
        currentPriority = 0;
        dialogueLockUntil = 0;
        lastDialogue = "";
        if (dialogueTimeout) clearInterval(dialogueTimeout);
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
        window.hideDialogue();
    }
};

console.log("💬 [DialogueManager] 데이터 구조 오류 수리 완료 전문 로드");