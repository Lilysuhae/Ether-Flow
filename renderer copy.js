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
    // data-i18n 속성을 가진 모든 엘리먼트를 찾아 번역을 적용합니다.
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = window.t(key);
    });
    console.log("🌐 [System] UI 언어 적용 완료");
};

const { ipcRenderer } = require('electron');
const path = require('path'); // [추가] path 모듈을 먼저 가져와야 합니다.

// [수정] path.join과 __dirname을 사용하여 경로를 절대화합니다.
const CharacterRenderer = require(path.join(__dirname, 'src', 'CharacterRenderer.js')); 
const ProgressManager = require(path.join(__dirname, 'src', 'progress.js'));
const CollectionManager = require(path.join(__dirname, 'src', 'collection.js'));
const MailboxManager = require(path.join(__dirname, 'src', 'mailboxManager.js'));

// 데이터 파일들도 동일하게 수정하는 것이 좋습니다.
let charData = null;
let mailPoolData = null;

// 전역 공유 (introManager.js 등이 에러 없이 쓰기 위함)
window.charData = charData;
window.CharacterRenderer = CharacterRenderer; 

// 파일 로드 (변수에 담지 않고 실행만 하여 중복 선언 방지)
require('./src/introManager.js');

// --- [필수 상태 변수 선언] ---
let masterData = { 
    settings: { 
        monitor: { workKeywords: [], distractKeywords: [] },
        sound: { master: true, system: true, autoPlay: true }
    },
    inventory: { byproducts: {} },
    collection: []
};
window.masterData = masterData;          // 통합 데이터 객체 (JSON 파일 기반)
let lastActiveWin = null;       // 메인 프로세스에서 받은 활성 창 정보
let isActuallyWorking = false;  // 작업 도구 매칭 여부
let isDistraction = false;      // 딴짓 도구 매칭 여부 (전역 변수로 선언)
let isIdle = false;             // 부재 중 상태
let logViewDate = new Date();   // 로그 뷰어용 날짜
let dialogueTimeout = null; // [추가] 대사 사라짐 제어용 변수
window.isHatching = false; // [추가] 현재 부화 연출이 진행 중인지 체크하는 플래그
let lastLoadedId = null; // 마지막으로 로드된 캐릭터의 ID를 기억합니다.
let givenGiftsMap = {};
let dailyGiftCountMap = {}
let displayedPoints = 0; 
let isPointAnimating = false; // 애니메이션 중복 실행 방지용
let mailDisplayLimit = 10; // 초기 노출 개수
let currentStatus = "good"; // [추가] 현재 상태를 저장하여 클릭 시 사용
let awayStartTime = null;       // [추가] 부재 시작 시간 기록용
let lastIdleState = false;      // [추가] 직전 유휴 상태 기억용
let shopItems = [];
window.shopItems = [];

// --- [매니저 선언] ---
let renderer = null;
window.renderer = renderer; // [추가] 전역 인스턴스 연결
window.charRenderer = renderer; // [추가] 호환성을 위해 하나 더 연결
let progress = null;
let collection = null;
let mailbox = null;

// --- [데이터 관리 변수들] ---
let workApps = [];
let distractionApps = [];
let molipTodos = [];
let molipHabits = [];
let charIntimacyMap = {};
let charGrowthMap = {};
let dailyAppTimeMap = {};
let currentPartner = null;
let currentStage = '';

window.molipTodos = molipTodos;
window.molipHabits = molipHabits;

// --- [시스템 설정 변수] ---
window.isHorizontalMode = true;
window.isWindowMode = true;
window.isAlwaysOnTop = true;
window.hideCompleted = false;
window.showPastCompleted = false;
window.resetHour = 0; // 기본값 자정
window.autoDeleteOldTasks = false;

// --- [상호작용 설정 상수] ---
let lastPetTime = 0;            
const PET_COOLDOWN = 300;      
const EVOLUTION_TARGET_MIN = 300;
let dailyPetCountMap = {}; // [추가] 날짜별 클릭 횟수 기록용  
let currentPriority = 0;      // 현재 출력 중인 대사의 우선순위 (0: 일반, 1: 클릭, 2: 시스템)
let dialogueLockUntil = 0;    // 이 시간(ms)까지는 낮은 우선순위 대사 무시
let lastDialogue = "";          // [추가] 중복 대사 방지용 기록

function syncReferences() {
    if (!masterData) return;

    if (!masterData.settings) masterData.settings = {};
    if (!masterData.settings.accordionStates) masterData.settings.accordionStates = {};

    if (!masterData.settings.workApps) masterData.settings.workApps = [];
    if (!masterData.settings.distractionApps) masterData.settings.distractionApps = [];

    workApps = masterData.settings.workApps;
    distractionApps = masterData.settings.distractionApps;
    molipTodos = masterData.todo;
    molipHabits = masterData.habit;
    
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

    window.molipTodos = molipTodos;
    window.molipHabits = molipHabits;
    window.dailyAppTimeMap = dailyAppTimeMap;
}

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
];

// --- [Sound Effects Manager] ---
const sounds = {
    click: new Audio(path.join(__dirname, 'assets', 'sounds', 'click.mp3')),
    paper: new Audio(path.join(__dirname, 'assets', 'sounds', 'paper.mp3')),
    check: new Audio(path.join(__dirname, 'assets', 'sounds', 'check.mp3')),
    send: new Audio(path.join(__dirname, 'assets', 'sounds', 'send.mp3'))
};

window.playSFX = (key) => {
    // 1. 설정 체크
    const s = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
    if (!s || !s.master || !s.system) return;

    const sound = sounds[key];
    if (sound) {
        try {
            // [핵심] 기존 재생을 강제 중지하고 0초로 리셋 (이미 재생 중일 때 씹히는 현상 방지)
            sound.pause();
            sound.currentTime = 0;
            
            // 아주 짧은 지연 후 재생하여 브라우저의 거부 반응을 우회합니다.
            setTimeout(() => {
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn("SFX 재생 차단 우회:", e));
                }
            }, 5);
        } catch (err) {
            console.error("SFX 엔진 오류:", err);
        }
    }
};


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

    // 2. 1초마다 updateLoop를 실행합니다. 
    // [교정] window.updateLoop 대신 정의된 updateLoop 함수를 직접 참조합니다.
    window.gameEngineInterval = setInterval(updateLoop, 1000);
};

// [renderer.js] 프로그램 이름에서 불필요한 노이즈를 제거하는 유틸리티
window.cleanAppName = function(name) {
    if (!name) return "";
    return name.replace(/\s*\(.*?\)/g, '')  // (64-bit), (32-bit) 등 제거
               .replace(/\.exe/gi, '')       // .exe 제거
               .trim();
};

// --------------------------------------------------------------------------
// [SECTION 1] 통합 데이터 저장 시스템 (Atomic Save)
// --------------------------------------------------------------------------
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
        // updateLoop에서 이미 새 날짜를 주입했을 것이므로, 이 값을 '진짜'로 간주하여 보호합니다.
        const currentSaveDate = masterData.progress ? masterData.progress.lastSaveDate : window.getMolipDate();

        // 3. 매니저 클래스들의 최신 상태를 마스터 데이터로 집결합니다.
        if (progress) masterData.progress = progress.getSaveData(); 
        if (collection) masterData.collection = collection.getSaveData();

        // window.mailbox와 mailbox 변수 모두 체크하여 최신 데이터 확보
        const mb = window.mailbox || mailbox;
        if (mb) {
            // 매니저로부터 받은 기록(isRead 포함)을 마스터 데이터에 주입
            masterData.mailbox = mb.getSaveData(); 
        }
        
        // 4. [보강] getSaveData() 결과물에 날짜가 누락되었을 경우를 대비해 백업본으로 강제 복구합니다.
        if (masterData.progress) {
            masterData.progress.lastSaveDate = currentSaveDate;
        }

        // 5. [참조 유지] 할 일, 습관, 캐릭터 정보는 syncReferences() 덕분에 
        // 이미 masterData 내부에 실시간 반영되어 있으므로 별도 복사 과정이 필요 없습니다.

        // 6. UI 및 시스템 설정값을 최종 동기화합니다.
        if (masterData.settings) {
            masterData.settings.isHorizontalMode = window.isHorizontalMode;
            masterData.settings.isWindowMode = window.isWindowMode;
            masterData.settings.isAlwaysOnTop = window.isAlwaysOnTop;
            masterData.settings.hideCompleted = window.hideCompleted;
            masterData.settings.showPastCompleted = window.showPastCompleted;
            masterData.settings.resetHour = window.resetHour;
            masterData.settings.autoDeleteOldTasks = window.autoDeleteOldTasks;
        }

        // 7. [핵심] 메인 프로세스에 실제 파일 쓰기를 요청하고 파일 작성이 끝날 때까지 대기합니다.
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

// --------------------------------------------------------------------------
// [SECTION 2] 캐릭터 성장 및 스프라이트 관리
// --------------------------------------------------------------------------

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

// [통합] 일일 10회 한도 + 하트 효과 제어 클릭 핸들러
window.petCharacter = (event) => {
    if (!currentPartner) return;
    const now = Date.now();
    if (now - lastPetTime < PET_COOLDOWN) return;
    lastPetTime = now;

    // [핵심 수정] 캐릭터 ID와 날짜를 조합하여 개별 카운트용 키를 생성합니다.
    const dateKey = window.getMolipDate(); 
    const petKey = `${currentPartner.id}_${dateKey}`; 
    
    // 해당 캐릭터의 오늘 카운트가 없으면 0으로 초기화
    if (!dailyPetCountMap[petKey]) dailyPetCountMap[petKey] = 0;

    // 알 상태가 아니고, 해당 캐릭터의 오늘 한도(10회)를 넘지 않았을 때만 실행
    if (!collection.activeEgg && dailyPetCountMap[petKey] < 10) {
        // 호감도 상승 및 카운트 증가
        charIntimacyMap[currentPartner.id] = Math.min(100, (charIntimacyMap[currentPartner.id] || 0) + 0.5);
        dailyPetCountMap[petKey]++;
        
        // 하트 파티클 생성
        createHeartEffect(event.clientX, event.clientY);

        // ★ 기쁨 표정('good')으로 3초간 변경
        renderer.setExpression('good');
        setTimeout(() => {
            // 3초 후 현재 작업 상태에 맞는 표정으로 복구
            const backTo = isDistraction ? 'distracting' : (isIdle ? 'away' : 'working');
            renderer.setExpression(backTo);
        }, 3000);

        // 한도 도달 시 알림
        if (dailyPetCountMap[petKey] === 10) {
            window.showToast(`${currentPartner.name}은(는) 오늘은 충분히 애정을 느낀 것 같습니다.`, "info");
        }
    } 
    
    window.showDialogue(); // 대사 출력 시스템 호출
    saveAllData();         // 변경 사항 즉시 저장
    window.updateUI();     // UI 수치 갱신
};

// [추가] 클릭 시 하트 파티클 생성 함수
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
 * [renderer.js] 유아기에서 성체로의 진화 조건을 실시간으로 감시합니다.
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

// 성체 진화
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
    // refreshCharacterSprite 내부에서 currentStage를 'adult'로 변경함
    await refreshCharacterSprite();

    // 4. 연출 종료 및 클래스 정리
    container.classList.remove('evolving-act');
    container.classList.add('evolved-new');
    
    // 5. 진화 대사 출력
    // const evoText = character.stages.child.evolution_text || "저, 조금 더 어른이 된 것 같아요!";
    window.showDialogue(evoText, 2);

    setTimeout(() => { 
        container.classList.remove('evolved-new');
        window.isHatching = false; 
    }, 2000);

    saveAllData(); // 진화 결과 즉시 저장
};

// [추가] 알 부화 연출 엔진 (Egg -> Child)
window.performHatchSequence = async function(type) {
    if (window.isHatching) return; // 실행 시점에 잠금
    window.isHatching = true;

    console.log("🥚 부화 연출 시작: ", type);

    // 1. 시각 연출: 화이트 플래시 실행
    const hatchFlash = document.getElementById('hatch-flash');
    if (hatchFlash) {
        hatchFlash.style.display = 'block';
        hatchFlash.classList.add('flash-trigger');
    }

    // 2. ★ [핵심] 데이터 전환 처리 (알 제거 및 보유 캐릭터 추가)
    if (collection) {
        // 보유 목록에 추가
        if (!collection.ownedIds.includes(type)) {
            collection.ownedIds.push(type);
        }
        // 활성화된 알 제거
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

        // ★ [보강] 부화 성공 후 첫 인사 대사 출력
        setTimeout(() => {
            window.isHatching = false; // 연출이 모두 끝난 후 잠금 해제
            saveAllData(); // 최종 상태 저장
        }, 1000);

    }, 800);
};


// --------------------------------------------------------------------------
// [SECTION 3] 모든 UI 제어 및 탭 관리 (window 객체 바인딩)
// --------------------------------------------------------------------------

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
};

// [추가] 항상 위 고정 토글 함수
window.toggleAlwaysOnTop = () => {
    // 1. 상태 반전
    window.isAlwaysOnTop = !window.isAlwaysOnTop;

    // 2. 메인 프로세스에 상태 전달
    ipcRenderer.send('set-always-on-top', window.isAlwaysOnTop); 

    // 3. UI 아이콘 상태 업데이트
    window.updatePinUI();

    // 4. 변경된 설정값 저장
    saveAllData(); 
};

// [추가] 고정 버튼(핀) UI 업데이트 함수
window.updatePinUI = () => {
    const btn = document.getElementById('pin-btn');
    if (btn) {
        // 활성화 상태에 따라 'active' 클래스 토글 (CSS에서 색상 변경 처리)
        btn.classList.toggle('active', window.isAlwaysOnTop); 
    }
};

// [renderer.js] resetAllData 함수 전체 교체
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
 * [renderer.js] 앱 내부 커스텀 컨펌 모달 표시 함수
 */
/* [renderer.js] 커스텀 컨펌 시스템 및 습관 삭제 적용 */

/**
 * 1. 공용 컨펌 모달 표시 함수 (중복 호출 방지 및 이벤트 바인딩)
 */
window.showConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    // [중요] 기존에 걸려있던 클릭 이벤트를 깨끗이 지우고 새로 등록합니다.
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);

    newYesBtn.onclick = () => {
        modal.style.display = 'none';
        onConfirm(); // 실제 실행할 로직 호출
    };

    newNoBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
};

