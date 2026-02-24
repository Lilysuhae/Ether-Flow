/**
 * [src/DialogueManager.js]
 * 캐릭터의 대사 출력, 상황별 대사 추출, 타이핑 연출 및 우선순위 제어를 담당하는 전문 매니저입니다.
 */

/* ============================================================
   [1] 내부 상태 관리 변수
   ============================================================ */
let dialogueTimeout = null;     // 타이핑 연출을 위한 인터벌 타이머
let currentPriority = 0;        // 현재 출력 중인 대사의 우선순위 (0: 자동, 1: 상호작용, 2: 시스템)
let dialogueLockUntil = 0;      // 다음 대사 출력을 가로막는 잠금 타임스탬프 (ms)
let lastDialogue = "";          // 직전 대사 보관 (동일 대사 연속 출력 방지)

/* ============================================================
   [2] 대사 출력 엔진 (showDialogue)
   ============================================================ */
/**
 * 대사창 또는 지정된 엘리먼트에 텍스트를 타이핑 연출과 함께 출력합니다.
 * @param {string} overrideText - 출력할 텍스트 (null일 경우 데이터에서 추출)
 * @param {number} priority - 우선순위 (0: 자동, 1: 클릭, 2: 시스템/인트로)
 */
window.showDialogue = (overrideText, priority = 1) => {
    // ✨ [핵심 수정] 시스템 메시지(priority 2)이거나 인트로 단계라면 파트너가 없어도 진행을 허용합니다.
    if (!window.currentPartner && priority !== 2) {
        return; 
    }

    // 설정창이나 플레이어 패널이 열려있어 화면이 가려진 경우 일반 대사는 생략합니다.
    const isPanelOpen = document.querySelector('.player-panel.active');
    if (isPanelOpen && priority < 2) return;

    const now = Date.now();
    // 현재 진행 중인 중요 대사가 있고, 새로 들어온 요청의 우선순위가 낮다면 무시합니다.
    if (priority < currentPriority && now < dialogueLockUntil) return;

    let fullText = overrideText;
    
    // 파트너가 있는 경우에만 상태(집중/딴짓/대기)에 맞는 랜덤 대사를 추출합니다.
    if (!fullText && window.currentPartner) {
        const isFocusing = window.isActuallyWorking && !window.isIdle; 
        const category = isFocusing ? 'work' : (window.isDistraction ? 'distract' : 'idle');
        const list = window.getDialoguesFromJSON(category);
        
        if (list && list.length > 0) {
            // 직전 대사와 겹치지 않게 가급적 다른 대사를 선택합니다.
            const available = list.length > 1 ? list.filter(t => t !== lastDialogue) : list;
            fullText = available[Math.floor(Math.random() * available.length)];
        }
    }

    if (!fullText) return;

    // 대사 시스템 상태 업데이트
    lastDialogue = fullText;
    currentPriority = priority;
    
    // 시스템 서신(priority 2)은 사용자가 충분히 읽을 수 있도록 잠금 시간을 길게 가져갑니다.
    const lockDuration = (priority === 2) ? 8000 : 3500;
    dialogueLockUntil = now + lockDuration;

    // 출력할 엘리먼트 결정
    const bubble = document.getElementById('dialogue-bubble');
    const textEl = document.getElementById('dialogue-text');
    
    // ✨ 인트로 서신일 경우 index.html의 서신용 영역(#letter-content)을 타겟팅합니다.
    const introTextEl = document.getElementById('letter-content');
    const targetEl = (priority === 2 && introTextEl) ? introTextEl : textEl;

    if (targetEl) {
        // ✨ [가시성 및 띄어쓰기 수리] 공백 유지 속성과 글자색을 주입합니다.
        targetEl.style.whiteSpace = 'pre-wrap'; 
        
        if (priority === 2) {
            targetEl.style.color = '#333333';
            targetEl.style.zIndex = '1000001';
            targetEl.style.opacity = '1';
            targetEl.style.visibility = 'visible';
        }

        // 기존에 진행 중인 타이핑이 있다면 즉시 초기화합니다.
        if (dialogueTimeout) {
            clearInterval(dialogueTimeout);
            dialogueTimeout = null;
        }

        // 일반 대사창(말풍선)을 사용하는 경우 활성화 애니메이션을 부여합니다.
        if (bubble && targetEl === textEl) {
            bubble.classList.add('active');
        }

        // 타이핑 연출 실행
        window.typeText(targetEl, fullText, priority);
    }
};

/* ============================================================
   [3] 타이핑 연출 엔진 (typeText)
   ============================================================ */
/**
 * 지정된 엘리먼트에 텍스트를 한 글자씩 채워 넣는 효과를 줍니다.
 */
window.typeText = (el, text, priority = 1) => {
    if (!el || !text) return;
    
    // ✨ [띄어쓰기 수리] 브라우저가 공백을 무시하지 않도록 스타일 강제 주입
    el.style.whiteSpace = 'pre-wrap';
    el.innerText = "";
    
    let i = 0;
    // 시스템 서신은 약간 더 느리고 정중한 속도로 타이핑합니다.
    const speed = (priority === 2) ? 60 : 45;

    dialogueTimeout = setInterval(() => {
        if (i < text.length) {
            el.innerText += text[i];
            i++;
            
            // 효과음 재생 (SoundManager 존재 시)
            if (i % 2 === 0 && window.playSFX) {
                // window.playSFX('type'); 
            }
        } else {
            // 타이핑이 모두 완료되면 인터벌을 정리합니다.
            clearInterval(dialogueTimeout);
            dialogueTimeout = null;
            
            // 시스템 메시지(2)가 아닌 일반 대사는 일정 시간 후 자동으로 닫습니다.
            if (priority < 2) {
                setTimeout(() => {
                    if (currentPriority < 2) window.hideDialogue();
                }, 4000);
            }
        }
    }, speed);
};

/* ============================================================
   [4] 데이터 처리 및 유틸리티
   ============================================================ */
/**
 * JSON 데이터에서 현재 캐릭터의 단계와 상황에 맞는 대사 배열을 반환합니다.
 */
window.getDialoguesFromJSON = (category) => {
    if (!window.currentPartner || !window.currentPartner.dialogues) return [];
    
    // 현재 성장 단계(egg, child, adult 등)를 확인합니다.
    const stage = window.currentStage || 'egg';
    const stageData = window.currentPartner.dialogues[stage];
    
    if (!stageData) return [];
    return stageData[category] || [];
};

/**
 * 특정 이벤트(로그인, 복귀 등)에 따른 랜덤 대사를 출력합니다.
 */
window.showRandomDialogue = (eventType) => {
    const list = window.getDialoguesFromJSON(eventType);
    if (list && list.length > 0) {
        const text = list[Math.floor(Math.random() * list.length)];
        window.showDialogue(text, 1);
    }
};

/**
 * 대사창을 화면에서 숨기고 상태를 초기화합니다.
 */
window.hideDialogue = () => {
    const bubble = document.getElementById('dialogue-bubble');
    if (bubble) {
        bubble.classList.remove('active');
    }
    currentPriority = 0;
};

/* ============================================================
   [5] 전역 객체 바인딩
   ============================================================ */
window.dialogueManager = {
    show: window.showDialogue,
    hide: window.hideDialogue,
    trigger: window.showRandomDialogue,
    reset: () => {
        currentPriority = 0;
        dialogueLockUntil = 0;
        lastDialogue = "";
        if (dialogueTimeout) clearInterval(dialogueTimeout);
    }
};

console.log("💬 [System] DialogueManager 전문 로드 완료 (띄어쓰기/가시성 수리됨)");