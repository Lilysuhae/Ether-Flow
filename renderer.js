/* ============================================================
   [1] 모듈 임포트 및 의존성 설정
   ============================================================ */
const { ipcRenderer } = require('electron');
const path = require('path');

// 핵심 매니저 클래스 및 엔진 로드
const CharacterRenderer = require(path.join(__dirname, 'src', 'CharacterRenderer.js')); 
const CharacterManager  = require(path.join(__dirname, 'src', 'CharacterManager.js'));
const ProgressManager   = require(path.join(__dirname, 'src', 'progress.js'));
const CollectionManager = require(path.join(__dirname, 'src', 'collection.js'));
const MailboxManager    = require(path.join(__dirname, 'src', 'mailboxManager.js'));
const SoundManager      = require(path.join(__dirname, 'src', 'SoundManager.js'));
const TaskManager       = require(path.join(__dirname, 'src', 'TaskManager.js'));
const LogManager        = require(path.join(__dirname, 'src', 'LogManager.js'));
const CodeManager       = require(path.join(__dirname, 'src', 'CodeManager.js'));
const MolipMonitor = require(path.join(__dirname, 'src', 'MolipMonitor.js'));
const AchievementManager = require(path.join(__dirname, 'src', 'AchievementManager.js'));

// 통합 모듈 시스템 로드 (신규 분리 파일)
require(path.join(__dirname, 'src', 'ModuleManager.js'));
require(path.join(__dirname, 'src', 'UIManager.js'));
require(path.join(__dirname, 'src', 'DialogueManager.js'));
require(path.join(__dirname, 'src', 'NoteManager.js'));
require(path.join(__dirname, 'src', 'AlchemyManager.js'));

// UI 컴포넌트 라이브러리 설정
const { defineCustomElements } = require('@duetds/date-picker/dist/loader');
defineCustomElements(window);

/* ============================================================
   [2] 전역 유틸리티 함수 (Localization)
   ============================================================ */
   /**
 * [renderer.js] 한국어 조사(이/가, 을/를) 자동 선택 유틸리티
 * @param {string} word - 조사가 붙을 단어
 * @param {string} type - 선택할 조사 쌍 (예: "이/가", "을/를")
 */
window.getKoreanParticle = (word, type) => {
    if (!word) return type;
    const lastChar = word.charCodeAt(word.length - 1);
    
    // 한글 유니코드 연산을 통해 받침 존재 여부 확인
    const hasBatchim = (lastChar - 0xAC00) % 28 > 0;
    
    // 받침이 있으면 앞의 조사(을/이), 없으면 뒤의 조사(를/가) 반환
    return hasBatchim ? type.split('/')[0] : type.split('/')[1];
};

// 다국어 번역 텍스트 반환
window.t = (key) => {
    if (!window.uiData) return key;
    try {
        return key.split('.').reduce((obj, i) => (obj && obj[i] !== undefined) ? obj[i] : undefined, window.uiData) || key;
    } catch (e) { return key; }
};

// UI 언어 즉시 적용
window.applyLocalization = () => {
    if (!window.uiData) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = key.split('.').reduce((obj, i) => (obj && obj[i] !== undefined) ? obj[i] : undefined, window.uiData);

        if (translation !== undefined) {
            if (el.hasAttribute('data-tooltip')) {
                el.setAttribute('data-tooltip', translation); // 아이콘 보호를 위한 툴팁 교체
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.innerText = translation;
            }
        }
    });
    console.log("🌐 [System] UI 언어 적용 완료");
};

/* ============================================================
   [3] 변수 선언: 데이터 및 매니저 인스턴스
   ============================================================ */
// 데이터 파일 컨테이너
let charData = null;
let mailPoolData = null;

// 매니저 인스턴스 (실행 시 초기화)
let renderer = null;
let characterManager = null;
let progress = null;
let collection = null;
let mailbox = null;
let soundManager = null;
let taskManager = null;
let logManager = null;
let codeManager = null;
let molipMonitor = null;
let achievementManager = null;

/* ============================================================
   [4] 변수 선언: 핵심 상태 (Core State)
   ============================================================ */
let masterData = null;          // 통합 JSON 데이터 객체
let lastActiveWin = null;       // 메인 프로세스 수신 활성 창 정보

// 몰입 상태 플래그
let isActuallyWorking = false;  
let isDistraction = false;      
let isIdle = false;             
let lastInputTime = Date.now(); 
let lastIdleState = false;      
let awayStartTime = null;       
let currentStatus = "good";     

// 파트너 및 연출 정보
let currentPartner = null;
let currentStage = '';
let lastLoadedId = null;        
window.isHatching = false;      

// 전역 입력 감지 엔진
['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventName => {
    window.addEventListener(eventName, () => { 
        lastInputTime = Date.now(); 

        // ✨ window.isIdle이 true(부재중)일 때 움직임이 감지되면 실행
        if (window.isIdle) {
            window.isIdle = false; 
            console.log("👋 [System] 사용자 복귀 - 배지 상태 복구");
            if (typeof updateStatusBadge === 'function') {
                updateStatusBadge(); // 즉시 UI를 '집중' 또는 '딴짓'으로 갱신
            }
        }
    }, { passive: true });
});

/* ============================================================
   [5] 변수 선언: 데이터 컬렉션 (Maps & Arrays)
   ============================================================ */
let workApps = [];
let distractionApps = [];
let molipTodos = [];
let molipHabits = [];
let shopItems = [];

// 세부 데이터 맵
let charIntimacyMap = {};
let charGrowthMap = {};
let dailyAppTimeMap = {};
let givenGiftsMap = {};
let dailyGiftCountMap = {};
let dailyPetCountMap = {};

/* ============================================================
   [6] 변수 선언: UI 및 시스템 설정
   ============================================================ */
let displayedPoints = 0;        
let isPointAnimating = false;   
let mailDisplayLimit = window.mailDisplayLimit; // 기존 코드 호환용
let logViewDate = new Date();   

// 전역 시스템 설정 플래그 (Window Binding)
window.hideCompleted = false;
window.showPastCompleted = false;
window.autoDeleteOldTasks = false;
window.resetHour = 0;
window.isHorizontalMode = true;
window.isWindowMode = true;
window.isAlwaysOnTop = true;
window.mailDisplayLimit = 10; 

/* ============================================================
   [7] 상호작용 상수 및 제어 변수
   ============================================================ */
const PET_COOLDOWN = 300;      
const EVOLUTION_TARGET_MIN = 300;
let lastPetTime = 0;            

// 대사 시스템 제어
let dialogueTimeout = null;     
let currentPriority = 0;        
let dialogueLockUntil = 0;      
let lastDialogue = "";          

/* ============================================================
   [8] 전역 객체 연결 (Window Binding)
   ============================================================ */
window.masterData = masterData;
window.charData = charData;
window.CharacterRenderer = CharacterRenderer; 
window.shopItems = shopItems;

window.renderer = renderer;     
window.charRenderer = renderer; 

window.molipTodos = molipTodos;
window.molipHabits = molipHabits;

window.isActuallyWorking = isActuallyWorking;
window.isDistraction = isDistraction;
window.isIdle = isIdle;

/* ============================================================
   [9] 실행형 임포트 및 초기 가동
   ============================================================ */
require('./src/introManager.js'); // 인트로 시퀀스 가동

/* ============================================================
   [10] 데이터 동기화 함수 (syncReferences)
   ============================================================ */
function syncReferences() {
    if (!masterData) return;

    // 1. 설정 및 배열 초기화
    if (!masterData.settings) masterData.settings = {};
    masterData.settings.workApps = masterData.settings.workApps || [];
    masterData.settings.distractionApps = masterData.settings.distractionApps || [];
    masterData.todo = masterData.todo || [];
    masterData.habit = masterData.habit || [];

        // 사운드 설정 기본값 보장
    if (!masterData.settings.sound) {
        masterData.settings.sound = { 
            sfxVol: 80, notifVol: 80, timerVol: 100,
            sfxMute: false, notifMute: false, timerMute: false,
            master: true, system: true, autoPlay: true 
        };
    }

    // 2. 참조(Reference) 연결
    workApps = masterData.settings.workApps;
    distractionApps = masterData.settings.distractionApps;
    molipTodos = masterData.todo;
    molipHabits = masterData.habit;
    
    // 3. 외부 접근용 바인딩
    window.workApps = workApps;
    window.distractionApps = distractionApps;
    window.molipTodos = molipTodos;
    window.molipHabits = molipHabits;

    // 4. 설정값 동기화
    window.hideCompleted = !!masterData.settings.hideCompleted;
    window.showPastCompleted = !!masterData.settings.showPastCompleted;
    window.autoDeleteOldTasks = !!masterData.settings.autoDeleteOldTasks;
    window.resetHour = masterData.settings.resetHour || 0;
    window.isHorizontalMode = masterData.settings.isHorizontalMode ?? true;
    window.isAlwaysOnTop = masterData.settings.isAlwaysOnTop ?? true;

    // 5. 캐릭터 맵 데이터 동기화 및 전역(window) 연결
    if (!masterData.character) masterData.character = {};
    const c = masterData.character;
    
    c.intimacyMap = c.intimacyMap || {};
    c.growthMap = c.growthMap || {};
    c.givenGiftsMap = c.givenGiftsMap || {};
    c.dailyPetCountMap = c.dailyPetCountMap || {};
    c.dailyGiftCountMap = c.dailyGiftCountMap || {};

    // ✨ [중요] MolipMonitor가 안전하게 접근할 수 있도록 바인딩
    window.charIntimacyMap = c.intimacyMap;
    window.charGrowthMap = c.growthMap;
    window.givenGiftsMap = c.givenGiftsMap;
    window.dailyPetCountMap = c.dailyPetCountMap;
    window.dailyGiftCountMap = c.dailyGiftCountMap;
    
    charIntimacyMap = c.intimacyMap;
    charGrowthMap = c.growthMap;

    masterData.dailyAppTimeMap = masterData.dailyAppTimeMap || {};
    window.dailyAppTimeMap = masterData.dailyAppTimeMap;

    // ✨ 메모 데이터 구조 초기화 및 연결
    if (!masterData.notes) {
        masterData.notes = { x: 100, y: 100, content: "", isMinimized: false };
    }
    window.notes = masterData.notes;
    
    console.log("✅ [System] 데이터 참조 바인딩 완료");
}

/* ============================================================
   [11] 헬퍼 및 엔진 시작 함수
   ============================================================ */
window.playSFX = (key) => {
    if (soundManager) {
        soundManager.playSFX(key);
    }
};

// 고유 아이디
// 1. 고유 아이디 생성 함수 (영문 대소문자 + 숫자 20자)
function generateGlobalUserId(length = 20) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += charset[randomValues[i] % charset.length];
    }
    return result;
}

// 2. 아이디 초기화 및 표시 함수
window.initAccountInfo = function() {
    let userId = window.molipUserId || localStorage.getItem('molip_user_id');
    
    if (!userId) {
        userId = generateGlobalUserId(20);
        window.molipUserId = userId;
        localStorage.setItem('molip_user_id', userId);
        
        // ✨ [수정] 즉시 전체 데이터 저장 시퀀스 실행
        if (window.saveAllData) {
            window.saveAllData(); 
            console.log("🆕 새 고유 ID가 마스터 데이터 파일에 저장되었습니다.");
        }
    } else {
        window.molipUserId = userId;
    }
    
    const displayEl = document.getElementById('user-id-display');
    if (displayEl) displayEl.value = userId;
};