// 도감 및 캐릭터 상세 정보
// [renderer.js] 도감 렌더링 함수 수정 (에러 방지 및 'good' 이미지 반영)
// [renderer.js] 도감 목록 렌더링 함수 수정 (현재 성장 단계 반영)
window.renderCollection = () => {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    
    grid.innerHTML = charData.characters.map(char => {
        const isOwned = collection.ownedIds.includes(char.id);
        const isActiveEgg = collection.activeEgg && collection.activeEgg.type === char.id;
        
        // 1. 기본 이미지는 알로 설정
        let spriteSrc = char.stages.egg.sprite; 

        if (isOwned) {
            // ★ [핵심 수정] 각 캐릭터의 개별 성장 시간을 확인하여 현재 단계를 판별합니다.
            const totalSec = charGrowthMap[char.id] || 0;
            const growthMin = totalSec / 60;
            const targetMin = char.evolution_level || EVOLUTION_TARGET_MIN;
            
            // 성장 시간에 따라 'child' 혹은 'adult' 결정
            const currentStage = growthMin >= targetMin ? 'adult' : 'child';
            
            // 해당 단계의 'good' 표정 이미지를 가져옵니다.
            const stageData = char.stages[currentStage];
            if (stageData && stageData.expressions && stageData.expressions.good) {
                spriteSrc = stageData.expressions.good.sprite;
            }
        }

        // 2. 상태별 텍스트 및 클래스 설정
        let statusClass = 'locked';
        let statusText = '???';
        
        if (isOwned) { 
            statusClass = 'unlocked'; 
            statusText = char.name; 
        } else if (isActiveEgg) { 
            statusClass = 'hatching'; 
            statusText = '부화 중...'; 
            spriteSrc = char.stages.egg.sprite; // 부화 중에는 알 이미지 표시
        }

        // 3. 클릭 액션 설정
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

window.toggleCollection = (show) => { 
    // ★ 추가: 부화 중에는 도감을 열 수 없도록 차단
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
 * [renderer.js] 도감 상세 페이지 출력 (단위: 분/초 및 퍼센트 고정)
 */
window.showCharDetail = (id) => {
    const char = charData.characters.find(c => c.id === id);
    if (!char) return;
    
    const isActiveEgg = collection.activeEgg && collection.activeEgg.type === id;
    const modal = document.getElementById('char-detail-modal');
    if (!modal) return;

    // 1. 성장 데이터 계산 (초 단위를 시간/분/초로 정밀 분리)
    const totalSec = charGrowthMap[char.id] || 0; 
    const growthMin = totalSec / 60; 
    const targetMin = char.evolution_level || EVOLUTION_TARGET_MIN; // 기준값 (분)
    
    // 2. 시간 환산 로직
    const compHours = Math.floor(totalSec / 3600);
    const compMins = Math.floor((totalSec % 3600) / 60);
    const compSecs = totalSec % 60;

    // 3. 성장 단계 및 퍼센트 판별 (100% 캡 고정)
    const stage = growthMin >= targetMin ? 'adult' : 'child';
    const percent = Math.min(100, (growthMin / targetMin) * 100);

    // 4. UI 반영: 상단 정보 및 이미지
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

    // 5. [핵심 수정] 함께한 시간 표시: ㅁㅁ시간 ㅁㅁ분 ㅁㅁ초
    const companionshipEl = document.getElementById('detail-total-companionship');
    if (companionshipEl) {
        companionshipEl.innerText = `${compHours}시간 ${compMins}분 ${compSecs}초`;
    }

    // 6. 성장 진행도 표시: %
    const growthBar = document.getElementById('detail-growth-bar');
    const growthText = document.getElementById('detail-growth-text');
    if (growthBar) growthBar.style.width = `${percent}%`;
    if (growthText) {
        growthText.innerText = `${percent.toFixed(1)}%`;
    }

    // ... (이하 선물 리스트 렌더링 및 버튼 로직 기존 유지) ...
    const favListContainer = document.getElementById('list-favorite');
    const disListContainer = document.getElementById('list-dislike');
    
    const renderPrefItems = (container, items) => {
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#666; padding-left:5px;">(정보 없음)</span>';
            return;
        }
        container.innerHTML = items.map(itemName => {
            const isUnlocked = givenGiftsMap[char.id]?.includes(itemName);
            const itemInfo = shopItems.find(i => i.name === itemName);
            const iconContent = isUnlocked ? (itemInfo ? itemInfo.icon : '<i class="fas fa-box"></i>') : '<i class="fas fa-question"></i>';
            const displayName = isUnlocked ? itemName : "???";
            return `
                <div class="pref-item ${isUnlocked ? '' : 'locked'}" data-tooltip="${isUnlocked ? '' : '선물을 주어 정보를 해금하세요'}">
                    <div class="pref-item-icon-wrapper">${iconContent}</div>
                    <span class="pref-item-name">${displayName}</span>
                </div>`;
        }).join('');
    };

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

window.closeCharDetail = () => { document.getElementById('char-detail-modal').style.display = 'none'; };

/* ============================================================
   [🛒 상점 시스템: 데이터-UI 완전 동기화] 
   ============================================================ */
window.currentShopCategory = 'gift'; // 현재 상점 탭 상태 기억
/**
 * 1. 상점 열기
 */
window.openShop = () => {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'flex';
    
    // 마지막으로 열었던 탭(혹은 기본탭)으로 렌더링
    window.renderShopItems(window.currentShopCategory);
};

/**
 * 2. 탭 전환 (상태 저장 로직 추가)
 */
window.switchShopTab = (category, btnElement) => {
    // 현재 카테고리 상태 업데이트 (매우 중요!)
    window.currentShopCategory = category;

    document.querySelectorAll('.shop-tab-re').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    window.renderShopItems(category);
};

// 3. 아이템 렌더링 (필터링 로직 강화)
// [renderer.js] 905라인부터 951라인까지 이 코드로 덮어쓰세요.
window.renderShopItems = (category) => {
    const grid = document.getElementById('shop-grid'); 
    if (!grid) return;
    grid.innerHTML = ""; // 기존 내용 초기화

    // 1. 상단 보유 에테르 갱신
    const shopEther = document.getElementById('shop-ether-count');
    if (shopEther && window.collection) {
        shopEther.innerText = window.collection.points.toLocaleString();
    }

    // 2. 🛡️ [에러 해결] 기존의 if (category === 'material') 블록을 삭제하고 공통 로직을 타게 합니다.
    // window.shopItems가 초기화되지 않았을 경우를 대비해 직접 호출합니다.
    const itemsToFilter = (window.shopItems && window.shopItems.length > 0) ? window.shopItems : window.getShopItems();
    const filtered = itemsToFilter.filter(item => item.category === category);

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.2);">판매 중인 물품이 없습니다.</div>`;
        return;
    }
    
    // 3. ✨ [이미지 출력 해결] 각 아이템을 <img> 태그로 안전하게 감싸서 출력합니다.
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card-glass';
        card.setAttribute('data-tooltip', item.desc);

        // 구매 가능 여부 체크
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
 * 4. 상점 닫기
 */
window.closeShop = () => {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'none';
};

/**
 * [renderer.js] 아이템 구매 처리 함수
 * @param {string} itemId - 구매할 아이템의 ID
 * @param {number} price - 아이템 가격
 */
window.buyItem = (itemId, price) => {
    if (!window.collection || window.collection.points < price) {
        if (window.showToast) window.showToast("에테르가 부족합니다.", "error");
        return;
    }

    // 에테르 차감 및 데이터 저장
    window.collection.points -= price;
    if (masterData.collection) masterData.collection.points = window.collection.points;
    
    if (!masterData.inventory.items) masterData.inventory.items = {};
    masterData.inventory.items[itemId] = (masterData.inventory.items[itemId] || 0) + 1;

    saveAllData();
    if (window.updateUI) window.updateUI();

    // [수정 포인트] 현재 보고 있던 카테고리 그대로 다시 그리기
    window.renderShopItems(window.currentShopCategory);

    const item = shopItems.find(i => i.id === itemId);
    if (window.showToast) window.showToast(`${item.name} 구매 완료!`, "success");
};

// --------------------------------------------------------------------------
// [SECTION 5] 작업 도구 및 리스트 관리 (window 바인딩)
// --------------------------------------------------------------------------

window.renderWorkAppList = () => {
    const list = document.getElementById('work-app-list');
    if (!list) return;

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

// [renderer.js] 약 590행 부근 수정
window.renderDistractionAppList = () => {
    // 설정창 내부에 존재하는 리스트 ID
    const settingsList = document.getElementById('distract-app-list-settings');
    if (!settingsList) return; 

    // 데이터가 비었을 때와 있을 때의 HTML 생성
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

    // 만약 나중에 메인 화면에 같은 ID를 추가할 경우를 대비한 안전 코드
    const mainList = document.getElementById('distract-app-list');
    if (mainList) mainList.innerHTML = content;
};

// [renderer.js] 작업 도구 등록 함수 수정
window.addCurrentApp = () => {
    const rawName = lastActiveWin?.owner;
    if (!rawName) return;

    // [핵심] 이름을 깨끗하게 정제하여 등록합니다.
    const name = window.cleanAppName(rawName);

    const forbidden = ["내 연구실", "일렉트론", "에테르플로우", "Electron", "Ether Flow"];
    if (forbidden.some(k => name.includes(k))) {
        return window.showToast("시스템 앱은 작업 도구로 등록할 수 없습니다.", "warning");
    }

    if (workApps.includes(name)) return window.showToast("이미 등록된 작업 도구입니다.", "info");
    if (distractionApps.includes(name)) return window.showToast("딴짓 도구에 이미 등록되어 있습니다.", "warning");

    workApps.push(name);
    window.renderWorkAppList();
    window.showToast("작업 도구 등록됨", "success");
    saveAllData();
};

// [renderer.js] 딴짓 도구 등록 함수 수정
window.addDistractionApp = () => {
    const rawName = lastActiveWin?.owner;
    if (!rawName) return;

    // [핵심] 이름을 깨끗하게 정제하여 등록합니다. (64-bit 등 제거)
    const name = window.cleanAppName(rawName);

    // 시스템 앱 등록 방지
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

    // 목록 추가 및 UI 갱신
    distractionApps.push(name);
    if (typeof window.renderDistractionAppList === 'function') {
        window.renderDistractionAppList();
    }
    
    window.showToast("딴짓 도구 등록됨", "success");
    saveAllData(); // 파일에 즉시 저장
};

// [renderer.js 약 660행] 작업 도구 삭제
window.removeWorkApp = (name) => { 
    // 1. 마스터 데이터 상자 안의 배열을 직접 필터링하여 교체합니다.
    masterData.settings.workApps = masterData.settings.workApps.filter(a => a !== name); 
    // 2. 이름표(참조)를 다시 상자 내용물에 붙여줍니다.
    syncReferences(); 
    window.renderWorkAppList(); 
    saveAllData(); 
};

// [renderer.js 약 661행] 딴짓 도구 삭제
window.removeDistractionApp = (name) => { 
    masterData.settings.distractionApps = masterData.settings.distractionApps.filter(a => a !== name); 
    syncReferences(); 
    window.renderDistractionAppList(); 
    saveAllData(); 
};

// TO-DO 리스트 관리
// [renderer.js] 상단 상태 변수 선언부에 추가
let editingTodoId = null; 

// [renderer.js] 할 일 수정 모달 열기 함수

window.editTodo = (id) => {
    const todoItem = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (!todoItem) return;

    const textSpan = todoItem.querySelector('.todo-text');
    const currentText = textSpan.innerText;

    // ★ 수정: 엔터 키 입력 시 onblur를 null로 만들어 중복 호출을 차단합니다.
    textSpan.innerHTML = `
        <input type="text" class="inline-edit-input" 
               value="${currentText}" 
               onkeydown="if(event.key==='Enter') { this.onblur = null; window.saveInlineEdit('${id}', this.value); } 
                          if(event.key==='Escape') { this.onblur = null; window.renderTodos(); }"
               onblur="window.saveInlineEdit('${id}', this.value)">
    `;

    const input = textSpan.querySelector('input');
    input.focus();
    input.select();
};

// [renderer.js] 인라인 수정 저장 함수
window.saveInlineEdit = (id, newText) => {
    const trimmedText = newText.trim();
    if (!trimmedText) {
        window.renderTodos(); // 빈 내용이면 원래대로 복구
        return;
    }

    const index = molipTodos.findIndex(t => String(t.id) === String(id));
    if (index !== -1) {
        molipTodos[index].text = trimmedText;
        window.renderTodos(); // UI 갱신
        saveAllData();       // 데이터 저장
        window.showToast("수정되었습니다.", "success");
    }
};

/**
 * [renderer.js] 할 일 목록 렌더링 (날짜별/상태별 필터링 보강)
 */
window.renderTodos = () => {
    const list = document.getElementById('todo-list');
    const badge = document.getElementById('todo-count-badge');
    if (!list) return;

    const molipToday = window.getMolipDate(); // 시스템 기준 오늘 날짜

    // 1. [기존 로직] 화면에 표시할 후보군 선정 (Rule A, B, C 반영)
    let displayTodos = (molipTodos || []).filter(t => {
        if (!t) return false;

        const isToday = t.date === molipToday;
        const isUnfinishedPast = !t.completed && t.date !== molipToday; // 끝내지 못한 과거의 일
        const isFinishedPast = t.completed && t.date !== molipToday;    // 이미 끝낸 과거의 일

        // [A] 오늘 생성된 일은 무조건 표시
        if (isToday) return true;
        // [B] 과거의 일인데 아직 완료 안 했다면 무조건 표시 (날아감 방지 핵심)
        if (isUnfinishedPast) return true;
        // [C] 과거에 완료된 일은 '이전 항목 표시' 옵션이 켜졌을 때만 표시
        if (isFinishedPast && window.showPastCompleted) return true;

        return false;
    });

    // 2. [기존 로직] 뱃지 계산 (오늘 할 일 기준)
    const todayPool = (molipTodos || []).filter(t => t && t.date === molipToday);
    const total = todayPool.length;
    const completed = todayPool.filter(t => t.completed).length;

    if (badge) {
        badge.innerText = `${completed}/${total}`;
        badge.classList.toggle('all-completed', total > 0 && completed === total);
    }

    // 3. [기존 로직] '완료된 항목 숨기기' 필터 적용
    if (window.hideCompleted) {
        displayTodos = displayTodos.filter(t => !t.completed);
    }

    // 4. [기존 로직] 정렬 (미완료 상단 -> 완료 하단 / 그 안에서는 order순)
    displayTodos.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.order || 0) - (b.order || 0);
    });

    // 5. [기존 로직] 목록이 비었을 때 처리
    if (displayTodos.length === 0) {
        list.innerHTML = '<li class="empty-list-msg">표시할 할 일이 없습니다.</li>';
        return;
    }

    // 6. [기존 기능 + 드래그 속성] HTML 출력
    // draggable="true"와 window.handle... 핸들러들을 각 항목에 연결합니다.
    list.innerHTML = displayTodos.map((todo, index) => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" 
            data-id="${todo.id}"
            draggable="true"
            ondragstart="window.handleDragStart(event, ${index})"
            ondragover="window.handleDragOver(event)"
            ondragenter="window.handleDragEnter(event)"
            ondragleave="window.handleDragLeave(event)"
            ondrop="window.handleDrop(event, ${index})"
            ondragend="window.handleDragEnd(event)">
            <div class="todo-checkbox" onclick="window.toggleTodo('${todo.id}')">
                ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <span class="todo-text">${todo.text}</span>
            <div class="todo-actions">
                <button class="btn-todo-action btn-edit" onclick="window.editTodo('${todo.id}')">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-todo-action btn-trash" onclick="window.deleteTodo('${todo.id}')">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        </li>`).join('');
};

window.addMolipTodo = () => {
    const input = document.getElementById('todo-input');
    if (!input || !input.value.trim()) return;

    // [수정] 일반 toDateString() 대신 시스템 날짜 함수 사용
    const molipToday = window.getMolipDate(); 

    molipTodos.push({ 
        id: Date.now().toString(36), 
        text: input.value.trim(), 
        completed: false, 
        rewarded: false, 
        date: molipToday, // 여기에 시스템 기준 날짜 저장
        order: Date.now() 
    });

    input.value = ''; 
    window.renderTodos(); // 여기서 뱃지 업데이트도 함께 일어남
    saveAllData();
};

/**
 * [renderer.js] 투두 상태 토글 및 사라짐 방지 로직
 */
window.toggleTodo = (id) => {
    // 1. 대상 찾기
    const index = molipTodos.findIndex(t => String(t.id) === String(id));
    if (index === -1) return;

    window.playSFX('check');
    const molipToday = window.getMolipDate(); // 시스템 기준 오늘 날짜
    const wasCompleted = molipTodos[index].completed;

    // 2. 상태 반전
    molipTodos[index].completed = !molipTodos[index].completed;

    // [핵심 수정] 체크를 해제했을 때, 만약 과거 날짜의 항목이라면 날짜를 오늘로 바꿉니다.
    // 이렇게 하면 renderTodos의 '오늘 항목' 필터에 걸려 사라지지 않고 목록 상단으로 올라옵니다.
    if (!molipTodos[index].completed && molipTodos[index].date !== molipToday) {
        molipTodos[index].date = molipToday;
        window.showToast("미완료된 과거의 과업을 오늘로 가져왔습니다.", "info");
    }

    // 3. 항목이 '완료'가 되었을 때의 보상 및 대사 로직
    if (molipTodos[index].completed && !wasCompleted) {
        // 캐릭터 대사 출력
        if (currentPartner && !window.isHatching) { // 알 상태가 아닐 때만 실행
            const stageData = currentPartner.stages[currentStage] || currentPartner.stages['adult'];
            
            // [방어] todo_responses가 없으면 기본 격려 대사 세트 사용
            const responses = stageData.todo_responses || [
                "정말 멋져요!", "하나씩 해내는 모습이 보기 좋아요.", "수고하셨습니다!"
            ];
            
            const text = Array.isArray(responses) 
                ? responses[Math.floor(Math.random() * responses.length)] 
                : responses;
            window.showDialogue(text);
        }

        // 보상 지급 (최초 1회)
        if (!molipTodos[index].rewarded) {
            if (Math.random() < 0.05) { // 럭키 박스
                const bonusPoints = 50;
                collection.addPoints(bonusPoints);
                window.showToast(`연성로 가열! ${bonusPoints} Et 추가 획득`, "event");
            }
            collection.addPoints(5);
            molipTodos[index].rewarded = true;
            window.showToast("5 Et 획득!", "success");
            window.updateUI();
        }
    }

    // 4. UI 새로고침 및 데이터 저장
    window.renderTodos();
    saveAllData();
};

window.deleteTodo = (id) => { 
    // 1. 저장 상자(masterData) 내부의 데이터를 직접 필터링
    masterData.todo = masterData.todo.filter(t => String(t.id) !== String(id)); 
    // 2. 이름표(참조)를 다시 상자 내용물에 붙여줌
    syncReferences(); 
    window.renderTodos(); 
    saveAllData(); 
};

// --------------------------------------------------------------------------
// [SECTION 6] 작업 로그 및 영수증 엔진
// --------------------------------------------------------------------------

window.openDailyLog = () => {
    logViewDate = new Date(); // 열 때 항상 오늘로 초기화
    window.currentLogTab = 'list'; // 탭 상태를 '목록'으로 초기화
    
    const modal = document.getElementById('daily-log-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // 1. [핵심] 탭 버튼 UI 초기화 ('목록' 버튼 활성화)
        const tabs = modal.querySelectorAll('.shop-tab-re');
        tabs.forEach((btn, idx) => {
            if (idx === 0) {
                btn.classList.add('active'); // 첫 번째 '목록' 버튼에 액티브 추가
            } else {
                btn.classList.remove('active'); // 나머지 '통계' 버튼에서 제거
            }
        });

        // 2. 컨텐츠 영역 표시 초기화 (목록은 보이고 통계는 숨김)
        const listArea = document.getElementById('daily-log-list');
        const chartArea = document.getElementById('daily-log-chart-area');
        if (listArea) listArea.style.display = 'block';
        if (chartArea) chartArea.style.display = 'none';
    }

    window.renderDailyLogContent(); // 데이터 렌더링 실행
};

window.closeDailyLog = () => { document.getElementById('daily-log-modal').style.display = 'none'; };

window.changeLogDate = (offset) => {
    const nextDate = new Date(logViewDate);
    nextDate.setDate(nextDate.getDate() + offset);
    
    // 정확한 날짜 비교 (시간 제외)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextComp = new Date(nextDate);
    nextComp.setHours(0, 0, 0, 0);
    
    if (nextComp > today) return; // 오늘 이후로는 못 넘어가게 차단
    
    logViewDate = nextDate;
    window.renderDailyLogContent();
};

/**
 * [renderer.js] 선택된 날짜의 작업 로그 리스트와 통계를 화면에 출력합니다.
 */
/**
 * [renderer.js] 선택된 날짜의 작업 로그 리스트와 통계를 화면에 출력합니다.
 */
window.renderDailyLogContent = () => {
    const list = document.getElementById('daily-log-list');
    const dateDisplay = document.getElementById('log-date-display');
    if (!list) return;

    if (dateDisplay) {
        const isToday = logViewDate.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');
        dateDisplay.innerText = `${logViewDate.toLocaleDateString()} ${isToday ? '(오늘)' : ''}`;
    }

    const dateStr = logViewDate.toLocaleDateString('en-CA');
    const dailyLogs = masterData.logs?.[dateStr] || [];

    if (dailyLogs.length === 0) {
        list.innerHTML = `<div class="empty-log-msg" style="text-align:center; padding:30px; color:rgba(255,255,255,0.2); font-size:0.75rem;">기록 없음</div>`;
        window.updateLogChart([]); 
        return;
    }

    const maxDuration = Math.min(1800, Math.max(...dailyLogs.map(log => log.duration || 0), 60)); 

    list.innerHTML = dailyLogs.map(log => {
        const isWork = log.type === 'work';
        const durationSec = log.duration || 0;
        const durationMin = Math.floor(durationSec / 60);
        const durationRestSec = durationSec % 60;
        const barPercent = Math.max(5, Math.min(100, (durationSec / maxDuration) * 100));
        
        const typeClass = isWork ? 'work' : 'distract';
        const barColor = isWork ? '#a0c4ff' : '#ff6b6b';

        return `
            <div class="log-item-card">
                <div class="log-time">${log.time}</div>
                <div class="log-badge ${typeClass}">${isWork ? '집중' : '딴짓'}</div>
                <div class="log-owner">${log.owner || 'Unknown'}</div>
                <div class="log-progress-container">
                    <div class="log-progress-fill" style="width: ${barPercent}%; background: ${barColor};"></div>
                </div>
                <div class="log-duration">
                    ${durationMin > 0 ? `${durationMin}m` : `${durationRestSec}s`}
                </div>
            </div>
        `;
    }).join('');

    window.updateLogChart(dailyLogs);
};

/**
 * [renderer.js] 작업 기록 모달의 탭(목록/통계)을 전환합니다.
 * 통합 탭 스타일인 .shop-tab-re 클래스를 제어합니다.
 */
window.switchLogTab = (tab, btn) => {
    window.currentLogTab = tab;

    // 1. 버튼 활성화 UI 처리 (통합 클래스명 적용)
    document.querySelectorAll('.shop-tab-re').forEach(b => {
        // 작업 기록 모달 내의 탭 버튼들만 선별하여 처리
        if (b.closest('#daily-log-modal')) {
            b.classList.remove('active');
        }
    });
    if (btn) btn.classList.add('active');

    // 2. 컨텐츠 표시 전환
    const listArea = document.getElementById('daily-log-list');
    const chartArea = document.getElementById('daily-log-chart-area');

    if (tab === 'list') {
        if (listArea) listArea.style.display = 'block';
        if (chartArea) chartArea.style.display = 'none';
        window.renderDailyLogContent(); 
    } else {
        if (listArea) listArea.style.display = 'none';
        if (chartArea) chartArea.style.display = 'block';
        
        const dateStr = logViewDate.toLocaleDateString('en-CA');
        const dailyLogs = masterData.logs?.[dateStr] || [];
        window.updateLogChart(dailyLogs);
    }
};

/**
 * [renderer.js] 작업 로그 데이터를 바탕으로 집중/딴짓 통계 및 프로그램별 상세 점유율을 그립니다.
 */
/**
 * [renderer.js] 작업 로그 데이터를 바탕으로 집중/딴짓 통계 및 프로그램별 상세 점유율을 그립니다.
 */
/**
 * [renderer.js] 작업 로그 데이터를 바탕으로 집중/딴짓 통계 및 프로그램별 상세 점유율을 그립니다.
 */
window.updateLogChart = (logs) => {
    const workBar = document.getElementById('stat-bar-work');
    const distractBar = document.getElementById('stat-bar-distract');
    const workPercentText = document.getElementById('stat-work-percent');
    const distractPercentText = document.getElementById('stat-distract-percent');
    const detailList = document.getElementById('stat-detail-list');
    const distractDetailList = document.getElementById('stat-distract-detail-list');

    if (!workBar || !distractBar || !detailList || !distractDetailList) return;

    let totalWork = 0;
    let totalDistract = 0;
    const workAppStats = {};     
    const distractAppStats = {}; 

    logs.forEach(log => {
        const duration = log.duration || 0;
        // [교정] 통계 계산 시에도 이름을 정제하여 동일 앱으로 인식하게 함
        const appName = window.cleanAppName(log.owner);
        
        if (log.type === 'work') {
            totalWork += duration;
            workAppStats[appName] = (workAppStats[appName] || 0) + duration;
        } else if (log.type === 'distract') {
            totalDistract += duration;
            distractAppStats[appName] = (distractAppStats[appName] || 0) + duration;
        }
    });

    const totalTime = totalWork + totalDistract;

    if (totalTime === 0) {
        workBar.style.width = "50%"; 
        distractBar.style.width = "50%";
        if (workPercentText) workPercentText.innerText = "0%";
        if (distractPercentText) distractPercentText.innerText = "0%";
        
        const noRecordHTML = `<div class="empty-log-msg" style="text-align:center; padding:15px; color:rgba(255,255,255,0.1); font-size:0.7rem;">기록 없음</div>`;
        detailList.innerHTML = noRecordHTML;
        distractDetailList.innerHTML = noRecordHTML;
        return;
    }

    const workRatio = (totalWork / totalTime) * 100;
    workBar.style.width = `${workRatio}%`;
    distractBar.style.width = `${100 - workRatio}%`;
    if (workPercentText) workPercentText.innerText = `${Math.round(workRatio)}%`;
    if (distractPercentText) distractPercentText.innerText = `${Math.round(100 - workRatio)}%`;

    const createStatListHTML = (stats, total, color) => {
        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return `<div class="empty-log-msg" style="text-align:center; padding:15px; color:rgba(255,255,255,0.1); font-size:0.7rem;">기록 없음</div>`;
        
        return sorted.map(([name, time]) => {
            const mins = (time / 60).toFixed(1);
            const percent = ((time / total) * 100).toFixed(1);
            return `
                <div class="stat-detail-item" style="border-left: 3px solid ${color};">
                    <div class="stat-app-name">${name}</div>
                    <div class="stat-app-info">
                        <span class="stat-min">${mins}m</span>
                        <span class="stat-percent" style="color: ${color};">${percent}%</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    detailList.innerHTML = createStatListHTML(workAppStats, totalWork, '#a0c4ff');
    distractDetailList.innerHTML = createStatListHTML(distractAppStats, totalDistract, '#ff6b6b');
};
/**
 * 영수증 출력 함수 (스마트 탐색 버전)
 * 지정된 날짜에 데이터가 없으면 오늘 날짜나 최신 데이터를 자동으로 찾아 출력합니다.
 */
window.saveLogAsReceipt = async () => {
    await saveAllData(); 

    // [수정] 모든 날짜 조회를 YYYY-MM-DD(en-CA) 형식으로 통일합니다.
    let targetDate = logViewDate || new Date();
    let viewDateKey = targetDate.toLocaleDateString('en-CA');
    let rawAppData = dailyAppTimeMap[viewDateKey];

    console.log(`[영수증] 1차 조회: "${viewDateKey}" -> ${rawAppData ? '성공' : '실패'}`);

    // 2차 시도: 오늘 날짜로 재시도
    if (!rawAppData) {
        const todayKey = window.getMolipDate();
        if (dailyAppTimeMap[todayKey]) {
            viewDateKey = todayKey;
            rawAppData = dailyAppTimeMap[todayKey];
            targetDate = new Date(); 
        }
    }

    // 3차 시도: 가장 최근 날짜 찾기
    if (!rawAppData) {
        const allKeys = Object.keys(dailyAppTimeMap);
        if (allKeys.length > 0) {
            allKeys.sort();
            const lastKey = allKeys[allKeys.length - 1];
            viewDateKey = lastKey;
            rawAppData = dailyAppTimeMap[lastKey];
            targetDate = new Date(lastKey);
        }
    }

    if (!rawAppData || Object.keys(rawAppData).length === 0) {
        return window.showToast("저장된 몰입 기록이 없습니다. 도구를 사용해 보세요!", "warning");
    }

    const focusApps = Object.keys(rawAppData);
    focusApps.sort((a, b) => a.localeCompare(b));

    const receiptNo = document.getElementById('receipt-no');
    const receiptDate = document.getElementById('receipt-date');
    const receiptChar = document.getElementById('receipt-char-name');
    
    if (receiptNo) receiptNo.innerText = `#${Math.floor(Math.random() * 9000) + 1000}`;
    if (receiptDate) receiptDate.innerText = targetDate.toLocaleDateString();
    if (receiptChar) receiptChar.innerText = currentPartner?.name || "Focus Dot";
    
    let totalSeconds = 0;
    const itemsHtml = focusApps.map(name => { 
        const time = rawAppData[name];
        totalSeconds += time; 
        return `
            <div class="receipt-item">
                <span class="name">${name}</span>
                <span class="dots"></span>
                <span class="time">${formatReceiptTime(time)}</span>
            </div>`; 
    }).join('');
    
    document.getElementById('receipt-items').innerHTML = itemsHtml;
    document.getElementById('receipt-total-time').innerText = formatReceiptTime(totalSeconds);

    const wrapper = document.getElementById('receipt-wrapper');
    const receiptArea = document.getElementById('focus-receipt');
    
    if (!wrapper || !receiptArea) return;

    wrapper.style.display = "flex";
    setTimeout(() => {
        const rect = receiptArea.getBoundingClientRect(); 
        ipcRenderer.send('save-log-image', { 
            x: 0, y: 0, width: Math.ceil(rect.width), height: Math.ceil(rect.height) 
        });
        setTimeout(() => { wrapper.style.display = "none"; }, 1000);
    }, 500);
};

// --------------------------------------------------------------------------
// [SECTION 7] 상점 및 상호작용
// --------------------------------------------------------------------------

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



// --------------------------------------------------------------------------
// [SECTION 8] 엔진 및 이벤트 (투두 엔터키 포함)
// --------------------------------------------------------------------------

window.applyWindowMode = () => { 
    const app = document.getElementById('app'); 
    if (app) app.classList.toggle('window-mode', window.isWindowMode); 
    ipcRenderer.send('set-window-mode', window.isWindowMode);
};

// [최종 수정] 자연스러운 카운트업 보장 버전
window.updateUI = function() {
    // 내부에서 사용할 변수를 전역 객체에서 가져오도록 보장
    const curProgress = window.progress;
    const curCollection = window.collection;

    if (!progress || !collection) return;

    const d = progress.getProgressData();
    const format = (s) => [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
        .map(v => v < 10 ? "0" + v : v).join(":");

    // 1. 기본 정보 업데이트
    if (document.getElementById('today-time')) document.getElementById('today-time').innerText = format(d.todayTime);
    if (document.getElementById('total-time')) document.getElementById('total-time').innerText = format(d.totalTime);
    if (document.getElementById('level-num')) document.getElementById('level-num').innerText = d.level;
    if (document.getElementById('exp-bar')) document.getElementById('exp-bar').style.width = `${d.percent || 0}%`;

    // 2. [핵심] 에테르 카운트업 애니메이션
    const pointsElement = document.getElementById('work-points');
    if (pointsElement) {
        const actualPoints = curCollection.points;

        // 숫자가 다르고, 애니메이션이 아직 실행 중이 아닐 때만 시작
        if (displayedPoints !== actualPoints && !isPointAnimating) {
            isPointAnimating = true;
            pointsElement.classList.add('point-pop');

            const step = () => {
                const diff = actualPoints - displayedPoints;
                
                // 자연스러운 흐름을 위해 차이의 15%만큼 이동하되, 최소 0.1씩은 움직이게 함
                if (Math.abs(diff) < 0.1) {
                    displayedPoints = actualPoints;
                } else {
                    displayedPoints += diff * 0.15; 
                }

                // 화면 업데이트
                pointsElement.innerHTML = `${Math.floor(displayedPoints).toLocaleString()} Et</i>`;

                if (displayedPoints !== actualPoints) {
                    requestAnimationFrame(step); // 목표값 도달까지 계속 실행
                } else {
                    isPointAnimating = false; // 종료 시 플래그 해제
                    setTimeout(() => pointsElement.classList.remove('point-pop'), 200);
                }
            };
            requestAnimationFrame(step);
        } else if (!isPointAnimating) {
            // 애니메이션 중이 아닐 때만 텍스트 고정
            pointsElement.innerHTML = `${actualPoints.toLocaleString()} Et</i>`;
        }
    }
    
    // 3. 파트너 및 호감도 업데이트
    if (currentPartner) {
        const nameTag = document.getElementById('char-name-tag');
        if (nameTag) nameTag.innerText = collection.activeEgg ? (currentPartner.egg_name || "알") : currentPartner.name;
        
        const intimacyVal = document.getElementById('intimacy-val');
        if (intimacyVal) {
            const currentInt = charIntimacyMap[currentPartner.id] || 0;
            intimacyVal.innerText = currentInt.toFixed(1);
            const intimacyBar = document.getElementById('intimacy-bar');
            if (intimacyBar) intimacyBar.style.width = `${currentInt}%`;
        }
    }

    // [renderer.js] window.updateUI 함수 내부 수정
    const expFill = document.getElementById('exp-fill');
    const levelText = document.getElementById('level-text');
    const expText = document.getElementById('exp-text');

    if (expFill && levelText && expText) {
        // 1. 데이터 가져오기 (속성명 확인: .exp 인지 .experience 인지)
        const currentExp = progress.exp || progress.experience || 0;
        const maxExp = progress.nextLevelExp || progress.maxExp || 100; // 0 방지용 기본값 100
        const level = progress.level || 1;

        // 2. 퍼센트 계산 (NaN 방지: maxExp가 0이 아니어야 함)
        let percent = 0;
        if (maxExp > 0) {
            percent = Math.min(100, (currentExp / maxExp) * 100);
        }

        // 3. UI 반영
        expFill.style.width = `${percent}%`;
        levelText.innerText = `LV. ${level}`;
        expText.innerText = `${currentExp.toLocaleString()} / ${maxExp.toLocaleString()}`;

        // 로그로 확인 (바가 안 움직일 때 F12 눌러서 확인용)
        // console.log(`[XP 업데이트] 레벨: ${level}, 경험치: ${currentExp}/${maxExp} (${percent}%)`);
    }
};

/**
 * 메인 루프: 감지, 기록, 저장, 캐릭터 피드백을 총괄합니다.
 */
async function updateLoop() {
    // 1. 기본 방어막
    if (!masterData || window.isResetting) return;

    // 🛡️ [데이터 구조 강제 초기화] - 없는 서랍을 즉시 만듭니다.
    if (!masterData.settings) masterData.settings = {};
    if (!masterData.settings.monitor) masterData.settings.monitor = { workKeywords: [], distractKeywords: [] };
    if (!masterData.progress) masterData.progress = { lastSaveDate: window.getMolipDate(), todayFocusTime: 0 };

    // 🛡️ [안전 변수 생성] - 전역 변수가 undefined여도 빈 배열([])로 취급해 에러를 막습니다.
    const safeTodos = (typeof molipTodos !== 'undefined' && molipTodos) ? molipTodos : [];
    const safeHabits = (typeof molipHabits !== 'undefined' && molipHabits) ? molipHabits : [];
    const safeOwnedIds = (collection && collection.ownedIds) ? collection.ownedIds : [];
    const safeGifts = (typeof givenGiftsMap !== 'undefined' && givenGiftsMap) ? givenGiftsMap : {};
    const safeWorkApps = (typeof workApps !== 'undefined' && workApps) ? workApps : [];
    const safeDistractionApps = (typeof distractionApps !== 'undefined' && distractionApps) ? distractionApps : [];
    const safeWorkKeys = masterData.settings.monitor.workKeywords || [];
    const safeDistractKeys = masterData.settings.monitor.distractKeywords || [];

    if (!dailyAppTimeMap) dailyAppTimeMap = masterData.dailyAppTimeMap || {};

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

        // --- [2] 활성 창 분석 및 UI 업데이트 ---
        const rawOwner = lastActiveWin?.owner || "Ether Flow";
        const cleanedName = window.cleanAppName(rawOwner);
        const isSelf = (
            cleanedName === "Ether Flow" || 
            cleanedName === "Electron" || 
            cleanedName === "내 연구실" ||
            rawOwner.includes("Ether Flow")
        );

        // 상단 앱 이름 표기
        const appNameEl = document.getElementById('current-app-name');
        const distractNameEl = document.getElementById('current-distract-name');
        if (appNameEl) appNameEl.innerText = isSelf ? "내 연구실" : cleanedName;
        if (distractNameEl) distractNameEl.innerText = isSelf ? "내 연구실" : cleanedName;

        // 등록 버튼 활성화/비활성화 제어
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

        // --- [3] 상태 판정 및 복귀 감지 ---
        isActuallyWorking = !isSelf && safeWorkApps.some(app => rawOwner.toLowerCase().includes(app.toLowerCase()));
        isDistraction = !isSelf && safeDistractionApps.some(app => rawOwner.toLowerCase().includes(app.toLowerCase()));
        const isFocusing = isActuallyWorking && !isIdle && !isDistraction;
        
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
            recordWorkLogEntry(rawOwner, isFocusing ? 'work' : 'distract');
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

        // --- [6] 서신(Mailbox) 트리거 체크 (모든 스탯 보존) ---
        if (mailbox) {
            const adultCount = charData.characters.filter(char => {
                const growthSec = charGrowthMap[char.id] || 0;
                return (growthSec / 60) >= (char.evolution_level || EVOLUTION_TARGET_MIN);
            }).length;

            const isPerfectDay = (safeTodos.length > 0 && safeTodos.every(t => t.completed)) && 
                                (safeHabits.length > 0 && safeHabits.every(h => h.completed));
            const petKey = `${currentPartner?.id}_${nowMolipDate}`;
            const lastSaveDateVal = masterData.progress.lastSaveDate ? new Date(masterData.progress.lastSaveDate) : new Date();
            const daysSinceLastSave = Math.floor((new Date() - lastSaveDateVal) / (1000 * 60 * 60 * 24));

            // ✨ 아티스트님이 원하시는 모든 상세 스탯을 stats 객체에 담습니다.
            const stats = {
                level: progress.level,
                alchemist_level: progress.level,
                points: collection.points,
                rich_alchemist: collection.points,
                totalTime: progress.totalFocusTime,
                total_focus: progress.totalFocusTime,
                marathonTime: window.marathonTime || 0,
                marathon_focus: window.marathonTime || 0,
                partnerId: currentPartner?.id,
                current_stage: currentStage,
                intimacy_level: charIntimacyMap[currentPartner?.id] || 0,
                growth_level: charGrowthMap[currentPartner?.id] || 0,
                adultCount: adultCount,
                all_growth: charGrowthMap,
                todoCount: safeTodos.filter(t => t.completed).length,
                todo_count: safeTodos.filter(t => t.completed).length,
                habit_master: safeHabits.length > 0 ? Math.max(...safeHabits.map(h => h.streak || 0), 0) : 0,
                ownedCount: safeOwnedIds.length,
                owned_count: safeOwnedIds.length,
                app_juggler: safeWorkApps.length,
                gift_total_count: Object.values(safeGifts).reduce((sum, list) => sum + (list ? list.length : 0), 0),
                isPerfectDay: isPerfectDay,
                perfect_day: isPerfectDay,
                isFlowActive: isFocusing,
                flow_state: isFocusing,
                failed_attempt_count: masterData.failedCount || 0,
                inactive_days: daysSinceLastSave,
                return_after_long_absence: daysSinceLastSave >= 7,
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
 * [renderer.js] 상태 배지의 클래스와 아이콘을 CSS 정의에 맞춰 업데이트합니다.
 */
function updateStatusBadge() {
    const badgeEl = document.getElementById('status-badge');
    if (!badgeEl) return;

    // 1. 상태에 따른 클래스명과 아이콘, 텍스트 정의 (style.css와 100% 일치)
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
        
        // 몰입의 정점(Flow State) 연출 추가 (선택 사항)
        if (progress.totalFocusTime % 300 === 0 && progress.totalFocusTime > 0) {
            statusClass += " flow-state";
        }
    } else {
        statusClass = "waiting";
        icon = '<i class="fas fa-hourglass-start"></i>';
        text = "대기 중";
    }

    // 2. 클래스 교체 (기존 클래스 다 지우고 새로 부여)
    badgeEl.className = statusClass; 

    // 3. 아이콘과 텍스트를 함께 삽입 (innerText 사용 시 아이콘이 지워지는 문제 해결)
    badgeEl.innerHTML = `${icon} ${text}`;
}

/**
 * [renderer.js] 알의 부화 조건을 감시합니다.
 */
function checkHatching() {
    if (!collection || !collection.activeEgg || window.isHatching) return;

    // 1. [핵심 수정] 알이 생성된 시각을 가져옵니다.
    const hatchStartTime = new Date(collection.activeEgg.date).getTime();
    const now = Date.now();
    
    // 2. 경과 시간 계산 (초 단위)
    const elapsedSeconds = (now - hatchStartTime) / 1000;
    const requiredTime = collection.activeEgg.target || 15; // 15초

    // 3. 부화 조건 판별
    if (elapsedSeconds >= requiredTime) {
        console.log(`✨ 부화 조건 충족 (${Math.floor(elapsedSeconds)}초 경과)`);
        
        if (window.performHatchSequence) {
            window.performHatchSequence(collection.activeEgg.type);
        }
    }
}

/**
 * 캐릭터 대사를 랜덤으로 출력하되, 연속 중복을 차단합니다.
 * @param {string} category - 'work', 'distract', 'idle', 'return', 'welcome'
 */
window.showRandomDialogue = function(category) {
    if (!currentPartner || window.isHatching) return;

    const charInfo = charData.characters.find(c => c.id === currentPartner.id);
    if (!charInfo) return;

    const stageData = charInfo.stages[currentStage];
    if (!stageData) return;

    let targetList = [];

    // 1. 성체기 전용 특수 대사 로드
    if (currentStage === 'adult') {
        if (category === 'return') {
            targetList = stageData.return_responses || ["무사히 돌아오셨군요.", "기다리고 있었습니다."];
        } else if (category === 'welcome') {
            targetList = stageData.welcome_responses || ["어서 오세요.", "다시 만나서 기뻐요."];
        }
    }

    // 2. 일반 상태 대사 로드 (특수 대사가 없거나 조건 미충족 시)
    if (targetList.length === 0 && stageData.dialogues) {
        const dialogueCategory = stageData.dialogues[category === 'work' ? 'work' : (category === 'distract' ? 'distract' : 'idle')];
        
        if (Array.isArray(dialogueCategory)) {
            targetList = dialogueCategory;
        } else if (dialogueCategory) {
            // 성체기 호감도 분기
            const intimacy = charIntimacyMap[currentPartner.id] || 0;
            const subKey = intimacy >= 90 ? 'max' : (intimacy >= 55 ? 'high' : 'low');
            targetList = dialogueCategory[subKey] || dialogueCategory['high'] || [];
        }
    }

    // 3. [중복 방지] 필터링 후 랜덤 선택
    if (targetList.length > 0) {
        // 목록이 2개 이상이면 직전 대사(lastDialogue)를 제외
        const available = targetList.length > 1 
            ? targetList.filter(t => t !== lastDialogue) 
            : targetList;

        const selected = available[Math.floor(Math.random() * available.length)];
        lastDialogue = selected; // 현재 대사 기록
        window.showDialogue(selected, 1);
    }
};

// --------------------------------------------------------------------------
// [누락 복구 2] 창 모드 및 레이아웃 토글 함수
// --------------------------------------------------------------------------
window.toggleHorizontalMode = () => {
    window.isHorizontalMode = !window.isHorizontalMode;
    window.applyHorizontalMode();
    saveAllData();
};

window.applyHorizontalMode = () => { 
    const app = document.getElementById('app'); 
    if (app) {
        // window.isHorizontalMode가 false일 때 'horizontal-mode' 클래스가 확실히 제거되는지 확인
        if (window.isHorizontalMode) {
            app.classList.add('horizontal-mode');
        } else {
            app.classList.remove('horizontal-mode');
        }
    }
    
    const toggleContainer = document.getElementById('horizontal-mode-toggle');
    if (toggleContainer) {
        toggleContainer.classList.toggle('active', window.isHorizontalMode);
    }
    
    ipcRenderer.send('set-layout-size', window.isHorizontalMode);
};

// 토글 기능 함수
window.toggleHideCompleted = () => {
    window.hideCompleted = !window.hideCompleted;
    
    // 부모 컨테이너에 active 클래스 토글
    const toggleContainer = document.getElementById('hide-completed-toggle');
    if (toggleContainer) {
        toggleContainer.classList.toggle('active', window.hideCompleted);
    }
    
    window.renderTodos();
    window.renderHabits();
    saveAllData();
    window.showToast(window.hideCompleted ? "완료된 항목을 숨깁니다." : "모든 항목을 표시합니다.", "info");
};

/**
 * [renderer.js] 엔진 시작: 렌더러 재연결 -> 데이터 로드 -> 파트너 복구
 */
async function startEngine() {
    // 🛡️ [수정] masterData 자체가 없을 때만 잠시 대기 (통째로 초기화 금지)
    if (!masterData) {
        console.log("⏳ [System] 데이터 로드를 기다리는 중...");
        return setTimeout(window.startEngine, 100);
    }

    // 🚨 중요: masterData = { ... } 이런 코드가 있다면 절대 삭제하세요!
    // 아래처럼 없는 속성만 하나씩 안전하게 보충해야 합니다.
    if (!masterData.settings) masterData.settings = {};
    if (!masterData.settings.monitor) masterData.settings.monitor = { workKeywords: [], distractKeywords: [] };
    if (!masterData.tasks) masterData.tasks = [];
    if (!masterData.habits) masterData.habits = [];

    // 인트로 완료 여부 확인 (기존 데이터 보존)
    if (masterData.isFirstRun === undefined) masterData.isFirstRun = true;

    console.log("🚀 [System] 엔진 가동 시작...");

    // 🚨 TypeError 방지 핵심 로직
    masterData.inventory = masterData.inventory || { items: {}, byproducts: {} };
    masterData.inventory.byproducts = masterData.inventory.byproducts || {};
    masterData.settings = masterData.settings || {};
    masterData.mailbox = masterData.mailbox || { mailHistory: [] };
    
    console.log(masterData);

    // ✨ [핵심 수정 1] 상점 아이템을 만들기 전에 '언어 파일'부터 완벽하게 로드합니다.
    await window.loadLanguageData('ko');

    // ✨ [핵심 수정 2] 번역 데이터가 확보된 '지금' 상점 아이템을 생성합니다.
    shopItems = window.getShopItems();
    window.shopItems = shopItems;


    syncReferences(); // 데이터 참조 연결

    // 3. 시스템 설정 로드 (ReferenceError: s 해결)
    if (masterData.settings) {
        const s = masterData.settings;
        window.resetHour = s.resetHour || 0;
        window.isHorizontalMode = s.isHorizontalMode ?? true;
        window.hideCompleted = s.hideCompleted ?? false;
        window.showPastCompleted = s.showPastCompleted ?? false;
    }

    isEngineStarted = true;
    await window.loadLanguageData('ko');
    
    // 3. 데이터 초기화 및 보정 로직
    if (!savedData) {
        masterData = {
            progress: { level: 1, exp: 0, totalFocusTime: 0, todayFocusTime: 0, lastSaveDate: window.getMolipDate() },
            collection: { ownedIds: [], points: 0, activeEgg: null },
            mailbox: { mailHistory: [] },
            settings: { 
                workApps: [], distractionApps: [], isHorizontalMode: true, isWindowMode: true, 
                isAlwaysOnTop: false, font: 'paperlogy', language: 'ko',
                sound: { master: true, system: true, autoPlay: true },
                accordionStates: {}, hideCompleted: false, showPastCompleted: false,
                autoDeleteOldTasks: false, resetHour: 0
            },
            character: { intimacyMap: {}, growthMap: {}, selectedPartnerId: null },
            todo: [], habit: [], stats: { dailyAppTimeMap: {} },
            inventory: { items: {}, byproducts: {} },
            achievements: [], cylinderSaturation: 0, hatchCount: 1
        };
    } else {
        masterData = savedData;
        masterData.settings = masterData.settings || {};
        masterData.settings.accordionStates = masterData.settings.accordionStates || {};
        masterData.character = masterData.character || { intimacyMap: {}, growthMap: {} };
        masterData.collection = masterData.collection || { ownedIds: [], points: 0, activeEgg: null };
    }

    window.masterData = masterData;
    syncReferences(); // 데이터 연결

    // 4. 설정값 적용
    if (masterData.settings) {
        const s = masterData.settings; 
        window.resetHour = s.resetHour || 0;
        window.isHorizontalMode = s.isHorizontalMode ?? true;
        window.isWindowMode = s.isWindowMode ?? true;
        window.isAlwaysOnTop = s.isAlwaysOnTop ?? false;
        window.hideCompleted = s.hideCompleted ?? false;
        window.showPastCompleted = s.showPastCompleted ?? false;
        window.autoDeleteOldTasks = s.autoDeleteOldTasks ?? false;
    }

    isEngineStarted = true;

    // 5. 언어 및 매니저 로드
    await window.loadLanguageData('ko');

    progress = new ProgressManager(masterData.progress);
    collection = new CollectionManager(masterData.collection);

    const history = masterData.mailbox?.mailHistory || (Array.isArray(masterData.mailbox) ? masterData.mailbox : []);
    mailbox = new MailboxManager(history, mailPoolData);
    
    window.progress = progress;
    window.collection = collection;
    window.mailbox = mailbox;

    // 6. [핵심] 파트너 자동 복구 (ID가 없으면 알이나 도감에서 찾아냄)
    const savedId = masterData.character?.selectedPartnerId;
    const hasOwned = collection.ownedIds && collection.ownedIds.length > 0;
    const hasEgg = !!collection.activeEgg;
    
    // 신규 유저 판정 (아무것도 없을 때)
    if (!savedId && !hasEgg && !hasOwned) {
        const intro = document.getElementById('intro-sequence');
        if (intro) intro.style.display = 'flex';
        console.log("🆕 신규 유저 인트로 실행");
    } else {
        // 복구 우선순위: 저장된ID -> 도감 첫번째 -> 알
        const targetId = savedId || (hasOwned ? collection.ownedIds[0] : (hasEgg ? collection.activeEgg.type : null));
        
        if (targetId) {
            currentPartner = charData.characters.find(c => c.id === targetId);
            if (currentPartner) {
                // 이미지를 그립니다.
                await refreshCharacterSprite(); 
            }
        }
    }

    // 7. UI 최종 적용
    if (masterData.settings.accordionStates) {
        Object.entries(masterData.settings.accordionStates).forEach(([id, isActive]) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('active', !!isActive);
        });
    }

    window.applyHorizontalMode();
    window.applyWindowMode();
    window.applySavedFont();
    if (window.updatePinUI) window.updatePinUI();
    if (window.updatePastItemsUI) window.updatePastItemsUI();

    window.renderWorkAppList(); 
    window.renderDistractionAppList();

    if (!masterData.tasks) masterData.tasks = [];
    window.renderTodos(); 
    if (!masterData.habits) masterData.habits = [];
    window.renderHabits();

    window.updateUI();
    window.updateMailNotification();

    // ✨ [핵심 추가] 시동 즉시 첫 번째 서신 트리거 체크 실행
    if (mailbox) {
        console.log("📨 [System] 초기 서신 트리거 확인 중...");
        // level 1, points 0 등의 초기 stats 전달
        mailbox.checkTriggers({ level: 1, alchemist_level: 1, points: 0, total_focus: 0 });
        window.updateMailNotification();
        window.renderMailList();
    }

    if (typeof window.startMainGameEngine === 'function') window.startMainGameEngine();

// 🎨 [핵심] 루프 가동
    if (window.renderer && typeof window.renderer.startLoop === 'function') {
        window.renderer.startLoop(); 
    }

    // 🎵 오디오 엔진 바인딩 호출
    if (typeof window.setupEngine === 'function') {
        window.setupEngine();
        console.log("🎵 [System] 오디오 컨트롤러 연결 완료");
    }
    
    window.startMainGameEngine();
    document.body.classList.add('ready');
}


document.addEventListener('DOMContentLoaded', () => {
    const unlockAudio = () => {
        Object.values(sounds).forEach(s => {
            s.play().then(() => { s.pause(); s.currentTime = 0; }).catch(() => {});
        });
        document.removeEventListener('click', unlockAudio); // 한 번만 실행 후 제거
        console.log("🔊 [System] 오디오 엔진 잠금 해제 완료");
    };
    document.addEventListener('click', unlockAudio);


    const todoInput = document.getElementById('todo-input');
    if (todoInput) {
        todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.addMolipTodo(); } });
    }
    const habitInput = document.getElementById('habit-input');
    if (habitInput) {
        habitInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); // 줄바꿈 방지
                window.addHabit();  // 기존에 정의된 습관 추가 함수 호출
            } 
        });
    }

    const canvas = document.getElementById('main-canvas');
    if (canvas) canvas.addEventListener('click', (e) => window.petCharacter(e));

    document.addEventListener('click', (e) => {
        // 클릭한 대상이 'modal-overlay' 클래스를 가지고 있다면 창을 닫음
        if (e.target.classList.contains('modal-overlay')) {
            window.closeAllModals();
        }
    });

    const saveEditBtn = document.getElementById('todo-edit-save-btn');
    const editInput = document.getElementById('todo-edit-input');

    if (saveEditBtn && editInput) {
        // 저장 버튼 클릭 시
        saveEditBtn.onclick = () => window.confirmEditTodo();
        
        // 엔터키 입력 시 저장
        editInput.onkeydown = (e) => {
            if (e.key === 'Enter') window.confirmEditTodo();
        };
    }

// [최종] renderer.js - 점프 없는 지연 툴팁 시스템
let tooltipTimeout = null;
let mouseX = 0; // 실시간 마우스 X 저장
let mouseY = 0; // 실시간 마우스 Y 저장
const TOOLTIP_DELAY = 250; // 0.5초 대기

/**
 * [renderer.js] 할 일 수정 모달에서 수정한 내용을 확정 저장합니다.
 */
window.confirmEditTodo = () => {
    const input = document.getElementById('todo-edit-input');
    const newText = input.value.trim();

    if (newText === "") {
        window.showToast("내용을 입력해주세요.", "warning");
        return;
    }

    const index = molipTodos.findIndex(t => String(t.id) === String(editingTodoId));
    if (index !== -1) {
        molipTodos[index].text = newText;
        window.renderTodos(); 
        saveAllData();       
        window.closeAllModals();
        window.showToast("과업이 수정되었습니다.", "success");
    }
    editingTodoId = null;

    // 테마 라디오 버튼 이벤트 연결 로직
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedThemeId = e.target.value; // 선택된 라디오의 value값 (예: ALCHEMY_LAB)
            console.log(`[테마 변경 요청] ID: ${selectedThemeId}`);
            
            // 1. 테마 적용 함수 호출
            window.applyTheme(selectedThemeId);
            
            // 2. 마스터 데이터에 저장 (나중에 켰을 때 유지되도록)
            if (window.masterData && window.masterData.settings) {
                window.masterData.settings.currentTheme = selectedThemeId;
                saveAllData();
            }
        });
    });
};

