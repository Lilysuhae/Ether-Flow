/**
 * [src/DialogueManager.js]
 * 캐릭터 대사 출력 및 타이핑 효과, 우선순위 제어를 담당하는 모듈입니다.
 */

// 내부 제어 변수 (전역 오염 방지)
let typingInterval = null;
let dialogueTimeout = null;
let currentPriority = 0;
let dialogueLockUntil = 0;
let lastDialogue = "";

/**
 * 1. 대사 출력 엔진
 * @param {string} overrideText - 출력할 텍스트
 * @param {number} priority - 0: 자동, 1: 클릭, 2: 시스템
 */
window.showDialogue = (overrideText, priority = 1) => {
    if (!window.currentPartner) return;

    // 패널이 열려있으면 대사 생략
    const isPanelOpen = document.querySelector('.player-panel.active');
    if (isPanelOpen) return;

    const now = Date.now();
    // 우선순위 체크
    if (priority < currentPriority && now < dialogueLockUntil) return;

    let fullText = overrideText;
    
    // 텍스트 미지정 시 랜덤 추출
    if (!fullText) {
        const isFocusing = window.isActuallyWorking && !window.isIdle; 
        const category = isFocusing ? 'work' : (window.isDistraction ? 'distract' : 'idle');
        const list = window.getDialoguesFromJSON(category);
        
        const available = list.length > 1 ? list.filter(d => d !== lastDialogue) : list;
        fullText = available[Math.floor(Math.random() * available.length)] || "...";
        lastDialogue = fullText;
    }

    currentPriority = priority;
    dialogueLockUntil = now + (priority >= 2 ? 3000 : 1000); 

    const textEl = document.getElementById('dialogue-text');
    const bubble = document.getElementById('dialogue-bubble');
    if (!textEl || !bubble) return;

    if (typingInterval) clearInterval(typingInterval);
    if (dialogueTimeout) clearTimeout(dialogueTimeout);

    bubble.style.display = 'flex';
    bubble.classList.add('active');
    textEl.innerText = "";
    
    let charIndex = 0;
    typingInterval = setInterval(() => {
        if (charIndex < fullText.length) {
            textEl.innerText += fullText.charAt(charIndex);
            charIndex++;
        } else {
            clearInterval(typingInterval);
        }
    }, 50);

    // 대사 노출 시간 계산 ($2500ms + 글자당 100ms$)
    const displayDuration = Math.max(3000, 2500 + (fullText.length * 100));

    dialogueTimeout = setTimeout(() => {
        bubble.classList.remove('active');
        setTimeout(() => { 
            bubble.style.display = 'none';
            currentPriority = 0; 
        }, 300);
    }, displayDuration);
};

/**
 * 2. 상황별 랜덤 대사 선택기
 */
window.showRandomDialogue = (category) => {
    const partner = window.currentPartner;
    const stage = window.currentStage;

    if (!partner || window.isHatching || !stage) return;

    const charInfo = window.charData.characters.find(c => c.id === partner.id);
    if (!charInfo) return;

    const stageData = charInfo.stages[stage];
    if (!stageData) return;

    let targetList = [];
    let priority = 1;

    // 복귀/환영 특수 처리
    if (category === 'return' || category === 'welcome') {
        priority = 2;
        targetList = category === 'return' 
            ? (stageData.return_responses || ["다시 오셨네요!"]) 
            : (stageData.welcome_responses || ["어서 오세요."]);
    }

    if (targetList.length === 0 && stageData.dialogues) {
        const dialogueCategory = stageData.dialogues[category === 'work' ? 'work' : (category === 'distract' ? 'distract' : 'idle')];
        
        if (Array.isArray(dialogueCategory)) {
            targetList = dialogueCategory;
        } else if (dialogueCategory) {
            const intimacy = window.charIntimacyMap[partner.id] || 0;
            const subKey = intimacy >= 90 ? 'max' : (intimacy >= 55 ? 'high' : 'low');
            targetList = dialogueCategory[subKey] || dialogueCategory['high'] || [];
        }
    }

    if (targetList.length > 0) {
        const available = targetList.length > 1 ? targetList.filter(t => t !== lastDialogue) : targetList;
        const selected = available[Math.floor(Math.random() * available.length)];
        lastDialogue = selected;
        window.showDialogue(selected, priority);
    }
};

/**
 * 3. JSON 구조 기반 대사 풀 반환 헬퍼
 */
window.getDialoguesFromJSON = (category) => {
    const char = window.currentPartner;
    const stage = window.currentStage;

    if (!char || window.isHatching || !stage) return ["..."];

    const stageData = char.stages[stage];
    if (!stageData || !stageData.dialogues) return ["..."];

    const categoryData = stageData.dialogues[category];
    if (!categoryData) return ["..."];
    
    const intimacy = window.charIntimacyMap[char.id] || 0;
    const intimacyKey = intimacy >= 90 ? 'max' : (intimacy >= 55 ? 'high' : 'low');

    if (Array.isArray(categoryData)) {
        return categoryData.length > 0 ? categoryData : ["..."];
    } else {
        return categoryData[intimacyKey] || categoryData['high'] || [];
    }
};

window.closeDialogue = () => {
    const bubble = document.getElementById('dialogue-bubble');
    if (bubble) {
        // 대화창 숨기기
        bubble.style.display = 'none';
    }

    // 기존에 예약된 대화 자동 닫기 타이머가 있다면 제거
    if (window.dialogueTimeout) {
        clearTimeout(window.dialogueTimeout);
        window.dialogueTimeout = null;
    }

    // 대화 잠금 상태 해제
    window.dialogueLockUntil = 0;
};