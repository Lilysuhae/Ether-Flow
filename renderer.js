/* ============================================================
   [1] 모듈 임포트 및 의존성 설정
   ============================================================ */
const { ipcRenderer } = require('electron');
const path = require('path'); // [추가] path 모듈을 먼저 가져와야 합니다.

// [수정] path.join과 __dirname을 사용하여 경로를 절대화합니다.
const CharacterRenderer = require(path.join(__dirname, 'src', 'CharacterRenderer.js')); 
const ProgressManager = require(path.join(__dirname, 'src', 'progress.js'));
const CollectionManager = require(path.join(__dirname, 'src', 'collection.js'));
const MailboxManager = require(path.join(__dirname, 'src', 'mailboxManager.js'));
const SoundManager = require(path.join(__dirname, 'src', 'SoundManager.js'));
const TaskManager = require(path.join(__dirname, 'src', 'TaskManager.js'));
const LogManager = require(path.join(__dirname, 'src', 'LogManager.js'));

/* ============================================================
   [2] 전역 유틸리티 함수 (Localization - UI 렌더링 전 필수)
   ============================================================ */
window.t = (key) => {
    if (!window.uiData) return key;
    try {
        return key.split('.').reduce((obj, i) => {
            return (obj && obj[i] !== undefined) ? obj[i] : undefined;
        }, window.uiData) || key;
    } catch (e) { 
        return key; 
    }
};

window.applyLocalization = () => {
    if (!window.uiData) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        
        // [핵심] 언어 파일에서 실제 데이터가 있는지 확인 (undefined 체크)
        const translation = key.split('.').reduce((obj, i) => {
            return (obj && obj[i] !== undefined) ? obj[i] : undefined;
        }, window.uiData);

        // 언어 파일에 데이터가 있는 경우에만 변경을 시도합니다.
        // 데이터가 없으면 기존 HTML 원본(아이콘 포함)이 그대로 유지됩니다.
        if (translation !== undefined) {
            
            // 1. 아이콘 버튼 보호: data-tooltip 속성이 있는 경우
            // 버튼 내부의 <i> 아이콘 태그를 지우지 않기 위해 툴팁 속성값만 교체합니다.
            if (el.hasAttribute('data-tooltip')) {
                el.setAttribute('data-tooltip', translation);
            }
            
            // 2. 입력창(INPUT/TEXTAREA) placeholder 처리
            else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            }
            
            // 3. 그 외 일반 텍스트 요소 (span, p, div 등)
            else {
                el.innerText = translation;
            }
        }
    });
    console.log("🌐 [System] UI 언어 적용 완료 (아이콘 보호 및 미번역 원본 유지)");
};

/* ============================================================
   [3] 변수 선언: 매니저 및 데이터 컨테이너
   ============================================================ */
// 데이터 파일 컨테이너
let charData = null;
let mailPoolData = null;

// 매니저 인스턴스
let renderer = null;
let progress = null;
let collection = null;
let mailbox = null;
let soundManager = null;
let taskManager = null;
let logManager = null;

/* ============================================================
   [4] 변수 선언: 핵심 상태 (Core State)
   ============================================================ */
// 필수 상태 변수
let masterData = null;          // 통합 데이터 객체 (JSON 파일 기반)
let lastActiveWin = null;       // 메인 프로세스에서 받은 활성 창 정보

// 상태 플래그
let isActuallyWorking = false;  // 작업 도구 매칭 여부
let isDistraction = false;      // 딴짓 도구 매칭 여부
let isIdle = false;             // 부재 중 상태
let lastIdleState = false;      // [추가] 직전 유휴 상태 기억용
let awayStartTime = null;       // [추가] 부재 시작 시간 기록용
let currentStatus = "good";     // [추가] 현재 상태를 저장하여 클릭 시 사용

// 파트너 및 연출 상태
let currentPartner = null;
let currentStage = '';
let lastLoadedId = null;        // 마지막으로 로드된 캐릭터의 ID
window.isHatching = false;      // [추가] 현재 부화 연출이 진행 중인지 체크

/* ============================================================
   [5] 변수 선언: 데이터 컬렉션 (Maps & Arrays)
   ============================================================ */
let workApps = [];
let distractionApps = [];
let molipTodos = [];
let molipHabits = [];
let shopItems = [];

// 맵 데이터
let charIntimacyMap = {};
let charGrowthMap = {};
let dailyAppTimeMap = {};
let givenGiftsMap = {};
let dailyGiftCountMap = {};
let dailyPetCountMap = {};      // [추가] 날짜별 클릭 횟수 기록용

/* ============================================================
   [6] 변수 선언: UI 및 시스템 설정
   ============================================================ */
// 시스템 설정
window.isHorizontalMode = true;
window.isWindowMode = true;
window.isAlwaysOnTop = true;
window.hideCompleted = false;
window.showPastCompleted = false;
window.autoDeleteOldTasks = false;
window.resetHour = 0;           // 기본값 자정

// UI 관련 변수
let logViewDate = new Date();   // 로그 뷰어용 날짜
let displayedPoints = 0; 
let isPointAnimating = false;   // 애니메이션 중복 실행 방지용
let mailDisplayLimit = 10;      // 초기 노출 개수

/* ============================================================
   [7] 변수 선언: 상호작용 및 상수
   ============================================================ */
const PET_COOLDOWN = 300;      
const EVOLUTION_TARGET_MIN = 300;
let lastPetTime = 0;            

// 대사 시스템 제어
let dialogueTimeout = null;     // [추가] 대사 사라짐 제어용 변수
let currentPriority = 0;        // 현재 출력 중인 대사의 우선순위
let dialogueLockUntil = 0;      // 이 시간(ms)까지는 낮은 우선순위 대사 무시
let lastDialogue = "";          // [추가] 중복 대사 방지용 기록

/* ============================================================
   [8] 전역 객체 연결 (Window Binding)
   ============================================================ */
// 데이터 및 클래스 노출
window.masterData = masterData;
window.charData = charData;
window.CharacterRenderer = CharacterRenderer; 
window.shopItems = shopItems;

// 매니저 노출
window.renderer = renderer;     // [추가] 전역 인스턴스 연결
window.charRenderer = renderer; // [추가] 호환성을 위해 하나 더 연결

// 데이터 배열 노출
window.molipTodos = molipTodos;
window.molipHabits = molipHabits;

window.isActuallyWorking = isActuallyWorking;
window.isDistraction = isDistraction;
window.isIdle = isIdle;

/* ============================================================
   [9] 실행형 임포트 (Side Effects)
   ============================================================ */
// 파일 로드 (변수에 담지 않고 실행만 하여 중복 선언 방지)
require('./src/introManager.js');

/* ============================================================
   [10] 핵심 함수: 데이터 동기화 (syncReferences)
   ============================================================ */
/**
 * [핵심] 전역 변수와 마스터 데이터(JSON)의 참조를 동기화합니다.
 * 데이터 로드 직후 반드시 호출되어야 합니다.
 */
function syncReferences() {
    if (!masterData) return;

    // 1. 설정 객체 및 내부 배열 초기화 (undefined 방지)
    if (!masterData.settings) masterData.settings = {};
    
    // 배열이 없으면 빈 배열로 생성하여 연결
    masterData.settings.workApps = masterData.settings.workApps || [];
    masterData.settings.distractionApps = masterData.settings.distractionApps || [];
    masterData.todo = masterData.todo || [];
    masterData.habit = masterData.habit || [];

    // 2. 전역 변수에 참조(Reference) 할당
    // 이렇게 해야 전역 변수(workApps)를 수정했을 때 masterData도 같이 수정됩니다.
    workApps = masterData.settings.workApps;
    distractionApps = masterData.settings.distractionApps;
    molipTodos = masterData.todo;
    molipHabits = masterData.habit;
    
    // 3. 윈도우 객체에도 노출 (디버깅 및 외부 접근용)
    window.workApps = workApps;
    window.distractionApps = distractionApps;
    window.molipTodos = molipTodos;
    window.molipHabits = molipHabits;

    // 4. 설정값 동기화 (Boolean 값 강제 변환)
    window.hideCompleted = !!masterData.settings.hideCompleted;
    window.showPastCompleted = !!masterData.settings.showPastCompleted;
    window.autoDeleteOldTasks = !!masterData.settings.autoDeleteOldTasks;
    window.resetHour = masterData.settings.resetHour || 0;
    window.isHorizontalMode = masterData.settings.isHorizontalMode ?? true;

    // 5. 캐릭터 데이터 맵 동기화
    if (!masterData.character) masterData.character = {};
    const c = masterData.character;
    
    c.intimacyMap = c.intimacyMap || {};
    c.growthMap = c.growthMap || {};
    c.givenGiftsMap = c.givenGiftsMap || {};
    c.dailyPetCountMap = c.dailyPetCountMap || {};
    c.dailyGiftCountMap = c.dailyGiftCountMap || {};

    charIntimacyMap = c.intimacyMap;
    charGrowthMap = c.growthMap;
    givenGiftsMap = c.givenGiftsMap;
    dailyPetCountMap = c.dailyPetCountMap;
    dailyGiftCountMap = c.dailyGiftCountMap;

    masterData.dailyAppTimeMap = masterData.dailyAppTimeMap || {};
    dailyAppTimeMap = masterData.dailyAppTimeMap;
    window.dailyAppTimeMap = dailyAppTimeMap;
    
    console.log("✅ [System] 데이터 참조 동기화 완료 (목록 연결됨)");
}

/* ============================================================
   [11] 데이터 정의 함수
   ============================================================ */
/**
 * [renderer.js] 상점 아이템 데이터 (아이콘 이미지화 버전)
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
        category: "material",
        name: window.t('game.items.old_parchment_name'),
        icon: "assets/images/items/old_parchment.png",
        price: 5,
        desc: window.t('game.items.old_parchment_desc')
    },
    {
        id: "music_seashell",
        category: "special", // 상점 탭 필터에 걸리지 않음
        name: "음악이 나오는 소라고둥",
        icon: "assets/images/items/music_seashell.png",
        price: 0, // 판매용이 아니므로 0
        desc: "소리의 요정이 선물한 신비한 고둥입니다. 귀를 기울이면 다채로운 선율이 들려옵니다."
    }
];

/* ============================================================
   [12] 헬퍼 및 엔진 시작 함수
   ============================================================ */