document.addEventListener('mousemove', (e) => {
    // 1. 툴팁 표시 여부와 상관없이 항상 현재 마우스 위치를 업데이트합니다.
    mouseX = e.clientX;
    mouseY = e.clientY;

    const tooltip = document.getElementById('common-tooltip');
    if (tooltip && tooltip.style.display === 'block') {
        // 2. 이미 떠 있는 툴팁은 부드럽게 따라다닙니다.
        tooltip.style.left = `${mouseX}px`; 
        tooltip.style.top = `${mouseY + 25}px`; 
    }
});

document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    const tooltip = document.getElementById('common-tooltip');
    
    if (target && tooltip) {
        const msg = target.getAttribute('data-tooltip');
        if (msg) {
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            
            tooltipTimeout = setTimeout(() => {
                tooltip.innerText = msg;
                
                // 3. [핵심] 나타나기 직전에 저장된 마우스 위치로 좌표를 먼저 고정합니다.
                tooltip.style.left = `${mouseX}px`;
                tooltip.style.top = `${mouseY + 25}px`;
                
                tooltip.style.display = 'block';
                tooltip.style.opacity = '1';
                // CSS 애니메이션 실행
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
        tooltip.style.animation = 'none'; // 애니메이션 초기화
    }
});

// 메인 버튼 클릭 사운드
    document.addEventListener('click', (e) => {
    // 버튼(.btn-game, button), 메뉴 아이템, 그리고 서신함 닫기 버튼 등을 포괄합니다.
    const btn = e.target.closest('btn-focus') || 
                e.target.closest('.btn-game');

    if (btn) {
        // [방어] 버튼이 비활성화 상태가 아닐 때만 소리를 냅니다.
        if (!btn.disabled) {
            window.playSFX('click');
        }
    }
}, true);

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

ipcRenderer.on('init-data', async (event, data) => {
    if (isEngineStarted) return;
    console.log("🚩 [동기화] 메인 프로세스로부터 데이터를 수신했습니다.");

    // 2. 전역 마스터 데이터 객체 할당
    masterData = data;
    window.masterData = data;

    // 3. 참조가 걸린 배열(투두/습관) 동기화
    // 단순히 배열을 교체(=)하지 않고 내용물만 비우고 채워 UI 참조를 유지합니다.
    if (data.todo && Array.isArray(data.todo)) {
        molipTodos.length = 0; 
        molipTodos.push(...data.todo.filter(t => t !== null));
    }
    if (data.habit && Array.isArray(data.habit)) {
        molipHabits.length = 0;
        molipHabits.push(...data.habit.filter(h => h !== null));
    }
    
    // 4. 캐릭터 유대 및 성장 기록 복구
    const charSave = data.character || {};
    charIntimacyMap = charSave.intimacyMap || {}; 
    charGrowthMap = charSave.growthMap || {}; 
    
    // 콘솔에서 접근 가능하도록 window 객체에 실시간 할당
    window.charIntimacyMap = charIntimacyMap;
    window.charGrowthMap = charGrowthMap;

    // 기타 수집 데이터 복구
    givenGiftsMap = charSave.givenGiftsMap || {};
    dailyPetCountMap = charSave.dailyPetCountMap || {};
    dailyGiftCountMap = charSave.dailyGiftCountMap || {};
    dailyAppTimeMap = data.dailyAppTimeMap || {};
    window.dailyAppTimeMap = dailyAppTimeMap;

    // 5. 매니저 객체 인스턴스 생성 및 데이터 주입
    progress = new ProgressManager(data.progress);
    window.progress = progress;
    
    collection = new CollectionManager(data.collection);
    window.collection = collection;
    
    const mailHistory = data.mailbox?.mailHistory || (Array.isArray(data.mailbox) ? data.mailbox : []);
    mailbox = new MailboxManager(mailHistory, mailPoolData);
    window.mailbox = mailbox;

    // 6. UI 및 알림 즉시 갱신
    window.renderTodos(); 
    window.renderHabits();
    window.updateUI();

    // 7. 엔진 가동 완료 플래그 설정
    isEngineStarted = true;

    // 약간의 지연 후 서신 알림 갱신
    setTimeout(() => {
        window.updateMailNotification();
        console.log("🚩 [성공] 모든 연구 데이터가 안전하게 동기화되었습니다.");
    }, 150);
});

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

function formatReceiptTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${sec}s` : `${sec}s`);
}

window.dragSrcIndex = null;
window.handleDragOver = (e) => { e.preventDefault(); return false; };
// [추가] 드래그 요소가 위로 올라왔을 때 하이라이트 표시
window.handleDragEnter = (e) => {
    const item = e.target.closest('.todo-item');
    // 드래그 중인 자기 자신이 아닐 때만 'drag-over' 클래스 추가
    if (item && !item.classList.contains('dragging')) {
        item.classList.add('drag-over');
    }
};

// [추가] 드래그 요소가 영역을 벗어났을 때 하이라이트 제거
window.handleDragLeave = (e) => {
    const item = e.target.closest('.todo-item');
    if (item) item.classList.remove('drag-over');
};

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

// [추가] 드래그가 완전히 끝났을 때(드롭 포함) 상태 초기화
window.handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    // 모든 항목에서 'drag-over' 클래스 제거
    document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
    window.dragSrcIndex = null;
};

// [renderer.js] 조작감이 개선된 드래그 앤 드롭 핸들러
window.handleDragStart = (e, index) => {
    window.dragSrcIndex = index;
    // 드래그 이미지 설정 (선택 사항)
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
};

/**
 * [renderer.js] 투두 순서 변경을 위한 드롭 핸들러
 */
/**
 * [renderer.js] 투두 순서 변경을 위한 드롭 핸들러
 * 화면에 표시된 목록과 내부 데이터 배열의 인덱스를 완벽히 동기화하여 순서를 재배치합니다.
 */
window.handleDrop = (e, targetIndex) => {
    e.preventDefault(); 
    // 드래그 시각 효과 제거
    document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over', 'dragging'));
    
    // 시작 인덱스가 없거나 동일한 위치에 드롭한 경우 무시
    if (window.dragSrcIndex === null || window.dragSrcIndex === targetIndex) return;

    const molipToday = window.getMolipDate();
    
    // 1. [교정] renderTodos와 '완벽히 동일한' 필터링 로직을 사용하여 임시 목록 생성
    // 인덱스 미스매치를 방지하기 위해 현재 사용자에게 보이는 목록을 그대로 재현해야 합니다.
    const todayTodos = molipTodos.filter(t => t && t.date === molipToday);
    let currentDisplay = todayTodos;

    // '지난 완료 항목 표시' 옵션 적용
    if (window.showPastCompleted) {
        const pastCompleted = molipTodos.filter(t => t && t.date !== molipToday && t.completed);
        currentDisplay = [...currentDisplay, ...pastCompleted];
    }
    
    // '완료된 항목 숨기기' 옵션 적용 (이 부분이 누락되면 인덱스가 꼬임)
    if (window.hideCompleted) {
        currentDisplay = currentDisplay.filter(t => !t.completed);
    }

    // 2. renderTodos와 동일한 정렬 규칙 적용 (완료 항목은 아래로, 나머지는 order순)
    currentDisplay.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.order || 0) - (b.order || 0);
    });

    // 3. 항목 이동 실행 (드래그 소스에서 제거 후 타겟 위치에 삽입)
    const [movedItem] = currentDisplay.splice(window.dragSrcIndex, 1);
    currentDisplay.splice(targetIndex, 0, movedItem);

    // 4. 이동 후 전체 목록에 순서 번호(order)를 다시 부여
    // currentDisplay 내의 요소들은 molipTodos의 참조값이므로 수정 시 원본 배열에도 반영됩니다.
    currentDisplay.forEach((todo, idx) => {
        todo.order = idx; 
    });

    // 5. UI 새로고침 및 데이터 영구 저장
    window.renderTodos(); 
    saveAllData(); 
    
    window.showToast("순서가 변경되었습니다.", "info");
};

// [추가] 레이아웃 설정 함수 (기존 toggle 대신 라디오에서 호출)
// [최종 통합] 레이아웃 설정 함수
window.setLayoutMode = (isHorizontal) => {
    window.isHorizontalMode = isHorizontal;
    window.applyHorizontalMode(); 
    saveAllData();
};

// [renderer.js] 설정 모달 열기/닫기 제어 함수 수정
window.toggleSettings = (show) => {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.style.display = show ? 'flex' : 'none';
    
    if (show) {
        const s = masterData.settings || {};

        if (show) {
            // [추가] 언어 드롭다운 값 동기화
            const langSelect = document.getElementById('language-select');
            if (langSelect) langSelect.value = masterData.settings?.language || 'ko';
        }

        // 1. 일반 설정 동기화 (폰트)
        const currentFont = s.font || 'paperlogy';
        const fontRadio = document.querySelector(`input[name="font-choice"][value="${currentFont}"]`);
        if (fontRadio) fontRadio.checked = true;

        // [핵심 추가] 테마 설정 동기화
        // 저장된 테마 ID를 가져와 해당 라디오 버튼을 체크합니다.
        const currentTheme = s.currentTheme || 'DEFAULT_DARK'; 
        const themeRadio = document.querySelector(`input[name="theme-choice"][value="${currentTheme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }

        // 2. 가로 모드 토글 UI 상태 동기화
        const horizontalToggle = document.getElementById('horizontal-mode-toggle');
        if (horizontalToggle) {
            horizontalToggle.classList.toggle('active', window.isHorizontalMode);
        }

        // 3. 작업 설정(Apps) UI 동기화
        const resetSelect = document.getElementById('reset-hour-select');
        if (resetSelect) resetSelect.value = window.resetHour;

        const hideToggle = document.getElementById('hide-completed-toggle');
        if (hideToggle) hideToggle.classList.toggle('active', window.hideCompleted);

        const showPastToggle = document.getElementById('show-past-toggle');
        if (showPastToggle) showPastToggle.classList.toggle('active', window.showPastCompleted);

        const autoDeleteToggle = document.getElementById('auto-delete-toggle');
        if (autoDeleteToggle) autoDeleteToggle.classList.toggle('active', window.autoDeleteOldTasks);

        if (show) {
            const s = masterData.settings || {};
            const currentTheme = s.currentTheme || localStorage.getItem('ether-flow-theme') || 'DEFAULT_DARK';
            
            // 현재 테마에 맞는 라디오 버튼을 찾아 체크 표시
            const themeRadio = document.querySelector(`input[name="theme-choice"][value="${currentTheme}"]`);
            if (themeRadio) themeRadio.checked = true;
        }

        // ✨ [추가] 사운드 UI 상태 동기화 호출
        window.updateSoundUI();

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

// [renderer.js] 누락된 편지함 UI 제어 함수들 추가
// 1. 뱃지 카운트 업데이트 로직으로 교체
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

// 3. 편지함 목록 렌더링 (매니저 데이터 기반)
// [renderer.js] 편지함 목록 렌더링 수정
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

// [renderer.js] 편지함 모달 열기 함수 수정
window.toggleMailbox = (show) => {
    const modal = document.getElementById('mailbox-modal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        if (show) {
            mailDisplayLimit = 10; // ★ 열 때마다 다시 10개로 초기화
            window.renderMailList();
            
            // 스크롤 이벤트 리스너 등록 (한 번만 등록되도록 처리)
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

// [renderer.js] 메일 추가 로드 함수
window.loadMoreMails = () => {
    const allCount = mailbox.receivedMails.length;
    
    // 이미 다 불러왔다면 중단
    if (mailDisplayLimit >= allCount) return;

    // 10개 더 추가하고 다시 렌더링
    mailDisplayLimit += 10;
    window.renderMailList();
};

// [renderer.js] 상단 혹은 전역 변수 구역에 추가
window.newlyEarnedAchievements = []; // 이번 세션에서 획득한 신규 업적 리스트

window.clearAchieveNewStatus = (achId) => {
    // 갓 얻은 리스트에서 삭제
    window.newlyEarnedAchievements = window.newlyEarnedAchievements.filter(id => id !== achId);
    // 그리드 리프레시 (빛 꺼짐)
    window.renderAchievementGrid();
};


/**
 * 인트로의 마지막 단계에서 선택한 캐릭터와 계약을 체결합니다.
 */
window.finalizeContract = function(selectedChar) {
    const stage = document.getElementById('intro-sequence');
    if (!stage) return;

    // 1. 선택한 캐릭터를 '알' 상태로 컬렉션 매니저에 등록
    if (collection) {
        collection.activeEgg = {
            type: selectedChar.id,
            progress: 0,
            target: 15, // 초기 부화 목표 시간 (15초)
            date: new Date().toISOString()
        };
    }

    // 2. 현재 파트너 업데이트 및 정보 동기화
    currentPartner = selectedChar;
    charIntimacyMap[selectedChar.id] = 0;
    charGrowthMap[selectedChar.id] = 0;

    // 3. 변경된 모든 정보 즉시 저장
    saveAllData();

    // 4. 인트로 화면 페이드 아웃 연출
    stage.style.opacity = '0';
    stage.style.transition = 'opacity 1.5s ease';

    setTimeout(async () => {
        stage.style.display = 'none'; // 인트로 레이어 제거
        
        // 5. 캐릭터 창에 알 스프라이트 로드 및 UI 갱신
        await refreshCharacterSprite();
        window.updateUI();

        // ★ 핵심: 인트로가 완전히 닫힌 후 엔진을 가동합니다.
        window.startMainGameEngine();
    }, 1500);
};

// [renderer.js] 습관 등록
window.addHabit = () => {
    const input = document.getElementById('habit-input');
    if (!input || !input.value.trim()) return;
    
    molipHabits.push({
        id: 'habit_' + Date.now().toString(36), // 이미 개별 아이디가 부여됨
        text: input.value.trim(),
        completed: false,
        rewarded: false, // [추가] 오늘 보상 지급 여부 플래그
        streak: 0,
        lastCompletedDate: null
    });
    
    input.value = '';
    window.renderHabits();
    saveAllData();
    window.showToast("새로운 습관을 새겼습니다.", "success");
};

// [renderer.js] 습관 리스트 렌더링
window.renderHabits = () => {
    const list = document.getElementById('habit-list');
    const badge = document.getElementById('habit-count-badge');
    if (!list) return;

    // 1. 습관 뱃지 계산 (전체 습관 중 오늘 완료한 것)
    const total = (molipHabits || []).length;
    const completed = (molipHabits || []).filter(h => h && h.completed).length;

    if (badge) {
        badge.innerText = `${completed}/${total}`;
        badge.classList.toggle('all-completed', total > 0 && completed === total);
    }

    // 2. 리스트 필터링
    let displayHabits = molipHabits;
    if (window.hideCompleted) {
        displayHabits = molipHabits.filter(h => !h.completed);
    }

    if ((displayHabits || []).length === 0) {
        list.innerHTML = '<li class="empty-list-msg">등록된 습관이 없습니다.</li>';
        return;
    }

    // ★ [교정] molipHabits 대신 displayHabits를 사용하여 리스트를 그립니다.
    list.innerHTML = displayHabits.map(habit => `
        <li class="todo-item habit-item ${habit.completed ? 'completed' : ''}" data-id="${habit.id}">
            <div class="todo-checkbox" onclick="window.toggleHabit('${habit.id}')">
                ${habit.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="habit-content-wrap">
                <span class="todo-text">${habit.text}</span>
                ${habit.streak > 0 ? `<span class="habit-streak-badge"><i class="fas fa-fire"></i> ${habit.streak}</span>` : ''}
            </div>
            <div class="todo-actions">
                <button class="btn-todo-action btn-edit" onclick="window.editHabit('${habit.id}')"><i class="fas fa-pen"></i></button>
                <button class="btn-todo-action btn-trash" onclick="window.deleteHabit('${habit.id}')"><i class="fas fa-trash-can"></i></button>
            </div>
        </li>`).join('');
};

// [renderer.js] 습관 상태 토글 및 스트릭 계산
/**
 * @param {string} id - 토글할 습관의 고유 ID
 */
window.toggleHabit = (id) => {
    // 1. 대상 습관 데이터 확보
    const habit = molipHabits.find(h => h.id === id);
    if (!habit) return;

    window.playSFX('check');

    const molipToday = window.getMolipDate(); // 시스템 기준 오늘 날짜
    const wasCompleted = habit.completed;

    // 2. 상태 반전
    habit.completed = !habit.completed;

    // 3. 완료(체크) 상태가 되었을 때의 로직
    if (habit.completed && !wasCompleted) {
        const lastDate = habit.lastCompletedDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        // [스트릭 계산 보정] 처음이거나 기록이 깨졌던 경우를 명확히 1일로 설정
        if (lastDate === yesterdayStr) {
            // 어제에 이어 오늘도 성공한 경우
            habit.streak += 1;
        } else if (!lastDate || lastDate !== molipToday) {
            // ★ 처음 완수(null)하거나, 어제 건너뛰었다면 오늘부터 1일째
            habit.streak = 1; 
        }
        
        habit.lastCompletedDate = molipToday; // 마지막 완료일 갱신

        // [중복 보상 방지 및 토스트 알림]
        if (!habit.rewarded) {
            window.collection.addPoints(10); // 10 Et 지급
            habit.rewarded = true;    // 오늘 보상 완료 플래그
            window.showToast(`습관 완수! ${habit.streak}일째입니다. +10 Et`, "success");
        } else {
            // 보상을 이미 받았다면 일수 정보만 노출
            window.showToast(`오늘의 수련은 이미 마쳤습니다. (${habit.streak}일째)`, "info");
        }
    } 
    // 4. 완료 취소 시
    else if (!habit.completed && wasCompleted) {
        // 취소해도 이미 올라간 스트릭이나 보상은 유지하여 실수를 방지합니다.
    }

    // 5. UI 및 데이터 저장
    window.renderHabits();
    window.updateUI();
    saveAllData();
};

// [renderer.js] 자정 초기화 체크 함수
function checkHabitReset() {
    const molipToday = window.getMolipDate(); // 설정된 기준 시간이 반영된 오늘 날짜
    let isChanged = false;

    // 어제 날짜 구하기 (스트릭 유지 여부 판별용)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    // 데이터 오염 방지를 위한 배열 체크
    if (!molipHabits) return;

    molipHabits.forEach(habit => {
        if (!habit) return;

        // 1. [상태 및 보상 리셋] 마지막 완료일이 '기준 시간상의 오늘'이 아니라면 초기화
        if (habit.completed && habit.lastCompletedDate !== molipToday) {
            habit.completed = false; // 체크 해제
            habit.rewarded = false;  // 보상 획득 권한 복구 (중복 보상 방지 리셋)
            isChanged = true;
            console.log(`[시스템] 습관 초기화 완료: ${habit.text}`);
        }
        
        // 2. [스트릭 초기화] 어제도 완료하지 않았고 오늘도 아직 완료하지 않았다면 스트릭 리셋
        if (habit.lastCompletedDate !== molipToday && habit.lastCompletedDate !== yesterdayStr) {
            if (habit.streak > 0) {
                habit.streak = 0; // 연속 기록 파기
                isChanged = true;
            }
        }
    });

    // 3. 변경 사항이 있을 때만 UI 갱신 및 데이터 저장
    if (isChanged) {
        window.renderHabits(); // 습관 리스트 새로고침
        saveAllData();         // 상태 영구 저장
    }
}

// [renderer.js] 습관 인라인 수정 진입
window.editHabit = (id) => {
    const habitItem = document.querySelector(`.habit-item[data-id="${id}"]`);
    if (!habitItem) return;

    const textSpan = habitItem.querySelector('.todo-text');
    const currentText = textSpan.innerText;

    // 인라인 입력창 생성 (중복 토스트 방지를 위해 onblur 제어 포함)
    textSpan.innerHTML = `
        <input type="text" class="inline-edit-input" 
               value="${currentText}" 
               onkeydown="if(event.key==='Enter') { this.onblur = null; window.saveHabitInlineEdit('${id}', this.value); } 
                          if(event.key==='Escape') { this.onblur = null; window.renderHabits(); }"
               onblur="window.saveHabitInlineEdit('${id}', this.value)">
    `;

    const input = textSpan.querySelector('input');
    input.focus();
    input.select();
};

// [renderer.js] 습관 수정 내용 저장
window.saveHabitInlineEdit = (id, newText) => {
    const trimmedText = newText.trim();
    if (!trimmedText) {
        window.renderHabits(); // 빈 내용이면 복구
        return;
    }

    const index = molipHabits.findIndex(h => String(h.id) === String(id));
    if (index !== -1) {
        molipHabits[index].text = trimmedText;
        window.renderHabits(); // 리스트 갱신
        saveAllData();       // 데이터 저장
        window.showToast("습관이 수정되었습니다.", "success");
    }
};

// [renderer.js] 습관 삭제
/**
 * @param {string} id - 삭제할 습관의 고유 ID
 */
window.deleteHabit = (id) => {
    window.showConfirm("습관 파기", "삭제 시 연속 달성 기록이 모두 사라집니다.", () => {
        // 1. 저장 상자 내부 데이터 직접 필터링
        masterData.habit = masterData.habit.filter(h => String(h.id) !== String(id));
        // 2. 이름표 재연결
        syncReferences();
        window.renderHabits();
        saveAllData();
    });
};

// [renderer.js] 데이터 복구 및 청소 함수
/**
 * 데이터 내부에 섞인 null 값을 제거하고 정상화하는 긴급 복구 함수입니다.
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
 * [renderer.js] JSON 구조에 맞춰 상황별 대사 배열을 반환합니다.
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

/**
 * 설정된 초기화 시간을 반영한 '게임 내 오늘 날짜'를 반환합니다.
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

window.toggleShowPast = () => {
    window.showPastCompleted = !window.showPastCompleted;
    document.getElementById('show-past-toggle').classList.toggle('active', window.showPastCompleted);
    window.renderTodos();
    saveAllData();
};

window.changeResetHour = (val) => {
    window.resetHour = parseInt(val);
    saveAllData();
    window.showToast(`이제 일과가 오전 ${val}시에 초기화됩니다.`, "info");
    window.renderTodos(); // 기준 날짜 변경에 따른 리스트 갱신
};

window.toggleAutoDelete = () => {
    window.autoDeleteOldTasks = !window.autoDeleteOldTasks;
    
    const toggle = document.getElementById('auto-delete-toggle');
    if (toggle) toggle.classList.toggle('active', window.autoDeleteOldTasks);
    
    if (window.autoDeleteOldTasks) {
        window.cleanupOldTasks(); // 켜는 순간 즉시 한 번 청소
    }
    
    saveAllData();
};

/**
 * [renderer.js] 완료된 지 7일이 지난 투두 항목을 영구 삭제합니다.
 */
window.cleanupOldTasks = () => {
    if (!window.autoDeleteOldTasks || !molipTodos) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // 시간 단위를 자정으로 고정하여 날짜만 비교

    const originalCount = molipTodos.length;
    
    molipTodos = molipTodos.filter(t => {
        if (!t.completed) return true; // 미완료 항목은 보존
        
        const taskDate = new Date(t.date);
        // 7일 전보다 이후(최근)이거나 오늘이면 유지, 그보다 오래됐으면 삭제
        return taskDate >= sevenDaysAgo;
    });

    if (molipTodos.length < originalCount) {
        const deletedCount = originalCount - molipTodos.length;
        console.log(`[시스템] 오래된 할 일 ${deletedCount}개가 정리되었습니다.`);
        window.renderTodos();
        saveAllData();
    }
};

// [renderer.js 맨 하단 수정]
ipcRenderer.on('active-window-update', (event, data) => { // 'active-window'에서 수정
    lastActiveWin = data; 
});



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

/**
 * [renderer.js] 업적 달성 조건 감시 (보상 수령 연동 버전)
 */
window.checkAchievementTriggers = () => {
    if (!progress || !masterData || !window.mailbox) return;
};

/* ============================================================
   [🏆 시스템 통합: 서신, 보상, 업적 관리] 
   ============================================================ */

// 전역 상태 변수 (중복 실행 및 알림 방지)
window.mailTypeTimer = null;
const sessionUnlockedAchievements = new Set();

/**
 * 1. 서신 상세보기 (발신자 표시 + 타이핑 연출 + [스킵 기능 추가])
 */
window.openLetter = (mailId) => {
    // 1. 매니저 확인
    const mb = window.mailbox || mailbox;
    if (!mb) return;
    
    // 타이머 및 효과음 초기화
    if (window.mailTypeTimer) { clearInterval(window.mailTypeTimer); window.mailTypeTimer = null; }
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

    // [핵심 추가] 타이핑 도중 모달 클릭 시 즉시 내용을 다 띄우는 함수
    const handleLetterSkip = () => {
        // 타이핑이 아직 진행 중(타이머 존재)일 때만 작동
        if (window.mailTypeTimer) {
            clearInterval(window.mailTypeTimer);
            window.mailTypeTimer = null; // 타이머 정지
            
            // 즉시 전체 본문 출력 (줄바꿈 처리 포함)
            if (contentEl) {
                contentEl.innerHTML = mail.content.replace(/\n/g, '<br>');
            }
            // 보상 버튼 즉시 생성
            window.renderLetterReward(mail);
            
            // 스킵 완료 후 클릭 이벤트 제거
            modal.removeEventListener('click', handleLetterSkip);
        }
    };

    // 이전 리스너 중복 방지를 위해 제거 후 새로 등록 (모달 자체에 클릭 이벤트 부여)
    modal.removeEventListener('click', modal._currentSkipHandler);
    modal._currentSkipHandler = handleLetterSkip;
    modal.addEventListener('click', handleLetterSkip);

    // 데이터 상태 업데이트 (읽음 처리 및 저장)
    mail.isRead = true;

    // 본문 타이핑 효과 시작
    if (contentEl) {
        if (window.mailTypeTimer) clearInterval(window.mailTypeTimer);
        
        window.startTypewriter(mail.content, contentEl, () => {
            // 자연스럽게 타이핑이 끝났을 때의 처리
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
            // 타이핑이 정상 종료됨
            clearInterval(window.mailTypeTimer);
            window.mailTypeTimer = null; 
            if (onComplete) onComplete(); 
        }
    }, 30);
};

/**
 * 3. 보상 버튼 렌더링 (디자인 규격 및 FA 아이콘 적용)
 */
window.renderLetterReward = (mail) => {
    const rewardZone = document.getElementById('letter-reward-zone');
    if (!rewardZone || !mail.reward) return;

    // 이미 수령한 경우
    if (mail.isRewardClaimed) {
        rewardZone.innerHTML = `
            <div class="mail-reward-box claimed" style="text-align: center; margin-top: 20px;">
                <button class="btn-claim-reward" disabled style="opacity: 0.6; cursor: default;">
                    <i class="fa-solid fa-check"></i> 보상 수령 완료
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

    // 유형별 데이터 및 아이콘 매칭
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
        buttonText = `${displayVal} 업적 해금하기`;
    };

    // style.css의 .mail-reward-box와 .reward-reveal(애니메이션) 클래스 사용
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
 * [renderer.js] 보상 수령 처리 (데이터-UI 완전 동기화 및 에러 해결 버전)
 */
window.claimMailReward = (mailId) => {
    // 1. 필수 객체 체크 (window.collection이 있는지 확인)
    if (!window.mailbox || !window.collection) {
        console.error("시스템이 아직 준비되지 않았습니다.");
        return;
    }
    
    const mail = window.mailbox.receivedMails.find(m => String(m.id) === String(mailId));
    if (!mail || mail.isRewardClaimed) return;

    const reward = window.mailbox.claimReward(mailId);
    if (reward) {
        let toastMsg = "";

        // 1. 에테르(포인트) 보상 처리
        if (reward.type === 'point' || reward.type === 'ether') {
            const amount = Number(reward.value || reward.amount || 0);
            
            // [해결책] 전역 객체인 window.collection의 포인트를 직접 올립니다.
            window.collection.points += amount;

            // 세이브 데이터(masterData)와도 즉시 동기화
            if (masterData.progress) masterData.progress.points = window.collection.points;
            if (masterData.collection) masterData.collection.points = window.collection.points;

            toastMsg = `${amount.toLocaleString()} 에테르를 수령했습니다!`;
            console.log(`[보상 성공] 획득: ${amount}, 현재잔액: ${window.collection.points}`);
        } 
        
        // 2. 아이템 보상 처리 (생략 없이 유지)
        else if (reward.type === 'item') {
            if (!masterData.inventory) masterData.inventory = { byproducts: {} };
            const amount = Number(reward.value || reward.amount || 1);
            masterData.inventory.byproducts[reward.id] = (masterData.inventory.byproducts[reward.id] || 0) + amount;
            const itemName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(reward.id) : "연구 재료";
            toastMsg = `${itemName} ${amount}개를 획득했습니다.`;
        }
        
        // 3. 업적 보상 처리
        else if (reward.type === 'achievement') {
            const achId = reward.value || reward.id;
            window.unlockAchievement(achId);
            saveAllData();
            window.renderLetterReward(mail);
            return;
        }

        // --- 공통 마무리 로직 ---
        if (toastMsg && window.showToast) window.showToast(toastMsg, "success");

        saveAllData(); // 파일 저장
        window.renderLetterReward(mail); // 버튼을 '수령 완료'로 변경
        
        // [중요] UI 즉시 갱신 (이제 window.collection을 바라보므로 정상 작동합니다)
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
    }
};

/**
 * [renderer.js] 업적 그리드 렌더링
 */
window.renderAchievementGrid = () => {
    const grid = document.getElementById('achievement-grid');
    if (!grid) return;
    
    grid.innerHTML = ""; // 초기화

    // window.achievementList가 정의되어 있어야 합니다.
    const list = window.achievementList || [];
    
    list.forEach(ach => {
        const isUnlocked = masterData.achievements.includes(ach.id);
        
        const slot = document.createElement('div');
        // style.css에 정의된 .achieve-slot 사용
        slot.className = `achieve-slot ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        // 1. [핵심] 해금 여부에 따른 데이터 마스킹
        const title = isUnlocked ? ach.name : "???";
        const desc = isUnlocked ? (ach.desc || ach.description) : "아직 달성하지 못한 업적입니다.";
        
        // 2. 공용 툴팁 설정 (data-tooltip)
        slot.setAttribute('data-tooltip', `[${title}]\n${desc}`);

        // 3. 아이콘 설정
        // 해금 시: 데이터에 있는 ach.icon 표시
        // 미해금 시: 물음표(?) 표시
        let iconHtml = "";
        if (isUnlocked) {
            const iconVal = ach.icon || 'assets/images/achieve/default.png';
            // ✨ 경로가 .png로 끝나면 img 태그로 출력
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

window.toggleAchievementModal = (show) => {
    const modal = document.getElementById('achievement-modal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';
    if (show) {
        window.renderAchievementGrid();
        window.updateAchievementBadge?.(false);
    }
};

window.unlockAchievement = (achievementId) => {
    // 🛡️ [방어막] 업적 배열이 없으면 즉시 빈 배열로 만듭니다. (에러 원천 차단)
    if (!masterData.achievements) masterData.achievements = [];

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

/**
 * 6. 서신 창 닫기
 */
window.closeLetterView = () => {
    // 1. [핵심] 창을 닫는 즉시 돌고 있던 모든 타이핑 타이머를 강제 종료합니다.
    if (window.mailTypeTimer) {
        clearInterval(window.mailTypeTimer);
        window.mailTypeTimer = null;
    }

    const modal = document.getElementById('letter-view-modal');
    if (modal) {
        modal.style.display = 'none';
    }

    // 2. 포커스를 강제로 바디로 돌려 클릭 이벤트가 씹히지 않게 합니다.
    document.body.focus();
};

// 1. 모달 열기
window.openSedimentModal = () => {
    const modal = document.getElementById('sediment-modal');
    if (!modal) return;
    
    // UI 업데이트 (현재 농도 및 재료 상황 반영)
    window.refreshSedimentUI(); 
    
    modal.style.display = 'flex';
};

// 2. 모달 닫기
window.closeSedimentModal = () => {
    document.getElementById('sediment-modal').style.display = 'none';
};

/* 연성로 */
window.refreshSedimentUI = () => {
    // 1. [방어] masterData나 inventory가 없을 경우를 대비해 기본값을 설정합니다.
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
    if (!grid) return;

    grid.innerHTML = byproductTable.map(item => {
        const count = inventory[item.id] || 0; // 이제 여기서 에러가 나지 않습니다.
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

    // 4. 연성 제단 업데이트 (조건 체크)
    if (window.updateAltarStatus) window.updateAltarStatus(); 
};

// [renderer.js] 실린더 심층 부산물 데이터 정의
const byproductTable = [
    { id: 'ether_sludge', name: '에테르 슬러지', icon: 'assets/images/items/sludge.png', rarity: 'common', minSat: 50, chance: 0.12 },
    { id: 'bleached_scales', name: '탈색된 비늘', icon: 'assets/images/items/scales.png', rarity: 'common', minSat: 50, chance: 0.10 },
    { id: 'petrified_memory', name: '석화된 기억', icon: 'assets/images/items/memory.png', rarity: 'uncommon', minSat: 65, chance: 0.08 },
    { id: 'transparent_husk', name: '투명한 허물', icon: 'assets/images/items/husk.png', rarity: 'uncommon', minSat: 65, chance: 0.06 },
    { id: 'pulsing_crystal', name: '박동하는 결정', icon: 'assets/images/items/crystal.png', rarity: 'rare', minSat: 80, chance: 0.04 },
    { id: 'floating_eye', name: '부유하는 안구', icon: 'assets/images/items/eye.png', rarity: 'rare', minSat: 80, chance: 0.03 },
    { id: 'abyssal_dregs', name: '심연의 침전물', icon: 'assets/images/items/dregs.png', rarity: 'epic', minSat: 90, chance: 0.015 },
    { id: 'incomplete_fetus', name: '불완전한 태아', icon: 'assets/images/items/fetus.png', rarity: 'epic', minSat: 95, chance: 0.01 }
];

// [상태 변수]
let cylinderSaturation = 0; // 현재 에테르 농도 (0~100)
let lastSedimentTick = Date.now(); // 가챠 체크 주기 관리

// [데이터 구조 확인 및 보정]
function initializeByproductData() {
    if (!masterData.inventory) masterData.inventory = {};
    if (!masterData.inventory.byproducts) {
        masterData.inventory.byproducts = {};
        byproductTable.forEach(item => {
            masterData.inventory.byproducts[item.id] = 0;
        });
    }
    
    // [추가] 세이브 데이터에서 농도 불러오기 (없으면 0)
    if (masterData.cylinderSaturation === undefined) {
        masterData.cylinderSaturation = 0;
    }
    // 전역 변수에 세이브된 값 할당
    cylinderSaturation = masterData.cylinderSaturation;
}

/**
 * 실린더 농도를 업데이트하고 부산물 발생 여부를 체크합니다. (매 초 호출 권장)
 */
window.updateCylinderSystem = () => {
    // 1. 농도 업데이트
    if (isActuallyWorking && !isIdle) {
        cylinderSaturation = Math.min(100, cylinderSaturation + 0.15);
    } else {
        cylinderSaturation = Math.max(0, cylinderSaturation - 0.07);
    }

    // [중요] 세이브 데이터 객체에 현재 농도 실시간 동기화
    masterData.cylinderSaturation = cylinderSaturation;

    // 2. 실시간 UI 반영 (이전과 동일)
    const satValEl = document.getElementById('sat-value');
    const satBarEl = document.getElementById('sat-bar-fill');
    if (satValEl && satBarEl) {
        satValEl.innerText = `${Math.floor(cylinderSaturation)}%`;
        satBarEl.style.width = `${cylinderSaturation}%`;
    }

    // 3. 침전물 발생 체크 (1분마다 1회)
    const now = Date.now();
    if (now - lastSedimentTick >= 60000) {
        lastSedimentTick = now;
        if (cylinderSaturation >= 50) {
            processSedimentation();
        }
    }
};

/**
 * 실제로 주사위를 굴려 아이템을 획득하는 내부 로직
 */
window.processSedimentation = () => {
    // 1. 당첨 아이템 선정 (가챠 로직)
    const item = window.getSedimentDrop(); 
    if (!item) return;

    // 2. 마스터 데이터에 아이템 추가
    if (!masterData.inventory.byproducts) masterData.inventory.byproducts = {};
    masterData.inventory.byproducts[item.id] = (masterData.inventory.byproducts[item.id] || 0) + 1;

    // 3. 세이브 데이터 저장
    saveAllData();

    // 1. 파트너 이름 확정
    const charName = collection.activeEgg ?
        (currentPartner.egg_name || "알") :
        (currentPartner ? currentPartner.name : "호문클루스");

    // 2. 조사 선택 (이/가)
    const particle = window.getKoreanParticle(charName, "이/가");

    // 3. 자연스러운 토스트 출력
    if (window.showToast) {
        window.showToast(`${charName}${particle} 실린더 속에서 '${item.name}'을(를) 건져 올렸습니다!`, "info");
    }

    // 5. 연성소 UI가 열려있다면 즉시 갱신
    if (window.refreshSedimentUI) window.refreshSedimentUI();
    if (window.updateAltarStatus) window.updateAltarStatus();
};

/**
 * [renderer.js] 한글 조사 자동 선택 함수 (이/가, 은/는, 을/를 등)
 * @param {string} word - 대상 단어 (예: '알', '모르가나')
 * @param {string} type - 조사 유형 ('이/가', '은/는', '을/를', '와/과')
 */
window.getKoreanParticle = (word, type) => {
    if (!word) return type;

    // 마지막 글자의 유니코드 확인
    const lastChar = word.charCodeAt(word.length - 1);

    // 한글 범위(가~힣)를 벗어나면 기본 조사 반환
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return type.split('/')[1];

    // 종성(받침) 유무 확인: (Unicode - 0xAC00) % 28
    // 종성 인덱스가 0이면 받침 없음, 0보다 크면 받침 있음
    const hasBatchim = (lastChar - 0xAC00) % 28 > 0;

    const [withBatchim, withoutBatchim] = type.split('/');

    return hasBatchim ? withBatchim : withoutBatchim;
};

/**
 * [renderer.js] 실린더 침전물 결정 함수 (가챠 로직)
 * 현재 농도(Saturation)에 따라 획득 가능한 아이템 중 하나를 확률적으로 선택합니다.
 */
window.getSedimentDrop = () => {
    const currentSat = cylinderSaturation; // 현재 실린더 농도
    
    // 1. [필터링] 현재 농도 조건(minSat)을 만족하는 아이템들만 모읍니다.
    const possibleItems = byproductTable.filter(item => currentSat >= item.minSat);
    
    if (possibleItems.length === 0) return null;

    // 2. [확률 정렬] 가장 희귀한 아이템(확률이 낮은 것)부터 검사합니다.
    // 그래야 흔한 아이템이 희귀한 아이템의 당첨 기회를 뺏지 않습니다.
    const sortedPool = [...possibleItems].sort((a, b) => a.chance - b.chance);

    // 3. [주사위 굴리기] 각 아이템의 확률과 대조
    for (const item of sortedPool) {
        if (Math.random() < item.chance) {
            console.log(`[침전 성공] 당첨 아이템: ${item.name} (확률: ${item.chance})`);
            return item; // 당첨된 즉시 해당 아이템 반환
        }
    }

    return null; // 모든 확률을 뚫지 못하면 이번엔 꽝
};

/**
 * 현재 연성 횟수에 따른 필요 비용 계산
 */
window.calculateNextEggCost = () => {
    const count = masterData.hatchCount || 1; // 1부터 시작
    return {
        ether: 5000 * Math.pow(4, count - 1), // 5,000 -> 20,000 -> 80,000 ...
        materials: {
            'ether_sludge': 10 * count,
            'petrified_memory': count > 1 ? 5 * (count - 1) : 0,
            'pulsing_crystal': count > 2 ? 2 * (count - 2) : 0
        }
    };
};

/**
 * 제단 UI 업데이트 (재료 충족 여부 표시)
 */
/**
 * [renderer.js] 제단 UI 업데이트 (모든 요구 재료 동적 표시)
 */
/**
 * [renderer.js] 제단 UI 업데이트 (동적 재료 표시)
 */
window.updateAltarStatus = () => {
    try {
        const cost = window.calculateNextEggCost();
        const inv = masterData.inventory.byproducts || {};
        const recipeContainer = document.querySelector('.recipe-check');
        if (!recipeContainer) return;

        let isReady = true;
        let html = "";

        // 1. 에테르 체크 (여러 경로 대응)
        const currentEther = (typeof collection !== 'undefined') ? collection.points : (masterData.currency ? masterData.currency.ether : 0);
        const etherMet = currentEther >= cost.ether;
        if (!etherMet) isReady = false;

        html += `
            <div class="req-item ${etherMet ? 'met' : ''}">
                <span class="dot"></span> 에테르: <span class="val">${currentEther.toLocaleString()} / ${cost.ether.toLocaleString()} Et</span>
            </div>
        `;

        // 2. 모든 요구 부산물 체크
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

        // 3. 버튼 활성화
        const btn = document.getElementById('btn-abyss-craft');
        if (btn) {
            btn.className = isReady ? "btn-craft-large ready" : "btn-craft-large disabled";
            btn.innerText = isReady ? "호문클루스 연성하기" : "재료가 부족합니다";
            btn.disabled = !isReady;
        }
    } catch (e) { console.error("UI 업데이트 에러:", e); }
};

/* ==========================================================
   [심연의 연성소] 통합 시스템 (중복방지 + 이미지교체 + 도감갱신)
   ========================================================== */

/**
 * 1. 연성 버튼 클릭 시 실행되는 메인 함수
 * 중복 방지 로직과 데이터 동기화를 완벽하게 수행합니다.
 */
window.startAbyssCrafting = () => {
    try {
        const cost = window.calculateNextEggCost();
        const inv = masterData.inventory.byproducts || {};
        
        // 1. [체크] 자원 확인 (에테르 및 부산물)
        const currentEther = (typeof collection !== 'undefined') ? collection.points : (masterData.currency?.ether || 0);
        let hasEnoughMaterials = true;
        for (const [id, amount] of Object.entries(cost.materials)) {
            if ((inv[id] || 0) < amount) { hasEnoughMaterials = false; break; }
        }

        if (currentEther < cost.ether || !hasEnoughMaterials) {
            window.showToast("연성 재료가 부족합니다.", "error");
            return;
        }

        // 2. [중복 방지] 보유 중인 ID를 제외한 후보군 생성
        const allChars = charData.characters || [];
        const ownedIds = (collection.ownedIds || []).map(id => String(id));
        const activeEggId = collection.activeEgg ? String(collection.activeEgg.type) : null;
        
        // 이미 보유했거나 현재 부화 중인 알은 후보에서 제외
        const availablePool = allChars.filter(char => 
            !ownedIds.includes(String(char.id)) && String(char.id) !== activeEggId
        );

        if (availablePool.length === 0) {
            window.showToast("연성 가능한 모든 생명을 연성했습니다!", "info");
            return;
        }

        // 3. [선택] 무작위 당첨
        const nextCharacter = availablePool[Math.floor(Math.random() * availablePool.length)];

        // 4. [차감] 자원 소비 및 상태 강제 전환
        if (typeof collection !== 'undefined') collection.points -= cost.ether;
        for (const [id, amount] of Object.entries(cost.materials)) { inv[id] -= amount; }
        
        // 시스템을 '부화 중' 모드로 잠금
        window.isHatching = true; 
        collection.activeEgg = {
            type: nextCharacter.id,
            progress: 0,
            target: 3,
            date: new Date().toISOString()
        };

        // 데이터 기록
        masterData.currentCharacterId = nextCharacter.id;
        window.currentPartner = nextCharacter;
        cylinderSaturation = 0;
        masterData.cylinderSaturation = 0;
        masterData.hatchCount = (masterData.hatchCount || 1) + 1;

        saveAllData(); //

        // 5. [연출] 연성 모달 닫고 슈퍼노바 실행
        window.closeSedimentModal();
        window.triggerSupernovaEffect(nextCharacter);

    } catch (e) {
        console.error("연성 중 오류 발생:", e);
    }
};

/**
 * [renderer.js] 슈퍼 노바 연출 및 캐릭터/배경 실시간 교체
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
        // 2단계: 섬광 폭발 (순백색)
        overlay.style.background = '#fff';

        try {
            // [A] 배경 즉시 교체
            const gameView = document.getElementById('game-view');
            if (gameView && newChar.background) {
                gameView.style.backgroundImage = `url('${newChar.background}')`;
            }

            // [B] 캐릭터 이미지 강제 교체 (중요: 클래스가 아닌 renderer 인스턴스 사용)
            if (window.renderer && newChar.stages?.egg) {
                // CharacterRenderer.js 규격에 맞춰 객체를 전달
                await window.renderer.loadCharacter(newChar.stages.egg);
                window.renderer.currentState = "egg";
                window.renderer.currentFrame = 0;
            }

            // [C] 도감 UI 동기화
            window.renderCollection();

            // 3단계: 결과 화면 구성 (알 이미지 표시)
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

        // 4단계: 마무리 및 UI 갱신
        setTimeout(() => {
            overlay.style.opacity = '0';
            window.updateUI(); // 이름표 갱신

            setTimeout(() => {
                overlay.classList.remove('active');
                overlay.innerHTML = "";
                window.isHatching = false; // 연출 잠금 해제
            }, 2000);
        }, 3500);
    }, 800);
};

/* ============================================================
   [🎒 가방(인벤토리) 시스템: 로직 및 에러 해결] 
   ============================================================ */

/**
 * 1. 가방 모달 열기
 */
window.openInventory = () => {
    const modal = document.getElementById('inventory-modal');
    if (modal) {
        modal.style.display = 'flex';
        window.renderInventory();
    }
};

window.closeInventory = () => {
    const modal = document.getElementById('inventory-modal');
    if (modal) modal.style.display = 'none';
};

/**
 * 2. 인벤토리 아이템 렌더링
 */
/**
 * [renderer.js] 인벤토리 아이템 렌더링 (실제 수량 체크 보강)
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
    
    // 1. [핵심 수정] 단순히 ID만 가져오는 게 아니라, 수량이 1개 이상인 아이템만 필터링합니다.
    const allItemIds = [...Object.keys(invItems), ...Object.keys(invByproducts)];
    const activeItems = [...new Set(allItemIds)].filter(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        return count > 0;
    });

    // 2. 필터링된 실제 아이템이 하나도 없다면 "가방이 비어 있음" 문구 출력
    if (activeItems.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: rgba(255, 255, 255, 0.2); text-align: center;">
                <i class="fa-solid fa-border-none" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <div style="font-size: 0.85rem; margin-top: 8px; opacity: 0.7;">가방이 비어있습니다.</div>
            </div>
        `;
        return;
    }

    // 3. 아이템이 있을 경우 슬롯 생성
    activeItems.forEach(id => {
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        
        let info = shopItems.find(i => i.id === id);
        if (!info) info = byproductTable.find(i => i.id === id);
        if (!info) return;

        const slot = document.createElement('div');
        slot.className = 'inventory-slot-glass';
        slot.innerHTML = `
            <div class="slot-icon">
                <img src="${info.icon}" class="inventory-img-icon">
            </div>
            <div class="slot-count">${count}</div>
        `;
        
        slot.onclick = () => window.selectInventoryItem(id, info);
        grid.appendChild(slot);
    });
};

/**
 * 3. 아이템 선택 시 상세 정보 표시
 */
window.selectInventoryItem = (id, info) => {
    document.querySelectorAll('.inventory-slot-glass').forEach(s => s.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    const detailArea = document.getElementById('inventory-detail');
    const isGift = info.category === 'gift';
    
    let remainingText = '';
    if (isGift) {
        const charId = currentPartner.id;
        // [수정] 일반 날짜가 아닌 '새벽 4시' 기준 날짜를 가져옵니다.
        const molipToday = window.getMolipDate(); 
        
        // [수정] giftCounts 대신 saveAllData와 연동되는 dailyGiftCountMap을 사용합니다.
        const giftData = dailyGiftCountMap[charId];
        const usedToday = (giftData?.date === molipToday) ? giftData.count : 0;
        
        remainingText = `<div style="font-size:0.75rem; color:var(--primary-gold); margin-bottom:10px;">오늘 남은 선물 횟수: ${3 - usedToday} / 3</div>`;
    }

    detailArea.innerHTML = `
        <div id="detail-info-area">
            <div class="detail-icon-lg">
                <img src="${info.icon}" class="inventory-img-large" onerror="this.src='assets/images/default.png'">
            </div>
            <div class="detail-name-lg">${info.name}</div>
            <div class="detail-desc-lg">${info.desc || info.description || ''}</div>
            ${remainingText}
            ${isGift ? `
                <button class="btn-inventory-action" onclick="window.useInventoryItem('${id}')">
                    호문클루스에게 선물하기
                </button>
            ` : `
                <div class="label" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 15px;">연성로에서 사용 가능한 재료입니다.</div>
            `}
        </div>
    `;
};

// [renderer.js] 아이템 사용 후 가방 모달 자동 닫기 추가
// [renderer.js] 아이템 사용 및 선물 로직 (에러 방지 및 데이터 보호 보강)
window.useInventoryItem = (id) => {
    if (!currentPartner) return;

    // 1. 아이템 정보 찾기 (상점 아이템 혹은 부산물 테이블)
    let itemInfo = shopItems.find(i => i.id === id) || byproductTable.find(i => i.id === id);
    if (!itemInfo) return;

    const charId = currentPartner.id;
    const molipToday = window.getMolipDate();

    // 2. 선물 카테고리일 경우 일일 한도 체크
    if (itemInfo.category === 'gift') {
        if (!dailyGiftCountMap[charId]) {
            dailyGiftCountMap[charId] = { date: molipToday, count: 0 };
        }
        if (dailyGiftCountMap[charId].date !== molipToday) {
            dailyGiftCountMap[charId].date = molipToday;
            dailyGiftCountMap[charId].count = 0;
        }
        if (dailyGiftCountMap[charId].count >= 3) {
            window.showToast("오늘은 선물을 충분히 주었습니다.", "error");
            return;
        }
    }

    // 3. 아이템 수량 차감 로직
    let itemUsed = false;
    if (masterData.inventory.items && (masterData.inventory.items[id] || 0) > 0) {
        masterData.inventory.items[id]--;
        itemUsed = true;
    } else if (masterData.inventory.byproducts && (masterData.inventory.byproducts[id] || 0) > 0) {
        masterData.inventory.byproducts[id]--;
        itemUsed = true;
    }

    // 4. 아이템 사용 성공 시 후속 처리
    if (itemUsed) {
        if (itemInfo.category === 'gift') {
            dailyGiftCountMap[charId].count++;

            // 해금 정보 업데이트
            if (!givenGiftsMap[charId]) givenGiftsMap[charId] = [];
            if (!givenGiftsMap[charId].includes(itemInfo.name)) {
                givenGiftsMap[charId].push(itemInfo.name);
            }

            // --- [데이터 참조 에러 방지 및 대사 선택] ---
            const stageKey = window.isHatching ? 'egg' : currentStage; 
            const stageData = currentPartner.stages[stageKey] || currentPartner.stages['adult'];

            // [핵심 수정] gift_responses가 없을 경우를 대비한 기본 대사 세트 (TypeError 방지)
            const responses = stageData.gift_responses || { 
                normal: "선물 고마워요.", 
                favorite: "정말 기뻐요! 소중히 간직할게요.", 
                dislike: "으음... 이건 제 취향이 아닌 것 같네요." 
            };

            // 호감도 수치 계산
            let points = 2;
            let responseText = responses.normal;

            if (currentPartner.preferences.favorite.includes(itemInfo.name)) {
                points = 5;
                responseText = responses.favorite || responses.normal;
            } else if (currentPartner.preferences.dislike.includes(itemInfo.name)) {
                points = 0.5;
                responseText = responses.dislike || responses.normal;
            }

            // 호감도 반영
            charIntimacyMap[charId] = Math.min(100, (charIntimacyMap[charId] || 0) + points);
            
            // 대사 출력 및 토스트 알림
            window.showDialogue(responseText, 2);
            window.showToast(`${itemInfo.name} 선물 완료!`, "success");
            
            // UI 및 데이터 저장
            window.updateUI();
            saveAllData(); 

            // 가방 닫기
            window.closeInventory(); 
        } else {
            // 선물 외 아이템(재료 등) 사용 시 처리 (필요 시 확장)
            window.showToast(`${itemInfo.name}을(를) 사용했습니다.`, "info");
            window.renderInventory();
            saveAllData();
        }
    } else {
        window.showToast("아이템 수량이 부족합니다.", "error");
    }
};

/**
 * [renderer.js] 실시간 작업 내역을 masterData.logs에 기록합니다.
 */
function recordWorkLogEntry(owner, type) {
    const today = window.getMolipDate(); // 시스템 날짜 기준
    if (!masterData.logs) masterData.logs = {};
    if (!masterData.logs[today]) masterData.logs[today] = [];

    const logs = masterData.logs[today];
    const lastLog = logs[logs.length - 1];
    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // [교정] 프로그램 이름에서 비트 정보 제거
    const cleanedOwner = window.cleanAppName(owner);

    // 마지막 기록이 동일한 앱이고 타입이 같다면 시간(duration)만 1초 증가
    if (lastLog && lastLog.owner === cleanedOwner && lastLog.type === type) {
        lastLog.duration = (lastLog.duration || 0) + 1;
    } else {
        // 새로운 작업이거나 타입이 바뀌었을 경우 새 로그 추가
        logs.push({
            time: nowTime,
            owner: cleanedOwner, // 정제된 이름 저장
            type: type,
            duration: 1
        });
    }
}

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

// [renderer.js] 맨 하단 테마 시스템 통합 코드

// 1. 테마 데이터 로드 (중복 선언 방지)
const { THEMES } = require('./themes.js'); 

/**
 * 2. 테마 실시간 적용 함수 (핵심 로직)
 */
// [renderer.js 하단]
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

window.changeTheme = function(themeKey) {
    window.applyTheme(themeKey);
    
    // [중요] masterData와 localStorage에 동시 저장
    if (window.masterData && window.masterData.settings) {
        window.masterData.settings.currentTheme = themeKey;
        saveAllData(); // 파일(JSON) 저장
    }
    localStorage.setItem('ether-flow-theme', themeKey); // 브라우저 캐시 저장
};

/**
 * 3. 라디오 버튼 클릭 시 호출되는 함수
 */
window.changeTheme = function(themeKey) {
    console.log(`[테마] 사용자가 "${themeKey}" 선택`);
    window.applyTheme(themeKey);
    
    // 설정 저장 (앱 재시작 시 유지)
    if (window.masterData && window.masterData.settings) {
        window.masterData.settings.currentTheme = themeKey;
        saveAllData();
    }
    
    // 로컬 스토리지 백업
    localStorage.setItem('ether-flow-theme', themeKey);
};

// 4. 초기 테마 로드 (저장된 설정이 없으면 DEFAULT_DARK 적용)
const savedTheme = localStorage.getItem('ether-flow-theme') || 'DEFAULT_DARK'; // [수정] 대문자화
window.applyTheme(savedTheme);

const savedFont = localStorage.getItem('ether-flow-font') || 'paperlogy';
window.changeFont(savedFont);

// 언어설정
// [renderer.js 하단 window.loadLanguageData 전문 교체]
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

window.changeLanguage = async (lang) => {
    if (!masterData) return;

    // 1. 설정 저장
    masterData.settings.language = lang;
    await saveAllData();

    // 2. 데이터 재로드 및 즉시 반영을 위한 앱 재시작
    // 대사나 편지 리스트를 실시간으로 모두 바꾸는 것보다 재로딩이 가장 안전합니다.
    window.showConfirm("언어 변경", "언어 설정을 적용하기 위해 연구실을 다시 구성합니다.", () => {
        location.reload();
    });
};

// 2. HTML 번역 적용 함수
window.applyLocalization = () => {
    if (!window.uiData) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = key.split('.').reduce((obj, i) => (obj ? obj[i] : undefined), window.uiData);

        if (translation) {
            // 1. 툴팁 속성이 있는 경우 (아이콘 버튼 등)
            // 이 경우 내부의 <i> 태그(아이콘)를 건드리지 않고 속성만 바꿉니다.
            if (el.hasAttribute('data-tooltip')) {
                el.setAttribute('data-tooltip', translation);
            }
            // 2. 입력창 placeholder인 경우
            else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            }
            // 3. 일반 텍스트인 경우 (<span>, <p> 등)
            else {
                el.innerText = translation;
            }
        }
    });
};

// [renderer.js 하단 리스너 구역]
ipcRenderer.on('user-idle-state', (event, state) => {
    isIdle = state; // 메인에서 보낸 true/false 반영
    console.log(`[시스템] 유휴 상태 변경: ${isIdle}`);
});

/* ============================================================
   [🎵 오디오 시스템: 자동 재생 및 마지막 상태 복구 통합본] 
   ============================================================ */
(function initRestoredPlayer() {
    // 1. 오디오 트랙 데이터 정의
    const trackData = {
        ambient: [
            { name: '잔잔한 파도', file: 'beautiful-ocean-waves.mp3' },
            { name: '음식점', file: 'busy-restaurant.mp3' },
            { name: '숲 속의 캠프파이어', file: 'campfire-in-the-woods.mp3' },
            { name: '밤의 숲', file: 'forest-night-time.mp3' },
            { name: '숲 속을 걷다', file: 'walking-in-a-forest.mp3' },
            { name: '가벼운 비', file: 'light-rain.mp3' },
            { name: '물 끓는 소리', file: 'pot-of-water-boiling.mp3' },
            { name: '큰 파도 소리', file: 'rough-ocean-waves.mp3' },
            { name: '부드러운 파도 소리', file: 'soothing-ocean-waves.mp3' },
        ],
        music: [
            { name: 'theme_mabel', file: 'theme_mabel.mp3' },
            { name: 'theme_indigo', file: 'theme_indigo.mp3' },
            { name: 'theme_morgana', file: 'theme_morgana.mp3' },
            { name: 'theme_aurelia', file: 'theme_aurelia.mp3' }
        ]
    };

    const audios = { ambient: new Audio(), music: new Audio() };

    // ✨ [수정] 저장된 마지막 곡 인덱스 가져오기
    const getSavedIdx = (type) => {
        const s = masterData?.settings?.sound;
        if (!s) return 0;
        return (type === 'ambient' ? s.lastAmbient : s.lastMusic) || 0;
    };

    const state = {
        ambient: { cur: getSavedIdx('ambient'), loop: true, shuffle: false },
        music: { cur: getSavedIdx('music'), loop: true, shuffle: false }
    };

    /**
     * 리스트 UI 갱신 함수 (스코프 내 보호됨)
     */
    const refreshList = (type) => {
        const container = document.getElementById(`list-${type}`);
        if (!container) return;
        
        container.innerHTML = trackData[type].map((item, idx) => `
            <div class="menu-item ${idx === state[type].cur ? 'selected' : ''}" data-idx="${idx}">
                <span>${item.name}</span>
                ${idx === state[type].cur ? '<i class="fa-solid fa-check"></i>' : ''}
            </div>
        `).join('');

        container.querySelectorAll('.menu-item').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                playTrack(type, parseInt(el.dataset.idx));
            };
        });
    };

    /**
     * 곡 재생 및 인덱스 저장 로직
     */
    const playTrack = (type, idx, isAuto = false) => {
        const list = trackData[type];
        idx = (idx + list.length) % list.length;
        state[type].cur = idx;
        const audio = audios[type];

        // ✨ [기록] 현재 듣는 곡 번호를 세이브 데이터에 저장
        if (masterData.settings && masterData.settings.sound) {
            if (type === 'ambient') masterData.settings.sound.lastAmbient = idx;
            else masterData.settings.sound.lastMusic = idx;
        }

        const triggerBtn = document.getElementById(`trig-${type === 'ambient' ? 'amb' : 'mus'}`);

        try {
            audio.src = path.join(__dirname, 'assets', 'sounds', type, list[idx].file);
            audio.loop = state[type].loop;
            
            audio.play().then(() => {
                const btn = document.getElementById(type === 'ambient' ? 'play-amb' : 'play-mus');
                if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                if (triggerBtn) triggerBtn.classList.add('active'); // 이너글로우 활성화
                if (!isAuto) saveAllData(); // 수동 재생 시 즉시 저장
            }).catch(e => {
                console.log(`🔇 [Audio] ${type} 자동 재생 대기 중 (상호작용 필요)`);
            });
        } catch (err) {}
        refreshList(type);
    };

    const nextTrack = (type) => {
        let nextIdx = state[type].shuffle ? Math.floor(Math.random() * trackData[type].length) : (state[type].cur + 1);
        playTrack(type, nextIdx);
    };

    const prevTrack = (type) => { playTrack(type, state[type].cur - 1); };

    /**
     * [핵심] 모든 오디오 UI 바인딩 및 자동 재생 시퀀스
     */
    window.setupEngine = () => {
        console.log("🎵 [Audio] 오디오 시스템 바인딩 및 자동 재생 체크 시작");
        
        ['ambient', 'music'].forEach(type => {
            const prefix = type === 'ambient' ? 'amb' : 'mus';
            const panel = document.getElementById(`panel-${type}`);
            const trigBtn = document.getElementById(`trig-${prefix}`); //
            const s = masterData?.settings?.sound;

            // 1. 리스트 및 초기 상태 설정
            refreshList(type);

            // 2. [중요] 모든 이벤트 바인딩을 자동 재생보다 '먼저' 수행합니다.
            
            // 패널 토글 버튼 (trig-amb, trig-mus)
            if (trigBtn) {
                trigBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isActive = panel.classList.contains('active');
                    // 모든 패널 닫기 후 토글
                    document.querySelectorAll('.player-panel').forEach(p => p.classList.remove('active'));
                    if (!isActive) {
                        panel.classList.add('active');
                        refreshList(type);
                    }
                };
            }

            // 재생/일시정지 버튼
            const playBtn = document.getElementById(`play-${prefix}`);
            if (playBtn) {
                playBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (audios[type].paused) {
                        audios[type].play();
                        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        if (trigBtn) trigBtn.classList.add('active');
                    } else {
                        audios[type].pause();
                        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        if (trigBtn) trigBtn.classList.remove('active');
                    }
                };
            }

            // 볼륨 슬라이더
            const volSlider = document.getElementById(`vol-${prefix}`);
            if (volSlider) {
                audios[type].volume = parseFloat(volSlider.value);
                volSlider.oninput = (e) => {
                    e.stopPropagation();
                    audios[type].volume = parseFloat(e.target.value);
                };
            }

            // 3. ✨ 모든 바인딩이 끝난 후, '자동 재생' 조건 확인 및 실행
            if (s && s.autoPlay === true) {
                const savedIdx = (type === 'ambient') ? s.lastAmbient : s.lastMusic;
                if (savedIdx !== undefined && savedIdx !== null) {
                    console.log(`▶️ [Audio] ${type} 자동 재생 시도 (Track: ${savedIdx})`);
                    // isAuto = true를 전달하여 불필요한 중복 저장을 방지합니다.
                    playTrack(type, savedIdx, true); 
                }
            }
        });
    };
    
})();

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



/**
 * [renderer.js] 모니터링 키워드 관리 시스템
 */
// 2. 키워드 리스트 렌더링 함수
window.renderMonitorSettings = () => {
    const monitor = masterData.settings.monitor;
    
    const render = (id, list, type) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = list.map((k, idx) => `
            <li class="keyword-item">
                <span>${k}</span>
                <button class="btn-del-keyword" onclick="window.removeKeyword('${type}', ${idx})">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `).join('');
    };

    render('work-keyword-list', monitor.workKeywords, 'work');
    render('distract-keyword-list', monitor.distractKeywords, 'distract');
};

// 3. 키워드 추가 함수
/**
 * [renderer.js] 키워드 추가 함수 (방어 로직 포함)
 */
window.addKeyword = () => {
    const input = document.getElementById('keyword-input');
    const typeSelect = document.getElementById('keyword-type-select');
    
    if (!input || !typeSelect) return;

    const type = typeSelect.value;
    const val = input.value.trim();

    // 🛡️ 방어 로직 1: 빈 값 체크
    if (!val) {
        if (window.showToast) window.showToast("키워드를 입력해주세요!", "error");
        input.focus();
        return;
    }

    const monitor = masterData.settings.monitor;
    const targetList = (type === 'work') ? monitor.workKeywords : monitor.distractKeywords;

    // 🛡️ 방어 로직 2: 중복 키워드 체크
    if (targetList.includes(val)) {
        if (window.showToast) window.showToast("이미 등록된 키워드입니다.", "warning");
        input.value = '';
        input.focus();
        return;
    }

    // 데이터 추가
    targetList.push(val);

    // UI 갱신 및 저장
    input.value = '';
    input.focus(); // 연속 입력 편의성
    window.renderMonitorSettings();
    saveAllData();
    
    if (window.showToast) window.showToast(`'${val}' 키워드가 등록되었습니다.`, "success");
};

// 4. 키워드 삭제 함수
window.removeKeyword = (type, idx) => {
    if (type === 'work') masterData.settings.monitor.workKeywords.splice(idx, 1);
    else masterData.settings.monitor.distractKeywords.splice(idx, 1);
    
    window.renderMonitorSettings();
    saveAllData();
};