// 3. 클립보드 복사 함수
window.copyUserId = function() {
    const userId = document.getElementById('user-id-display').value;
    navigator.clipboard.writeText(userId).then(() => {
        if (window.showToast) window.showToast("아이디가 복사되었습니다!", "success");
    });
};


/* ============================================================
   [⚙️ 설정 탭 UI 및 공통 모달 제어]
   ============================================================ */

/**
 * 1. 설정 창 탭 전환
 */
window.switchSettingsTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-tab-${tabId}`);
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    const targetContent = document.getElementById(`tab-content-${tabId}`);
    if (targetContent) {
        targetContent.style.display = 'block';
        setTimeout(() => targetContent.classList.add('active'), 10);
    }

    // ✨ [수정] 키워드 설정 탭을 누를 때 리스트 갱신 트리거
    if (tabId === 'monitor') {
        window.renderMonitorSettings();
    } else if (tabId === 'distract') {
        window.renderDistractionAppList(); // 딴짓 도구 목록 갱신
    } else if (tabId === 'apps') {
        window.renderWorkAppList(); // 작업 도구 목록 갱신
    }
};

window.toggleSoundSetting = (key) => {
    // 1. 사운드 설정 객체가 없으면 UI 업데이트 함수를 불러 초기화 유도
    if (!masterData.settings.sound) {
        window.updateSoundUI(); 
    }
    
    // 2. 이제 안전하게 값을 반전시킵니다.
    masterData.settings.sound[key] = !masterData.settings.sound[key];
    
    // 3. UI 갱신 및 데이터 저장
    window.updateSoundUI();
    saveAllData();
    window.playSFX('click');
    
    console.log(`🎵 [Setting] ${key} 토글됨:`, masterData.settings.sound[key]);
};

/**
 * 2. 항상 위 고정 토글
 */
window.toggleAlwaysOnTop = () => {
    window.isAlwaysOnTop = !window.isAlwaysOnTop;
    ipcRenderer.send('set-always-on-top', window.isAlwaysOnTop); 
    window.updatePinUI();
    saveAllData(); 
};

/**
 * 3. 핀(고정) 버튼 UI 업데이트
 */
window.updatePinUI = () => {
    const btn = document.getElementById('pin-btn');
    if (btn) {
        btn.classList.toggle('active', window.isAlwaysOnTop); 
    }
};

/**
 * 4. 데이터 초기화 (Reset)
 */
window.resetAllData = async () => {
    if (!confirm("⚠️ 모든 데이터가 사라집니다. 초기화하시겠습니까?")) return;

    window.isResetting = true; // 저장 방어막 가동

    if (window.molipUpdateTimer) {
        clearInterval(window.molipUpdateTimer);
        window.molipUpdateTimer = null;
    }

    // 메인 프로세스에 직접 삭제 요청
    ipcRenderer.send('force-reset-file');

    ipcRenderer.once('force-reset-complete', () => {
        localStorage.clear();
        alert("초기화가 완료되었습니다. 앱을 재구성합니다.");
        location.reload(); 
    });
};

/**
 * 5. 공용 컨펌 모달 표시 (이벤트 바인딩 안전 처리)
 */
window.showConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    // 이벤트 리스너 리셋 (cloneNode 사용)
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);

    newYesBtn.onclick = () => {
        modal.style.display = 'none';
        onConfirm(); 
    };

    newNoBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
};

// --------------------------------------------------------------------------
// [누락 복구 2] 창 모드 및 레이아웃 토글 함수
// --------------------------------------------------------------------------

// 토글 기능 함수
window.toggleHideCompleted = () => {
    window.hideCompleted = !window.hideCompleted;
    
    const toggleContainer = document.getElementById('hide-completed-toggle');
    if (toggleContainer) {
        toggleContainer.classList.toggle('active', window.hideCompleted);
    }
    
    // ✨ [수정] taskManager 인스턴스의 메서드를 직접 호출합니다.
    if (taskManager) {
        taskManager.renderTodos();
        taskManager.renderHabits();
    }
    
    saveAllData(); // 이제 크래시가 나지 않아 정상적으로 저장됩니다.
    window.showToast(window.hideCompleted ? "완료된 항목을 숨깁니다." : "모든 항목을 표시합니다.", "info");
};

// [renderer.js] DOMContentLoaded 이벤트 핸들러 (변수 누락 수리본)
document.addEventListener('DOMContentLoaded', () => {

    // 1. 앱 외부 클릭 감지 (창이 포커스를 잃을 때)
    window.addEventListener('blur', () => {
        // 플레이 리스트 패널들의 active 클래스를 제거합니다.
        document.querySelectorAll('.player-panel').forEach(panel => {
            panel.classList.remove('active');
        });
    });

    // 2. 앱 내부의 플레이 리스트 바깥 영역 클릭 감지
    document.addEventListener('mousedown', (e) => {
        const panels = document.querySelectorAll('.player-panel');
        
        panels.forEach(panel => {
            // 현재 패널이 열려 있는 상태인지 확인합니다.
            if (panel.classList.contains('active')) {
                // 클릭된 지점이 패널 내부도 아니고, 패널을 여는 버튼(trig-amb, trig-mus)도 아닐 때만 닫습니다.
                const isTriggerBtn = e.target.closest('#trig-amb') || e.target.closest('#trig-mus');
                
                if (!panel.contains(e.target) && !isTriggerBtn) {
                    panel.classList.remove('active');
                    
                    // [선택] 버튼의 활성화 상태 아이콘도 일시정지 모양에서 다시 재생 모양으로 바꿔야 할 수 있습니다.
                    // (이 부분은 SoundManager의 playTrack 상태와 연동되므로 클래스 제거만으로 충분합니다.)
                }
            }
        });
    });
    
    // ✨ [긴급 복구] 툴팁 및 마우스 추적 변수 선언
    let tooltipTimeout = null;
    let mouseX = 0;
    let mouseY = 0;
    const TOOLTIP_DELAY = 250; // 0.25초 대기

    // 2. 키워드 입력창 엔터 이벤트
    const keywordInput = document.getElementById('keyword-input');
    if (keywordInput) {
        keywordInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                window.addKeyword(); 
            } 
        });
    }

    // 3. 투두/습관 입력창 엔터 이벤트
    const todoInput = document.getElementById('todo-input');
    if (todoInput) {
        todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.addMolipTodo(); } });
    }
    const habitInput = document.getElementById('habit-input');
    if (habitInput) {
        habitInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                window.addHabit(); 
            } 
        });
    }

    // 4. 캐릭터 클릭 이벤트 (기존 petCharacter에서 handleCharacterClick으로 교체)
    const canvas = document.getElementById('main-canvas');
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            // 이제 클릭 한 번으로 쓰다듬기와 대사가 모두 실행됩니다.
            window.handleCharacterClick(e);
        });
    }

    // 5. 모달 닫기 (오버레이 클릭)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            window.closeAllModals();
        }
    });

    // 6. 투두 수정 모달 이벤트
    const saveEditBtn = document.getElementById('todo-edit-save-btn');
    const editInput = document.getElementById('todo-edit-input');
    if (saveEditBtn && editInput) {
        saveEditBtn.onclick = () => window.confirmEditTodo();
        editInput.onkeydown = (e) => {
            if (e.key === 'Enter') window.confirmEditTodo();
        };
    }

    // 7. 툴팁 마우스 추적
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        const tooltip = document.getElementById('common-tooltip');
        if (tooltip && tooltip.style.display === 'block') {
            tooltip.style.left = `${mouseX}px`; 
            tooltip.style.top = `${mouseY + 25}px`; 
        }
    });

    // 8. 툴팁 표시/숨김 로직
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        const tooltip = document.getElementById('common-tooltip');
        
        if (target && tooltip) {
            const msg = target.getAttribute('data-tooltip');
            if (msg) {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                tooltipTimeout = setTimeout(() => {
                    tooltip.innerText = msg;
                    // 저장된 좌표 사용
                    tooltip.style.left = `${mouseX}px`;
                    tooltip.style.top = `${mouseY + 25}px`;
                    tooltip.style.display = 'block';
                    tooltip.style.opacity = '1';
                    tooltip.style.animation = 'tooltip-fade 0.2s ease forwards';
                }, TOOLTIP_DELAY);
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        const tooltip = document.getElementById('common-tooltip');
        if (target && tooltip) {
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            tooltip.style.display = 'none';
            tooltip.style.opacity = '0';
            tooltip.style.animation = 'none';
        }
    });

    // 9. [버튼 클릭 효과음] 전역 리스너
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-game') || e.target.closest('button');
        if (btn && !btn.disabled) {
            window.playSFX('click');
        }
    }, true);

    // ★ 엔진 시작 호출
    startEngine();
});

/**
 * [renderer.js 연동용] 플라스크 알림 설정 토글 함수
 */
window.toggleCylinderToast = () => {
    if (!window.masterData.settings) window.masterData.settings = {};
    
    // 1. 현재 상태 반전 및 저장
    const currentStatus = window.masterData.settings.showCylinderToast !== false;
    const newStatus = !currentStatus;
    window.masterData.settings.showCylinderToast = newStatus;

    // 2. UI 스위치 동기화
    const toggle = document.getElementById('cylinder-toast-toggle');
    if (toggle) {
        toggle.classList.toggle('active', newStatus);
    }

    // 3. ✨ [추가] 상태 변경 피드백 토스트 출력
    if (window.showToast) {
        const msg = newStatus 
            ? "부산물 획득 알림을 다시 표시합니다." 
            : "이제 부산물 획득 알림이 뜨지 않습니다.";
        window.showToast(msg, newStatus ? "success" : "info");
    }

    // 4. 데이터 영구 저장 및 효과음
    if (window.saveAllData) window.saveAllData();
    if (window.playSFX) window.playSFX('click');
};

// [교정] 수동 호출용 함수도 ID를 'common-tooltip'으로 통일
window.showTooltip = (e, text) => {
    const tooltip = document.getElementById('common-tooltip');
    if (!tooltip) return;
    tooltip.innerText = text;
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
};

window.hideTooltip = () => {
    const tooltip = document.getElementById('common-tooltip');
    if (tooltip) tooltip.style.display = 'none';
};

/**
 * [renderer.js] 메인 프로세스로부터 세이브 데이터를 수신하여 메모리 및 UI를 동기화합니다.
 */
// 1. 엔진 가동 여부를 확인하는 플래그를 리스너 외부에 선언합니다.
let isEngineStarted = false; 

// 나머지 유틸리티
window.minimizeApp = () => ipcRenderer.send('minimize-app');
window.askClose = () => { document.getElementById('exit-confirm-modal').style.display = 'flex'; };

/**
 * 토스트 알림 생성 (타입별 세팅)
 * @param {string} message - 출력할 메시지
 * 토스트 알림 생성 (이벤트 타입 추가 및 시간 연장)
 * @param {string} type - 'info', 'success', 'achievement', 'error', 'event'
 */
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'achievement') icon = 'fa-trophy';
    if (type === 'error') icon = 'fa-exclamation-triangle';
    if (type === 'event') icon = 'fa-wand-magic-sparkles';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 50);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 400);
    }, 6000); 
};

window.dragSrcIndex = null;
window.handleDragOver = (e) => { e.preventDefault(); return false; };

//앱 종료
window.quitApp = async () => {
    try {
        // 1. 종료 전 팝업 닫기
        document.getElementById('exit-confirm-modal').style.display = 'none';
        
        // 2. "최후의 저장" 시도 및 대기 (await 필수)
        window.showToast("연구 데이터를 정리 중입니다...", "info");
        await saveAllData(); 
        
        console.log("✅ 모든 데이터 보존 완료. 안전하게 종료합니다.");
        
        // 3. 메인 프로세스에 종료 허가 신호 전송
        ipcRenderer.send('final-save-done'); 
    } catch (err) {
        console.error("종료 중 데이터 유실 위험 감지:", err);
        ipcRenderer.send('quit-app'); // 실패하더라도 앱은 종료
    }
};


// [추가] 레이아웃 설정 함수 (기존 toggle 대신 라디오에서 호출)
// [최종 통합] 레이아웃 설정 함수
window.setLayoutMode = (isHorizontal) => {
    window.isHorizontalMode = isHorizontal;
    window.applyHorizontalMode(); 
    saveAllData();
};

/**
 * 설정 모달 토글 및 내부 데이터 동기화
 */
/**
 * [renderer.js] 설정 모달 토글 및 모든 설정값 UI 동기화
 */
window.toggleSettings = (show) => {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.style.display = show ? 'flex' : 'none';
    
    if (show) {
        const s = masterData.settings || {};

        // 1. 일반 설정 동기화 (언어, 폰트, 테마)
        if (document.getElementById('language-select')) document.getElementById('language-select').value = s.language || 'ko';
        if (document.getElementById('font-select')) document.getElementById('font-select').value = s.font || 'paperlogy';
        
        const currentTheme = s.currentTheme || 'DEFAULT_DARK'; 
        const themeRadio = document.querySelector(`input[name="theme-choice"][value="${currentTheme}"]`);
        if (themeRadio) themeRadio.checked = true;

        // 2. ✨ [핵심 수정] 자동 시작 및 기타 토글 스위치 상태 복구
        const autoStartToggle = document.getElementById('auto-start-toggle');
        if (autoStartToggle) {
            // 저장된 autoStart 값이 true면 'active' 클래스 추가, 아니면 제거
            autoStartToggle.classList.toggle('active', !!s.autoStart);
        }

        const cylinderToggle = document.getElementById('cylinder-toast-toggle');
        if (cylinderToggle) {
            cylinderToggle.classList.toggle('active', s.showCylinderToast !== false);
        }

        // 3. 레이아웃 모드 버튼 동기화
        const currentMode = s.windowMode || 'horizontal';
        const btnGroup = document.querySelector('.window-mode-btns');
        if (btnGroup) {
            btnGroup.querySelectorAll('button').forEach(btn => {
                const isActive = btn.getAttribute('onclick').includes(`'${currentMode}'`);
                btn.classList.toggle('active', isActive);
            });
        }

        // 4. 할 일 관리 및 사운드 UI 동기화
        if (document.getElementById('reset-hour-select')) document.getElementById('reset-hour-select').value = window.resetHour || 0;
        window.updateSoundUI();
        window.updatePastItemsUI();

        // 기본 탭으로 시작
        window.switchSettingsTab('general'); 
    }
};

// [누락 복구] 첫 호문클루스 선택 모달 (처음 시작 시 필요)
window.showFirstChoiceModal = () => {
    const modal = document.getElementById('first-choice-modal'); // index.html에 해당 ID가 있어야 함
    if (modal) modal.style.display = 'flex';
};

// [최종] 모달 닫기 공용 함수
window.closeAllModals = () => {
    document.querySelectorAll('.modal-overlay, .alert-overlay').forEach(m => {
        m.style.display = 'none';
    });
};

// [추가] 아코디언 열림/닫힘 제어 함수
window.toggleAccordion = (id) => {
    const accordion = document.getElementById(id);
    if (accordion) {
        // 1. 시각적 토글
        const isActive = accordion.classList.toggle('active');
        
        // 2. [핵심] 마스터 데이터에 상태 기록
        if (!masterData.settings.accordionStates) {
            masterData.settings.accordionStates = {};
        }
        masterData.settings.accordionStates[id] = isActive;
        
        // 3. 즉시 저장
        saveAllData(); 
    }
};

/**
 * [복구] 저장된 아코디언(접기/펼치기) 상태를 화면에 적용합니다.
 */
window.applyAccordionStates = () => {
    const states = masterData.settings?.accordionStates;
    if (!states) return;

    // 저장된 모든 아코디언 ID에 대해 상태 복구
    for (const [id, isActive] of Object.entries(states)) {
        const el = document.getElementById(id);
        if (el) {
            // 저장된 값이 true면 펼치고, false면 접습니다.
            el.classList.toggle('active', !!isActive);
        }
    }
};

/**
 * 폰트 변경 함수
 * @param {string} fontName - 변경할 폰트 이름
 * @param {boolean} needSave - 파일 저장 여부 (초기화 시 false, 사용자 변경 시 true)
 */
window.changeFont = function(fontName, needSave = true) {
    const root = document.documentElement;
    
    // 폰트별 CSS 변수 매핑
    const fontMapping = {
        'Pretendard': "'Pretendard', sans-serif",
        'Galmuri11': "'Galmuri11', sans-serif",
        'NanumSquareNeo': "'NanumSquareNeo', sans-serif", // ✨ 추가
        'paperlogy': "'Paperlogy', sans-serif",
        'NeoHyundai': "'NeoHyundai', sans-serif",
    };

    const selectedFont = fontMapping[fontName] || fontMapping['paperlogy'];
    root.style.setProperty('--main-font', selectedFont);

    // 설정 데이터 업데이트 및 저장
    if (window.masterData && window.masterData.settings) {
        window.masterData.settings.font = fontName;
        if (needSave) {
            saveAllData(); 
            console.log(`[설정] 폰트 변경: ${fontName}`);
        }
    }
};

/**
 * 저장된 폰트 불러오기 (앱 시작 시 호출)
 */
window.applySavedFont = function() {
    if (window.masterData && window.masterData.settings && window.masterData.settings.font) {
        const savedFont = window.masterData.settings.font;
        // [핵심] 초기화 단계이므로 저장을 하지 않도록 false를 전달합니다.
        window.changeFont(savedFont, false); 
    }
};



/* ============================================================
   [🛒 상점 시스템 (Shop) 통합 버전] 
   ============================================================ */
window.buyItem = async (itemId, price) => {
    // 1. 거래 데이터 구성: 에테르 차감(-), 아이템 수량 증가(+)
    const transaction = {
        ether: -price,         // 구매 가격만큼 에테르 차감
        items: { [itemId]: 1 } // 선택한 아이템 1개 추가
    };

    // 2. ✨ [핵심] 통합 거래 모듈 호출
    // 검증(잔액 확인), 실제 차감, 데이터 저장, 모든 UI 리프레시가 이 한 줄로 처리됩니다.
    const result = await window.processResourceTransaction(transaction);

    // 3. 결과에 따른 후속 처리
    if (result.success) {
        if (window.playSFX) {
            window.playSFX('coin'); 
        }
        // 아이템 이름을 찾아 성공 알림 출력
        const items = (window.shopItems && window.shopItems.length > 0) ? window.shopItems : window.getShopItems();
        const item = items.find(i => i.id === itemId);
        
        window.showToast(`${item?.name || '아이템'} 구매 완료!`, "success");
        console.log(`🛒 [Shop] 구매 성공: ${itemId} (-${price} Et)`);
    } 
    else {
        // 실패 사유에 따른 메시지 분기
        if (result.reason === "insufficient_ether") {
            window.showToast("에테르가 부족하여 구매할 수 없습니다.", "error");
        } else {
            window.showToast("거래 처리 중 오류가 발생했습니다.", "error");
            console.error(`❌ [Shop] 구매 실패 사유: ${result.reason}`);
        }
    }
};

/**
 * [renderer.js] 캐릭터 클릭 시 상호작용 (최종 통합 디버깅 버전)
 */
window.handleCharacterClick = function (event) {
    const stage = window.currentStage;

    // 1. 쓰다듬기 실행 (통합 모듈 호출)
    if (window.characterManager && stage !== 'egg') {
        window.characterManager.pet(event); // 내부에서 processInteraction('pet') 호출
    }

    // 2. 대사 출력 (알 상태면 침묵, 아니면 상태 대사)
    if (stage === 'egg') {
        window.showDialogue("...", 1);
    } else {
        // 현재 상태(working/distracting/idle)에 맞는 대사 출력
        window.processInteraction('click'); 
    }
};


/* ============================================================
   [🔊 사운드 시스템: 통합 및 동기화]
   ============================================================ */
window.updateSoundUI = () => {
    // 1. 데이터 부재 시 초기화
    if (!masterData.settings.sound) {
        masterData.settings.sound = { 
            sfxVol: 80, notifVol: 80, timerVol: 100,
            sfxMute: false, notifMute: false, timerMute: false,
            master: true, system: true, autoPlay: true 
        };
    }
    
    const s = masterData.settings.sound;

    // 2. 상단 토글 버튼 상태 반영
    const masterEl = document.getElementById('master-sound-toggle');
    const systemEl = document.getElementById('system-sound-toggle');
    const autoPlayEl = document.getElementById('auto-play-toggle'); 
    if (masterEl) masterEl.classList.toggle('active', !!s.master);
    if (systemEl) systemEl.classList.toggle('active', !!s.system);
    if (autoPlayEl) autoPlayEl.classList.toggle('active', !!s.autoPlay);

    // 3. 개별 슬라이더 및 확성기 아이콘 업데이트
    ['sfx', 'notif', 'timer'].forEach(type => {
        const slider = document.getElementById(`vol-${type}`);
        const muteBtn = document.getElementById(`mute-${type}`);
        const isMuted = !!s[`${type}Mute`];

        if (slider) slider.value = s[`${type}Vol`] || 0;
        if (muteBtn) {
            muteBtn.classList.toggle('muted', isMuted);
            muteBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        }
    });
};

window.updateVolume = (type, val) => {
    if (!masterData.settings.sound) return;
    
    const vol = parseInt(val);
    masterData.settings.sound[`${type}Vol`] = vol;

    // ✨ 볼륨이 0이면 자동으로 음소거 처리, 0보다 크면 음소거 해제
    masterData.settings.sound[`${type}Mute`] = (vol === 0);

    if (window.soundManager) {
        window.soundManager.applyVolumeSettings();
    }
    
    window.updateSoundUI(); // 아이콘 상태 즉시 갱신
    saveAllData();
};

// --- [개별 토글 로직] ---

window.toggleMasterSound = () => {
    if (!masterData.settings.sound) masterData.settings.sound = { master: true, system: true, autoPlay: true };
    
    // 상태 반전 및 UI 갱신
    masterData.settings.sound.master = !masterData.settings.sound.master;
    window.updateSoundUI();
    saveAllData(); //
    
    window.showToast(masterData.settings.sound.master ? "전체 소리가 켜졌습니다." : "전체 소리가 꺼졌습니다.", "info");
};

window.toggleSystemSound = () => {
    if (!masterData.settings.sound) masterData.settings.sound = { master: true, system: true, autoPlay: true };
    
    masterData.settings.sound.system = !masterData.settings.sound.system;
    window.updateSoundUI();
    saveAllData();
    
    window.showToast(masterData.settings.sound.system ? "시스템 효과음이 활성화되었습니다." : "시스템 효과음이 비활성화되었습니다.", "info");
};

window.toggleAutoPlay = () => {
    // [보강] 데이터 경로가 없으면 즉시 생성
    if (!masterData.settings.sound) {
        masterData.settings.sound = { master: true, system: true, autoPlay: true };
    }
    
    // 상태 반전
    masterData.settings.sound.autoPlay = !masterData.settings.sound.autoPlay;
    
    // UI 갱신 및 저장
    window.updateSoundUI();
    saveAllData(); 
    
    window.showToast(masterData.settings.sound.autoPlay ? "자동 재생 모드가 활성화되었습니다." : "자동 재생 모드가 비활성화되었습니다.", "info");
};

window.togglePastItems = () => {
    if (!masterData.settings) return;
    masterData.settings.showPastCompleted = !masterData.settings.showPastCompleted;
    window.showPastCompleted = masterData.settings.showPastCompleted;
    saveAllData();
    window.updatePastItemsUI();
    window.renderTodos(); // 마침표 에러 수정 완료
};

window.updatePastItemsUI = () => {
    const el = document.getElementById('show-past-toggle');
    if (el) el.classList.toggle('active', !!window.showPastCompleted);
};


/* ============================================================
   [📱 앱 관리 시스템: 작업 및 딴짓 도구] 
   ============================================================ */

/**
 * [UI 갱신] 작업 도구 목록을 화면에 그립니다.
 */
window.renderWorkAppList = () => {
    // 1. HTML 리스트 컨테이너 찾기
    const list = document.getElementById('work-app-list');
    if (!list) {
        console.warn("⚠️ [UI] 'work-app-list' 요소를 찾을 수 없어 렌더링을 건너뜁니다.");
        return;
    }

    // 2. 데이터 유효성 검사 (syncReferences가 선행되어야 함)
    // workApps가 undefined일 경우 빈 배열로 처리하여 에러 방지
    const safeApps = Array.isArray(workApps) ? workApps : [];

    // 3. 목록이 비어있을 경우 안내 메시지 출력
    // 데이터가 없을 경우 메시지 표시
    if (workApps.length === 0) {
        list.innerHTML = '<li class="empty-list-msg">등록된 도구가 없습니다.</li>';
        return;
    }

    list.innerHTML = workApps.map(app => `
        <li class="work-app-item">
            <i class="fas fa-box-archive"></i> 
            <span class="app-name">${app}</span>
            <button class="btn-trash" onclick="window.removeWorkApp('${app}')">
                <i class="fas fa-trash-can"></i>
            </button>
        </li>`).join('');
};

/**
 * 2. 딴짓 도구 목록 렌더링
 */
window.renderDistractionAppList = () => {
    // 설정창 내부에 존재하는 리스트 ID
    const settingsList = document.getElementById('distract-app-list-settings');
    if (!settingsList) return; 

    const content = distractionApps.length === 0 
        ? '<li class="empty-list-msg">등록된 딴짓이 없습니다.</li>'
        : distractionApps.map(app => `
            <li class="work-app-item">
                <i class="fas fa-ghost"></i> 
                <span class="app-name">${app}</span>
                <button class="btn-trash" onclick="window.removeDistractionApp('${app}')">
                    <i class="fas fa-trash-can"></i>
                </button>
            </li>`).join('');

    // 설정창 리스트에 주입
    settingsList.innerHTML = content;

    // 메인 화면용 (안전 장치)
    const mainList = document.getElementById('distract-app-list');
    if (mainList) mainList.innerHTML = content;
};

/**
 * 3. 현재 활성 창을 작업 도구로 등록
 */
/**
 * [등록] 현재 활성화된 창을 작업 도구 리스트에 추가합니다.
 * 등록 즉시 UI를 새로고침하여 목록에 반영되도록 수정했습니다.
 */
window.addCurrentApp = () => {
    // 1. 현재 활성 창 정보 확인 (ipcRenderer로 받은 lastActiveWin 사용)
    if (!lastActiveWin || !lastActiveWin.owner) {
        window.showToast("활성화된 창을 감지할 수 없습니다.", "error");
        return;
    }

    const rawName = lastActiveWin.owner;
    // 이름 정제 (cleanAppName 헬퍼 사용)
    const name = window.cleanAppName ? window.cleanAppName(rawName) : rawName.trim();

    // 2. 시스템 앱(자기 자신) 등록 방지
    const forbidden = ["내 연구실", "일렉트론", "에테르플로우", "Electron", "Ether Flow"];
    if (forbidden.some(k => name.includes(k))) {
        window.showToast("이 앱은 작업 도구로 등록할 수 없습니다.", "warning");
        return;
    }

    // 3. 중복 체크 (1번 syncReferences로 연결된 workApps 사용)
    if (workApps.includes(name)) {
        window.showToast("이미 등록된 작업 도구입니다.", "info");
        return;
    }
    
    // 딴짓 도구에 이미 있는지 체크
    if (distractionApps && distractionApps.includes(name)) {
        window.showToast("이미 딴짓 도구로 등록되어 있습니다. 목록을 확인해주세요.", "warning");
        return;
    }

    // 4. 데이터 추가
    workApps.push(name);
    
    // 5. [핵심] 데이터 변경 후 UI를 즉시 다시 그립니다 (2번 함수 호출)
    window.renderWorkAppList();
    
    // 6. 파일에 영구 저장
    saveAllData();
    
    window.showToast(`'${name}' 도구가 등록되었습니다.`, "success");
    console.log(`✅ [WorkTool] 작업 도구 추가됨: ${name}`);
};

/**
 * 4. 현재 활성 창을 딴짓 도구로 등록
 */
window.addDistractionApp = () => {
    const rawName = lastActiveWin?.owner;
    if (!rawName) return;

    // 이름 정제
    const name = window.cleanAppName(rawName);

    const forbidden = ["내 연구실", "일렉트론", "에테르플로우", "Electron", "Ether Flow"];
    if (forbidden.some(k => name.includes(k))) {
        return window.showToast("시스템 앱은 딴짓 도구로 등록할 수 없습니다.", "warning");
    }

    // 중복 및 교차 등록 체크
    if (distractionApps.includes(name)) {
        return window.showToast("이미 등록된 딴짓 도구입니다.", "info");
    }
    if (workApps.includes(name)) {
        return window.showToast("작업 도구에 이미 등록되어 있습니다. 먼저 작업 도구에서 삭제하세요.", "warning");
    }

    distractionApps.push(name);
    if (typeof window.renderDistractionAppList === 'function') {
        window.renderDistractionAppList();
    }
    
    window.showToast("딴짓 도구 등록됨", "success");
    saveAllData(); 
};

/**
 * 5. 작업 도구 삭제
 */
window.removeWorkApp = (name) => { 
    // 마스터 데이터 직접 수정 후 동기화
    masterData.settings.workApps = masterData.settings.workApps.filter(a => a !== name); 
    syncReferences(); 
    window.renderWorkAppList(); 
    saveAllData(); 
};

/**
 * 6. 딴짓 도구 삭제
 */
window.removeDistractionApp = (name) => { 
    masterData.settings.distractionApps = masterData.settings.distractionApps.filter(a => a !== name); 
    syncReferences(); 
    window.renderDistractionAppList(); 
    saveAllData(); 
};


/* ============================================================
   [🔍 키워드 모니터링 시스템]
   ============================================================ */

/**
 * 1. 키워드 데이터 초기화 체크
 */
function ensureMonitorData() {
    if (!masterData.settings.monitor) {
        masterData.settings.monitor = { workKeywords: [], distractKeywords: [] };
    }
}

/**
 * 2. 키워드 설정 리스트 렌더링 (HTML ID 일치 버전)
 */
window.renderMonitorSettings = () => {
    // 🛡️ 데이터 구조 방어 (없으면 생성)
    if (!masterData.settings.monitor) {
        masterData.settings.monitor = { workKeywords: [], distractKeywords: [] };
    }

    const monitor = masterData.settings.monitor;

    // 공용 렌더링 헬퍼
    const render = (containerId, keywords, type) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!keywords || keywords.length === 0) {
            container.innerHTML = '<span style="color:rgba(255,255,255,0.1); font-size:0.7rem; padding:10px;">등록된 키워드 없음</span>';
            return;
        }

        // 🏷️ 태그 형태로 출력 (X 버튼 포함)
        container.innerHTML = keywords.map(key => `
            <li class="keyword-tag">
                <span>${key}</span>
                <button class="btn-del-key" onclick="window.removeKeyword('${type}', '${key}')">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `).join('');
    };

    // index.html에 정의된 ID와 매칭
    render('work-keyword-list', monitor.workKeywords, 'work');
    render('distract-keyword-list', monitor.distractKeywords, 'distract');
};

/**
 * 3. 키워드 삭제 함수
 */
window.removeKeyword = (type, val) => {
    const targetKey = (type === 'work') ? 'workKeywords' : 'distractKeywords';
    masterData.settings.monitor[targetKey] = masterData.settings.monitor[targetKey].filter(k => k !== val);
    
    window.renderMonitorSettings(); // 삭제 후 즉시 재렌더링
    saveAllData(); // 파일 저장
};

/**
 * 4. 키워드 추가 함수 (공백 검증 강화)
 */
window.addKeyword = () => {
    const typeSelect = document.getElementById('keyword-type-select');
    const input = document.getElementById('keyword-input');
    
    if (!typeSelect || !input) return;

    const type = typeSelect.value;
    const val = input.value

    // 🛡️ [수정] 공백 검증 및 사용자 피드백 추가
    if (!val || val.length === 0) {
        if (window.showToast) {
            window.showToast("내용이 없는 키워드는 등록할 수 없습니다.", "error");
        }
        input.value = ""; // 입력창 초기화
        input.focus();
        return;
    }

    ensureMonitorData(); // 데이터 구조 확인
    const monitor = masterData.settings.monitor;
    const targetList = type === 'work' ? monitor.workKeywords : monitor.distractKeywords;

    // 중복 체크
    if (targetList.includes(val)) {
        if (window.showToast) window.showToast("이미 등록된 키워드입니다.", "info");
        return;
    }

    targetList.push(val);
    input.value = "";
    
    window.renderMonitorSettings(); // UI 갱신
    saveAllData(); // 저장
    
    if (window.showToast) window.showToast(`키워드 등록 완료: ${val}`, "success");
};

/* ============================================================
   [📡 시스템 업데이트 및 버전 관리]
   ============================================================ */

/**
 * versionInfo가 null일 경우를 대비한 방어 로직이 추가되었습니다.
 */
async function checkForUpdateMail() {
    try {
        const versionInfo = await ipcRenderer.invoke('get-version-update');
        if (!versionInfo || !versionInfo.latest) return;

        if (isNewerVersion(versionInfo.current, versionInfo.latest)) {
            const mailId = `update_notice_${versionInfo.latest}`;
            const isAlreadyReceived = mailbox.receivedMails.some(m => m.id === mailId);

            if (!isAlreadyReceived) {
                const updateMail = {
                    id: mailId,
                    title: `새로운 연구 소식 (v${versionInfo.latest})`,
                    sender: "연금술 길드장",
                    content: `연금술사님, 연구실의 새로운 기능과 안정성이 개선된 버전이 준비되었습니다. 아래 버튼을 눌러 최신 버전을 획득하세요!`,
                    receivedDate: new Date().toISOString(),
                    isRead: false,
                    isRewardClaimed: false,
                    reward: { type: 'update', value: 1000, downloadUrl: versionInfo.downloadUrl }
                };

                mailbox.receivedMails.unshift(updateMail);
                window.updateMailNotification(); 
                window.showToast("학회로부터 중요한 서신이 도착했습니다!", "info");
                saveAllData(); 
            }
        }
    } catch (err) { console.error("업데이트 체크 실패:", err); }
}

// 간단한 버전 비교 함수
function isNewerVersion(current, latest) {
    if (!current || !latest) return false;
    return current !== latest;
}


/* ============================================================
   [🎨 테마 시스템: 스타일 및 폰트]
   ============================================================ */

// 1. 테마 데이터 로드
const { THEMES } = require('./themes.js'); 

/**
 * 2. 테마 실시간 적용 함수 (핵심 로직)
 */
window.applyTheme = function(themeId) {
    const theme = THEMES[themeId];
    if (!theme) {
        console.error(`[테마 에러] ${themeId}를 찾을 수 없어 기본 테마를 적용합니다.`);
        // 테마를 못 찾으면 기본 다크 모드로 강제 적용하여 멈춤 방지
        return window.applyTheme('DEFAULT_DARK'); 
    }

    const root = document.documentElement;
    const app = document.getElementById('app');
    
    // 1. 변수 주입
    Object.entries(theme.variables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });

    // 2. 클래스 교체 (기존 theme- 클래스 모두 제거 후 추가)
    if (app) {
        const toRemove = Array.from(app.classList).filter(c => c.startsWith('theme-'));
        app.classList.remove(...toRemove);
        app.classList.add(`theme-${theme.id}`);
    }
    
    document.body.setAttribute('data-theme', theme.id);
};

/**
 * 3. 테마 변경 및 저장 함수
 */
window.changeTheme = function(themeKey) {
    console.log(`[테마] 사용자가 "${themeKey}" 선택`);
    window.applyTheme(themeKey);
    
    // [중요] masterData와 localStorage에 동시 저장
    if (window.masterData && window.masterData.settings) {
        window.masterData.settings.currentTheme = themeKey;
        saveAllData(); // 파일(JSON) 저장
    }
    
    // 로컬 스토리지 백업 (앱 재시작 시 빠른 로드용)
    localStorage.setItem('ether-flow-theme', themeKey);
};

// 4. 초기 테마 및 폰트 로드
const savedTheme = localStorage.getItem('ether-flow-theme') || 'DEFAULT_DARK';
window.applyTheme(savedTheme);

const savedFont = localStorage.getItem('ether-flow-font') || 'paperlogy';
window.changeFont(savedFont);


/* ============================================================
   [🌐 데이터 로드: 언어 및 리소스]
   ============================================================ */

window.loadLanguageData = async (lang = 'ko') => {
    try {
        // [요청 반영] 무조건 한국어로 고정
        const targetLang = 'ko'; 
        const basePath = path.join(__dirname, 'assets', 'data', 'locales', targetLang);

        // 1. 캐릭터 및 메일 데이터 로드
        charData = require(path.join(basePath, 'characters.json'));
        mailPoolData = require(path.join(basePath, 'mailbox_pool.json'));
        
        // 2. [핵심] UI 번역 데이터(ui.json) 로드
        window.uiData = require(path.join(basePath, 'ui.json'));
        
        window.charData = charData;

        // 3. UI에 즉시 번역 적용 (에러 방지를 위해 존재 여부 확인)
        if (typeof window.applyLocalization === 'function') {
            window.applyLocalization();
        }

        return true;
    } catch (err) {
        console.error(`[에러] ko 언어 팩 로드 실패:`, err);
        return false;
    }
};

/* ============================================================
   [👂 IPC 이벤트 리스너]
   ============================================================ */

ipcRenderer.on('user-idle-state', (event, state) => {
    isIdle = state; // 메인에서 보낸 true/false 반영
    console.log(`[시스템] 유휴 상태 변경: ${isIdle}`);
});


/* ============================================================
   [🔧 핵심 유틸리티: 날짜 및 데이터 관리]
   ============================================================ */

/**
 * 1. 설정된 초기화 시간을 반영한 '게임 내 오늘 날짜'를 반환합니다.
 */
window.getMolipDate = () => {
    const resetHour = window.masterData.settings.resetHour || 0; // 유저 설정값 (0, 4, 5, 6)
    const now = new Date();
    
    // 현재 시간에서 설정된 초기화 시간을 뺍니다.
    // 예: 새벽 2시인데 초기화가 4시라면, 결과는 전날 밤 22시가 되어 날짜가 '어제'로 유지됨.
    now.setHours(now.getHours() - resetHour);
    
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * 2. 데이터 내부에 섞인 null 값을 제거하고 정상화하는 긴급 복구 함수
 */
window.cleanAndFixData = async () => {
    console.log("데이터 청소를 시작합니다...");

    // 1. 할 일 목록에서 null 제거
    const originalTodoCount = molipTodos.length;
    molipTodos = molipTodos.filter(t => t !== null && typeof t === 'object' && t.id);

    // 2. 습관 목록에서 null 제거
    const originalHabitCount = molipHabits.length;
    molipHabits = molipHabits.filter(h => h !== null && typeof h === 'object' && h.id);

    console.log(`청소 완료: 할 일(${originalTodoCount} -> ${molipTodos.length}), 습관(${originalHabitCount} -> ${molipHabits.length})`);

    // 3. 깨끗해진 데이터를 즉시 파일에 저장
    await saveAllData();

    // 4. UI 갱신 및 알림
    window.renderTodos();
    window.renderHabits();
    window.showToast("오염된 데이터를 복구하고 청소했습니다.", "success");
};


/* ============================================================
   [⚙️ 사용자 설정 제어: 시간 및 자동화]
   ============================================================ */
// [1251행 부근] 이전 항목 표시 토글
window.toggleShowPast = () => {
    window.showPastCompleted = !window.showPastCompleted;
    
    const el = document.getElementById('show-past-toggle');
    if (el) el.classList.toggle('active', window.showPastCompleted);
    
    if (taskManager) taskManager.renderTodos();
    saveAllData();
};

// [1258행 부근] 초기화 시간 변경
window.changeResetHour = (val) => {
    window.resetHour = parseInt(val);
    if (taskManager) taskManager.renderTodos();
    saveAllData();
    window.showToast(`이제 일과가 오전 ${val}시에 초기화됩니다.`, "info");
};

// [1264행 부근] 자동 삭제 토글
window.toggleAutoDelete = () => {
    window.autoDeleteOldTasks = !window.autoDeleteOldTasks;
    
    const toggle = document.getElementById('auto-delete-toggle');
    if (toggle) toggle.classList.toggle('active', window.autoDeleteOldTasks);
    
    if (window.autoDeleteOldTasks && taskManager && typeof taskManager.cleanupOldTasks === 'function') {
        taskManager.cleanupOldTasks(); 
    }
    
    saveAllData();
};


/* ============================================================
   [👂 IPC 이벤트 리스너: 메인 프로세스 통신]
   ============================================================ */

// 활성 창 변경 감지
ipcRenderer.on('active-window-update', (event, data) => { 
    lastActiveWin = data; 
});


/* ============================================================
   [🚀 메인 엔진 및 유틸리티]
   ============================================================ */
/**
 * [renderer.js] 메인 게임 엔진 루프를 가동합니다.
 */
window.startMainGameEngine = () => {
    // 1. 이미 엔진이 가동 중이면 중복 생성 방지
    if (window.gameEngineInterval) {
        console.log("⚠️ 에테르 엔진이 이미 가동 중입니다.");
        return;
    }
    console.log("🚀 에테르 엔진 가동 시작");
    window.gameEngineInterval = setInterval(updateLoop, 1000);
};

/**
 * [renderer.js] 프로그램 이름에서 불필요한 노이즈를 제거하는 유틸리티
 */
window.cleanAppName = function(name) {
    if (!name) return "";
    return name.replace(/\s*\(.*?\)/g, '')  // (64-bit), (32-bit) 등 제거
               .replace(/\.exe/gi, '')       // .exe 제거
               .trim();
};


/* ============================================================
   [💾 통합 데이터 저장 시스템 (Atomic Save)]
   ============================================================ */
/**
 * [renderer.js] 모든 연구 데이터를 수집하여 하드디스크에 안전하게 기록합니다.
 * [Data-Guard Plus] 할일, 습관, 캐릭터 수, 친밀도 총합을 대조하여 비정상 초기화를 차단합니다.
 */
async function saveAllData() {
    // 1. [시스템 보호] 리셋 작업 중이거나 데이터가 로드되지 않은 경우 저장을 차단합니다.
    if (!masterData || window.isResetting) {
        console.warn("⚠️ [System] 저장 중단: 리셋 모드이거나 데이터 미로드 상태입니다.");
        return { success: false };
    }

    try {
        // 2. [현재 데이터 수집] 검증을 위한 현재 상태값들을 확보합니다.
        const currentTodos = window.molipTodos || molipTodos || [];
        const currentHabits = window.molipHabits || molipHabits || [];
        const currentUserId = window.molipUserId;
        
        // 캐릭터 및 친밀도 데이터 추출
        const currentOwnedCount = (collection && collection.ownedIds) ? collection.ownedIds.length : 0;
        const currentIntimacyMap = charIntimacyMap || {};
        const currentTotalIntimacy = Object.values(currentIntimacyMap).reduce((sum, val) => sum + (Number(val) || 0), 0);

        // 3. ✨ [초정밀 데이터 가드] 비정상 공백 감지 시스템
        // 이전에 유효한 데이터 정보가 기록된 적이 있는 경우에만 검사를 실행합니다.
        if (window.lastValidTodoCount !== undefined && window.lastValidOwnedCount !== undefined) {
            
            // 검증 항목별 공백 여부 판단
            const isTodoLost = window.lastValidTodoCount > 0 && currentTodos.length === 0;
            const isHabitLost = window.lastValidHabitCount > 0 && currentHabits.length === 0;
            const isCharLost = window.lastValidOwnedCount > 0 && currentOwnedCount === 0;
            const isIntimacyLost = window.lastValidTotalIntimacy > 1 && currentTotalIntimacy === 0; // 최소 1 이상의 친밀도가 증발한 경우
            const isUserIdLost = !currentUserId;

            // 의도적인 리셋이 아닌데 하나라도 비정상적으로 비어있다면 저장 차단
            if (!window.isResetting && (isTodoLost || isHabitLost || isCharLost || isIntimacyLost || isUserIdLost)) {
                console.error("🚫 [DataGuard Plus] 비정상적인 데이터 유실 감지! 저장을 거부합니다.");
                console.error(`- 감지 내용: 할일(${isTodoLost}), 습관(${isHabitLost}), 캐릭터(${isCharLost}), 친밀도(${isIntimacyLost}), ID(${isUserIdLost})`);
                
                if (window.showToast) {
                    window.showToast("연구 데이터 유실 위험이 감지되어 파일 보호를 위해 저장이 중단되었습니다.", "error");
                }
                return { success: false }; // ❌ 기존 파일을 지키기 위해 덮어쓰기 중단
            }
        }

        // 4. [데이터 업데이트] 검증을 통과한 데이터를 masterData 객체에 집결시킵니다.
        if (progress) masterData.progress = progress.getSaveData(); 
        if (collection) masterData.collection = collection.getSaveData();

        const mb = window.mailbox || mailbox;
        if (mb) {
            const history = mb.getSaveData(); 
            masterData.mailbox = { mailHistory: Array.isArray(history) ? history : [] };
        }
        
        // 날짜 정보 및 핵심 배열 동기화
        const finalMolipDate = window.getMolipDate();
        if (masterData.progress) masterData.progress.lastSaveDate = finalMolipDate;
        
        masterData.userId = currentUserId;
        masterData.todo = currentTodos;
        masterData.habit = currentHabits;

        // 설정값 및 앱 목록 최종 업데이트
        if (masterData.settings) {
            masterData.settings.hideCompleted = window.hideCompleted;
            masterData.settings.showPastCompleted = window.showPastCompleted;
            masterData.settings.resetHour = window.resetHour;
            masterData.settings.autoDeleteOldTasks = window.autoDeleteOldTasks;
            masterData.settings.workApps = window.workApps || workApps; 
            masterData.settings.distractionApps = window.distractionApps || distractionApps;
            masterData.settings.isHorizontalMode = window.isHorizontalMode;
            masterData.settings.isAlwaysOnTop = window.isAlwaysOnTop;
            masterData.settings.windowMode = masterData.settings.windowMode || 'horizontal';
            masterData.settings.currentTheme = masterData.settings.currentTheme || 'DEFAULT_DARK';
        }

        // 5. [최종 기록] 메인 프로세스에 원자적 파일 쓰기를 요청합니다.
        const result = await ipcRenderer.invoke('save-game-data', masterData);
        
        if (result && result.success) {
            // ✅ 저장 성공 시, 현재 상태를 다음 검증을 위한 '마지막 유효 값'으로 갱신합니다.
            window.lastValidTodoCount = currentTodos.length;
            window.lastValidHabitCount = currentHabits.length;
            window.lastValidOwnedCount = currentOwnedCount;
            window.lastValidTotalIntimacy = currentTotalIntimacy;
            
            console.log(`💾 [System] 데이터 보존 완료 (기준: 할일 ${currentTodos.length}, 습관 ${currentHabits.length}, 캐릭터 ${currentOwnedCount}기)`);
            return { success: true };
        } else {
            throw new Error("파일 시스템 응답 실패");
        }
    } catch (err) {
        console.error("❌ [System] 데이터 저장 중 오류 발생:", err);
        if (window.showToast) {
            window.showToast("데이터 저장에 실패했습니다. 권한을 확인하세요.", "error");
        }
        return { success: false };
    }
}

// 전역 연결
window.saveAllData = saveAllData;


/* ============================================================
   [🖥️ 창(Window) 및 UI 제어 시스템]
   ============================================================ */

/**
 * 1. 창 모드 변경 (가로/세로/미니)
 */
window.changeWindowMode = (mode) => {
    if (!masterData.settings) masterData.settings = {};
    
    // 설정 저장
    masterData.settings.windowMode = mode;
    
    // UI 적용 및 메인 프로세스 통신
    window.applyWindowMode();
    saveAllData();
    
    // 미니 모드는 설정창 즉시 닫기
    if (mode === 'mini') {
        window.toggleSettings(false); 
    } else {
        // 버튼 상태 갱신
        const btnGroup = document.querySelector('.window-mode-btns');
        if (btnGroup) {
            btnGroup.querySelectorAll('button').forEach(btn => {
                const isActive = btn.getAttribute('onclick').includes(`'${mode}'`);
                btn.classList.toggle('active', isActive);
            });
        }
    }
    
    const modeName = mode === 'mini' ? '미니 위젯' : (mode === 'horizontal' ? '가로' : '세로');
    window.showToast(`${modeName} 모드로 전환합니다.`, "info");
};

/**
 * 2. 창 모드 실제 적용 (CSS & IPC)
 */
window.applyWindowMode = () => {
    const mode = masterData.settings.windowMode || 'horizontal';
    const app = document.getElementById('app');

    if (app) {
        app.classList.remove('mode-horizontal', 'mode-vertical', 'mode-mini');
        app.classList.add(`mode-${mode}`);
        
        if (mode === 'horizontal') app.classList.add('horizontal-mode');
        else app.classList.remove('horizontal-mode');
    }

    // 메인 프로세스에 크기 변경 요청
    ipcRenderer.send('set-window-mode', mode); 
};

/**
 * 3. 가로 모드 토글 (레거시 지원)
 */
window.toggleHorizontalMode = () => {
    window.isHorizontalMode = !window.isHorizontalMode;
    window.applyHorizontalMode();
    saveAllData();
};

window.applyHorizontalMode = () => { 
    const app = document.getElementById('app'); 
    if (app) {
        if (window.isHorizontalMode) app.classList.add('horizontal-mode');
        else app.classList.remove('horizontal-mode');
    }
};


/**
 * [renderer.js] 새로운 알 획득 및 엔진 동기화 (중복 방지 강화)
 */
window.processNewEggAcquisition = async (charId, targetSec = 1800, source = 'system') => {
    // 1. ✨ [방어] 이미 플라스크에 알이 있다면 'false'를 반환하고 즉시 종료
    if (window.collection && window.collection.activeEgg) {
        window.showToast("이미 알이 플라스크 안에 있어 받을 수 없습니다.", "error");
        return false; 
    }

    // 2. 캐릭터 데이터 확인
    const char = window.charData.characters.find(c => String(c.id) === String(charId));
    if (!char) return false;

    // 3. ✨ 파트너 정보 및 엔진 상태 동기화 (이름/배경 변경 해결)
    window.currentPartner = char; 
    window.masterData.character.selectedPartnerId = char.id; 
    window.currentStage = 'egg'; 

    // 4. 알 데이터 등록
    window.collection.activeEgg = {
        type: char.id,
        progress: 0,
        target: targetSec,
        date: new Date().toISOString()
    };

    // 5. 그래픽 강제 리프레시
    if (window.characterManager) {
        await window.characterManager.refreshSprite(true); 
    }

    // 6. UI 업데이트 및 저장
    window.updateUI(); 
    if (window.saveAllData) await window.saveAllData();
    
    // 7. 연출 실행
    if (window.triggerSupernovaEffect) {
        window.triggerSupernovaEffect(char);
    }

    return true; // ✨ 모든 과정이 성공했을 때만 true 반환
};


/**
 * [renderer.js] 메인 UI 통합 갱신 엔진 (이름표 및 데이터 동기화 최종본)
 */
window.updateUI = function() {
    const curProgress = window.progress;
    const curCollection = window.collection;

    // 1. 필수 시스템 객체 존재 여부 확인
    if (!curProgress || !curCollection) return;

    // 2. 진행도 데이터(시간, 레벨, 경험치) 획득
    const d = curProgress.getProgressData();
    
    // 시:분:초 포맷팅 헬퍼 함수
    const format = (s) => {
        const val = Math.max(0, Math.floor(s || 0));
        const h = Math.floor(val / 3600);
        const m = Math.floor((val % 3600) / 60);
        const sec = val % 60;
        return [h, m, sec].map(v => v < 10 ? "0" + v : v).join(":");
    };

    // 3. 시간 기록 표시 업데이트 (오늘 집중 시간 / 누적 집중 시간)
    if (document.getElementById('today-time')) {
        const todayVal = d.todayFocusTime !== undefined ? d.todayFocusTime : (d.todayTime || 0);
        document.getElementById('today-time').innerText = format(todayVal);
    }
    if (document.getElementById('total-time')) {
        const totalVal = d.totalFocusTime !== undefined ? d.totalFocusTime : (d.totalTime || 0);
        document.getElementById('total-time').innerText = format(totalVal);
    }
    
    // 4. 레벨 및 경험치 바 업데이트
    const levelNum = document.getElementById('level-num');
    const expBar = document.getElementById('exp-bar');
    const expPercent = document.getElementById('exp-percent');
    if (levelNum) levelNum.innerText = d.level;
    if (expBar) expBar.style.width = `${d.percent || 0}%`;
    if (expPercent) expPercent.innerText = `${Math.round(d.percent || 0)}%`;

    // 5. 에테르 포인트 업데이트 (부드러운 증가 애니메이션 포함)
    const pointsElement = document.getElementById('work-points');
    if (pointsElement) {
        const actualPoints = curCollection.points || 0;
        if (displayedPoints !== actualPoints && !isPointAnimating) {
            isPointAnimating = true;
            pointsElement.classList.add('point-pop');
            const step = () => {
                const diff = actualPoints - displayedPoints;
                if (Math.abs(diff) < 0.1) {
                    displayedPoints = actualPoints;
                } else {
                    displayedPoints += diff * 0.15;
                }
                pointsElement.innerHTML = `${Math.floor(displayedPoints).toLocaleString()} Et`;
                if (displayedPoints !== actualPoints) {
                    requestAnimationFrame(step);
                } else {
                    isPointAnimating = false;
                    setTimeout(() => pointsElement.classList.remove('point-pop'), 200);
                }
            };
            requestAnimationFrame(step);
        } else if (!isPointAnimating) {
            pointsElement.innerHTML = `${actualPoints.toLocaleString()} Et`;
        }
    }
    
    // 6. ✨ 파트너 이름표 동기화 (알 상태 감지 강화)
    if (window.currentPartner || curCollection.activeEgg) {
        const nameTag = document.getElementById('char-name-tag');
        if (nameTag) {
            const activeEgg = curCollection.activeEgg;
            // 현재 파트너가 진짜로 부화 중인 알인지 정밀 판정
            const isActuallyEggView = activeEgg && 
                                      window.currentPartner && 
                                      String(window.currentPartner.id) === String(activeEgg.type) && 
                                      window.currentStage === 'egg';

            if (isActuallyEggView) {
                // 알 상태일 때는 ㅁㅁ색 알 이름 표시
                nameTag.innerText = window.currentPartner.egg_name || "알";
            } else if (window.currentPartner) {
                nameTag.innerText = window.currentPartner.name;
            }
        }
        
        // 7. ✨ 호감도(애정도) 업데이트 (알 상태일 때 0.0 강제 리셋 적용)
        const intimacyVal = document.getElementById('intimacy-val');
        const intimacyBar = document.getElementById('intimacy-bar');
        
        if (window.currentPartner && (intimacyVal || intimacyBar)) {
            // ✨ [수정 완료] 단계가 'egg'면 실제 호감도와 무관하게 0으로 표시합니다.
            const currentInt = (window.currentStage === 'egg') ? 0 : (charIntimacyMap[window.currentPartner.id] || 0);
            
            if (intimacyVal) {
                intimacyVal.innerText = currentInt.toFixed(1);
            }
            if (intimacyBar) {
                intimacyBar.style.width = `${currentInt}%`;
            }
        }
    }

    if (window.NoteManager) {
        window.NoteManager.updateTheme();
    }
};

/* ============================================================
   [🏁 게임 엔진 루프 (Heartbeat) - 최적화 완료 버전]
   ============================================================ */

async function updateLoop() {
    if (!masterData || window.isResetting) return;

    const nowMolipDate = window.getMolipDate();

    // 🕒 1. [부재중 판정] 실제 PC 유휴 시간 가져오기 (15초 기준)
    const systemIdleSeconds = await ipcRenderer.invoke('get-idle-time'); 
    const isNowIdle = (systemIdleSeconds >= 300); // 아티스트님이 원하시는 15초로 수정

    // ✨ 2. [상태 변화 트리거] 부재 상태가 변하는 순간 캐릭터 반응
    if (window.isIdle !== isNowIdle) {
        window.isIdle = isNowIdle;
        isIdle = isNowIdle;

        if (window.isIdle) {
            if (window.renderer) window.renderer.setExpression('away');
            awayStartTime = Date.now();
        } else {
            if (typeof window.showRandomDialogue === 'function') {
                window.showRandomDialogue('return'); 
            }
            if (window.characterManager) window.characterManager.refreshSprite(); 
        }
    }

    // 📅 3. 날짜 변경 감지 (기존 로직 유지)
    if (masterData.progress && masterData.progress.lastSaveDate !== nowMolipDate) {
        await handleMidnightReset(nowMolipDate);
        return;
    }

    // 🔍 4. [모니터링 분석] 집중/딴짓/대기 판별
    let isFocusing = false;
    try {
        if (window.molipMonitor) {
            isFocusing = await window.molipMonitor.analyze(lastActiveWin);
        }
    } catch (e) { console.error("⚠️ [Monitor] 분석 에러:", e); }

    // 💡 5. [전역 상태 동기화] 뱃지 UI와 애니메이션이 참조할 핵심 변수 갱신
    if (window.isIdle) {
        window.isActuallyWorking = false;
        window.isDistraction = false;
    } else {
        // 집중 앱이면 집중, 딴짓 앱이면 딴짓, 둘 다 아니면 대기(false) 처리
        const appName = window.cleanAppName(lastActiveWin?.owner);
        const winTitle = (lastActiveWin?.title || "").toLowerCase();
        const distractKeywords = masterData.settings.monitor?.distractKeywords || [];
        const isKnownDist = distractionApps.includes(appName) || distractKeywords.some(k => winTitle.includes(k.toLowerCase()));

        window.isActuallyWorking = isFocusing; 
        window.isDistraction = !isFocusing && isKnownDist;
    }

    // ✉️ 6. 서신/업적/성장 체크
    try {
        checkMailAndAchievements(window.isActuallyWorking, nowMolipDate);
    } catch (e) { console.error("⚠️ [System] 조건 체크 에러:", e); }

    try {
        if (window.characterManager) {
            window.characterManager.checkHatching();   
            window.characterManager.checkEvolution();  
        }
    } catch (e) { console.error("⚠️ [Manager] 성장 로직 에러:", e); }

    // 🖥️ 7. UI 및 애니메이션 최종 갱신
    try {
        if (window.updateCylinderSystem) window.updateCylinderSystem(); 
        window.updateUI(); 
        
        // ✨ [알 흔들림 연출] '집중 중'일 때만 egg-anim-active 클래스를 활성화합니다.
        const mainCanvas = document.getElementById('main-canvas');
        if (mainCanvas) {
            const shouldAnimate = window.collection.activeEgg && window.isActuallyWorking && !window.isHatching;
            mainCanvas.classList.toggle('egg-anim-active', shouldAnimate);
        }

        // 상태 뱃지 업데이트 (window.isActuallyWorking 등을 참조함)
        if (typeof updateStatusBadge === 'function') {
            updateStatusBadge();
        }
    } catch (e) { console.error("⚠️ [UI] 최종 갱신 에러:", e); }
}


/**
 * [추출] 자정 및 날짜 변경 시 '소프트 리셋' 처리 (앱 재시작 없음)
 */
async function handleMidnightReset(nowMolipDate) {
    console.log(`🌅 [System] 새로운 하루 감지: ${nowMolipDate}`);
    
    if (masterData.progress) masterData.progress.lastSaveDate = nowMolipDate;
    if (progress) {
        progress.lastSaveDate = nowMolipDate; 
        progress.todayFocusTime = 0; 
    }

    // ✨ [안전장치 추가] 함수 존재 여부 확인 후 호출
    if (typeof window.checkHabitReset === 'function') { 
        window.checkHabitReset(); 
    }
    
    if (taskManager) {
        try {
            taskManager.renderTodos(); 
            taskManager.renderHabits();
        } catch (e) { console.error("Task render error during reset:", e); }
    }

    window.updateUI(); 
    await saveAllData(); 
    window.showToast("새로운 하루가 밝았습니다.", "info");
}

/**
 * [renderer.js] 서신 및 업적 조건 체크 함수 전문
 * @param {boolean} isFocusing - 현재 집중 중인지 여부 (flow_state 판정용)
 * @param {string} nowMolipDate - 현재 논리적 날짜 (YYYY-MM-DD)
 */
function checkMailAndAchievements(isFocusing, nowMolipDate) {
    // 기초 시스템 로드 확인
    if (!window.mailbox || !window.progress || !window.collection) return;

    const currentId = window.currentPartner?.id;
    const now = new Date();

    // 1. 성체 캐릭터 수 계산
    const adultCount = (window.charData?.characters || []).filter(char => {
        const growthSec = window.charGrowthMap[char.id] || 0;
        return (growthSec / 60) >= (char.evolution_level || 300);
    }).length;

    // 2. 완벽한 하루(Perfect Day) 판정
    const hasTasks = window.molipTodos.length > 0 || window.molipHabits.length > 0;
    const allTodosDone = window.molipTodos.length > 0 ? window.molipTodos.every(t => t.completed) : true;
    const allHabitsDone = window.molipHabits.length > 0 ? window.molipHabits.every(h => h.completed) : true;
    const isPerfectDay = hasTasks && allTodosDone && allHabitsDone;

    // 3. 쓰다듬기 횟수 키 생성
    const petKey = `${currentId}_${nowMolipDate}`;

    // 4. ✨ [핵심 수정] mailboxManager.js가 내부적으로 사용하는 변수명으로 매핑
    const stats = {
        // [식별자 및 단계]
        partnerId: currentId,
        current_stage: window.currentStage,
        isEggStage: (window.currentStage === 'egg'),
        
        // [시간 데이터 - mailboxManager는 내부적으로 totalTime, marathonTime 등을 찾음]
        totalTime: window.progress.totalFocusTime, // 초 단위로 전달 (매니저가 분으로 변환함)
        marathonTime: window.molipMonitor?.currentSessionTime || 0,
        all_growth: window.charGrowthMap || {},   // 덴데 조건(specific_growth) 판정용 객체
        
        // [능력치 및 수집]
        alchemist_level: window.progress.getProgressData().level,
        intimacy_level: window.charIntimacyMap[currentId] || 0,
        ownedCount: (window.collection.ownedIds || []).length, // owned_count 트리거 대응
        todoCount: window.molipTodos.filter(t => t.completed).length, // todo_count 트리거 대응
        points: window.collection.points, // rich_alchemist 트리거 대응
        
        // [활동 기록]
        habit_master: Math.max(0, ...window.molipHabits.map(h => h.streak || 0)),
        app_juggler: (window.workApps || []).length,
        daily_pet_limit: window.dailyPetCountMap ? (window.dailyPetCountMap[petKey] || 0) : 0,
        
        // [상태 및 시간대 판정]
        isFlowActive: isFocusing, // flow_state 트리거 대응
        isPerfectDay: isPerfectDay, // perfect_day 트리거 대응
        currentHour: now.getHours(),
        currentDay: now.getDay()
    };

    // 5. 서신 트리거 엔진 실행
    const newMails = window.mailbox.checkTriggers(stats);

    // 6. 신규 서신 도착 처리
    if (newMails && newMails.length > 0) {
        console.log(`📨 [Note] 덴데의 서신을 포함한 ${newMails.length}통의 서신 도착`);
        
        if (window.playSFX) window.playSFX('letterbox'); 
        if (window.showToast) window.showToast("새로운 서신이 도착했습니다!", "info");
        
        if (window.renderMailList) window.renderMailList();
        if (window.updateMailNotification) window.updateMailNotification();
        if (window.saveAllData) window.saveAllData(); 
    }
}

/**
 * [renderer.js] 상태 배지 UI 업데이트 (디자인 클래스 보존 버전)
 */
function updateStatusBadge() {
    const badgeEl = document.getElementById('status-badge');
    if (!badgeEl) return;

    let statusClass = "";
    let icon = "";
    let text = "";

    // 우선순위: 부재 > 딴짓 > 집중 > 대기
    if (window.isIdle) { 
        statusClass = "away";
        icon = '<i class="fas fa-moon"></i>';
        text = "부재 중";
    } else if (window.isDistraction) {
        statusClass = "distracting";
        icon = '<i class="fas fa-ghost"></i>';
        text = "딴짓 중";
    } else if (window.isActuallyWorking) {
        statusClass = "working";
        icon = '<i class="fas fa-fire"></i>';
        text = "집중 중";
    } else {
        statusClass = "waiting";
        icon = '<i class="fas fa-hourglass-start"></i>';
        text = "대기 중";
    }

    // ✨ [핵심 수정] className을 통째로 바꾸지 않고 classList를 사용해 안전하게 교체합니다.
    const allStates = ["away", "distracting", "working", "waiting"];
    badgeEl.classList.remove(...allStates);
    badgeEl.classList.add(statusClass);
    
    badgeEl.innerHTML = `${icon} ${text}`;
}

/**
 * [renderer.js] 인트로 종료: 첫 번째 알과 계약을 체결합니다.
 */
window.finalizeContract = async (char) => {
    console.log("📜 첫 번째 계약 체결: ", char.name);

    // 1. 인트로 화면 페이드 아웃
    const intro = document.getElementById('intro-sequence');
    if (intro) {
        intro.style.transition = "opacity 1.5s ease";
        intro.style.opacity = "0";
    }

    // 2. 컬렉션 매니저 초기화
    if (!collection) collection = new CollectionManager({});
    
    // 3. ✨ [알 상태 등록] 보유 목록(ownedIds)에 넣지 않고 플라스크(activeEgg)에만 등록합니다.
    // 이렇게 해야 도감에서 "태어난 상태"가 아닌 "부화 중"으로 정확히 표시됩니다.
    collection.activeEgg = {
        type: char.id,
        progress: 0,
        target: 1800, // 30분
        date: new Date().toISOString()
    };
    
    // 4. 파트너 및 UI 상태를 '알'로 강제 설정
    currentPartner = char;
    window.currentPartner = char;
    window.currentStage = 'egg';      // 이름표 동기화 핵심
    window.lastCharacterState = null; // 상태 초기화
    
    if (!masterData.character) masterData.character = {};
    masterData.character.selectedPartnerId = char.id;
    
    // 연출용 플래그 및 농도 초기화
    window.isHatching = true; 
    cylinderSaturation = 0;
    masterData.cylinderSaturation = 0;
    masterData.hatchCount = (masterData.hatchCount || 0) + 1;

    // 5. 날짜 기록 및 데이터 영구 저장
    if (!masterData.progress) masterData.progress = {};
    masterData.progress.lastSaveDate = window.getMolipDate();
    await saveAllData();

    // 6. 메인 화면 전환 및 엔진 가동
    setTimeout(async () => {
        if (intro) intro.style.display = 'none'; 
        
        // 캐릭터(알) 그래픽 및 UI 로드
        if (typeof refreshCharacterSprite === 'function') {
            await refreshCharacterSprite(); 
        }
        
        window.updateUI(); // 이름표가 'ㅁㅁ색 알'로 나오도록 갱신
        if (window.renderCollection) window.renderCollection(); // 도감에 '부화 중' 표시

        // 엔진이 꺼져있다면 가동
        if (!window.gameEngineInterval) {
            window.startMainGameEngine();
            if (typeof isEngineStarted !== 'undefined') isEngineStarted = true;
        }

        // 부화 연출 잠금 해제
        setTimeout(() => { window.isHatching = false; }, 1000);

        window.showToast(`${char.egg_name}과(와) 운명적인 계약을 맺었습니다.`, "success");
    }, 1500);
};

/**
 * 인트로 확인 모달 닫기 (introManager.js 연동)
 */
window.closeIntroConfirm = () => {
    const modal = document.getElementById('intro-confirm-modal');
    if (modal) modal.style.display = 'none';
};

/**
 * [🌟 통합 엔진 시작]
 * 데이터 로드, 매니저 초기화, 캐릭터 복구, 그리고 **UI 초기 렌더링**까지 수행합니다.
 */
async function startEngine() {
    if (isEngineStarted) return;
    console.log("🚀 [System] 연구실 엔진 가동 시퀀스 시작...");

    try {
        const savedData = await ipcRenderer.invoke('load-game-data');
        
        masterData = savedData || { 
            progress: { level: 1, exp: 0, totalFocusTime: 0, todayFocusTime: 0, lastSaveDate: window.getMolipDate() }, 
            settings: {}, character: {}, collection: {}, achievements: [], 
            inventory: { items: {}, byproducts: {} }, mailbox: { mailHistory: [] }, todo: [], habit: [] 
        };

        if (masterData.userId) {
            window.molipUserId = masterData.userId;
            localStorage.setItem('molip_user_id', masterData.userId);
        }

        // [핵심] 기존 데이터의 시간 필드 복구 및 동기화
        if (!masterData.progress) masterData.progress = {};
        masterData.progress.level = masterData.progress.level || 1;
        masterData.progress.todayFocusTime = masterData.progress.todayFocusTime || masterData.progress.todayTime || 0;
        masterData.progress.totalFocusTime = masterData.progress.totalFocusTime || masterData.progress.totalTime || 0;
        masterData.progress.lastSaveDate = masterData.progress.lastSaveDate || window.getMolipDate();

        if (!masterData.achievements) masterData.achievements = [];
        window.masterData = masterData; // 전역 마스터 데이터 확정

        // 3. 데이터 구조 보정 (나머지 안전장치)
        masterData.inventory = masterData.inventory || { items: {}, byproducts: {} };
        masterData.settings = masterData.settings || {};
        masterData.mailbox = masterData.mailbox || { mailHistory: [] };
        if (Array.isArray(masterData.mailbox)) {
            masterData.mailbox = { mailHistory: masterData.mailbox };
        }
        
        // [필수] 전역 변수 연결
        syncReferences(); 

        // 4. 언어 및 리소스 로드
        await window.loadLanguageData('ko');
        window.shopItems = window.getShopItems();

        // 5. 렌더러 초기화
        if (!window.renderer && document.getElementById('main-canvas')) {
            window.renderer = new CharacterRenderer('main-canvas');
            renderer = window.renderer; 
        }

        if (masterData.settings && masterData.settings.autoStart !== undefined) {
            ipcRenderer.send('set-auto-start', masterData.settings.autoStart);
        }

        // 6. 매니저 초기화 (misplaced 코드들을 여기서 수행)
        const mailHistory = masterData.mailbox?.mailHistory || [];
        mailbox = new MailboxManager(mailHistory, mailPoolData);
        progress = new ProgressManager(masterData.progress);
        collection = new CollectionManager(masterData.collection);
        soundManager = new SoundManager();
        taskManager = new TaskManager();
        logManager = new LogManager();
        codeManager = new CodeManager();
        molipMonitor = new MolipMonitor();
        window.molipMonitor = molipMonitor;
        window.logManager = logManager;
        window.taskManager = taskManager;

        // 매니저 초기화 구역
        achievementManager = new AchievementManager();
        window.achievementManager = achievementManager;
        window.achievementList = achievementManager.list; // 호환성 유지
        window.unlockAchievement = (id) => achievementManager.unlock(id); // 호환성 유지

        // ✨ CharacterManager 생성 및 데이터 연결
        characterManager = new CharacterManager({ charData: charData });
        window.characterManager = characterManager;

        // 전역 연결 래퍼 (HTML 버튼 호환성 유지)
        window.refreshCharacterSprite = () => characterManager.refreshSprite();
        window.petCharacter = (e) => characterManager.pet(e);
        window.performHatchSequence = (type) => characterManager.performHatch(type);

        window.progress = progress;
        window.collection = collection;
        window.mailbox = mailbox;
        window.soundManager = soundManager;

        logManager.init();
        codeManager.init();

        // 7. 캐릭터 복구
        const savedId = masterData.character?.selectedPartnerId;
        const hasOwned = collection.ownedIds && collection.ownedIds.length > 0;
        const hasEgg = !!collection.activeEgg;
        
        if (!savedId && !hasEgg && !hasOwned) {
            const intro = document.getElementById('intro-sequence');
            if (intro) intro.style.display = 'flex';
        } else {
            const targetId = savedId || (hasOwned ? collection.ownedIds[0] : (hasEgg ? collection.activeEgg.type : null));
            if (targetId) {
                currentPartner = charData.characters.find(c => c.id === targetId);
                // ✨ [핵심 수정] 파트너 정보를 전역 객체에 공유 (CharacterManager가 인식하도록 함)
                window.currentPartner = currentPartner; 
                
                if (currentPartner) await refreshCharacterSprite(); 
            }
        }

        if (window.NoteManager) {
            window.NoteManager.init();
        }

        // 8. UI 최종 적용
        window.applyHorizontalMode();
        window.applyWindowMode();
        window.applySavedFont();
        ipcRenderer.send('set-always-on-top', window.isAlwaysOnTop);
        window.updatePinUI();
        window.updateUI();
        window.updateMailNotification();
        
        window.applyAccordionStates();
        window.renderWorkAppList(); 
        window.renderMonitorSettings(); 
        
        taskManager.init();
        taskManager.renderTodos();
        taskManager.renderHabits();

        checkForUpdateMail();

        const isAutoStart = !!(masterData.settings && masterData.settings.autoStart);
        ipcRenderer.send('set-auto-start', isAutoStart); 
        console.log(`📡 [System] 자동 시작 설정 복구: ${isAutoStart}`);

        if (window.initAccountInfo) {
            window.initAccountInfo();
            console.log("🆔 유저 아이디 시스템 가동");
        }

        if (window.renderer && typeof window.renderer.startLoop === 'function') {
            window.renderer.startLoop(); 
        }
        if (typeof window.setupEngine === 'function') {
            window.setupEngine();
        }

        // 9. 엔진 가동
        isEngineStarted = true;
        window.startMainGameEngine();
        document.body.classList.add('ready');
        console.log("✅ [System] 엔진 가동 및 UI 렌더링 완료");

        // 10. 환영 인사
        setTimeout(() => {
            if (typeof window.showRandomDialogue === 'function') {
                window.showRandomDialogue('welcome');
            }
        }, 1000);

    } catch (err) {
        console.error("❌ [System] 엔진 시작 중 오류:", err);
    }
}

// 오디오 엔진 설정
window.setupEngine = () => {
    if (soundManager) {
        soundManager.setupAudioEngine();
    }
};

/**
 * [renderer.js] 사운드 개별 음소거 토글 함수
 * @param {string} type - 'sfx', 'notif', 'timer' 중 하나
 */
window.toggleMute = (type) => {
    if (!masterData.settings.sound) {
        window.updateSoundUI(); // 데이터가 없으면 초기화 실행
    }
    
    const s = masterData.settings.sound;
    const muteKey = `${type}Mute`;
    
    // 1. 음소거 상태 반전
    s[muteKey] = !s[muteKey];

    // 2. ✨ [추가] 음소거 해제 시 볼륨이 0이라면 최소 볼륨(10)으로 복구
    if (!s[muteKey] && s[`${type}Vol`] === 0) {
        s[`${type}Vol`] = 10;
    }

    // 3. 실제 오디오 엔진에 변경사항 적용
    if (window.soundManager) {
        window.soundManager.applyVolumeSettings();
    }
    
    // 4. UI 갱신 및 데이터 저장
    window.updateSoundUI(); 
    saveAllData();
    window.playSFX('click');
    
    const statusMsg = s[muteKey] ? "음소거됨" : "소리 켬";
    console.log(`🔊 [Sound] ${type} 상태 변경: ${statusMsg}`);
};

/**
 * [renderer.js] 자동 실행 설정 토글
 */
window.toggleAutoStart = () => {
    if (!masterData.settings) masterData.settings = {};
    
    const newStatus = !masterData.settings.autoStart;
    masterData.settings.autoStart = newStatus;

    // UI 즉시 반영
    const toggle = document.getElementById('auto-start-toggle');
    if (toggle) toggle.classList.toggle('active', newStatus);

    // 시스템 및 파일 저장
    ipcRenderer.send('set-auto-start', newStatus);
    saveAllData(); 
    window.playSFX('click');
    window.showToast(newStatus ? "자동 실행이 켜졌습니다." : "자동 실행이 꺼졌습니다.", "info");
};

/**
 * [renderer.js] 새로운 알 탄생 시 슈퍼노바(Supernova) 연출
 * @param {object} char - 탄생한 캐릭터 데이터
 */
window.triggerSupernovaEffect = (char) => {
    const effectLayer = document.getElementById('effect-layer');
    if (!effectLayer) return;

    // 1. 화이트 플래시 효과 시작
    effectLayer.classList.add('supernova-active');
    
    // 2. 강렬한 연성 성공 효과음 재생
    if (window.playSFX) {
        window.playSFX('hatch'); // 혹은 'upgrade' 등의 효과음
    }

    // 3. 연출 중 캐릭터 캔버스 흔들림 및 강조
    const mainCanvas = document.getElementById('main-canvas');
    if (mainCanvas) {
        mainCanvas.style.filter = 'brightness(2) contrast(1.2) drop-shadow(0 0 20px gold)';
        mainCanvas.style.transform = 'scale(1.1)';
    }

    // 4. 일정 시간 후 연출 제거 및 복구
    setTimeout(() => {
        effectLayer.classList.remove('supernova-active');
        if (mainCanvas) {
            mainCanvas.style.filter = '';
            mainCanvas.style.transform = '';
        }
    }, 2000); // 2초간 지속
};