window.playSFX = (key) => {
    if (soundManager) {
        soundManager.playSFX(key);
    }
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


/* ============================================================
   [🎨 캐릭터 렌더링 및 연출 시스템]
   ============================================================ */

/**
 * 1. 캐릭터 스프라이트/배경/표정 갱신 (핵심 함수)
 */
async function refreshCharacterSprite() {
    const r = window.renderer; 
    if (!currentPartner || !r) return;

    // 1. 배경 적용
    const gameView = document.getElementById('game-view');
    if (gameView && currentPartner.background) {
        gameView.style.backgroundImage = `url('${currentPartner.background}')`;
    }
    
    // 2. 성장 단계 계산
    const totalSec = charGrowthMap[currentPartner.id] || 0;
    const newStage = (totalSec / 60) >= (currentPartner.evolution_level || EVOLUTION_TARGET_MIN) ? 'adult' : 'child';

    // 3. 알 상태 특수 처리
    if (collection.activeEgg && collection.activeEgg.type === currentPartner.id) {
        currentStage = 'egg';
        await r.loadCharacter(currentPartner.stages.egg);
        if (r.draw) r.draw();
        return;
    }

    // 4. 이미지 로드 및 초기 표정 설정
    if (currentStage !== newStage || lastLoadedId !== currentPartner.id) {
        currentStage = newStage;
        lastLoadedId = currentPartner.id;
        const stageData = currentPartner.stages[currentStage];
        
        if (stageData.expressions) {
            await r.loadExpressions(stageData.expressions);
            r.setExpression('good'); // ★ 로드 후 즉시 첫 표정 그리기
        } else {
            await r.loadCharacter(stageData);
        }
        
        if (r.draw) r.draw(); // 강제 출력
        window.lastCharacterState = null; 
    }
}

/**
 * 2. 캐릭터 쓰다듬기 (일일 한도 + 하트 효과 + 표정 변화)
 */
window.petCharacter = (event) => {
    if (!currentPartner) return;
    const now = Date.now();
    if (now - lastPetTime < PET_COOLDOWN) return;
    lastPetTime = now;

    // 날짜별 키 생성
    const dateKey = window.getMolipDate(); 
    const petKey = `${currentPartner.id}_${dateKey}`; 
    
    // 초기화
    if (!dailyPetCountMap[petKey]) dailyPetCountMap[petKey] = 0;

    // 한도(10회) 및 알 상태 체크
    if (!collection.activeEgg && dailyPetCountMap[petKey] < 10) {
        // 호감도 상승
        charIntimacyMap[currentPartner.id] = Math.min(100, (charIntimacyMap[currentPartner.id] || 0) + 0.5);
        dailyPetCountMap[petKey]++;
        
        // 시각 효과
        createHeartEffect(event.clientX, event.clientY);

        // 표정 변화 (3초간 기쁨)
        renderer.setExpression('good');
        setTimeout(() => {
            const backTo = isDistraction ? 'distracting' : (isIdle ? 'away' : 'working');
            renderer.setExpression(backTo);
        }, 3000);

        // 한도 도달 알림
        if (dailyPetCountMap[petKey] === 10) {
            window.showToast(`${currentPartner.name}은(는) 오늘은 충분히 애정을 느낀 것 같습니다.`, "info");
        }
    } 
    
    window.showDialogue(); // 대사 출력
    saveAllData();         // 저장
    window.updateUI();     // UI 갱신
};

/**
 * 3. 하트 파티클 생성 헬퍼
 */
function createHeartEffect(x, y) {
    const layer = document.getElementById('effect-layer');
    if (!layer) return;
    const heart = document.createElement('i');
    heart.className = 'fas fa-heart floating-heart';
    const rect = document.getElementById('main-canvas').getBoundingClientRect();
    heart.style.left = `${x - rect.left}px`;
    heart.style.top = `${y - rect.top}px`;
    layer.appendChild(heart);
    setTimeout(() => heart.remove(), 800);
}

/**
 * 4. 진화 조건 감시 (updateLoop에서 호출)
 */
function checkEvolution() {
    // 1. 파트너가 없거나, 이미 성체이거나, 부화/진화 연출 중이면 중단
    if (!currentPartner || currentStage !== 'child' || window.isHatching) return;

    // 2. 현재 캐릭터의 누적 성장 시간(초) 계산
    const totalSec = charGrowthMap[currentPartner.id] || 0;
    const growthMin = totalSec / 60;
    const targetMin = currentPartner.evolution_level || EVOLUTION_TARGET_MIN;

    // 3. 진화 조건 달성 시 performEvolution 실행
    if (growthMin >= targetMin) {
        console.log(`✨ ${currentPartner.name} 진화 조건 달성!`);
        if (window.performEvolution) {
            window.performEvolution(currentPartner);
        }
    }
}

/**
 * 5. 성체 진화 연출 실행
 */
window.performEvolution = async (character) => {
    const container = document.getElementById('character-container');
    const flash = document.getElementById('hatch-flash');
    if (!container || window.isHatching) return; // 이미 연출 중이면 중복 방지

    window.isHatching = true; // 연출 중 잠금

    // 1. 진화 연출 시작 (진동 및 로직)
    container.classList.add('evolving-act');
    window.showDialogue("앗...!", 2); 

    await new Promise(resolve => setTimeout(resolve, 2500));

    // 2. 섬광 효과 실행
    if (flash) {
        flash.style.display = 'block';
        flash.classList.add('flash-trigger');
        setTimeout(() => { 
            flash.style.display = 'none';
            flash.classList.remove('flash-trigger');
        }, 600);
    }

    // 3. 이미지 및 단계 강제 갱신
    await refreshCharacterSprite();

    // 4. 연출 종료 및 클래스 정리
    container.classList.remove('evolving-act');
    container.classList.add('evolved-new');
    
    // 5. 진화 대사 출력
    const evoText = character.stages.child.evolution_text || "저, 조금 더 어른이 된 것 같아요!";
    window.showDialogue(evoText, 2);

    setTimeout(() => { 
        container.classList.remove('evolved-new');
        window.isHatching = false; 
    }, 2000);

    saveAllData(); // 진화 결과 즉시 저장
};

/**
 * 6. 알 부화 연출 엔진 (Egg -> Child)
 */
window.performHatchSequence = async function(type) {
    if (window.isHatching) return; // 실행 시점에 잠금
    window.isHatching = true;

    const mainCanvas = document.getElementById('main-canvas');
    if (mainCanvas) mainCanvas.classList.remove('egg-anim-active');

    // 1. 시각 연출: 화이트 플래시 실행
    const hatchFlash = document.getElementById('hatch-flash');
    if (hatchFlash) {
        hatchFlash.style.display = 'block';
        hatchFlash.classList.add('flash-trigger');
    }

    // 2. 데이터 전환 (알 제거 및 보유 캐릭터 추가)
    if (collection) {
        if (!collection.ownedIds.includes(type)) {
            collection.ownedIds.push(type);
        }
        collection.activeEgg = null;
    }

    // 3. 마스터 데이터 동기화
    if (masterData) {
        masterData.collection = collection.getSaveData();
        if (!masterData.character) masterData.character = {};
        masterData.character.selectedPartnerId = type;
    }

    // 4. 연출 대기 및 UI 전환
    setTimeout(async () => {
        const targetChar = charData.characters.find(c => c.id === type);
        currentPartner = targetChar; 
        
        // 스프라이트 갱신 (알 이미지가 제거되고 유아기 이미지가 로드됨)
        await refreshCharacterSprite();

        if (hatchFlash) {
            hatchFlash.style.display = 'none';
            hatchFlash.classList.remove('flash-trigger');
        }

        // 도감 UI 갱신
        window.renderCollection(); 

        window.showToast("부화 성공! 새로운 인연이 시작되었습니다.", "success");
        window.updateUI();

        // 부화 성공 후 첫 인사 대사 출력 및 저장
        setTimeout(() => {
            window.isHatching = false; 
            saveAllData(); 
        }, 1000);

    }, 800);
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
 * 2. 도감 모달 토글
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

    // 성장 데이터 계산 (시간 환산)
    const totalSec = charGrowthMap[char.id] || 0; 
    const growthMin = totalSec / 60; 
    const targetMin = char.evolution_level || EVOLUTION_TARGET_MIN; // 기준값 (분)
    
    const compHours = Math.floor(totalSec / 3600);
    const compMins = Math.floor((totalSec % 3600) / 60);
    const compSecs = totalSec % 60;

    const stage = growthMin >= targetMin ? 'adult' : 'child';
    const percent = Math.min(100, (growthMin / targetMin) * 100);

    // UI 정보 반영
    document.getElementById('detail-char-name').innerText = isActiveEgg ? "부화 중인 알" : char.name;
    document.getElementById('detail-char-stage').innerText = isActiveEgg ? "알 (부화 대기)" : (stage === 'child' ? "유아기" : "성체기");

    let spriteSrc = "";
    if (isActiveEgg) {
        spriteSrc = char.stages.egg.sprite;
    } else {
        const stageData = char.stages[stage] || char.stages['adult'];
        spriteSrc = (stageData.expressions && stageData.expressions.good) 
                    ? stageData.expressions.good.sprite 
                    : (stageData.sprite || "");
    }
    const detailImg = document.getElementById('detail-char-img');
    if (detailImg) detailImg.src = spriteSrc;

    // [함께한 시간] 상세 표시
    const companionshipEl = document.getElementById('detail-total-companionship');
    if (companionshipEl) {
        companionshipEl.innerText = `${compHours}시간 ${compMins}분 ${compSecs}초`;
    }

    // [성장 진행도]
    const growthBar = document.getElementById('detail-growth-bar');
    const growthText = document.getElementById('detail-growth-text');
    if (growthBar) growthBar.style.width = `${percent}%`;
    if (growthText) {
        growthText.innerText = `${percent.toFixed(1)}%`;
    }

    // [선호도 리스트] 해금 여부 체크 렌더러
    const renderPrefItems = (container, items) => {
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#666; padding-left:5px;">(정보 없음)</span>';
            return;
        }
        container.innerHTML = items.map(itemName => {
            const isUnlocked = givenGiftsMap[char.id]?.includes(itemName);
            const itemInfo = shopItems.find(i => i.name === itemName);
            
            // 아이콘 시각화 (이미지 태그 사용)
            let iconContent = '<i class="fas fa-question"></i>';
            if (isUnlocked) {
                if (itemInfo && itemInfo.icon) {
                    iconContent = `<img src="${itemInfo.icon}" class="pref-item-img" onerror="this.src='assets/images/items/default.png'">`;
                } else {
                    iconContent = '<i class="fas fa-box"></i>';
                }
            }

            const displayName = isUnlocked ? itemName : "???";
            return `
                <div class="pref-item ${isUnlocked ? '' : 'locked'}" data-tooltip="${isUnlocked ? '' : '선물을 주어 정보를 해금하세요'}">
                    <div class="pref-item-icon-wrapper">${iconContent}</div>
                    <span class="pref-item-name">${displayName}</span>
                </div>`;
        }).join('');
    };

    const favListContainer = document.getElementById('list-favorite');
    const disListContainer = document.getElementById('list-dislike');
    renderPrefItems(favListContainer, char.preferences.favorite);
    renderPrefItems(disListContainer, char.preferences.dislike);

    document.getElementById('detail-char-desc').innerText = isActiveEgg ? "당신의 몰입을 기다리고 있는 알입니다." : (char.description || "");
    
    // 파트너 선택 버튼 로직
    const selectBtn = document.getElementById('detail-select-btn');
    if (currentPartner && currentPartner.id === char.id) {
        selectBtn.style.display = 'none'; 
    } else {
        selectBtn.style.display = 'block';
        selectBtn.innerText = isActiveEgg ? "다시 알 품기" : "파트너로 선택하기";
        selectBtn.onclick = async () => {
            currentPartner = char;
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
   [📨 편지함(Mailbox) UI 제어]
   ============================================================ */

/**
 * 1. 알림 뱃지 및 툴팁 업데이트
 */
window.updateMailNotification = () => {
    const badge = document.getElementById('mail-badge');
    // 뱃지가 들어있는 실제 버튼 클래스인 .btn-game으로 수정
    const mailBtn = badge?.closest('.btn-game'); 
    
    if (!badge || !window.mailbox) return;

    const unreadCount = window.mailbox.getUnreadCount();
    
    if (unreadCount > 0) {
        badge.innerText = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = 'flex'; // 0보다 크면 무조건 표시
        
        // 버튼 툴팁 업데이트
        if (mailBtn) mailBtn.setAttribute('data-tooltip', `서신함 (안 읽은 서신 ${unreadCount})`);
    } else {
        badge.style.display = 'none'; // 0이면 무조건 숨김
        if (mailBtn) mailBtn.setAttribute('data-tooltip', '서신함');
    }
};

/**
 * 2. 편지함 목록 렌더링 (매니저 데이터 기반)
 */
window.renderMailList = () => {
    const list = document.getElementById('mail-list');
    if (!list || !mailbox) return;

    // 전체 수신 메일 중 limit만큼만 자릅니다.
    const allMails = mailbox.receivedMails;
    const displayMails = allMails.slice(0, mailDisplayLimit);

    if (allMails.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:40px; color:rgba(255,255,255,0.2);">아직 도착한 서신이 없습니다.</div>';
        return;
    }

    // 목록 생성
    let html = displayMails.map(mail => `
        <div class="mail-item ${mail.isRead ? '' : 'unread'}" onclick="window.openLetter('${mail.id}')">
            <div class="mail-icon"><i class="fas ${mail.isRead ? 'fa-envelope-open' : 'fa-envelope'}"></i></div>
            <div class="mail-info">
                <div class="mail-title">${mail.title}</div>
                <div class="mail-sender">${mail.sender}</div>
            </div>
            <div class="mail-date">${new Date(mail.receivedDate).toLocaleDateString()}</div>
        </div>
    `).join('');

    // ★ 더 불러올 메일이 남았다면 하단에 로딩 표시 추가
    if (allMails.length > mailDisplayLimit) {
        html += `<div id="mail-load-more" class="mail-load-more">남은 기록을 불러오는 중...</div>`;
    }

    list.innerHTML = html;
};

/**
 * 3. 편지함 모달 열기 (초기화 및 스크롤 이벤트)
 */
window.toggleMailbox = (show) => {
    const modal = document.getElementById('mailbox-modal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        if (show) {
            mailDisplayLimit = 10; // ★ 열 때마다 다시 10개로 초기화
            window.renderMailList();
            
            // 스크롤 이벤트 리스너 등록 (바닥 감지)
            const listContainer = document.getElementById('mail-list');
            listContainer.onscroll = () => {
                // 바닥 근처(20px 전)에 도달했는지 확인
                if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 20) {
                    window.loadMoreMails();
                }
            };
        }
    }
};

/**
 * 4. 메일 추가 로드 (무한 스크롤)
 */
window.loadMoreMails = () => {
    const allCount = mailbox.receivedMails.length;
    
    // 이미 다 불러왔다면 중단
    if (mailDisplayLimit >= allCount) return;

    // 10개 더 추가하고 다시 렌더링
    mailDisplayLimit += 10;
    window.renderMailList();
};


// [복구] 캐릭터 대사 출력 시스템
let typingInterval = null;

// [최종 수정] 모든 디테일(타이핑, 호감도 분기)을 유지하며 대사 길이에 따라 시간을 조절합니다.
/**
 * [renderer.js] 대사 출력 엔진 (우선순위 제어 포함)
 * @param {string} overrideText - 출력할 텍스트 (없으면 상황에 맞는 랜덤 대사 선택)
 * @param {number} priority - 0: 자동발화, 1: 클릭, 2: 시스템(집중시작/딴짓)
 */
window.showDialogue = function(overrideText, priority = 1) {
    if (!currentPartner) return;

    const isPanelOpen = document.querySelector('.player-panel.active');
    // 패널이 열려있다면 대사를 출력하지 않고 즉시 종료합니다.
    if (isPanelOpen) {
        return;
    }

    const now = Date.now();
    // 1. [우선순위 체크] 현재 더 중요한 대사가 출력 중이면 무시
    if (priority < currentPriority && now < dialogueLockUntil) return;

    let fullText = overrideText;
    
    // 2. [대사 결정 및 중복 방지] 직접 전달된 텍스트가 없을 때만 랜덤 추출
    if (!fullText) {
        // 현재 상태(집중/딴짓/대기)에 맞는 카테고리 선정
        const isFocusing = isActuallyWorking && !isIdle; 
        const category = isFocusing ? 'work' : (isDistraction ? 'distract' : 'idle');
        
        const list = window.getDialoguesFromJSON(category);
        
        // ★ [복구] 리스트가 2개 이상일 때 이전 대사(lastDialogue)와 겹치지 않게 필터링
        const available = list.length > 1 ? list.filter(d => d !== lastDialogue) : list;
        fullText = available[Math.floor(Math.random() * available.length)] || "...";
        
        // 현재 선택된 대사를 기록하여 다음 번 중복 방지
        lastDialogue = fullText;
    }

    // 3. 우선순위 상태 업데이트 및 잠금 설정
    currentPriority = priority;
    dialogueLockUntil = now + (priority >= 2 ? 3000 : 1000); 

    const textEl = document.getElementById('dialogue-text');
    const bubble = document.getElementById('dialogue-bubble');
    if (!textEl || !bubble) return;

    // 4. 타이핑 효과 연출 (기존 로직 유지)
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

    // 대사 노출 시간 계산 및 종료 예약
    const displayDuration = Math.max(3000, 2500 + (fullText.length * 100));

    dialogueTimeout = setTimeout(() => {
        bubble.classList.remove('active');
        setTimeout(() => { 
            bubble.style.display = 'none';
            currentPriority = 0; // 대사가 완전히 사라지면 우선순위 리셋
        }, 300);
    }, displayDuration);
};

/**
 * [renderer.js]
 * 캐릭터 대사를 랜덤으로 출력하며, 카테고리에 따라 우선순위를 다르게 부여합니다.
 */
window.showRandomDialogue = function(category) {
    if (!currentPartner || window.isHatching) return;

    const charInfo = charData.characters.find(c => c.id === currentPartner.id);
    if (!charInfo) return;

    const stageData = charInfo.stages[currentStage];
    if (!stageData) return;

    let targetList = [];
    // 기본 우선순위는 1 (상태 대사)
    let priority = 1;

    // 1. 환영/복귀 대사일 경우 우선순위를 2로 높입니다.
    if (category === 'return' || category === 'welcome') {
        priority = 2;
        if (category === 'return') {
            targetList = stageData.return_responses || ["다시 오셨네요!", "기다리고 있었어요."];
        } else {
            targetList = stageData.welcome_responses || ["어서 오세요, 연금술사님.", "오늘 연구도 힘내봐요!"];
        }
    }

    // 2. 일반 상태 대사 로드
    if (targetList.length === 0 && stageData.dialogues) {
        const dialogueCategory = stageData.dialogues[category === 'work' ? 'work' : (category === 'distract' ? 'distract' : 'idle')];
        
        if (Array.isArray(dialogueCategory)) {
            targetList = dialogueCategory;
        } else if (dialogueCategory) {
            const intimacy = charIntimacyMap[currentPartner.id] || 0;
            const subKey = intimacy >= 90 ? 'max' : (intimacy >= 55 ? 'high' : 'low');
            targetList = dialogueCategory[subKey] || dialogueCategory['high'] || [];
        }
    }

    // 3. 중복 방지 필터링 후 지정된 우선순위로 출력
    if (targetList.length > 0) {
        const available = targetList.length > 1 
            ? targetList.filter(t => t !== lastDialogue) 
            : targetList;

        const selected = available[Math.floor(Math.random() * available.length)];
        lastDialogue = selected; 
        
        // 중요: 계산된 priority를 전달합니다.
        window.showDialogue(selected, priority);
    }
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
    
    // ✨ [긴급 복구] 툴팁 및 마우스 추적 변수 선언
    let tooltipTimeout = null;
    let mouseX = 0;
    let mouseY = 0;
    const TOOLTIP_DELAY = 250; // 0.25초 대기

    // 1. 오디오 잠금 해제 리스너 (SoundManager 사용)
    // const unlockAudioHandler = () => {
    //     if (soundManager) {
    //         soundManager.unlockAll();
    //     }
    //     document.removeEventListener('click', unlockAudioHandler); 
    // };
    // document.addEventListener('click', unlockAudioHandler);

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

    // 4. 캐릭터 클릭 이벤트
    const canvas = document.getElementById('main-canvas');
    if (canvas) canvas.addEventListener('click', (e) => window.petCharacter(e));

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
        // 1. 종료 전 현재 상태(시간, 호감도, 에테르 등)를 최후로 저장
        await saveAllData(); 
        console.log("종료 전 데이터 저장 완료");
        
        // 2. [수정] quit-app 대신 main.js의 종료 플래그를 해제하는 final-save-done 신호 전송
        // 이 신호를 받으면 main.js에서 isQuitting = true를 설정하고 안전하게 종료합니다.
        ipcRenderer.send('final-save-done'); 
        
    } catch (err) {
        console.error("종료 중 저장 실패:", err);
        // 저장이 실패하더라도 앱은 꺼져야 하므로 강제 종료 신호를 보냅니다.
        ipcRenderer.send('quit-app'); 
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
window.toggleSettings = (show) => {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.style.display = show ? 'flex' : 'none';
    
    if (show) {
        const s = masterData.settings || {};

        // 1. 일반 설정 동기화 (언어, 폰트, 테마)
        const langSelect = document.getElementById('language-select');
        if (langSelect) langSelect.value = s.language || 'ko';

        const currentFont = s.font || 'paperlogy';
        const fontRadio = document.querySelector(`input[name="font-choice"][value="${currentFont}"]`);
        if (fontRadio) fontRadio.checked = true;

        const currentTheme = s.currentTheme || 'DEFAULT_DARK'; 
        const themeRadio = document.querySelector(`input[name="theme-choice"][value="${currentTheme}"]`);
        if (themeRadio) themeRadio.checked = true;

        // 2. 레이아웃 모드 버튼 동기화
        const currentMode = s.windowMode || 'horizontal';
        const btnGroup = document.querySelector('.window-mode-btns');
        if (btnGroup) {
            btnGroup.querySelectorAll('button').forEach(btn => {
                const onClickAttr = btn.getAttribute('onclick') || "";
                const isActive = onClickAttr.includes(`'${currentMode}'`);
                btn.classList.toggle('active', isActive);
            });
        }

        // 3. [할 일 관리] 탭 데이터 동기화 ✨
        const resetSelect = document.getElementById('reset-hour-select');
        if (resetSelect) resetSelect.value = window.resetHour;

        const hideToggle = document.getElementById('hide-completed-toggle');
        if (hideToggle) hideToggle.classList.toggle('active', !!window.hideCompleted);

        const showPastToggle = document.getElementById('show-past-toggle');
        if (showPastToggle) showPastToggle.classList.toggle('active', !!window.showPastCompleted);

        const autoDeleteToggle = document.getElementById('auto-delete-toggle');
        if (autoDeleteToggle) autoDeleteToggle.classList.toggle('active', !!window.autoDeleteOldTasks);

        // 4. 사운드 및 기타 UI 상태 갱신
        window.updateSoundUI();
        window.updatePastItemsUI(); // 배지 상태 등 추가 갱신

        // 기본 탭으로 시작 (필요 시 'monitor'나 'general'로 변경 가능)
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
    
    // 폰트 적용
    if (fontName === 'Pretendard') {
        root.style.setProperty('--main-font', "'Pretendard', sans-serif");
    } else if (fontName === 'Galmuri11') {
        root.style.setProperty('--main-font', "'Galmuri11', sans-serif");
    } else {
        root.style.setProperty('--main-font', "'Paperlogy', sans-serif");
    }

    // 설정 객체 업데이트
    if (window.masterData && window.masterData.settings) {
        window.masterData.settings.font = fontName;
        
        // [수정] needSave가 true일 때만 파일에 저장합니다. (부팅 시 과부하 방지)
        if (needSave) {
            saveAllData(); 
            console.log(`[설정] 폰트 변경 및 저장 완료: ${fontName}`);
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
   [🛒 상점 시스템: 데이터-UI 완전 동기화] 
   ============================================================ */

/* ============================================================
   [🛒 상점 시스템 (Shop) 통합 버전] 
   ============================================================ */
window.currentShopCategory = 'gift'; // 현재 상점 탭 상태 기억

/**
 * 1. 상점 열기
 */
window.openShop = () => {
    const modal = document.getElementById('shop-modal');
    if (modal) {
        modal.style.display = 'flex';
        // 상점 열 때 에테르 표시 갱신 (매니저 객체 기준)
        if (window.collection) {
            const etherEl = document.getElementById('shop-ether-count');
            if (etherEl) etherEl.innerText = window.collection.points.toLocaleString();
        }
        // 마지막으로 보던 카테고리로 리스트 렌더링
        window.renderShopItems(window.currentShopCategory);
    }
};

/**
 * 2. 상점 닫기
 */
window.closeShop = () => {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'none';
};

/**
 * 3. 탭 전환 (버튼 활성화 + 카테고리 변경)
 */
window.switchShopTab = (category, btnElement) => {
    window.currentShopCategory = category;
    document.querySelectorAll('.shop-tab-re').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    window.renderShopItems(category);
};

/**
 * 4. 아이템 리스트 렌더링 (필터링 및 UI 구성)
 */
window.renderShopItems = (category) => {
    const grid = document.getElementById('shop-grid'); 
    if (!grid) return;
    grid.innerHTML = ""; 

    // 상단 보유 에테르 UI 동기화
    const shopEther = document.getElementById('shop-ether-count');
    if (shopEther && window.collection) {
        shopEther.innerText = window.collection.points.toLocaleString();
    }

    // [특수 처리] 연구 재료 탭은 아직 준비 중인 경우
    if (category === 'material') {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: rgba(255,255,255,0.4);">
                <i class="fa-solid fa-hammer" style="font-size: 3rem; margin-bottom: 20px; display: block; opacity: 0.3;"></i>
                <div style="font-size: 1.1rem;">연구 재료 준비 중</div>
                <div style="font-size: 0.75rem; margin-top: 10px; opacity: 0.6;">새로운 재료들을 가공하고 있습니다.<br>다음 업데이트를 기대해 주세요.</div>
            </div>`;
        return; 
    }

    // 아이템 데이터 필터링
    const items = (window.shopItems && window.shopItems.length > 0) ? window.shopItems : window.getShopItems();
    const filtered = items.filter(item => item.category === category);

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.2);">판매 중인 물품이 없습니다.</div>`;
        return;
    }
    
    // 아이템 카드 생성
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card-glass';
        card.setAttribute('data-tooltip', item.desc);

        // 구매 가능 여부 체크 (Manager 기준)
        const canAfford = (window.collection) ? window.collection.points >= item.price : false;

        card.innerHTML = `
            <div class="shop-card-icon">
                <img src="${item.icon}" class="shop-img-icon" onerror="this.src='assets/images/items/default.png'">
            </div>
            <div class="shop-card-name">${item.name}</div>
            <div class="shop-card-price">${item.price.toLocaleString()} Et</div>
            <button class="btn-buy-glass" 
                ${canAfford ? '' : 'disabled'} 
                onclick="window.buyItem('${item.id}', ${item.price})">
                ${canAfford ? '구매하기' : '잔액 부족'}
            </button>
        `;
        grid.appendChild(card);
    });
};

/**
 * 5. 아이템 구매 처리 (데이터 저장 및 UI 갱신)
 */
window.buyItem = (itemId, price) => {
    if (!window.collection || window.collection.points < price) {
        window.showToast("에테르가 부족합니다.", "error");
        return;
    }

    // 에테르 차감 및 데이터 동기화
    window.collection.points -= price;
    if (masterData.collection) masterData.collection.points = window.collection.points;
    
    // 인벤토리에 추가
    if (!masterData.inventory.items) masterData.inventory.items = {};
    masterData.inventory.items[itemId] = (masterData.inventory.items[itemId] || 0) + 1;

    // 저장 및 전체 UI 갱신
    saveAllData();
    window.updateUI();
    window.renderShopItems(window.currentShopCategory);

    const item = window.getShopItems().find(i => i.id === itemId);
    window.showToast(`${item?.name || '아이템'} 구매 완료!`, "success");
};

/* ============================================================
   [🎒 가방(인벤토리) 시스템 통합 버전] 
   ============================================================ */
window.currentInventoryTab = 'gift'; // 기본 탭 설정

/**
 * 1. 가방 모달 열기
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
        window.renderInventory();
    }
};

/**
 * 2. 가방 닫기
 */
window.closeInventory = () => {
    const modal = document.getElementById('inventory-modal');
    if (modal) modal.style.display = 'none';
};

/**
 * 3. 인벤토리 내 탭 전환
 */
window.switchInventoryTab = (category, btnElement) => {
    window.currentInventoryTab = category;
    const modal = document.getElementById('inventory-modal');
    if (modal) {
        modal.querySelectorAll('.shop-tab-re').forEach(btn => btn.classList.remove('active'));
    }
    if (btnElement) btnElement.classList.add('active');
    window.renderInventory();
};

/**
 * 4. 가방 아이템 리스트 렌더링
 */
window.renderInventory = () => {
    const grid = document.getElementById('inventory-grid');
    const detailArea = document.getElementById('inventory-detail');
    if (!grid) return;

    grid.innerHTML = "";
    // 상세창 초기화
    if (detailArea) detailArea.innerHTML = `<div class="empty-bag-msg">아이템을 선택해 주세요.</div>`;

    const invItems = masterData.inventory?.items || {};
    const invByproducts = masterData.inventory?.byproducts || {};
    
    // 보유 수량이 1개 이상인 모든 아이템 ID 수집
    const allItemIds = [...Object.keys(invItems), ...Object.keys(invByproducts)];
    const uniqueIds = [...new Set(allItemIds)];

    const filteredItems = uniqueIds.filter(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        if (count <= 0) return false;

        // 상점 데이터 혹은 부산물 테이블에서 정보 탐색
        let info = window.getShopItems().find(i => i.id === id) || (typeof byproductTable !== 'undefined' ? byproductTable.find(i => i.id === id) : null);
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
 * 5. 아이템 선택 시 상세 정보 표시 (가독성 개선)
 */
window.selectInventoryItem = (id, info) => {
    document.querySelectorAll('.inventory-slot-glass').forEach(s => s.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    const detailArea = document.getElementById('inventory-detail');
    if (!detailArea) return;

    // 설명문 마침표 뒤 줄바꿈 처리
    const rawDesc = info.desc || info.description || '';
    const formattedDesc = rawDesc.replace(/\. /g, '.\n').replace(/\./g, '.\n');

    // 탭 카테고리에 따른 추가 안내 문구
    let tabDetailDesc = ""; 
    switch (window.currentInventoryTab) {
        case 'gift': tabDetailDesc = "호문클루스에게 마음을 전할 수 있는 소중한 선물입니다."; break;
        case 'material': tabDetailDesc = "연성재료로 분류되어 연성로에서 사용 가능합니다."; break;
        case 'special': tabDetailDesc = "소중한 추억이나 특별한 힘이 깃든 비매품입니다."; break;
        default: tabDetailDesc = "가방에 보관 중인 소중한 물품입니다.";
    }

    const isGift = info.category === 'gift';
    let remainingText = '';
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
 * 6. 아이템 사용 및 선물 로직 (데이터 정합성 보강)
 */
window.useInventoryItem = (id) => {
    if (!currentPartner) {
        window.showToast("선물을 받을 파트너가 없습니다.", "warning");
        return;
    }

    let itemInfo = window.getShopItems().find(i => i.id === id) || byproductTable.find(i => i.id === id);
    if (!itemInfo) return;

    const charId = currentPartner.id;
    const molipToday = window.getMolipDate();

    // 일일 선물 한도 체크
    if (itemInfo.category === 'gift') {
        if (!dailyGiftCountMap[charId]) dailyGiftCountMap[charId] = { date: molipToday, count: 0 };
        if (dailyGiftCountMap[charId].date !== molipToday) {
            dailyGiftCountMap[charId].date = molipToday;
            dailyGiftCountMap[charId].count = 0;
        }
        if (dailyGiftCountMap[charId].count >= 3) {
            window.showToast("오늘은 선물을 충분히 주었습니다.", "error");
            return;
        }
    }

    // 수량 차감
    let itemUsed = false;
    if (masterData.inventory.items?.[id] > 0) {
        masterData.inventory.items[id]--;
        itemUsed = true;
    } else if (masterData.inventory.byproducts?.[id] > 0) {
        masterData.inventory.byproducts[id]--;
        itemUsed = true;
    }

    if (itemUsed) {
        if (itemInfo.category === 'gift') {
            dailyGiftCountMap[charId].count++;
            
            // 해금 정보 업데이트
            if (!givenGiftsMap[charId]) givenGiftsMap[charId] = [];
            if (!givenGiftsMap[charId].includes(itemInfo.name)) givenGiftsMap[charId].push(itemInfo.name);

            // 호감도 계산
            const stageData = currentPartner.stages[currentStage] || currentPartner.stages['adult'];
            const responses = stageData.gift_responses || { normal: "고마워요.", favorite: "정말 기뻐요!", dislike: "으음..." };
            
            let points = 2;
            let responseText = responses.normal;
            if (currentPartner.preferences.favorite.includes(itemInfo.name)) {
                points = 5; responseText = responses.favorite;
            } else if (currentPartner.preferences.dislike.includes(itemInfo.name)) {
                points = 0.5; responseText = responses.dislike;
            }

            charIntimacyMap[charId] = Math.min(100, (charIntimacyMap[charId] || 0) + points);
            window.showDialogue(responseText, 2);
            window.showToast(`${itemInfo.name} 선물 완료!`, "success");
            
            window.updateUI();
            saveAllData(); 
            window.closeInventory(); 
        } else {
            window.showToast(`${itemInfo.name}을(를) 사용했습니다.`, "info");
            window.renderInventory();
            saveAllData();
        }
    } else {
        window.showToast("아이템 수량이 부족합니다.", "error");
    }
};


/**
 * [renderer.js] 현재 상태에 맞는 캐릭터 대사를 출력합니다.
 */
function triggerStatusDialogue(status) {
    const partnerId = masterData.character.selectedPartnerId;
    if (!partnerId) return;

    const charInfo = charData.characters.find(c => c.id === partnerId);
    if (!charInfo) return;

    // 성장 단계 판별
    const growth = masterData.character.growthMap[partnerId] || 0;
    const isAdult = growth >= charInfo.evolution_level;
    const stageKey = isAdult ? "adult" : "child";
    const stageData = charInfo.stages[stageKey];

    if (!stageData || !stageData.dialogues) return;

    // 상태값 매핑 (시스템 status -> JSON 대사 키)
    const statusMap = {
        "working": "work",
        "distracting": "distract",
        "away": "idle",
        "good": "idle"
    };
    const dialogueKey = statusMap[status] || "idle";
    const dialogues = stageData.dialogues[dialogueKey];

    let dialoguePool = [];

    if (Array.isArray(dialogues)) {
        // 어린이(Child) 단계: 단순 배열 구조
        dialoguePool = dialogues;
    } else if (typeof dialogues === 'object') {
        // 성체(Adult) 단계: intimacy(호감도)에 따른 분기 구조
        const intimacy = masterData.character.intimacyMap[partnerId] || 0;
        let subKey = "high";
        if (intimacy >= 80) subKey = "max";
        else if (intimacy <= 30) subKey = "low";
        
        dialoguePool = dialogues[subKey] || [];
    }

    if (dialoguePool.length > 0) {
        const randomText = dialoguePool[Math.floor(Math.random() * dialoguePool.length)];
        window.showDialogue(randomText, 3);
    }
}

/**
 * [renderer.js] 캐릭터 클릭 시 상호작용
 */
window.handleCharacterClick = function () {
    const partnerId = masterData.character.selectedPartnerId;
    if (!partnerId) return;

    // 1. 알 상태 체크
    if (masterData.collection.activeEgg) {
        const eggData = charData.characters.find(c => c.id === masterData.collection.activeEgg.type);
        if (eggData && eggData.stages.egg.evolution_text) {
            window.showDialogue(eggData.stages.egg.evolution_text);
        } else {
            window.showDialogue("따뜻한 온기가 느껴지는 알입니다.");
        }
        return;
    }

    // 2. [추가] 캐릭터 상태인 경우 현재 상태(currentStatus) 기반 대사 출력
    triggerStatusDialogue(currentStatus);
};

/**
 * [renderer.js] 호문클루스에게 선물을 전달하고 호감도 및 해금 정보를 업데이트합니다.
 */
window.giveGift = (charId, itemInfo) => {
    const charInfo = charData.characters.find(c => c.id === charId);
    if (!charInfo) return;

    // 1. 해당 캐릭터의 해금 선물 목록 데이터가 없으면 초기화
    if (!charIntimacyMap[charId]) charIntimacyMap[charId] = 0;
    if (!givenGiftsMap[charId]) givenGiftsMap[charId] = [];

    // 2. [핵심] 해금 목록에 아이템 추가 (중복 방지)
    if (!givenGiftsMap[charId].includes(itemInfo.name)) {
        givenGiftsMap[charId].push(itemInfo.name);
    }

    // 3. 호감도 계산 (좋아함: +10, 보통: +5, 싫어함: -5)
    let increment = 5;
    let prefType = 'normal';

    if (charInfo.preferences.favorite.includes(itemInfo.name)) {
        increment = 10;
        prefType = 'favorite';
    } else if (charInfo.preferences.dislike.includes(itemInfo.name)) {
        increment = -5;
        prefType = 'dislike';
    }

    charIntimacyMap[charId] = Math.min(100, Math.max(0, charIntimacyMap[charId] + increment));
    
    // 4. 캐릭터 대사 출력 및 UI 갱신
    const growth = charGrowthMap[charId] || 0;
    const stageKey = growth >= charInfo.evolution_level ? 'adult' : 'child';
    const stageData = charInfo.stages[stageKey];

    if (stageData && stageData.gift_responses) {
        const response = stageData.gift_responses[prefType] || "고마워요.";
        window.showDialogue(response, 3);
    }

    // 5. 데이터 영구 저장
    saveAllData();
    window.updateUI();
    window.showToast(`${itemInfo.name}을(를) 선물했습니다!`, "success");
};


/* ============================================================
   [⚗️ 연금술 시스템: 농도, 침전물, 연성]
   ============================================================ */

// [상태 변수]
let cylinderSaturation = 0; // 현재 에테르 농도 (0~100)
let lastSedimentTick = Date.now(); // 가챠 체크 주기 관리

// [데이터] 부산물 테이블
const byproductTable = [
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
 * 1. 연성소 모달 열기
 */
window.openSedimentModal = () => {
    const modal = document.getElementById('sediment-modal');
    if (!modal) return;
    
    // UI 업데이트 (현재 농도 및 재료 상황 반영)
    window.refreshSedimentUI(); 
    modal.style.display = 'flex';
};

/**
 * 2. 연성소 모달 닫기
 */
window.closeSedimentModal = () => {
    document.getElementById('sediment-modal').style.display = 'none';
};

/**
 * 3. 연성소 UI 갱신 (농도, 슬롯, 제단)
 */
window.refreshSedimentUI = () => {
    // 1. [방어] masterData나 inventory가 없을 경우를 대비
    if (!masterData.inventory) masterData.inventory = { byproducts: {} };
    const inventory = masterData.inventory.byproducts || {};
    
    // 2. 농도 수치 및 바 반영
    const satValue = Math.floor(cylinderSaturation || 0); 
    const satValEl = document.getElementById('sat-value');
    const satBarEl = document.getElementById('sat-bar-fill');
    if (satValEl) satValEl.innerText = `${satValue}%`;
    if (satBarEl) satBarEl.style.width = `${satValue}%`;
    
    // 3. 인벤토리 슬롯 렌더링
    const grid = document.getElementById('sediment-grid');
    if (grid) {
        grid.innerHTML = byproductTable.map(item => {
            const count = inventory[item.id] || 0;
            const hasItem = count > 0;
            
            return `
                <div class="sediment-slot ${hasItem ? 'has-item' : ''}">
                    <div class="sediment-icon">
                        ${hasItem ? `<img src="${item.icon}" class="sediment-img" alt="${item.name}">` : '<i class="fas fa-question"></i>'}
                    </div>
                    <div class="sediment-name">${hasItem ? item.name : '???'}</div>
                    <div class="sediment-count">${hasItem ? 'x' + count : ''}</div>
                </div>
            `;
        }).join('');
    }

    // 4. 연성 제단 업데이트 (조건 체크)
    if (window.updateAltarStatus) window.updateAltarStatus(); 
};

/**
 * 4. 데이터 초기화 및 보정
 */
function initializeByproductData() {
    if (!masterData.inventory) masterData.inventory = {};
    if (!masterData.inventory.byproducts) {
        masterData.inventory.byproducts = {};
        byproductTable.forEach(item => {
            masterData.inventory.byproducts[item.id] = 0;
        });
    }
    
    // 세이브 데이터에서 농도 불러오기
    if (masterData.cylinderSaturation === undefined) {
        masterData.cylinderSaturation = 0;
    }
    cylinderSaturation = masterData.cylinderSaturation;
}

/**
 * 5. 실린더 시스템 업데이트 (매 초 호출)
 */
window.updateCylinderSystem = () => {
    // 1. 농도 변화 계산
    if (isActuallyWorking && !isIdle) {
        cylinderSaturation = Math.min(100, cylinderSaturation + 0.15);
    } else {
        cylinderSaturation = Math.max(0, cylinderSaturation - 0.07);
    }

    // 세이브 데이터 동기화
    masterData.cylinderSaturation = cylinderSaturation;

    // 2. 실시간 UI 반영
    const satValEl = document.getElementById('sat-value');
    const satBarEl = document.getElementById('sat-bar-fill');
    if (satValEl && satBarEl) {
        satValEl.innerText = `${Math.floor(cylinderSaturation)}%`;
        satBarEl.style.width = `${cylinderSaturation}%`;
    }

    // 3. 침전물 발생 체크 (1분마다)
    const now = Date.now();
    if (now - lastSedimentTick >= 60000) {
        lastSedimentTick = now;
        if (cylinderSaturation >= 50) {
            processSedimentation();
        }
    }
};

/**
 * 6. 침전물 획득 처리 (가챠 성공 시)
 */
window.processSedimentation = () => {
    const item = window.getSedimentDrop(); 
    if (!item) return;

    // 데이터 저장
    if (!masterData.inventory.byproducts) masterData.inventory.byproducts = {};
    masterData.inventory.byproducts[item.id] = (masterData.inventory.byproducts[item.id] || 0) + 1;
    saveAllData();

    // 알림 메시지 구성
    const charName = collection.activeEgg ?
        (currentPartner.egg_name || "알") :
        (currentPartner ? currentPartner.name : "호문클루스");
    const particle = window.getKoreanParticle(charName, "이/가");

    if (window.showToast) {
        window.showToast(`${charName}${particle} 실린더 속에서 '${item.name}'을(를) 건져 올렸습니다!`, "info");
    }

    // UI 갱신
    if (window.refreshSedimentUI) window.refreshSedimentUI();
    if (window.updateAltarStatus) window.updateAltarStatus();
};

/**
 * 7. 침전물 결정 (확률 계산)
 */
window.getSedimentDrop = () => {
    const currentSat = cylinderSaturation;
    const possibleItems = byproductTable.filter(item => currentSat >= item.minSat);
    
    if (possibleItems.length === 0) return null;

    // 희귀도 순 정렬 (낮은 확률부터 검사)
    const sortedPool = [...possibleItems].sort((a, b) => a.chance - b.chance);

    for (const item of sortedPool) {
        if (Math.random() < item.chance) {
            console.log(`[침전 성공] 당첨 아이템: ${item.name} (확률: ${item.chance})`);
            return item;
        }
    }
    return null;
};

/**
 * 8. 한글 조사 처리 헬퍼
 */
window.getKoreanParticle = (word, type) => {
    if (!word) return type;
    const lastChar = word.charCodeAt(word.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return type.split('/')[1];
    const hasBatchim = (lastChar - 0xAC00) % 28 > 0;
    const [withBatchim, withoutBatchim] = type.split('/');
    return hasBatchim ? withBatchim : withoutBatchim;
};


/* ==========================================================
   [🔥 호문클루스 연성: 비용 계산 및 실행]
   ========================================================== */

/**
 * 1. 다음 연성 비용 계산
 */
window.calculateNextEggCost = () => {
    const count = masterData.hatchCount || 1;
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
 * 2. 제단 UI 업데이트 (재료 충족 여부 표시)
 */
window.updateAltarStatus = () => {
    try {
        const cost = window.calculateNextEggCost();
        const inv = masterData.inventory.byproducts || {};
        const recipeContainer = document.querySelector('.recipe-check');
        if (!recipeContainer) return;

        let isReady = true;
        let html = "";

        // 에테르 체크
        const currentEther = (typeof collection !== 'undefined') ? collection.points : (masterData.currency ? masterData.currency.ether : 0);
        const etherMet = currentEther >= cost.ether;
        if (!etherMet) isReady = false;

        html += `
            <div class="req-item ${etherMet ? 'met' : ''}">
                <span class="dot"></span> 에테르: <span class="val">${currentEther.toLocaleString()} / ${cost.ether.toLocaleString()} Et</span>
            </div>
        `;

        // 재료 체크
        for (const [id, amount] of Object.entries(cost.materials)) {
            if (amount <= 0) continue;
            const has = inv[id] || 0;
            const isMet = has >= amount;
            if (!isMet) isReady = false;

            const itemInfo = byproductTable.find(t => t.id === id);
            const itemName = itemInfo ? itemInfo.name : id;

            html += `
                <div class="req-item ${isMet ? 'met' : ''}">
                    <span class="dot"></span> ${itemName}: <span class="val">${has} / ${amount}</span>
                </div>
            `;
        }

        recipeContainer.innerHTML = html;

        // 버튼 상태 갱신
        const btn = document.getElementById('btn-abyss-craft');
        if (btn) {
            btn.className = isReady ? "btn-craft-large ready" : "btn-craft-large disabled";
            btn.innerText = isReady ? "호문클루스 연성하기" : "재료가 부족합니다";
            btn.disabled = !isReady;
        }
    } catch (e) { console.error("UI 업데이트 에러:", e); }
};

/**
 * 3. 연성 시작 (버튼 클릭 핸들러)
 */
window.startAbyssCrafting = () => {
    try {
        const cost = window.calculateNextEggCost();
        const inv = masterData.inventory.byproducts || {};
        
        // 자원 재확인
        const currentEther = (typeof collection !== 'undefined') ? collection.points : (masterData.currency?.ether || 0);
        let hasEnoughMaterials = true;
        for (const [id, amount] of Object.entries(cost.materials)) {
            if ((inv[id] || 0) < amount) { hasEnoughMaterials = false; break; }
        }

        if (currentEther < cost.ether || !hasEnoughMaterials) {
            window.showToast("연성 재료가 부족합니다.", "error");
            return;
        }

        // 캐릭터 풀 확보 (중복 방지)
        const allChars = charData.characters || [];
        const ownedIds = (collection.ownedIds || []).map(id => String(id));
        const activeEggId = collection.activeEgg ? String(collection.activeEgg.type) : null;
        
        const availablePool = allChars.filter(char => 
            !ownedIds.includes(String(char.id)) && String(char.id) !== activeEggId
        );

        if (availablePool.length === 0) {
            window.showToast("연성 가능한 모든 생명을 연성했습니다!", "info");
            return;
        }

        // 캐릭터 추첨
        const nextCharacter = availablePool[Math.floor(Math.random() * availablePool.length)];

        // 자원 차감
        if (typeof collection !== 'undefined') collection.points -= cost.ether;
        for (const [id, amount] of Object.entries(cost.materials)) { inv[id] -= amount; }
        
        // 시스템 상태 전환 (부화 중)
        window.isHatching = true; 
        collection.activeEgg = {
            type: nextCharacter.id,
            progress: 0,
            target: 1800,
            date: new Date().toISOString()
        };

        // 데이터 기록
        masterData.currentCharacterId = nextCharacter.id;
        window.currentPartner = nextCharacter;
        cylinderSaturation = 0;
        masterData.cylinderSaturation = 0;
        masterData.hatchCount = (masterData.hatchCount || 1) + 1;

        saveAllData(); 

        // 연출 실행
        window.closeSedimentModal();
        window.triggerSupernovaEffect(nextCharacter);

    } catch (e) {
        console.error("연성 중 오류 발생:", e);
    }
};

/**
 * 4. 슈퍼노바 연출 (알 등장)
 */
window.triggerSupernovaEffect = (newChar) => {
    let overlay = document.getElementById('supernova-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'supernova-overlay';
        document.body.appendChild(overlay);
    }

    // 1단계: 암전
    overlay.style.background = '#000';
    overlay.style.opacity = '1';
    overlay.classList.add('active');

    setTimeout(async () => {
        // 2단계: 섬광 (화이트아웃)
        overlay.style.background = '#fff';

        try {
            // [배경 및 캐릭터 교체]
            const gameView = document.getElementById('game-view');
            if (gameView && newChar.background) {
                gameView.style.backgroundImage = `url('${newChar.background}')`;
            }

            if (window.renderer && newChar.stages?.egg) {
                await window.renderer.loadCharacter(newChar.stages.egg);
                window.renderer.currentState = "egg";
                window.renderer.currentFrame = 0;
            }

            window.renderCollection();

            // 3단계: 알 등장 연출 UI
            const eggSprite = newChar.stages.egg.sprite;
            overlay.innerHTML = `
                <div class="reveal-container" style="text-align:center;">
                    <div class="new-egg-name" style="color:#000; font-family:'Paperlogy'; font-weight:800; font-size:2.5rem; margin-bottom:20px;">${newChar.name}</div>
                    <img src="${eggSprite}" id="reveal-img" class="new-egg-reveal" style="width:280px; height:280px; object-fit:contain; transition:all 1s ease-out; transform:scale(0.7); opacity:0;">
                    <div class="new-egg-desc" style="color:#444; font-family:'Paperlogy'; margin-top:20px;">새로운 생명의 씨앗이 실린더에 안착했습니다.</div>
                </div>
            `;
            
            const revealImg = document.getElementById('reveal-img');
            setTimeout(() => {
                if (revealImg) {
                    revealImg.style.transform = 'scale(1.1)';
                    revealImg.style.opacity = '1';
                }
            }, 100);

        } catch (err) {
            console.error("교체 시퀀스 오류:", err);
        }

        // 4단계: 종료
        setTimeout(() => {
            overlay.style.opacity = '0';
            window.updateUI(); 

            setTimeout(() => {
                overlay.classList.remove('active');
                overlay.innerHTML = "";
                window.isHatching = false; // 잠금 해제
            }, 2000);
        }, 3500);
    }, 800);
};


// [renderer.js 상단] 업적 리스트 정의
window.achievementList = [
    // 0. 연금술 레벨
    { id: 'rank_novice_1', name: '연금술 입문', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '연금술의 세계에 첫 발을 내디뎠습니다.', hint: '' },
    { id: 'rank_apprentice_5', name: '수습 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '기초 연성법을 익히고 가능성을 증명했습니다.', hint: '' },
    { id: 'rank_regular_10', name: '정식 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '능숙한 도구 사용으로 정식 대원이 되었습니다.', hint: '' },
    { id: 'rank_expert_15', name: '전문 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '고도화된 지식과 실무 능력을 겸비했습니다.', hint: '' },
    { id: 'rank_senior_20', name: '상급 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '길드 내에서 존경받는 상급 연구자의 자리에 올랐습니다.', hint: '' },
    { id: 'rank_veteran_25', name: '노련한 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '수많은 경험을 통해 노련한 통찰력을 갖추었습니다.', hint: '' },
    { id: 'rank_master_30', name: '연금술 명장', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '에테르 연성을 예술의 경지로 끌어올린 명장입니다.', hint: '' },
    { id: 'rank_harmonizer_35', name: '원소의 조율자', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '사대 원소의 균형을 완벽하게 다스리는 조율자입니다.', hint: '' },
    { id: 'rank_guardian_40', name: '지혜의 파수꾼', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '심연의 지식을 수호하고 금기를 다스리는 파수꾼입니다.', hint: '' },
    { id: 'rank_interpreter_45', name: '비전의 해석자', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '고대의 비전과 비밀스러운 공식을 완벽히 해석했습니다.', hint: '' },
    { id: 'rank_truth_50', name: '진리의 도달자', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '인간의 한계를 넘어 진리의 문턱에 도달한 탐구자입니다.', hint: '' },
    { id: 'rank_lord_55', name: '에테르의 군주', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '세상의 모든 에테르 흐름을 지배하는 위대한 군주입니다.', hint: '' },
    { id: 'rank_legend_60', name: '전설의 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '연금술 역사에 영원히 기록될 신화적인 존재가 되었습니다.', hint: '' },

    // 1. 몰입 및 시간 관련 업적
    { id: 'focus_depth_5000', name: '몰입의 심연', icon: 'assets/images/achievements/achievement_task.png', desc: '누적 5,000분의 몰입을 달성하여 심연의 끝에 도달했습니다.', hint: '' },
    { id: 'marathon_king_180', name: '불굴의 집중력', icon: 'assets/images/achievements/achievement_task.png', desc: '한 번의 흐트러짐 없이 180분간 연성로의 불꽃을 지켜냈습니다.', hint: '' },
    { id: 'night_monarch', name: '심야의 수호자', icon: 'assets/images/achievements/achievement_task.png', desc: '모두가 잠든 밤, 고요한 정적 속에서 가장 찬란한 진리를 일깨웠습니다.', hint: '' },
    { id: 'dawn_pioneer', name: '새벽의 선구자', icon: 'assets/images/achievements/achievement_task.png', desc: '가장 맑은 새벽 에테르를 정제하며 완벽한 하루를 시작했습니다.', hint: '' },

    // 2. 과업 및 습관 관련 업적
    { id: 'task_centurion', name: '백 번의 성취', icon: 'assets/images/achievements/achievement_task.png', desc: '백 번의 과업 완수를 통해 연금술의 견고한 토대를 쌓았습니다.', hint: '' },
    { id: 'task_grandmaster', name: '성취의 거장', icon: 'assets/images/achievements/achievement_task.png', desc: '천 번의 마침표를 찍으며 연금술의 거장 반열에 올랐습니다.', hint: '' },
    { id: 'habit_legend_100', name: '백일의 기적', icon: 'assets/images/achievements/achievement_task.png', desc: '100일간의 성실함으로 영혼의 본질을 변화시키는 연금술을 완성했습니다.', hint: '' },
    { id: 'perfect_rhythm_7', name: '완전무결한 리듬', icon: 'assets/images/achievements/achievement_task.png', desc: '일주일간 단 하나의 결점도 없는 완벽한 생활 리듬을 유지했습니다.', hint: '' },

    // 3. 유대 및 캐릭터 관련 업적
    { id: 'mabel_eternal_partner', name: '메이벨의 유일한 이해자', icon: 'assets/images/achievements/mabel_eternal_partner.png', desc: '메이벨과 영혼의 무게를 나누는 절대적인 신뢰 관계가 되었습니다.', hint: '' },
    { id: 'indigo_shadow_bond', name: '인디고의 그림자 동반자', icon: 'assets/images/achievements/indigo_shadow_bond.png', desc: '인디고의 정적 속에 머물며 완벽한 그림자 우대를 공유하게 되었습니다.', hint: '' },
    { id: 'morgana_abyss_lover', name: '모르가나의 진실한 반려', icon: 'assets/images/achievements/morgana_abyss_lover.png', desc: '모르가나와 함께 심연의 끝에서 가장 은밀한 진실을 마주했습니다.', hint: '' },
    { id: 'aurelia_golden_glory', name: '아우렐리아의 황금빛 파트너', icon: 'assets/images/achievements/aurelia_golden_glory.png', desc: '아우렐리아로부터 정점의 가호를 받는 고결한 동반자로 인정받았습니다.', hint: '' },
    { id: 'homunculus_collector', name: '요람의 대주인', icon: 'assets/images/achievements/homunculus_collector.png', desc: '네 마리의 호문클루스를 모두 거느려 연구실의 생태계를 완성했습니다.', hint: '' },
    { id: 'evolution_master', name: '진화의 마스터', icon: 'assets/images/achievements/evolution_master.png', desc: '모든 피조물을 성공적으로 성체기까지 인도한 육성의 대가입니다.', hint: '' },

    // 4. 전문성 및 자산 관련 업적
    { id: 'sage_alchemist_30', name: '대연금술사의 증표', icon: 'assets/images/achievements/sage_alchemist_30.png', desc: '30레벨의 숙련도에 도달하여 연금술의 현자 경지를 증명했습니다.', hint: '' },
    { id: 'midas_hand_10000', name: '황금의 손', icon: 'assets/images/achievements/midas_hand_10000.png', desc: '10,000 에테르를 모아 연구실을 황금빛 풍요로 가득 채웠습니다.', hint: '' },
    { id: 'generous_creator_50', name: '다정한 창조주', icon: 'assets/images/achievements/generous_creator_50.png', desc: '50번의 선물을 통해 피조물들에게 진심 어린 다정함을 전했습니다.', hint: '' },
    { id: 'tool_conductor_7', name: '도구의 지휘자', icon: 'assets/images/achievements/tool_conductor_7.png', desc: '일곱 개의 도구를 자유자재로 다루며 업무의 파도를 지휘합니다.', hint: '' },
    { id: 'iron_will_failed_10', name: '불굴의 의지', icon: 'assets/images/achievements/iron_will_failed_10.png', desc: '열 번의 실패조차 굴복시키지 못한 단단한 연금술사의 의지를 지녔습니다.', hint: '' },
    { id: 'order_avatar_30', name: '절대 질서의 화신', icon: 'assets/images/achievements/order_avatar_30.png', desc: '한 달간의 완벽한 규칙을 통해 혼돈을 이겨내고 절대 질서의 화신이 되었습니다.', hint: '' }
];
/* ============================================================
   [🏆 시스템 통합: 서신, 보상, 업적 관리] 
   ============================================================ */

// 전역 상태 변수 (중복 실행 및 알림 방지)
window.mailTypeTimer = null;
const sessionUnlockedAchievements = new Set();

window.checkAchievementTriggers = () => {
    if (!progress || !masterData || !window.mailbox) return;
    // 여기에 개별 업적 조건 체크 로직 추가 가능
};

/**
 * 1. 서신 상세보기 (발신자 표시 + 타이핑 연출 + [스킵 기능 추가])
 */
window.openLetter = (mailId) => {
    // 1. 매니저 확인
    const mb = window.mailbox || mailbox;
    if (!mb) return;
    
    // 타이머 및 효과음 초기화
    if (window.mailTypeTimer) { 
        clearInterval(window.mailTypeTimer); 
        window.mailTypeTimer = null; 
    }
    window.playSFX('paper');

    // 2. 대상 서신 찾기
    const mail = mb.receivedMails.find(m => String(m.id) === String(mailId));
    if (!mail) return;

    const modal = document.getElementById('letter-view-modal');
    const titleEl = document.getElementById('letter-detail-title');
    const senderEl = document.getElementById('letter-detail-sender');
    const contentEl = document.getElementById('letter-view-content');
    const rewardZone = document.getElementById('letter-reward-zone');

    if (!modal) return;

    // 모달 표시 및 초기화
    modal.style.display = 'flex';
    if (titleEl) titleEl.innerText = mail.title;
    if (senderEl) senderEl.innerText = `${mail.sender || '연금술 길드'}`;
    if (rewardZone) rewardZone.innerHTML = ""; 

    // 문장 부호 뒤 줄바꿈 처리
    const formattedContent = mail.content.replace(/(?<![.!?])([.!?])(?![.!?])\s*/g, '$1\n');

    // 3. 타이핑 도중 모달 클릭 시 스킵 처리 함수
    const handleLetterSkip = () => {
        if (window.mailTypeTimer) {
            clearInterval(window.mailTypeTimer);
            window.mailTypeTimer = null; 
            
            if (contentEl) {
                // 개행 문자를 HTML 줄바꿈 태그로 변환
                contentEl.innerHTML = formattedContent.replace(/\n/g, '<br>');
            }
            window.renderLetterReward(mail);
            modal.removeEventListener('click', handleLetterSkip);
        }
    };

    modal.removeEventListener('click', modal._currentSkipHandler);
    modal._currentSkipHandler = handleLetterSkip;
    modal.addEventListener('click', handleLetterSkip);

    // 읽음 처리
    mail.isRead = true;

    // 4. 본문 타이핑 효과 시작
    if (contentEl) {
        if (window.mailTypeTimer) clearInterval(window.mailTypeTimer);
        
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
 * 2. 타이핑 엔진 (상태 관리 보강)
 */
window.startTypewriter = (text, element, onComplete) => {
    let index = 0;
    element.innerHTML = ""; 

    window.mailTypeTimer = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text[index] === '\n' ? '<br>' : text[index];
            index++;
            element.scrollTop = element.scrollHeight;
        } else {
            // 타이핑 종료
            clearInterval(window.mailTypeTimer);
            window.mailTypeTimer = null; 
            if (onComplete) onComplete(); 
        }
    }, 30);
};

/**
 * 3. 보상 버튼 렌더링
 */
window.renderLetterReward = (mail) => {
    const rewardZone = document.getElementById('letter-reward-zone');
    if (!rewardZone || !mail.reward) return;

    // 이미 수령한 경우
    if (mail.isRewardClaimed) {
        rewardZone.innerHTML = `
            <div class="mail-reward-box claimed" style="text-align: center; margin-top: 20px;">
                <button class="btn-claim-reward" disabled style="opacity: 0.6; cursor: default;">
                    <i class="fa-solid fa-check"></i> 이미 보상을 수령했습니다
                </button>
            </div>`;
        return;
    }

    const type = mail.reward.type;
    const val = mail.reward.value || mail.reward.amount || 0;
    const rewardId = mail.reward.id;
    
    let faIcon = "fa-gift";
    let displayName = "보상";
    let displayVal = "";
    let buttonText = "";

    // 유형별 데이터 매칭
    if (type === 'point' || type === 'ether') {
        faIcon = "fa-coins";
        displayName = "에테르";
        displayVal = `${val.toLocaleString()} Et`;
        buttonText = `${displayVal} 수령하기`;
    } else if (type === 'item') {
        faIcon = "fa-box-open";
        displayName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(rewardId) : "연구 재료";
        displayVal = `${val}개`;
        buttonText = `${displayVal} 수령하기`;
    } else if (type === 'achievement') {
        faIcon = "fa-trophy";
        const ach = (window.achievementList || []).find(a => a.id === rewardId);
        displayName = ach ? ach.name : "특별 업적";
        buttonText = `${displayName} 업적 해금하기`;
    };

    // [수정 완료] 텍스트는 툴팁으로 보내고, 버튼 안에는 아이콘만 남김
    rewardZone.innerHTML = `
        <div class="mail-reward-box reward-reveal" style="text-align: center; margin-top: 25px;">
            <span class="reward-label">${displayName} 지원</span>
            <button class="btn-claim-reward" onclick="window.claimMailReward('${mail.id}')">
                <i class="fa-solid ${faIcon}" style="margin-right: 10px;"></i> ${buttonText}
            </button>
        </div>
    `;
};

/**
 * 4. 보상 수령 처리 (데이터-UI 완전 동기화)
 */
window.claimMailReward = (mailId) => {
    // 1. 필수 객체 체크
    if (!window.mailbox || !window.collection) {
        console.error("시스템이 아직 준비되지 않았습니다.");
        return;
    }
    
    const mail = window.mailbox.receivedMails.find(m => String(m.id) === String(mailId));
    if (!mail || mail.isRewardClaimed) return;

    const reward = window.mailbox.claimReward(mailId);
    if (reward) {
        let toastMsg = "";

        // 1. 에테르(포인트) 보상
        if (reward.type === 'point' || reward.type === 'ether') {
            const amount = Number(reward.value || reward.amount || 0);
            
            // [해결책] 전역 객체인 window.collection의 포인트를 직접 올립니다.
            window.collection.points += amount;

            // 세이브 데이터 동기화
            if (masterData.progress) masterData.progress.points = window.collection.points;
            if (masterData.collection) masterData.collection.points = window.collection.points;

            toastMsg = `${amount.toLocaleString()} 에테르를 수령했습니다!`;
        } 
        
        // 2. 아이템 보상
        else if (reward.type === 'item') {
            if (!masterData.inventory) masterData.inventory = { byproducts: {} };
            const amount = Number(reward.value || reward.amount || 1);
            masterData.inventory.byproducts[reward.id] = (masterData.inventory.byproducts[reward.id] || 0) + amount;
            
            const itemName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(reward.id) : "연구 재료";
            toastMsg = `${itemName} ${amount}개를 획득했습니다.`;
        }
        
        // 3. 업적 보상
        else if (reward.type === 'achievement') {
            const achId = reward.value || reward.id;
            window.unlockAchievement(achId);
            saveAllData();
            window.renderLetterReward(mail);
            return;
        }

        // 공통 마무리
        if (toastMsg && window.showToast) window.showToast(toastMsg, "success");

        saveAllData(); 
        window.renderLetterReward(mail); // 버튼 상태 변경
        
        // UI 즉시 갱신
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
    }
};

/**
 * 5. 서신 창 닫기 (타이핑 종료 포함)
 */
window.closeLetterView = () => {
    // 창을 닫는 즉시 타이핑 종료
    if (window.mailTypeTimer) {
        clearInterval(window.mailTypeTimer);
        window.mailTypeTimer = null;
    }

    const modal = document.getElementById('letter-view-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    document.body.focus();
};

/**
 * 6. 업적 그리드 렌더링
 */
window.renderAchievementGrid = () => {
    const grid = document.getElementById('achievement-grid');
    if (!grid) return;
    
    grid.innerHTML = ""; 

    const list = window.achievementList || [];
    
    list.forEach(ach => {
        const isUnlocked = masterData.achievements.includes(ach.id);
        
        const slot = document.createElement('div');
        slot.className = `achieve-slot ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        // 데이터 마스킹
        const title = isUnlocked ? ach.name : "???";
        const desc = isUnlocked ? (ach.desc || ach.description) : "아직 달성하지 못한 업적입니다.";
        
        // 툴팁 설정
        slot.setAttribute('data-tooltip', `[${title}]\n${desc}`);

        // 아이콘 설정
        let iconHtml = "";
        if (isUnlocked) {
            const iconVal = ach.icon || 'assets/img/achieve/default.png';
            if (iconVal.endsWith('.png')) {
                iconHtml = `<img src="${iconVal}" class="achieve-img-icon">`;
            } else {
                iconHtml = `<span style="font-size: 2rem;">${iconVal}</span>`;
            }
        } else {
            iconHtml = `<img src="${ach.icon}" class="achieve-img-icon locked-img">`;
        }
        
        slot.innerHTML = iconHtml;
        grid.appendChild(slot);
    });
};

/**
 * 7. 업적 모달 토글
 */
window.toggleAchievementModal = (show) => {
    const modal = document.getElementById('achievement-modal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';
    if (show) {
        window.renderAchievementGrid();
        window.updateAchievementBadge?.(false);
    }
};

/**
 * 8. 업적 해금 함수
 */
window.unlockAchievement = (achievementId) => {
    const id = String(achievementId);
    if (masterData.achievements.includes(id) || sessionUnlockedAchievements.has(id)) return;

    sessionUnlockedAchievements.add(id);
    masterData.achievements.push(id);
    saveAllData();

    setTimeout(() => {
        const ach = (window.achievementList || []).find(a => a.id === id);
        const name = ach ? ach.name : "새로운 업적";
        if (window.showToast) window.showToast(`업적 달성: ${name}`, "achievement");
        window.updateAchievementBadge?.(true);
    }, 1500);
};


/* ============================================================
   [🔊 사운드 시스템: 토글 및 데이터 동기화] 
   ============================================================ */

window.updateSoundUI = () => {
    // 1. [데이터 체크] 사운드 설정이 없으면 기본값 생성
    if (!masterData.settings || !masterData.settings.sound) {
        if (masterData.settings) {
            masterData.settings.sound = { master: true, system: true, autoPlay: true };
        } else {
            return; // 설정 데이터가 아직 로드되지 않음
        }
    }
    
    const s = masterData.settings.sound;

    // 2. [핵심] HTML의 ID와 코드의 ID를 100% 일치시킵니다.
    const masterEl = document.getElementById('master-sound-toggle');
    const systemEl = document.getElementById('system-sound-toggle');
    const autoPlayEl = document.getElementById('auto-play-toggle'); 

    // 3. 각 요소가 존재할 때만 active 클래스를 토글합니다.
    if (masterEl) masterEl.classList.toggle('active', !!s.master);
    if (systemEl) systemEl.classList.toggle('active', !!s.system);
    if (autoPlayEl) autoPlayEl.classList.toggle('active', !!s.autoPlay);
    
    console.log("🔊 [System] 사운드 UI 모션 동기화 완료");
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
    const val = input.value.trim().toLowerCase(); // 좌우 공백 제거 및 소문자화

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
        // 메인 프로세스로부터 버전 정보를 요청합니다.
        const versionInfo = await ipcRenderer.invoke('get-version-update');
        
        // [핵심 수정] versionInfo가 null이거나 latest 속성이 없는 경우 즉시 중단하여 에러를 방지합니다.
        if (!versionInfo || !versionInfo.latest) {
            console.log("[시스템] 버전 정보를 가져올 수 없거나 이미 최신 버전입니다.");
            return;
        }

        // 새 버전이 존재할 경우에만 서신 생성 로직을 실행합니다.
        if (isNewerVersion(versionInfo.current, versionInfo.latest)) {
            const mailId = `update_notice_${versionInfo.latest}`;
            const isAlreadyReceived = mailbox.receivedMails.some(m => m.id === mailId);

            if (!isAlreadyReceived) {
                const updateMail = {
                    id: mailId,
                    title: `새로운 연구 소식 (v${versionInfo.latest})`,
                    sender: "연금술 도우미",
                    content: `연금술사님, 연구실의 새로운 기능과 안정성이 개선된 v${versionInfo.latest} 버전이 준비되었습니다. 지금 새로운 버전을 확인해 보세요!\n\n` +
                        `<a href="#" onclick="event.preventDefault(); require('electron').shell.openExternal('${versionInfo.downloadUrl}')" style="color: #a0c4ff; text-decoration: underline; cursor: pointer;">` +
                        `[확인하기]</a>`,
                    receivedDate: new Date().toISOString(),
                    isRead: false,
                    isRewardClaimed: false,
                    reward: { type: 'point', value: 1000 }
                };

                mailbox.receivedMails.unshift(updateMail);
                window.updateMailNotification(); 
                window.showToast("학회로부터 중요한 서신이 도착했습니다!", "event");
                saveAllData(); 
            }
        }
    } catch (err) {
        // 네트워크 오류 등으로 인한 예외 상황을 처리합니다.
        console.error("[시스템] 업데이트 체크 중 예외 발생:", err);
    }
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
    const now = new Date();
    const hour = now.getHours();
    
    if (hour < window.resetHour) {
        now.setDate(now.getDate() - 1);
    }
    
    // [수정] toDateString() 대신 아래 코드를 사용하세요.
    return now.toLocaleDateString('en-CA'); 
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

/**
 * 3. JSON 구조에 맞춰 상황별 대사 배열 반환
 * @param {string} category - 'work', 'distract', 'idle' 중 하나
 */
window.getDialoguesFromJSON = (category) => {
    if (!currentPartner || window.isHatching) return ["..."];

    const stageData = currentPartner.stages[currentStage];
    if (!stageData || !stageData.dialogues) return ["..."];

    const categoryData = stageData.dialogues[category];
    if (!categoryData) return ["..."];
    
    // 호감도에 따른 키 결정 (JSON 구조: max, high, low)
    const intimacy = charIntimacyMap[currentPartner.id] || 0;
    const intimacyKey = intimacy >= 90 ? 'max' : (intimacy >= 55 ? 'high' : 'low');

    // [방어] 데이터가 배열이면 그대로 반환, 객체면 호감도 키에 따라 반환
    if (Array.isArray(categoryData)) {
        return categoryData.length > 0 ? categoryData : ["..."];
    } else {
        const list = categoryData[intimacyKey] || categoryData['high'] || [];
        return list.length > 0 ? list : ["..."];
    }
};


/* ============================================================
   [✨ 시각 효과 및 연출]
   ============================================================ */

/**
 * 레벨업 연출 (배지 애니메이션 + 토스트 + 화면 섬광)
 */
function triggerLevelUpEffect() {
    const levelBadge = document.querySelector('.level-badge'); // 레벨이 표시되는 엘리먼트
    
    // 1. 이벤트 토스트 띄우기
    window.showToast(`✨ 축하합니다! 연금술사 레벨이 ${progress.level}로 올랐습니다!`, "success");

    // 2. 캐릭터 대사 출력 (우선순위 2로 고정)
    // const cheerTexts = ["대단해요! 당신의 재능이 꽃을 피우고 있군요.", "놀라운 성장이네요! 에테르의 흐름이 달라졌어요."];
    // window.showDialogue(cheerTexts[Math.floor(Math.random() * cheerTexts.length)], 2);

    // 3. 배지 애니메이션 적용
    if (levelBadge) {
        levelBadge.classList.add('level-up-active');
        setTimeout(() => levelBadge.classList.remove('level-up-active'), 1500);
    }

    // 4. (보너스) 화면 섬광 효과
    const flash = document.createElement('div');
    flash.className = 'screen-flash active';
    document.body.appendChild(flash);
    setTimeout(() => {
        flash.classList.remove('active');
        setTimeout(() => flash.remove(), 200);
    }, 100);
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
 * 참조 방식을 사용하여 데이터 누락을 차단하고, 날짜 보존 로직을 통해 무한 새로고침을 방지합니다.
 */
async function saveAllData() {
    // 1. [방어] 초기화 중이거나 데이터가 로드되지 않은 경우 저장을 차단합니다.
    if (!masterData || window.isResetting) {
        console.warn("⚠️ [System] 저장 중단: 리셋 중이거나 데이터 미로드");
        return { success: false };
    }

    try {
        console.log("💾 [System] 데이터 저장 시퀀스 개시...");

        // 2. [핵심] 날짜 정보 백업 (무한 새로고침 방지용)
        const currentSaveDate = masterData.progress ? masterData.progress.lastSaveDate : window.getMolipDate();

        // 3. 매니저 클래스들의 최신 상태를 마스터 데이터로 집결합니다.
        if (progress) masterData.progress = progress.getSaveData(); 
        if (collection) masterData.collection = collection.getSaveData();

        // window.mailbox와 mailbox 변수 모두 체크하여 최신 데이터 확보
        const mb = window.mailbox || mailbox;
        if (mb) {
            const history = mb.getSaveData(); 
            masterData.mailbox = { 
                mailHistory: Array.isArray(history) ? history : [] 
            };
        }
        
        // 4. [보강] getSaveData() 결과물에 날짜가 누락되었을 경우를 대비해 백업본으로 강제 복구합니다.
        if (masterData.progress) {
            masterData.progress.lastSaveDate = currentSaveDate;
        }

        // 5. [참조 유지] 할 일, 습관, 캐릭터 정보는 syncReferences() 덕분에 
        // 이미 masterData 내부에 실시간 반영되어 있으므로 별도 복사 과정이 필요 없습니다.

        // 6. UI 및 시스템 설정값을 최종 동기화합니다.
        if (masterData.settings) {
            masterData.settings.hideCompleted = window.hideCompleted;
            masterData.settings.showPastCompleted = window.showPastCompleted;
            masterData.settings.resetHour = window.resetHour;
            masterData.settings.autoDeleteOldTasks = window.autoDeleteOldTasks;
            masterData.settings.workApps = workApps; 
            masterData.settings.distractionApps = distractionApps;
            masterData.settings.isHorizontalMode = window.isHorizontalMode;
            masterData.settings.windowMode = masterData.settings.windowMode || 'horizontal';
            masterData.settings.currentTheme = masterData.settings.currentTheme || 'DEFAULT_DARK';
        }

        // 7. 메인 프로세스에 실제 파일 쓰기를 요청
        const result = await ipcRenderer.invoke('save-game-data', masterData);
        
        if (result && result.success) {
            console.log(`💾 [System] 데이터 보존 완료 (기준 날짜: ${currentSaveDate})`);
            return { success: true };
        } else {
            throw new Error("파일 시스템 응답 실패");
        }
    } catch (err) {
        console.error("❌ [System] 데이터 저장 중 오류 발생:", err);
        if (window.showToast) {
            window.showToast("데이터 저장에 실패했습니다. 파일 쓰기 권한을 확인하세요.", "error");
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
 * 4. 메인 UI 갱신 (1초마다 호출됨)
 */
window.updateUI = function() {
    const curProgress = window.progress;
    const curCollection = window.collection;

    if (!curProgress || !curCollection) return;

    const d = curProgress.getProgressData();
    const format = (s) => [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
        .map(v => v < 10 ? "0" + v : v).join(":");

    // 시간 및 에테르
    if (document.getElementById('today-time')) document.getElementById('today-time').innerText = format(d.todayTime);
    if (document.getElementById('total-time')) document.getElementById('total-time').innerText = format(d.totalTime);
    
    // 레벨 및 경험치
    const levelNum = document.getElementById('level-num');
    const expBar = document.getElementById('exp-bar');
    const expPercent = document.getElementById('exp-percent');

    if (levelNum) levelNum.innerText = d.level;
    if (expBar) expBar.style.width = `${d.percent || 0}%`;
    if (expPercent) expPercent.innerText = `${Math.round(d.percent || 0)}%`;

    // 에테르 애니메이션
    const pointsElement = document.getElementById('work-points');
    if (pointsElement) {
        const actualPoints = curCollection.points;
        if (displayedPoints !== actualPoints && !isPointAnimating) {
            isPointAnimating = true;
            pointsElement.classList.add('point-pop');
            const step = () => {
                const diff = actualPoints - displayedPoints;
                if (Math.abs(diff) < 0.1) displayedPoints = actualPoints;
                else displayedPoints += diff * 0.15; 
                pointsElement.innerHTML = `${Math.floor(displayedPoints).toLocaleString()} Et`;
                if (displayedPoints !== actualPoints) requestAnimationFrame(step);
                else {
                    isPointAnimating = false;
                    setTimeout(() => pointsElement.classList.remove('point-pop'), 200);
                }
            };
            requestAnimationFrame(step);
        } else if (!isPointAnimating) {
            pointsElement.innerHTML = `${actualPoints.toLocaleString()} Et`;
        }
    }
    
    // 파트너 정보
    if (currentPartner) {
        const nameTag = document.getElementById('char-name-tag');
        if (nameTag) nameTag.innerText = curCollection.activeEgg ? (currentPartner.egg_name || "알") : currentPartner.name;
        
        const intimacyVal = document.getElementById('intimacy-val');
        if (intimacyVal) {
            const currentInt = charIntimacyMap[currentPartner.id] || 0;
            intimacyVal.innerText = currentInt.toFixed(1);
            const intimacyBar = document.getElementById('intimacy-bar');
            if (intimacyBar) intimacyBar.style.width = `${currentInt}%`;
        }
    }

    // 소라고둥 버튼
    const inv = masterData.inventory;
    const hasSeashell = ((inv?.items?.music_seashell || 0) + (inv?.byproducts?.music_seashell || 0)) > 0;
    const ambientBtn = document.getElementById('trig-amb');
    const musicBtn = document.getElementById('trig-mus');

    if (ambientBtn && musicBtn) {
        const displayStatus = hasSeashell ? 'flex' : 'none';
        ambientBtn.style.display = displayStatus;
        musicBtn.style.display = displayStatus;
    }
};


/* ============================================================
   [🏁 게임 엔진 루프 (Heartbeat)]
   ============================================================ */

/**
 * 메인 루프: 감지, 기록, 저장, 캐릭터 피드백을 총괄합니다.
 */
async function updateLoop() {
    // ✨ [추가] 파트너가 없는 신규 유저 상태라면 루프 로직 중단
    if (!masterData || window.isResetting) return;
    if (!currentPartner) return;

    // 1. 데이터 로드 전이거나 리셋 중이면 중단
    if (!masterData || window.isResetting) return;

    // 변수 안전 선언
    if (!dailyAppTimeMap) dailyAppTimeMap = masterData.dailyAppTimeMap || {};
    const safeWorkApps = workApps || [];
    const safeDistractionApps = distractionApps || [];

    try {
        const nowMolipDate = window.getMolipDate(); 
        
        // --- [1] 날짜 변경 감지 및 자정 리셋 ---
        if (masterData.progress && masterData.progress.lastSaveDate !== nowMolipDate) {
            console.log(`[시스템] 날짜 변경 감지: ${masterData.progress.lastSaveDate} -> ${nowMolipDate}`);
            masterData.progress.lastSaveDate = nowMolipDate; 
            if (progress) {
                progress.lastSaveDate = nowMolipDate; 
                progress.todayFocusTime = 0;
            }
            checkHabitReset(); 
            window.showToast("새로운 하루가 시작되었습니다. 연구 기록을 정리 중입니다...", "info");

            const saveResult = await saveAllData(); 
            if (saveResult && saveResult.success) {
                console.log("[시스템] 자정 데이터 보존 완료. 앱을 재시작합니다.");
                setTimeout(() => { location.reload(); }, 500);
            } else {
                window.showToast("데이터 저장 실패! 저장 공간을 확인해 주세요.", "error");
            }
            return;
        }

        // --- [2] 활성 창 분석 ---
        const rawOwner = lastActiveWin?.owner || "Ether Flow";
        const cleanedName = window.cleanAppName(rawOwner);
        const isSelf = (
            cleanedName === "Ether Flow" || 
            cleanedName === "Electron" || 
            cleanedName === "내 연구실" ||
            rawOwner.includes("Ether Flow")
        );

        // UI 갱신 (현재 앱 이름)
        const appNameEl = document.getElementById('current-app-name');
        const distractNameEl = document.getElementById('current-distract-name');
        if (appNameEl) appNameEl.innerText = isSelf ? "내 연구실" : cleanedName;
        if (distractNameEl) distractNameEl.innerText = isSelf ? "내 연구실" : cleanedName;

        const workAddBtn = document.querySelector('#current-app-box .btn-add-current');
        const distractAddBtn = document.querySelector('#tab-content-distract .btn-add-current');
        if (workAddBtn) {
            workAddBtn.disabled = isSelf;
            workAddBtn.style.opacity = isSelf ? "0.5" : "1";
        }
        if (distractAddBtn) {
            distractAddBtn.disabled = isSelf;
            distractAddBtn.style.opacity = isSelf ? "0.5" : "1";
        }

        // --- [3] 상태 판정 ---
        const monitor = masterData.settings?.monitor || { workKeywords: [], distractKeywords: [] };
        const safeWorkKeys = monitor.workKeywords || [];
        const safeDistractKeys = monitor.distractKeywords || [];

        const targetOwner = (rawOwner || "").toLowerCase();
        const targetTitle = (lastActiveWin?.title || "").toLowerCase();

        // 키워드 매칭
        const matchedWorkKey = safeWorkKeys.find(key => {
            const k = key.toLowerCase();
            return targetOwner.includes(k) || targetTitle.includes(k);
        });
        const matchedDistractKey = safeDistractKeys.find(key => {
            const k = key.toLowerCase();
            return targetOwner.includes(k) || targetTitle.includes(k);
        });

        // 앱 매칭
        const appMatchWork = !isSelf && safeWorkApps.some(app => targetOwner.includes(app.toLowerCase()));
        const appMatchDistract = !isSelf && safeDistractionApps.some(app => targetOwner.includes(app.toLowerCase()));

        // 최종 상태 판정
        window.isActuallyWorking = appMatchWork || !!matchedWorkKey; 
        window.isDistraction = appMatchDistract || !!matchedDistractKey; 
        
        // 로컬 변수도 전역 값을 참조하도록 업데이트
        isActuallyWorking = window.isActuallyWorking;
        isDistraction = window.isDistraction;

        const isFocusing = isActuallyWorking && !isIdle && !isDistraction;
        
        // 부재중(Idle) 처리
        if (isIdle && !lastIdleState) awayStartTime = Date.now(); 
        if (!isIdle && lastIdleState && awayStartTime) {
            const awayDuration = (Date.now() - awayStartTime) / 1000;
            if (awayDuration >= 180 && currentStage === 'adult') window.showRandomDialogue('return'); 
            awayStartTime = null;
        }
        lastIdleState = isIdle; 

        // --- [4] 캐릭터 표정 및 상태별 대사 ---
        let exprKey = isFocusing ? 'working' : (isDistraction ? 'distracting' : (isIdle ? 'away' : 'good'));
        let dialogueKey = isFocusing ? 'work' : (isDistraction ? 'distract' : 'idle');

        if (currentStage !== 'egg' && window.renderer && typeof window.renderer.setExpression === 'function') {
            if (window.lastCharacterState !== exprKey) {
                window.renderer.setExpression(exprKey);
                if (!awayStartTime) window.showRandomDialogue(dialogueKey);
                window.lastCharacterState = exprKey;
            }
        }

        // --- [5] 실시간 데이터 기록 ---
        if (isFocusing || isDistraction) {
            let logName = cleanedName;
            if (matchedWorkKey) logName = `🔑 ${matchedWorkKey}`;
            else if (matchedDistractKey) logName = `🚫 ${matchedDistractKey}`;

            if (logManager) {
                logManager.recordLog(logName, isFocusing ? 'work' : 'distract');
            }

            if (isFocusing) {
                if (currentPartner && !collection.activeEgg) {
                    charGrowthMap[currentPartner.id] = (charGrowthMap[currentPartner.id] || 0) + 1;
                }
                if (!dailyAppTimeMap[nowMolipDate]) dailyAppTimeMap[nowMolipDate] = {};
                dailyAppTimeMap[nowMolipDate][cleanedName] = (dailyAppTimeMap[nowMolipDate][cleanedName] || 0) + 1;
                
                progress.recordFocus(); 
                if (progress.totalFocusTime % 60 === 0) { 
                    collection.addPoints(1); 
                    saveAllData(); 
                }
            }
        }

        // --- [6] 서신 트리거 체크 ---
        if (mailbox) {
            const adultCount = charData.characters.filter(char => {
                const growthSec = charGrowthMap[char.id] || 0;
                return (growthSec / 60) >= (char.evolution_level || EVOLUTION_TARGET_MIN);
            }).length;

            const isPerfectDay = (molipTodos.length > 0 && molipTodos.every(t => t.completed)) && 
                                (molipHabits.length > 0 && molipHabits.every(h => h.completed));
            const petKey = `${currentPartner?.id}_${nowMolipDate}`;
            const lastSaveDateVal = masterData.progress.lastSaveDate ? new Date(masterData.progress.lastSaveDate) : new Date();
            const daysSinceLastSave = Math.floor((new Date() - lastSaveDateVal) / (1000 * 60 * 60 * 24));

            const stats = {
                level: progress.getProgressData().level,
                points: collection.points,
                totalTime: progress.totalFocusTime,
                marathonTime: window.marathonTime || 0,
                partnerId: currentPartner?.id,
                current_stage: currentStage,
                intimacy_level: charIntimacyMap[currentPartner?.id] || 0,
                growth_level: charGrowthMap[currentPartner?.id] || 0,
                adultCount: adultCount,
                all_growth: charGrowthMap,
                todoCount: molipTodos.filter(t => t.completed).length,
                habit_master: Math.max(...molipHabits.map(h => h.streak || 0), 0),
                ownedCount: collection.ownedIds.length,
                app_juggler: safeWorkApps.length,
                gift_total_count: Object.values(givenGiftsMap).reduce((sum, list) => sum + list.length, 0),
                isPerfectDay: isPerfectDay,
                isFlowActive: isFocusing,
                failed_attempt_count: masterData.failedCount || 0,
                inactive_days: daysSinceLastSave,
                daily_pet_limit: dailyPetCountMap[petKey] || 0,
                currentHour: new Date().getHours(),
                currentDay: new Date().getDay(),
                early_bird: new Date().getHours() >= 6 && new Date().getHours() <= 9,
                night_owl: new Date().getHours() >= 0 && new Date().getHours() < 5,
                weekend_alchemist: [0, 6].includes(new Date().getDay())
            };
            
            const newMails = mailbox.checkTriggers(stats);
            if (newMails && newMails.length > 0) {
                window.showToast("새로운 서신이 "+ newMails.length +"통 도착했습니다.", "info");
                if (window.renderMailList) window.renderMailList();
                window.updateMailNotification();
                saveAllData(); 
            }
        }

        const mainCanvas = document.getElementById('main-canvas');
        if (mainCanvas) {
            // 조건: 1. 현재 알 상태여야 함 (activeEgg 존재)
            //       2. 실제로 집중 중이어야 함 (isFocusing)
            //       3. 부화 연출 중이 아니어야 함 (!window.isHatching)
            if (collection.activeEgg && isFocusing && !window.isHatching) {
                mainCanvas.classList.add('egg-anim-active');
            } else {
                mainCanvas.classList.remove('egg-anim-active');
            }
        }

        // --- [7] 시스템 및 UI 갱신 ---
        checkHatching();
        checkEvolution();
        updateStatusBadge(); 
        window.updateCylinderSystem();
        window.updateUI();

    } catch (err) {
        console.error("UpdateLoop 치명적 에러:", err);
    }
}

/**
 * 상태 배지 UI 업데이트
 */
function updateStatusBadge() {
    const badgeEl = document.getElementById('status-badge');
    if (!badgeEl) return;

    let statusClass = "";
    let icon = "";
    let text = "";

    if (isIdle) {
        statusClass = "away";
        icon = '<i class="fas fa-moon"></i>';
        text = "부재 중";
    } else if (isDistraction) {
        statusClass = "distracting";
        icon = '<i class="fas fa-ghost"></i>';
        text = "딴짓 중";
    } else if (isActuallyWorking) {
        statusClass = "working";
        icon = '<i class="fas fa-fire"></i>';
        text = "집중 중";
        if (progress.totalFocusTime % 300 === 0 && progress.totalFocusTime > 0) {
            statusClass += " flow-state";
        }
    } else {
        statusClass = "waiting";
        icon = '<i class="fas fa-hourglass-start"></i>';
        text = "대기 중";
    }

    badgeEl.className = statusClass; 
    badgeEl.innerHTML = `${icon} ${text}`;
}

/**
 * [인트로 종료] 계약 확정 및 게임 엔진 가동 (새로고침 없는 버전)
 */
window.finalizeContract = async (char) => {
    console.log("📜 계약 체결 시작:", char.name);
    
    // 1. 인트로 화면 페이드 아웃 (부드러운 전환)
    const intro = document.getElementById('intro-sequence');
    if (intro) {
        intro.style.transition = "opacity 1.5s ease"; // 1.5초 동안 서서히 사라짐
        intro.style.opacity = "0";
    }

    // 2. 데이터 초기화 (알 상태로 등록)
    // 컬렉션 매니저가 없으면 안전하게 생성
    if (!collection) collection = new CollectionManager({});
    
    collection.activeEgg = {
        type: char.id,
        progress: 0,
        target: 900, // 부화 목표 시간 (초)
        date: new Date().toISOString()
    };
    
    // 3. 파트너 설정 및 마스터 데이터 동기화
    currentPartner = char;
    if (!masterData.character) masterData.character = {};
    masterData.character.selectedPartnerId = char.id;

    // ✨ [핵심 수정] 계약 맺는 날짜를 오늘로 확정
    if (!masterData.progress) masterData.progress = {};
    masterData.progress.lastSaveDate = window.getMolipDate();

    // 4. 데이터 저장 (저장 후 새로고침 하지 않음!)
    await saveAllData();

    // 5. 페이드 아웃이 끝난 후 게임 화면 활성화
    setTimeout(async () => {
        if (intro) intro.style.display = 'none'; // 인트로 완전히 제거
        
        // 캐릭터(알) 스프라이트 로드
        if (typeof refreshCharacterSprite === 'function') {
            await refreshCharacterSprite(); 
        }
        
        // UI 수치 갱신
        window.updateUI();

        // [핵심] 엔진 가동 (이미 돌고 있지 않다면 시작)
        if (!window.gameEngineInterval) {
            window.startMainGameEngine();
            isEngineStarted = true;
        }

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
 * 부화 조건 체크
 */
function checkHatching() {
    if (!collection || !collection.activeEgg || window.isHatching) return;

    const hatchStartTime = new Date(collection.activeEgg.date).getTime();
    const now = Date.now();
    
    const elapsedSeconds = (now - hatchStartTime) / 1000;
    const requiredTime = collection.activeEgg.target || 15; 

    if (elapsedSeconds >= requiredTime) {
        console.log(`✨ 부화 조건 충족 (${Math.floor(elapsedSeconds)}초 경과)`);
        if (window.performHatchSequence) {
            window.performHatchSequence(collection.activeEgg.type);
        }
    }
}

/**
 * [🌟 통합 엔진 시작]
 * 데이터 로드, 매니저 초기화, 캐릭터 복구, 그리고 **UI 초기 렌더링**까지 수행합니다.
 */
async function startEngine() {
    // 1. 중복 실행 방지 플래그 체크
    if (isEngineStarted) return;
    
    console.log("🚀 [System] 연구실 엔진 가동 시퀀스 시작...");

    try {
        // 2. 데이터 로드
        const savedData = await ipcRenderer.invoke('load-game-data');
        masterData = savedData || { 
            progress: {}, settings: {}, character: {}, collection: {}, 
            inventory: { items: {}, byproducts: {} }, 
            mailbox: { mailHistory: [] }, todo: [], habit: [] 
        };

        if (!masterData.progress) masterData.progress = {};
        masterData.progress.lastSaveDate = window.getMolipDate(); // <--- 이 줄이 핵심입니다!

        window.masterData = masterData;

        // 3. 데이터 구조 보정
        masterData.inventory = masterData.inventory || { items: {}, byproducts: {} };
        masterData.settings = masterData.settings || {};
        masterData.mailbox = masterData.mailbox || { mailHistory: [] };
        if (Array.isArray(masterData.mailbox)) {
            masterData.mailbox = { mailHistory: masterData.mailbox };
        }
        
        // [필수] 전역 변수 연결 (여기서 workApps가 채워집니다)
        syncReferences(); 

        // 4. 언어 및 리소스 로드
        await window.loadLanguageData('ko');
        window.shopItems = window.getShopItems();

        // 5. 렌더러 초기화
        if (!window.renderer && document.getElementById('main-canvas')) {
            window.renderer = new CharacterRenderer('main-canvas');
            renderer = window.renderer; 
        }

        // 6. 매니저 초기화
        const mailHistory = masterData.mailbox?.mailHistory || [];
        mailbox = new MailboxManager(mailHistory, mailPoolData);
        progress = new ProgressManager(masterData.progress);
        collection = new CollectionManager(masterData.collection);
        soundManager = new SoundManager();
        taskManager = new TaskManager();
        logManager = new LogManager();

        window.progress = progress;
        window.collection = collection;
        window.mailbox = mailbox;
        window.soundManager = soundManager;
        logManager.init();

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
                if (currentPartner) await refreshCharacterSprite(); 
            }
        }

        // 8. UI 최종 적용 [✨ 여기가 핵심입니다]
        window.applyHorizontalMode();
        window.applyWindowMode();
        window.applySavedFont();
        window.updateUI();
        window.updateMailNotification();
        
        // [누락 수정] 앱 켜자마자 사이드바 목록과 키워드를 그립니다.
        window.applyAccordionStates();
        window.renderWorkAppList(); 
        window.renderMonitorSettings(); 
        
        taskManager.init();
        taskManager.renderTodos();
        taskManager.renderHabits();

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