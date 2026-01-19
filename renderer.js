const { ipcRenderer } = require('electron');
const path = require('path'); // [추가] path 모듈을 먼저 가져와야 합니다.

// [수정] path.join과 __dirname을 사용하여 경로를 절대화합니다.
const CharacterRenderer = require(path.join(__dirname, 'src', 'CharacterRenderer.js')); 
const ProgressManager = require(path.join(__dirname, 'src', 'progress.js'));
const CollectionManager = require(path.join(__dirname, 'src', 'collection.js'));
const MailboxManager = require(path.join(__dirname, 'src', 'mailboxManager.js'));

// 데이터 파일들도 동일하게 수정하는 것이 좋습니다.
const charData = require(path.join(__dirname, 'assets', 'data', 'characters.json'));
const mailPoolData = require(path.join(__dirname, 'assets', 'data', 'mailbox_pool.json'));

// 전역 공유 (introManager.js 등이 에러 없이 쓰기 위함)
window.charData = charData;
window.CharacterRenderer = CharacterRenderer; 

// 파일 로드 (변수에 담지 않고 실행만 하여 중복 선언 방지)
require('./src/introManager.js');

// --- [필수 상태 변수 선언] ---
let masterData = null;          // 통합 데이터 객체 (JSON 파일 기반)
let lastActiveWin = null;       // 메인 프로세스에서 받은 활성 창 정보
let isActuallyWorking = false;  // 작업 도구 매칭 여부
let isDistraction = false;      // 딴짓 도구 매칭 여부 (전역 변수로 선언)
let badge = null;               // 상태 배지 엘리먼트
let isIdle = false;             // 부재 중 상태
let logViewDate = new Date();   // 로그 뷰어용 날짜
let dialogueTimeout = null; // [추가] 대사 사라짐 제어용 변수
let isHatching = false; // [추가] 현재 부화 연출이 진행 중인지 체크하는 플래그
let lastLoadedId = null; // 마지막으로 로드된 캐릭터의 ID를 기억합니다.
let givenGiftsMap = {};
let dailyGiftCountMap = {}
let awayStartTime = null;
let continuousFocusStart = null;
let flowStateEndTime = null;
let displayedPoints = 0; 
let isPointAnimating = false; // 애니메이션 중복 실행 방지용
let mailDisplayLimit = 10; // 초기 노출 개수
let currentStatus = "good"; // [추가] 현재 상태를 저장하여 클릭 시 사용
let lastStatus = null;      // [추가] 상태 변경 감지용
let currentLogTab = 'list'; // [추가] 작업 기록의 현재 탭 상태 ('list' 또는 'chart')

// --- [매니저 선언] ---
const renderer = new CharacterRenderer('main-canvas'); //
let progress = null;
let collection = null;

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
const IDLE_THRESHOLD = 180;
let dailyPetCountMap = {}; // [추가] 날짜별 클릭 횟수 기록용
let lastFocusState = false;      // 이전 집중 상태 (isFocusing)
let lastDistractState = false;   // 이전 딴짓 상태 (isDistraction)
let autoDialogueTimer = 0;       // 자동 발화용 카운터    
let currentPriority = 0;      // 현재 출력 중인 대사의 우선순위 (0: 일반, 1: 클릭, 2: 시스템)
let dialogueLockUntil = 0;    // 이 시간(ms)까지는 낮은 우선순위 대사 무시
let lastDialogue = "";        // [추가] 직전에 출력된 대사를 기억하여 중복을 방지합니다.

const shopItems = [
    // category: 'material' (재료 및 도구 탭용)
    { id: "old_parchment", category: "gift", name: "손편지", icon: '<i class="fa-solid fa-envelope"></i>', price: 5, desc: "종이 위에 꾹꾹 눌러 담은 마음이 느껴지는 편지입니다." },
    { id: "red_berry", category: "gift", name: "붉은 열매", icon: '<i class="fa-solid fa-apple-whole"></i>', price: 20, desc: "잘 익은 열매에서 은은한 생명력이 느껴집니다." },
    { id: "black_extract", category: "gift", name: "검은 추출액", icon: '<i class="fa-solid fa-mug-hot"></i>', price: 30, desc: "쓴맛 뒤에 정신이 맑아지는 기운이 감도는 액체입니다." },
    { id: "old_record", category: "gift", name: "낡은 기록서", icon: '<i class="fa-solid fa-book"></i>', price: 60, desc: "누군가의 탐구 흔적이 가득한 오래된 책입니다." },
    { id: "old_instrument", category: "gift", name: "낡은 악기", icon: '<i class="fa-solid fa-guitar"></i>', price: 50, desc: "오랜 세월을 견뎠지만, 맑은 소리를 내는 악기입니다." },
    { id: "warm_blanket", category: "gift", name: "따뜻한 모포", icon: '<i class="fa-solid fa-rug"></i>', price: 60, desc: "결이 곱게 가공된 직물입니다." },
    { id: "ice_shard", category: "gift", name: "빙결 조각", icon: '<i class="fa-solid fa-ice-cream"></i>', price: 30, desc: "과열된 연성로의 열기를 식힐 냉기를 머금은 조각입니다." },
    { id: "gem_shard", category: "gift", name: "원석 조각", icon: '<i class="fa-solid fa-gem"></i>', price: 80, desc: "가공되지 않은 순수한 마력의 결정체입니다." },
    { id: "silent_candle", category: "gift", name: "침묵의 향초", icon: '<i class="fa-solid fa-wind"></i>', price: 25, desc: "타오를수록 주변의 잡음을 지우고 깊은 정적을 불러오는 향입니다." },
    { id: "prism_kaleidoscope", category: "gift", name: "프리즘 만화경", icon: '<i class="fa-solid fa-eye"></i>', price: 70, desc: "빛을 산란시켜 평범한 풍경을 수만 갈래의 환상적인 색채로 나누어 보여주는 도구입니다." },
    { id: "dried_flower", category: "gift", name: "마른 안개꽃", icon: '<i class="fa-solid fa-clover"></i>', price: 15, desc: "화려하진 않지만 책상 위에서 묵묵히 자리를 지킵니다." },
    { id: "old_parchment", category: "material", name: "낡은 양피지", icon: '<i class="fa-solid fa-envelope"></i>', price: 5, desc: "연구 기록을 휘갈기기 좋은 종이입니다." },
];


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

// --------------------------------------------------------------------------
// [SECTION 1] 통합 데이터 저장 시스템 (Atomic Save)
// --------------------------------------------------------------------------
/**
 * 모든 현재 상태를 메모리에서 수집하여 main.js를 통해 save_data.json에 안전하게 기록합니다.
 */
function saveAllData() {
    // 1. [철벽 방어] 데이터가 없거나 초기화 중(Reset)이라면 저장을 즉시 중단
    if (!masterData || window.isResetting) return;

    try {
        // 2. [매니저 데이터 취득]
        if (progress) masterData.progress = progress.getSaveData();
        if (collection) masterData.collection = collection.getSaveData();
        if (mailbox) masterData.mailbox = mailbox.getSaveData();

        // 3. [캐릭터 상태 동기화] intimacyMap, growthMap 등 모든 맵 데이터 포함
        masterData.character = {
            intimacyMap: charIntimacyMap || {},
            growthMap: charGrowthMap || {},
            givenGiftsMap: givenGiftsMap || {},
            dailyPetCountMap: dailyPetCountMap || {},
            dailyGiftCountMap: dailyGiftCountMap || {},
            selectedPartnerId: currentPartner ? currentPartner.id : null
        };

        // 4. [시스템 설정값 동기화] 창 모드, 레이아웃, 폰트 등
        masterData.settings = {
            workApps: workApps || [],
            distractionApps: distractionApps || [],
            isHorizontalMode: window.isHorizontalMode,
            isWindowMode: window.isWindowMode,
            isAlwaysOnTop: window.isAlwaysOnTop,
            hideCompleted: window.hideCompleted,
            showPastCompleted: window.showPastCompleted,
            resetHour: window.resetHour,
            autoDeleteOldTasks: window.autoDeleteOldTasks,
            font: masterData.settings?.font || 'paperlogy',
            accordionStates: {} // 현재 아코디언 상태 수집
        };

        // 아코디언 상태 실시간 수집
        document.querySelectorAll('.accordion').forEach(acc => {
            if (acc.id) masterData.settings.accordionStates[acc.id] = acc.classList.contains('active');
        });

        // 5. [투두/습관/업적/통계] 배열 및 객체 데이터
        masterData.todo = (molipTodos || []).filter(t => t !== null);
        masterData.habit = (molipHabits || []).filter(h => h !== null);
        masterData.achievements = masterData.achievements || [];
        masterData.stats = {
            dailyAppTimeMap: dailyAppTimeMap || {}
        };

        // 6. [무한 리셋 방지] 저장 시점의 게임 내 날짜를 확실히 각인
        if (masterData.progress) {
            masterData.progress.lastSaveDate = window.getMolipDate();
        }

        // 7. [전송] 메인 프로세스의 'save-game-data' 핸들러 호출
        // main.js의 ipcMain.handle('save-game-data', ...)와 연결됩니다.
        ipcRenderer.invoke('save-game-data', masterData).then(result => {
            if (!result.success) console.error("저장 실패:", result.error);
        });

    } catch (err) {
        console.error("데이터 통합 저장 프로세스 중 치명적 오류:", err);
    }
}

// --------------------------------------------------------------------------
// [SECTION 2] 캐릭터 성장 및 스프라이트 관리
// --------------------------------------------------------------------------

/**
 * 캐릭터의 성장 상태(알/어린이/성체)를 판별하여 캔버스 이미지를 교체하고 애니메이션을 제어합니다.
 */
// [renderer.js] 약 105행 부근: 함수 내용 교체
async function refreshCharacterSprite() {
    if (!currentPartner) return;
    const canvas = document.getElementById('main-canvas'); // 캔버스 엘리먼트 참조

    const gameView = document.getElementById('game-view');
    if (gameView && currentPartner.background) {
        gameView.style.backgroundImage = `url('${currentPartner.background}')`;
    }
    
    const totalSec = charGrowthMap[currentPartner.id] || 0;
    const growthMin = totalSec / 60;
    const targetMin = currentPartner.evolution_level || 1440;
    
    // 1. 알 상태일 때
    if (collection.activeEgg && collection.activeEgg.type === currentPartner.id) {
        currentStage = 'egg';
        lastLoadedId = currentPartner.id;
        
        // 알 흔들림 애니메이션 추가
        if (canvas) canvas.classList.add('egg-hatching-anim'); 
        
        await renderer.loadCharacter(currentPartner.stages.egg);
        return;
    }

    // ★ 알 상태가 아니라면 흔들림 애니메이션 즉시 제거
    if (canvas) canvas.classList.remove('egg-hatching-anim'); 

    // 2. 성장 단계 판별
    const newStage = growthMin >= targetMin ? 'adult' : 'child';

    if (currentStage !== newStage || lastLoadedId !== currentPartner.id) {
        currentStage = newStage;
        lastLoadedId = currentPartner.id;
        
        const stageData = currentPartner.stages[currentStage];
        
        // 유아기/성체기용 표정 로직 로드 (이때 자동으로 2배 배율이 적용됨)
        if (stageData.expressions) {
            await renderer.loadExpressions(stageData.expressions);
        } else {
            await renderer.loadCharacter(stageData);
        }
    }
}

// [통합] 일일 10회 한도 + 하트 효과 제어 클릭 핸들러
window.petCharacter = (event) => {
    if (!currentPartner) return;
    const now = Date.now();
    if (now - lastPetTime < PET_COOLDOWN) return;
    lastPetTime = now;

    const dateKey = new Date().toDateString();
    if (!dailyPetCountMap[dateKey]) dailyPetCountMap[dateKey] = 0;

    if (!collection.activeEgg && dailyPetCountMap[dateKey] < 10) {
        charIntimacyMap[currentPartner.id] = Math.min(100, (charIntimacyMap[currentPartner.id] || 0) + 0.5);
        dailyPetCountMap[dateKey]++;
        createHeartEffect(event.clientX, event.clientY);

        // ★ 기쁨 표정('good')으로 3초간 변경
        renderer.setExpression('good');
        setTimeout(() => {
            // 현재 앱 상태에 맞는 표정으로 복구
            const backTo = isDistraction ? 'distracting' : (isIdle ? 'away' : 'working');
            renderer.setExpression(backTo);
        }, 3000);

        if (dailyPetCountMap[dateKey] === 10) window.showToast("오늘의 교감 한도 도달!", "info");
    } 
    
    window.showDialogue(); 
    saveAllData(); 
    window.updateUI();
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

// 성체 진화
window.performEvolution = async (character) => {
    const container = document.getElementById('character-container');
    const flash = document.getElementById('hatch-flash');
    if (!container || isHatching) return; // 이미 연출 중이면 중복 방지

    isHatching = true; // 연출 중 잠금

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
        isHatching = false; 
    }, 2000);

    saveAllData(); // 진화 결과 즉시 저장
};

// [추가] 알 부화 연출 엔진 (Egg -> Child)
window.performHatchSequence = async function(type) {
    if (isHatching) return; // 실행 시점에 잠금
    isHatching = true;

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
            isHatching = false; // 연출이 모두 끝난 후 잠금 해제
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
window.showConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) {
        // 만약 커스텀 모달 엘리먼트가 없다면 브라우저 기본 confirm으로 대체 (안전장치)
        if (confirm(message)) onConfirm();
        return;
    }

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    // 이전 이벤트 리스너 제거 후 새로 등록
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
            const targetMin = char.evolution_level || 1440;
            
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
            ? `onclick="if(!isHatching) window.showCharDetail('${char.id}'); else window.showToast('탄생의 순간에는 눈을 뗄 수 없습니다.', 'warning');"`
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
    if (show && isHatching) {
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
 * [renderer.js] 도감 상세 페이지를 출력합니다. 
 * 캐릭터별 선호도 목록(favorite, dislike)을 기반으로 그리드 형태를 유지하며, 준 적 없는 선물은 "???"로 가립니다.
 */
window.showCharDetail = (id) => {
    // 1. 데이터 소스 확보
    const char = charData.characters.find(c => c.id === id);
    if (!char) return;
    
    const isActiveEgg = collection.activeEgg && collection.activeEgg.type === id;
    const modal = document.getElementById('char-detail-modal');
    if (!modal) return;

    // 2. 성장 데이터 및 단계 계산
    const totalSec = charGrowthMap[char.id] || 0; 
    const growthMin = totalSec / 60; 
    const targetMin = char.evolution_level || 1440; 
    
    const stage = growthMin >= targetMin ? 'adult' : 'child';
    const percent = Math.min(100, (growthMin / targetMin) * 100);

    // 3. UI 반영: 상단 텍스트 정보
    document.getElementById('detail-char-name').innerText = isActiveEgg ? "부화 중인 알" : char.name;
    document.getElementById('detail-char-stage').innerText = isActiveEgg ? "알 (부화 대기)" : (stage === 'child' ? "유아기" : "성체기");

    // 4. 이미지 경로 처리 (알/성장단계별 good 표정 반영)
    let spriteSrc = "";
    if (isActiveEgg) {
        spriteSrc = char.stages.egg.sprite;
    } else {
        const stageData = char.stages[stage] || char.stages['adult'];
        if (stageData.expressions && stageData.expressions.good) {
            spriteSrc = stageData.expressions.good.sprite;
        } else {
            spriteSrc = stageData.sprite || ""; 
        }
    }
    
    const detailImg = document.getElementById('detail-char-img');
    if (detailImg) detailImg.src = spriteSrc;

    // 5. 수치 업데이트 (함께한 시간 및 성장 게이지)
    const companionshipEl = document.getElementById('detail-total-companionship');
    if (companionshipEl) {
        companionshipEl.innerText = formatReceiptTime(totalSec);
    }

    const growthBar = document.getElementById('detail-growth-bar');
    const growthText = document.getElementById('detail-growth-text');
    if (growthBar) growthBar.style.width = `${percent}%`;
    if (growthText) {
        growthText.innerText = `${Math.floor(growthMin)} / ${targetMin} min`;
    }

    // 6. [수정] 선호/불호 선물 분리 렌더링
    const favListContainer = document.getElementById('list-favorite');
    const disListContainer = document.getElementById('list-dislike');
    const giftsGiven = givenGiftsMap[char.id] || [];

    const renderPrefItems = (container, items) => {
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#666; padding-left:5px;">(정보 없음)</span>';
            return;
        }

        container.innerHTML = items.map(itemName => {
            const isUnlocked = givenGiftsMap[char.id]?.includes(itemName);
            const itemInfo = shopItems.find(i => i.name === itemName);
            
            let iconContent = isUnlocked 
                ? (itemInfo ? itemInfo.icon : '<i class="fas fa-box"></i>') 
                : '<i class="fas fa-question"></i>';
                
            const displayName = isUnlocked ? itemName : "???";
            const statusClass = isUnlocked ? '' : 'locked';

            // [핵심 교정] title 속성을 제거하고 data-tooltip을 사용합니다.
            const tooltipMsg = isUnlocked ? `` : "다양한 선물을 주어 정보를 해금하세요";

            return `
                <div class="pref-item ${statusClass}" data-tooltip="${tooltipMsg}">
                    <div class="pref-item-icon-wrapper">${iconContent}</div>
                    <span class="pref-item-name">${displayName}</span>
                </div>
            `;
        }).join('');
    };

    renderPrefItems(favListContainer, char.preferences.favorite);
    renderPrefItems(disListContainer, char.preferences.dislike);

    // 7. 설명 및 버튼 제어
    document.getElementById('detail-char-desc').innerText = isActiveEgg 
        ? "당신의 몰입을 기다리고 있는 알입니다. 다시 품어주시겠습니까?" 
        : (char.description || "등록된 설명이 없습니다.");

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
window.renderShopItems = (category) => {
    const grid = document.getElementById('shop-grid'); 
    if (!grid) return;
    grid.innerHTML = ""; // 기존 내용 초기화

    // 1. 상단 보유 에테르 갱신
    const shopEther = document.getElementById('shop-ether-count');
    if (shopEther && window.collection) {
        shopEther.innerText = window.collection.points.toLocaleString();
    }

    // 2. [아티스트 요청] 연구 재료(material) 탭은 '준비 중' 메시지 출력
    if (category === 'material') {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: rgba(255, 255, 255, 0.2); text-align: center;">
                <i class="fas fa-hammer" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <div style="font-size: 1.1rem; font-weight: bold; letter-spacing: 1px;">연구 재료 준비 중</div>
                <div style="font-size: 0.85rem; margin-top: 8px; opacity: 0.7;">새로운 재료들을 가공하고 있습니다.<br>다음 업데이트를 기대해 주세요.</div>
            </div>
        `;
        return; 
    }

    // 3. 선물(gift) 등 실제 판매 아이템 필터링
    const filtered = shopItems.filter(item => item.category === category);

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.2);">판매 중인 물품이 없습니다.</div>`;
        return;
    }

    // 4. 아이템 카드 생성
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'shop-card-glass';
        card.setAttribute('data-tooltip', item.desc);

        // 구매 가능 여부 체크
        const canAfford = (window.collection) ? window.collection.points >= item.price : false;

        card.innerHTML = `
            <div class="shop-card-icon">${item.icon}</div>
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
    const name = lastActiveWin?.owner;
    if (!name) return;

    // [아티스트 요청] 자신(시스템) 등록 차단
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
    const name = lastActiveWin?.owner;
    if (!name) return;

    // [아티스트 요청] 자신(시스템) 등록 차단
    const forbidden = ["내 연구실", "일렉트론", "에테르플로우", "Electron", "Ether Flow"];
    if (forbidden.some(k => name.includes(k))) {
        return window.showToast("시스템 앱은 딴짓 도구로 등록할 수 없습니다.", "warning");
    }

    if (distractionApps.includes(name)) return window.showToast("이미 등록된 딴짓 도구입니다.", "info");
    if (workApps.includes(name)) return window.showToast("작업 도구에 이미 등록되어 있습니다.", "warning");

    distractionApps.push(name);
    window.renderDistractionAppList();
    window.showToast("딴짓 도구 등록됨", "success");
    saveAllData();
};

window.removeWorkApp = (name) => { workApps = workApps.filter(a => a !== name); window.renderWorkAppList(); saveAllData(); };
window.removeDistractionApp = (name) => { distractionApps = distractionApps.filter(a => a !== name); window.renderDistractionAppList(); saveAllData(); };

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

window.renderTodos = () => {
    const list = document.getElementById('todo-list');
    const badge = document.getElementById('todo-count-badge');
    if (!list) return;

    const molipToday = window.getMolipDate(); 

    // 1. [핵심] 오늘 날짜에 해당하는 투두만 필터링하여 뱃지 계산
    const todayTodos = molipTodos.filter(t => t && t.date === molipToday);
    const total = todayTodos.length;
    const completed = todayTodos.filter(t => t.completed).length;

    if (badge) {
        badge.innerText = `${completed}/${total}`;
        // 모두 완료 시 강조 효과
        if (total > 0 && completed === total) {
            badge.classList.add('all-completed');
        } else {
            badge.classList.remove('all-completed');
        }
    }

    // 2. 화면에 표시할 리스트 필터링 (완료 숨기기 등 적용)
    let displayTodos = todayTodos; // 기본적으로 오늘 것만 표시
    
    // 만약 '지난 완료 항목 표시'가 켜져 있다면 완료된 다른 날짜 항목도 추가
    if (window.showPastCompleted) {
        const pastCompleted = molipTodos.filter(t => t && t.date !== molipToday && t.completed);
        displayTodos = [...displayTodos, ...pastCompleted];
    }
    
    // 완료 숨기기 옵션 체크
    if (window.hideCompleted) {
        displayTodos = displayTodos.filter(t => !t.completed);
    }

    // 정렬 로직 (완료 항목 하단으로)
    displayTodos.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.order || 0) - (b.order || 0);
    });

    if (displayTodos.length === 0) {
        list.innerHTML = '<li class="empty-list-msg">표시할 할 일이 없습니다.</li>';
        return;
    }

    list.innerHTML = displayTodos.map((todo, index) => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" 
            data-id="${todo.id}"
            draggable="true"
            ondragstart="window.handleDragStart(event, ${index})"
            ondragover="window.handleDragOver(event)"
            ondragenter="window.handleDragEnter(event)"
            ondragleave="window.handleDragLeave(event)"
            ondragend="window.handleDragEnd(event)"
            ondrop="window.handleDrop(event, ${index})">
            <div class="todo-checkbox" onclick="window.toggleTodo('${todo.id}')">
                ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <span class="todo-text">${todo.text}</span>
            <div class="todo-actions">
                <button class="btn-todo-action btn-edit" onclick="window.editTodo('${todo.id}')"><i class="fas fa-pen"></i></button>
                <button class="btn-todo-action btn-trash" onclick="window.deleteTodo('${todo.id}')"><i class="fas fa-trash-can"></i></button>
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

// [수정] renderer.js - window.toggleTodo 함수
// [통합] 투두 체크 관리 및 럭키 박스 토스트 이벤트
window.toggleTodo = (id) => {
    // 1. 대상 찾기
    const index = molipTodos.findIndex(t => String(t.id) === String(id));
    if (index === -1) return;

    // 2. 상태 반전 (체크/해제)
    molipTodos[index].completed = !molipTodos[index].completed;

    // 3. 항목이 '완료(체크)' 상태가 된 경우에만 보상 및 대사 로직 실행
    if (molipTodos[index].completed) {

        // [A] 캐릭터 대사 출력 (알 상태가 아닐 때만)
        if (currentPartner && !collection.activeEgg) {
            const stageData = currentPartner.stages[currentStage] || currentPartner.stages['adult'];
            const responses = stageData.todo_responses; // characters.json 내 데이터

            if (responses) {
                const text = Array.isArray(responses) 
                    ? responses[Math.floor(Math.random() * responses.length)] 
                    : responses;
                window.showDialogue(text); // 한 글자씩 출력 엔진
            }
        }

        // [B] 보상 지급 (최초 1회 완료 시에만 작동)
        if (!molipTodos[index].rewarded) {
            
            // --- [럭키 박스 확률 체크: 5%] ---
            if (Math.random() < 0.05) {
                const bonusPoints = 50;
                collection.addPoints(bonusPoints); // 50P 추가

                // [변경] 알림창 대신 상단 토스트로 알림
                window.showToast(`연성로가 가열되어 ${bonusPoints} Et를 추가 획득했습니다.`, "event");
            }
            // ------------------------------

            // 기본 보상(5P) 지급 및 플래그 설정
            collection.addPoints(5);
            molipTodos[index].rewarded = true;
            window.showToast("5 Et 획득!", "success");

            // 에테르 UI 갱신
            window.updateUI();
        }
    }

    // 4. 리스트 새로고침 및 데이터 저장
    window.renderTodos();
    saveAllData();
};

window.deleteTodo = (id) => { molipTodos = molipTodos.filter(t => String(t.id) !== String(id)); window.renderTodos(); saveAllData(); };

// --------------------------------------------------------------------------
// [SECTION 6] 작업 로그 및 영수증 엔진
// --------------------------------------------------------------------------

window.openDailyLog = () => {
    logViewDate = new Date(); // 열 때 항상 오늘로 초기화
    document.getElementById('daily-log-modal').style.display = 'flex';
    window.renderDailyLogContent();
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

// [수정] renderer.js - window.saveLogAsReceipt 함수
// [최종 수정] 영수증 정밀 캡처 로직 (에러 방지 및 타이트한 크기 고정)
window.saveLogAsReceipt = async () => {
    const viewDateKey = logViewDate.toDateString();
    const appData = dailyAppTimeMap[viewDateKey] || {};
    if (Object.keys(appData).length === 0) return window.showToast("기록이 없습니다.", "warning");

    // 데이터 입력 (기존 로직 유지)
    document.getElementById('receipt-no').innerText = `#${Math.floor(Math.random()*9000)+1000}`;
    document.getElementById('receipt-date').innerText = logViewDate.toLocaleDateString();
    document.getElementById('receipt-char-name').innerText = currentPartner?.name || "Focus Dot";
    
    let total = 0;
    document.getElementById('receipt-items').innerHTML = Object.keys(appData).map(name => { 
        total += appData[name]; 
        return `<div class="receipt-item"><span class="name">${name}</span><span class="dots"></span><span class="time">${formatReceiptTime(appData[name])}</span></div>`; 
    }).join('');
    
    document.getElementById('receipt-total-time').innerText = formatReceiptTime(total);

    // --- [중요: 변수 선언 및 위치 고정] ---
    const wrapper = document.getElementById('receipt-wrapper');
    const receipt = document.getElementById('focus-receipt');
    
    if (!wrapper || !receipt) return console.error("영수증 엘리먼트를 찾을 수 없습니다.");

    // 1. 촬영을 위해 흰색 배경을 띄우고 영수증을 (0,0) 위치로 강제 밀착
    wrapper.style.display = "flex";

    setTimeout(() => {
        // 2. [핵심] 영수증 본체의 실제 크기(높이, 너비)를 측정
        const rect = receipt.getBoundingClientRect(); 

        const captureRect = {
            x: 0, // 좌상단 밀착 상태이므로 0
            y: 0, // 좌상단 밀착 상태이므로 0
            width: Math.ceil(rect.width),  // 영수증 너비만큼만 (약 320px)
            height: Math.ceil(rect.height) // 영수증의 실제 길이에 딱 맞게 캡처
        };

        // 3. 메인 프로세스에 정밀 캡처 요청
        ipcRenderer.send('save-log-image', captureRect);

        // 4. 촬영 후 다시 숨김 (ReferenceError 방지를 위해 wrapper 변수 활용)
        setTimeout(() => {
            wrapper.style.display = "none";
        }, 1000);
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
 * [renderer.js] 핵심 로직 루프
 * 활성 창 감지, "내 연구실" 처리, 버튼 비활성화, 캐릭터 상태 및 서신 체크를 수행합니다.
 */
async function updateLoop() {
    try {
        if (!masterData || window.isResetting) return;

        // 1. [핵심] 인트로 모달이 화면에 '물리적으로' 존재하는지 확인
        const introModal = document.getElementById('intro-modal');
        // offsetParent가 null이면 화면에서 완전히 사라진 상태입니다.
        const isIntroPlaying = introModal && introModal.offsetParent !== null;

        // 2. 인트로가 진행 중일 때는 편지와 업적 로직에 '접근'조차 못하게 막습니다.
        if (!isIntroPlaying) {
            
            // [A] 편지 체크: 인트로가 끝나야만 작동
            if (window.mailbox) {
                const stats = {
                    level: progress.level,
                    points: collection.points,
                    currentHour: new Date().getHours(),
                    currentDay: new Date().getDay()
                };
                const newMails = window.mailbox.checkTriggers(stats);
                
                if (newMails && newMails.length > 0) {
                    if (window.renderMailList) window.renderMailList();
                }
            }

            // [B] 업적 체크: 인트로가 끝나야만 작동
            if (window.checkAchievementTriggers) {
                window.checkAchievementTriggers();
            }
        }

        // 1. 날짜 변경 및 일과 초기화 체크
        const nowMolipDate = window.getMolipDate();
        if (masterData.progress && masterData.progress.lastSaveDate !== nowMolipDate) {
            progress.todayFocusTime = 0;
            masterData.progress.lastSaveDate = nowMolipDate;
            
            // [추가] 날짜가 바뀌었으니 리스트와 뱃지를 0으로 초기화하기 위해 재렌더링
            window.renderTodos();
            window.renderHabits();
            
            saveAllData();
            window.updateUI();
        }

        // 2. 부재 중(Idle) 체크 및 돌아온 대사 출력
        const idleTime = await ipcRenderer.invoke('get-idle-time');
        const nowIsIdle = idleTime > IDLE_THRESHOLD; 

        if (!isIdle && nowIsIdle) awayStartTime = Date.now();
        if (isIdle && !nowIsIdle) {
            if (awayStartTime && (Date.now() - awayStartTime) / 1000 >= 900) {
                const responses = currentPartner?.stages[currentStage]?.return_responses || ["돌아오셨군요!"];
                window.showDialogue(Array.isArray(responses) ? responses[Math.floor(Math.random() * responses.length)] : responses, 2);
            }
            awayStartTime = null;
        }
        isIdle = nowIsIdle;

        // 3. 캐릭터 성장도 누적 및 진화 체크
        if (currentPartner && !collection.activeEgg) {
            charGrowthMap[currentPartner.id] = (charGrowthMap[currentPartner.id] || 0) + 1;
            if (currentStage === 'child' && (charGrowthMap[currentPartner.id] / 60) >= (currentPartner.evolution_level || 1440)) {
                window.performEvolution(currentPartner);
            }
        }

        // 4. ★ 활성 창 분석 및 인식 로직 ★
        // updateLoop 함수 내부의 활성 창 분석 로직 구간
        const rawOwner = lastActiveWin?.owner || "Ether Flow";
        const cleanedName = window.cleanAppName(rawOwner); // 이름 정제
        const isSelf = (cleanedName === "Ether Flow" || cleanedName === "Electron" || cleanedName === "내 연구실");

        const appNameEl = document.getElementById('current-app-name');
        const distractNameEl = document.getElementById('current-distract-name');

        if (appNameEl) appNameEl.innerText = isSelf ? "내 연구실" : cleanedName;
        if (distractNameEl) distractNameEl.innerText = isSelf ? "내 연구실" : cleanedName;

        // 작업 도구 매칭 (대소문자 무시 및 포함 여부 체크)
        const checkTarget = rawOwner.toLowerCase();
        isActuallyWorking = !isSelf && workApps.some(app => {
            const appName = typeof app === 'string' ? app : (app.name || "");
            return checkTarget.includes(appName.toLowerCase());
        });

        isDistraction = !isSelf && distractionApps.some(app => {
            const appName = typeof app === 'string' ? app : (app.name || "");
            return checkTarget.includes(appName.toLowerCase());
        });
        
        const addWorkBtn = document.querySelector('.btn-add-current'); 
        const addDistBtn = document.querySelector('.btn-add-current'); 

        // [핵심] 자신을 보고 있을 때 버튼 비활성화 처리
        if (isSelf) {
            if (addWorkBtn) {
                addWorkBtn.disabled = true;
                addWorkBtn.style.opacity = "0.4";
                addWorkBtn.style.cursor = "not-allowed";
            }
            if (addDistBtn) {
                addDistBtn.disabled = true;
                addDistBtn.style.opacity = "0.4";
                addDistBtn.style.cursor = "not-allowed";
            }
        } else {
            if (addWorkBtn) {
                addWorkBtn.disabled = false;
                addWorkBtn.style.opacity = "1";
                addWorkBtn.style.cursor = "pointer";
            }
            if (addDistBtn) {
                addDistBtn.disabled = false;
                addDistBtn.style.opacity = "1";
                addDistBtn.style.cursor = "pointer";
            }
        }

        // 상태 확정
        const isFocusing = isActuallyWorking && !isIdle && !isDistraction;

        // [추가] 알 부화 감시 호출
        if (collection.activeEgg) {
            checkHatching();
        }
        
        // 6. 캐릭터 상태 및 배지 업데이트
        let nextState = 'good';
        if (isIdle) nextState = 'away';
        else if (isDistraction) nextState = 'distracting';
        else if (isFocusing) nextState = 'working';

        // ★ [핵심 추가] 상태가 변경되었을 때 캐릭터 대사 트리거
        if (nextState !== lastStatus) {
            // 알 상태가 아닐 때만 대사 출력 (알 상태 대사는 클릭 로직에서 처리)
            if (!collection.activeEgg) {
                window.showDialogue(null, 2); 
            }
            lastStatus = nextState;
        }

        if (currentStage !== 'egg' && renderer.currentState !== nextState) {
            await renderer.setExpression(nextState);
        }
        
        // 배지 업데이트 호출
        updateStatusBadge();

        // 7. 서신(Mailbox) 트리거 체크
        const statsForMail = {
            partnerId: currentPartner ? currentPartner.id : null,
            intimacy_level: currentPartner ? (charIntimacyMap[currentPartner.id] || 0) : 0,
            current_stage: currentStage,
            all_growth: charGrowthMap || {},
            ownedCount: collection.ownedIds.length,
            totalTime: progress.totalFocusTime,
            todoCount: molipTodos.filter(t => t && t.completed).length,
            alchemist_level: progress.level,
            points: collection.points,
            isFlowActive: (flowStateEndTime && Date.now() < flowStateEndTime),
            isPerfectDay: (molipTodos.length > 0 && molipTodos.every(t => t && t.completed)),
            currentHour: new Date().getHours(),
            currentDay: new Date().getDay()
        };

        if (mailbox) {
            const checkResult = mailbox.checkTriggers(statsForMail);
            if (checkResult && checkResult.length > 0) {
                window.updateMailNotification();
                window.showToast(`${checkResult.length}통의 새로운 서신 도착!`, "success");
            }
        }

        // 8. 집중 포인트 정산 및 실시간 기록 저장
        if (isFocusing || isDistraction) {
            const type = isFocusing ? 'work' : 'distract';
            
            // 1. 작업 기록(로그) 세부 데이터 저장
            recordWorkLogEntry(rawOwner, type);

            // 2. 영수증용 앱별 누적 시간 기록
            const dateKey = new Date().toDateString();
            if (!dailyAppTimeMap[dateKey]) dailyAppTimeMap[dateKey] = {};
            dailyAppTimeMap[dateKey][rawOwner] = (dailyAppTimeMap[dateKey][rawOwner] || 0) + 1;

            // 3. 기존 포인트/레벨 정산 로직
            if (isFocusing) {
                progress.recordFocus(); 
                if (progress.totalFocusTime % 60 === 0) collection.addPoints(1);
            }
        }

        // [추가] 실린더 부산물 시스템 업데이트 (매 초 농도 계산 및 가챠 체크)
        window.updateCylinderSystem();

        // [추가] 업적 달성 조건 실시간 감시
        window.checkAchievementTriggers();

        // 9. 데이터 저장 및 UI 갱신
        saveAllData();
        window.updateUI();

    } catch (err) {
        console.error("UpdateLoop Error:", err);
    }
}

/**
 * [renderer.js] 상태 배지의 텍스트와 색상을 업데이트합니다.
 */
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
    // 알이 없거나 이미 부화 연출 중이면 중단
    if (!collection || !collection.activeEgg || isHatching) return;

    // 부화 목표 (15초)
    const requiredTime = 15; 
    const currentTime = progress.totalFocusTime;

    if (currentTime >= requiredTime) {
        console.log("✨ 에테르(15초) 달성! 부화 시퀀스를 호출합니다.");
        
        // ★ [교정] 여기서 isHatching을 true로 만들지 않고, 실행 함수에 위임합니다.
        if (window.startHatchingProcess) {
            window.startHatchingProcess();
        } else if (window.performHatchSequence) {
            window.performHatchSequence(collection.activeEgg.type);
        }
    }
}

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
 * [renderer.js] 엔진 시작: 데이터 로드, 매니저 초기화, UI 복구 및 환영 인사 실행
 */
async function startEngine() {
    // 1. 데이터 로드 및 기본값 확인
    masterData = await ipcRenderer.invoke('load-game-data');

    if (!masterData || !masterData.settings) {
        masterData = {
            progress: { level: 1, exp: 0, totalFocusTime: 0, todayFocusTime: 0, lastSaveDate: window.getMolipDate() },
            collection: { ownedIds: [], points: 0, activeEgg: null },
            mailbox: { mailHistory: [] },
            settings: { 
                workApps: [], distractionApps: [], isHorizontalMode: true, 
                isWindowMode: true, isAlwaysOnTop: false, font: 'paperlogy' 
            },
            character: { intimacyMap: {}, growthMap: {} },
            todo: [], habit: [], stats: { dailyAppTimeMap: {} },
            inventory: { items: {}, byproducts: {} }
        };
    }

    // 2. 매니저 및 시스템 데이터 복구
    workApps = masterData.settings.workApps || []; 
    distractionApps = masterData.settings.distractionApps || [];
    if (typeof initializeByproductData === 'function') initializeByproductData();

    progress = new ProgressManager(masterData.progress); 
    window.progress = progress;

    collection = new CollectionManager(masterData.collection);
    window.collection = collection;

    const mailData = (masterData.mailbox && masterData.mailbox.mailHistory) 
                     ? masterData.mailbox.mailHistory 
                     : (Array.isArray(masterData.mailbox) ? masterData.mailbox : []);
    mailbox = new MailboxManager(mailData, mailPoolData);

    // 3. 오늘 날짜 기준 시간 복구 (형식 통일: YYYY-MM-DD)
    const todayStr = window.getMolipDate();
    if (masterData.progress && masterData.progress.lastSaveDate === todayStr) {
        progress.todayFocusTime = masterData.progress.todayFocusTime || 0; 
    } else {
        progress.todayFocusTime = 0; 
    }

    // 4. 캐릭터 및 유대 데이터 로드
    const charSave = masterData.character || {};
    charIntimacyMap = charSave.intimacyMap || {}; 
    charGrowthMap = charSave.growthMap || {}; 
    givenGiftsMap = charSave.givenGiftsMap || {};
    dailyPetCountMap = charSave.dailyPetCountMap || {};

    molipTodos = (masterData.todo || []).filter(t => t !== null);
    molipHabits = (masterData.habit || []).filter(h => h !== null);

    // 5. 시스템 설정 동기화 및 즉시 적용
    const s = masterData.settings || {};
    window.isHorizontalMode = (s.isHorizontalMode !== undefined) ? s.isHorizontalMode : true; 
    window.isWindowMode = (s.isWindowMode !== undefined) ? s.isWindowMode : true; 
    window.isAlwaysOnTop = s.isAlwaysOnTop || false;

    // [작업 설정값 복구]
    window.resetHour = s.resetHour || 0;
    window.hideCompleted = s.hideCompleted || false;
    window.showPastCompleted = s.showPastCompleted || false;
    window.autoDeleteOldTasks = s.autoDeleteOldTasks || false;

    // 시스템 레이아웃 및 윈도우 모드 적용
    window.applyHorizontalMode();
    window.applyWindowMode();

    // ★ [추가] 아코디언 상태 복구 로직
    // 저장된 아코디언 상태가 있다면 해당 ID를 찾아 active 클래스를 토글합니다.
    const savedAccordionStates = masterData.settings.accordionStates || {};
    Object.keys(savedAccordionStates).forEach(id => {
        const acc = document.getElementById(id);
        if (acc) {
            const isActive = savedAccordionStates[id];
            if (isActive) {
                acc.classList.add('active');
            } else {
                acc.classList.remove('active');
            }
        }
    });

    // 6. 파트너 로드 및 엔진 가동
    const savedId = charSave.selectedPartnerId;
    const introLayer = document.getElementById('intro-sequence');

    if (!savedId) {
        if (introLayer) introLayer.style.display = 'flex';
    } else {
        if (introLayer) introLayer.style.display = 'none';
        currentPartner = charData.characters.find(c => c.id === savedId); 
        if (currentPartner) {
            await refreshCharacterSprite(); 
        }

        if (typeof window.startMainGameEngine === 'function') {
            window.startMainGameEngine();
        }
    }

    // 7. UI 초기 렌더링
    window.renderWorkAppList(); 
    window.renderDistractionAppList();
    window.renderTodos(); 
    window.renderHabits();
    window.updateUI();

    document.body.classList.add('ready');
    if (typeof renderer !== 'undefined' && renderer.startLoop) renderer.startLoop();
}


document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    if (todoInput) {
        todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.addMolipTodo(); } });
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

// [renderer.js] 초기 데이터 로드 및 인트로 체크
ipcRenderer.on('init-data', async (event, data) => {
    if (!data) return;
    masterData = data;

    // 기존 매니저가 없을 때만 새로 생성하거나, 기존 객체에 데이터 주입
    if (!progress) {
        progress = new ProgressManager(masterData.progress);
        window.progress = progress;
    }
    if (!collection) {
        collection = new CollectionManager(masterData.collection);
        window.collection = collection;
    }
    
    // 데이터 복구 및 매니저 초기화
    progress = new ProgressManager(masterData.progress);
    collection = new CollectionManager(masterData.collection);
    charGrowthMap = masterData.charGrowthMap || {};
    charIntimacyMap = masterData.charIntimacyMap || {};
    givenGiftsMap = masterData.givenGiftsMap || {};
    
    // 설정값 복구
    workApps = masterData.workApps || [];
    distractionApps = masterData.distractionApps || [];
    molipTodos = masterData.molipTodos || [];
    molipHabits = masterData.molipHabits || [];

    // 메일박스 초기화
    mailbox = new MailboxManager(masterData.mailbox, mailPoolData);

    // ★ [핵심 보강] 보유 캐릭터가 없다면 인트로(첫 선택) 모달 표시
    if (!collection.ownedIds || collection.ownedIds.length === 0) {
        if (window.showFirstChoiceModal) {
            // 약간의 지연 후 실행하여 UI가 완전히 로드된 뒤 뜨게 함
            setTimeout(() => window.showFirstChoiceModal(), 500);
        }
    } else {
        // 캐릭터가 있다면 정상적으로 파트너 설정 및 렌더링 시작
        currentPartner = charData.characters.find(c => c.id === masterData.collection.ownedIds[0]);
        await refreshCharacterSprite();
        renderer.startLoop();
    }

    window.updateUI();
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
/**
 * [renderer.js] 설정 모달을 열 때 현재 저장된 값으로 UI를 동기화합니다.
 */
window.toggleSettings = (show) => {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.style.display = show ? 'flex' : 'none';
    
    if (show) {
        const s = masterData.settings || {};

        // 1. 일반 설정 동기화
        const currentFont = s.font || 'paperlogy';
        const fontRadio = document.querySelector(`input[name="font-choice"][value="${currentFont}"]`);
        if (fontRadio) fontRadio.checked = true;

        // 2. [버그 수정] 넓게 보기(가로 모드) 토글 UI 상태 동기화
        // 기존의 layout-h, layout-v 참조 코드를 제거하고 아래 코드로 대체합니다.
        const horizontalToggle = document.getElementById('horizontal-mode-toggle');
        if (horizontalToggle) {
            horizontalToggle.classList.toggle('active', window.isHorizontalMode);
        }

        // 2. [작업 설정(Apps) UI 동기화] ★ 핵심 추가 ★
        
        // 초기화 시간 셀렉트 박스
        const resetSelect = document.getElementById('reset-hour-select');
        if (resetSelect) resetSelect.value = window.resetHour;

        // 완료 항목 숨기기 토글
        const hideToggle = document.getElementById('hide-completed-toggle');
        if (hideToggle) hideToggle.classList.toggle('active', window.hideCompleted);

        // 지난 항목 표시 토글
        const showPastToggle = document.getElementById('show-past-toggle');
        if (showPastToggle) showPastToggle.classList.toggle('active', window.showPastCompleted);

        // 자동 삭제 토글
        const autoDeleteToggle = document.getElementById('auto-delete-toggle');
        if (autoDeleteToggle) autoDeleteToggle.classList.toggle('active', window.autoDeleteOldTasks);

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
// [renderer.js] 약 1184행 부근 toggleAccordion 함수 수정
window.toggleAccordion = (id) => {
    const accordion = document.getElementById(id);
    if (accordion) {
        accordion.classList.toggle('active');
        
        // ★ 추가: 상태가 변할 때마다 즉시 저장 시스템에 반영
        saveAllData(); 
    }
};

window.changeFont = (fontName) => {
    // 1. Body 클래스 초기화 (기존 폰트 클래스 제거)
    document.body.classList.remove('font-paperlogy', 'font-Galmuri11', 'font-Stardust', 'font-Pretendard');
    
    // 2. 새로운 클래스 추가
    const targetClass = `font-${fontName}`;
    document.body.classList.add(targetClass);
    
    // 3. 세이브 데이터에 기록
    if (window.masterData) {
        masterData.settings = masterData.settings || {};
        masterData.settings.fontFamily = fontName;
        saveAllData(); //
    }

    console.log(`폰트가 변경되었습니다: ${fontName}`);
};

// [교정] 앱 시작 시 저장된 폰트 불러오기 함수 수정
function applySavedFont() {
    if (!masterData || !masterData.settings) return;

    const savedFont = masterData.settings.font || 'paperlogy';
    window.changeFont(savedFont);
    
    // 라디오 버튼 체크 상태 동기화
    const radio = document.querySelector(`input[name="font-choice"][value="${savedFont}"]`);
    if (radio) radio.checked = true;
}

// [renderer.js] 누락된 편지함 UI 제어 함수들 추가

// 1. 뱃지 카운트 업데이트 로직으로 교체

window.updateMailNotification = () => {
    const badge = document.getElementById('mail-badge');
    if (!badge || !mailbox) return;

    // 매니저를 통해 읽지 않은 메일 갯수를 가져옵니다.
    const unreadCount = mailbox.getUnreadCount();

    if (unreadCount > 0) {
        badge.innerText = unreadCount; // 숫자 반영
        badge.style.display = 'flex';  // 뱃지 노출
    } else {
        badge.style.display = 'none';  // 0개일 때는 숨김
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
        id: 'habit_' + Date.now().toString(36),
        text: input.value.trim(),
        completed: false,
        streak: 0,
        lastCompletedDate: null // 마지막으로 완료한 날짜 (YYYY-MM-DD)
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
    const total = molipHabits.length;
    const completed = molipHabits.filter(h => h && h.completed).length;

    if (badge) {
        badge.innerText = `${completed}/${total}`;
        badge.classList.toggle('all-completed', total > 0 && completed === total);
    }

    // 2. 리스트 필터링
    let displayHabits = molipHabits;
    if (window.hideCompleted) {
        displayHabits = molipHabits.filter(h => !h.completed);
    }

    if (displayHabits.length === 0) {
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
window.toggleHabit = (id) => {
    const habit = molipHabits.find(h => h.id === id);
    if (!habit) return;

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const wasCompleted = habit.completed;

    habit.completed = !habit.completed;

    if (habit.completed && !wasCompleted) {
        // 새로 완료한 경우 스트릭 계산
        const lastDate = habit.lastCompletedDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        if (lastDate === yesterdayStr) {
            habit.streak += 1; // 어제에 이어 오늘도 성공
        } else if (lastDate !== today) {
            habit.streak = 1; // 새로 시작
        }
        
        habit.lastCompletedDate = today;
        collection.addPoints(10); // 습관은 과업(5P)보다 보상을 크게 설정
        window.showToast(`습관 완수! ${habit.streak}일째입니다. +10 Et`, "success");
    } else if (!habit.completed && wasCompleted) {
        // 완료 취소 시 스트릭 원복 (간단하게 1 차감 혹은 유지 로직 선택)
        habit.streak = Math.max(0, habit.streak - 1);
    }

    window.renderHabits();
    window.updateUI();
    saveAllData();
};

// [renderer.js] 자정 초기화 체크 함수
function checkHabitReset() {
    const today = new Date().toLocaleDateString('en-CA');
    let isChanged = false;

    molipHabits.forEach(habit => {
        // 마지막 완료일이 오늘이 아니고 이미 완료 상태라면 초기화
        if (habit.completed && habit.lastCompletedDate !== today) {
            habit.completed = false;
            isChanged = true;
        }
        
        // 하루를 건너뛰었다면 스트릭 초기화
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');
        
        if (habit.lastCompletedDate !== today && habit.lastCompletedDate !== yesterdayStr) {
            if (habit.streak > 0) {
                habit.streak = 0;
                isChanged = true;
            }
        }
    });

    if (isChanged) {
        window.renderHabits();
        saveAllData();
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
window.deleteHabit = (id) => {
    if (!confirm("이 습관 수련을 중단하시겠습니까? (연속 기록이 사라집니다)")) return;
    
    molipHabits = molipHabits.filter(h => String(h.id) !== String(id));
    window.renderHabits();
    saveAllData();
    window.showToast("습관 기록을 파기했습니다.", "info");
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
    if (!currentPartner || collection.activeEgg) return [];

    const stageData = currentPartner.stages[currentStage];
    if (!stageData || !stageData.dialogues || !stageData.dialogues[category]) return [];

    const categoryData = stageData.dialogues[category];
    
    // 호감도에 따른 키 결정 (JSON 구조: max, high, low)
    const intimacy = charIntimacyMap[currentPartner.id] || 0;
    const intimacyKey = intimacy >= 90 ? 'max' : (intimacy >= 55 ? 'high' : 'low');

    // 해당 카테고리가 호감도별 객체인지, 아니면 단순 배열인지 판별
    if (Array.isArray(categoryData)) {
        return categoryData;
    } else {
        return categoryData[intimacyKey] || categoryData['high'] || [];
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
    { id: 'rank_novice_1', name: '연금술 입문', icon: '📜', desc: '연금술의 세계에 첫 발을 내디뎠습니다.' },
    { id: 'rank_apprentice_5', name: '수습 연금술사', icon: '🧪', desc: '기초 연성법을 익히고 가능성을 증명했습니다.' },
    { id: 'rank_regular_10', name: '정식 연금술사', icon: '⚒️', desc: '능숙한 도구 사용으로 정식 대원이 되었습니다.' },
    { id: 'rank_expert_15', name: '전문 연금술사', icon: '📖', desc: '고도화된 지식과 실무 능력을 겸비했습니다.' },
    { id: 'rank_senior_20', name: '상급 연금술사', icon: '🎖️', desc: '길드 내에서 존경받는 상급 연구자의 자리에 올랐습니다.' },
    { id: 'rank_veteran_25', name: '노련한 연금술사', icon: '⏳', desc: '수많은 경험을 통해 노련한 통찰력을 갖추었습니다.' },
    { id: 'rank_master_30', name: '연금술 명장', icon: '🔨', desc: '에테르 연성을 예술의 경지로 끌어올린 명장입니다.' },
    { id: 'rank_harmonizer_35', name: '원소의 조율자', icon: '🌪️', desc: '사대 원소의 균형을 완벽하게 다스리는 조율자입니다.' },
    { id: 'rank_guardian_40', name: '지혜의 파수꾼', icon: '🛡️', desc: '심연의 지식을 수호하고 금기를 다스리는 파수꾼입니다.' },
    { id: 'rank_interpreter_45', name: '비전의 해석자', icon: '🔎', desc: '고대의 비전과 비밀스러운 공식을 완벽히 해석했습니다.' },
    { id: 'rank_truth_50', name: '진리의 도달자', icon: '⚖️', desc: '인간의 한계를 넘어 진리의 문턱에 도달한 탐구자입니다.' },
    { id: 'rank_lord_55', name: '에테르의 군주', icon: '🏰', desc: '세상의 모든 에테르 흐름을 지배하는 위대한 군주입니다.' },
    { id: 'rank_legend_60', name: '전설의 연금술사', icon: '🌟', desc: '연금술 역사에 영원히 기록될 신화적인 존재가 되었습니다.' },

    // 1. 몰입 및 시간 관련 업적
    { id: 'focus_depth_5000', name: '몰입의 심연', icon: '🌀', desc: '누적 5,000분의 몰입을 달성하여 심연의 끝에 도달했습니다.' },
    { id: 'marathon_king_180', name: '불굴의 집중력', icon: '🕯️', desc: '한 번의 흐트러짐 없이 180분간 연성로의 불꽃을 지켜냈습니다.' },
    { id: 'night_monarch', name: '심야의 수호자', icon: '🌙', desc: '모두가 잠든 밤, 고요한 정적 속에서 가장 찬란한 진리를 일깨웠습니다.' },
    { id: 'dawn_pioneer', name: '새벽의 선구자', icon: '🌅', desc: '가장 맑은 새벽 에테르를 정제하며 완벽한 하루를 시작했습니다.' },

    // 2. 과업 및 습관 관련 업적
    { id: 'task_centurion', name: '백 번의 성취', icon: '💯', desc: '백 번의 과업 완수를 통해 연금술의 견고한 토대를 쌓았습니다.' },
    { id: 'task_grandmaster', name: '성취의 거장', icon: '🏛️', desc: '천 번의 마침표를 찍으며 연금술의 거장 반열에 올랐습니다.' },
    { id: 'habit_legend_100', name: '백일의 기적', icon: '🌳', desc: '100일간의 성실함으로 영혼의 본질을 변화시키는 연금술을 완성했습니다.' },
    { id: 'perfect_rhythm_7', name: '완전무결한 리듬', icon: '⏳', desc: '일주일간 단 하나의 결점도 없는 완벽한 생활 리듬을 유지했습니다.' },

    // 3. 유대 및 캐릭터 관련 업적
    { id: 'mabel_eternal_partner', name: '메이벨의 유일한 이해자', icon: '🌸', desc: '메이벨과 영혼의 무게를 나누는 절대적인 신뢰 관계가 되었습니다.' },
    { id: 'indigo_shadow_bond', name: '인디고의 그림자 동반자', icon: '🌑', desc: '인디고의 정적 속에 머물며 완벽한 그림자 우대를 공유하게 되었습니다.' },
    { id: 'morgana_abyss_lover', name: '모르가나의 진실한 반려', icon: '🐍', desc: '모르가나와 함께 심연의 끝에서 가장 은밀한 진실을 마주했습니다.' },
    { id: 'aurelia_golden_glory', name: '아우렐리아의 황금빛 파트너', icon: '👑', desc: '아우렐리아로부터 정점의 가호를 받는 고결한 동반자로 인정받았습니다.' },
    { id: 'homunculus_collector', name: '요람의 대주인', icon: '🌈', desc: '네 마리의 호문클루스를 모두 거느려 연구실의 생태계를 완성했습니다.' },
    { id: 'evolution_master', name: '진화의 마스터', icon: '✨', desc: '모든 피조물을 성공적으로 성체기까지 인도한 육성의 대가입니다.' },

    // 4. 전문성 및 자산 관련 업적
    { id: 'sage_alchemist_30', name: '대연금술사의 증표', icon: '🔮', desc: '30레벨의 숙련도에 도달하여 연금술의 현자 경지를 증명했습니다.' },
    { id: 'midas_hand_10000', name: '황금의 손', icon: '💰', desc: '10,000 에테르를 모아 연구실을 황금빛 풍요로 가득 채웠습니다.' },
    { id: 'generous_creator_50', name: '다정한 창조주', icon: '🎁', desc: '50번의 선물을 통해 피조물들에게 진심 어린 다정함을 전했습니다.' },
    { id: 'tool_conductor_7', name: '도구의 지휘자', icon: '🎻', desc: '일곱 개의 도구를 자유자재로 다루며 업무의 파도를 지휘합니다.' },
    { id: 'iron_will_failed_10', name: '불굴의 의지', icon: '🛡️', desc: '열 번의 실패조차 굴복시키지 못한 단단한 연금술사의 의지를 지녔습니다.' },
    { id: 'order_avatar_30', name: '절대 질서의 화신', icon: '⚖️', desc: '한 달간의 완벽한 규칙을 통해 혼돈을 이겨내고 절대 질서의 화신이 되었습니다.' }
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
 * 1. 서신 상세보기 (발신자 표시 + 타이핑 연출)
 */
window.openLetter = (mailId) => {
    if (!window.mailbox) return;
    
    const mail = window.mailbox.receivedMails.find(m => String(m.id) === String(mailId));
    if (!mail) return;

    // index.html의 실제 ID 참조
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
    if (rewardZone) rewardZone.innerHTML = ""; // 타이핑 시작 전 보상 칸 비우기

    // 본문 타이핑 효과 시작
    if (contentEl) {
        if (window.mailTypeTimer) clearInterval(window.mailTypeTimer);
        
        window.startTypewriter(mail.content, contentEl, () => {
            // [콜백] 타이핑 완료 시점에 보상 영역 렌더링
            window.renderLetterReward(mail);
        });
    }

    // 데이터 상태 업데이트 (읽음 처리)
    mail.isRead = true;
    saveAllData();
    if (window.renderMailList) window.renderMailList();
    if (window.updateMailNotification) window.updateMailNotification();
};

/**
 * 2. 타이핑 엔진
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
            clearInterval(window.mailTypeTimer);
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
                    <i class="fa-solid fa-check-double"></i> 보상 수령 완료
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

    // 유형별 데이터 및 아이콘 매칭
    if (type === 'point' || type === 'ether') {
        faIcon = "fa-coins";
        displayName = "에테르";
        displayVal = `${val.toLocaleString()} Et`;
    } else if (type === 'item') {
        faIcon = "fa-box-open";
        displayName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(rewardId) : "연구 재료";
        displayVal = `${val}개`;
    } else if (type === 'achievement') {
        faIcon = "fa-trophy";
        const ach = (window.achievementList || []).find(a => a.id === rewardId);
        displayName = ach ? ach.name : "특별 업적";
        displayVal = "해금";
    }

    // 아티스트님이 요청하신 "아이콘 + 금액 + 수령하기" 형식
    const buttonText = `${displayVal} 수령하기`;

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

            toastMsg = `✨ ${amount.toLocaleString()} 에테르를 수령했습니다!`;
            console.log(`[보상 성공] 획득: ${amount}, 현재잔액: ${window.collection.points}`);
        } 
        
        // 2. 아이템 보상 처리 (생략 없이 유지)
        else if (reward.type === 'item') {
            if (!masterData.inventory) masterData.inventory = { byproducts: {} };
            const amount = Number(reward.value || reward.amount || 1);
            masterData.inventory.byproducts[reward.id] = (masterData.inventory.byproducts[reward.id] || 0) + amount;
            const itemName = (window.inventory && window.inventory.getItemName) ? window.inventory.getItemName(reward.id) : "연구 재료";
            toastMsg = `📦 ${itemName} ${amount}개를 획득했습니다.`;
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
/**
 * [renderer.js] 업적 그리드 렌더링 (아이콘 적용 + 마스킹 + 공용 툴팁)
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
            const iconVal = ach.icon || '🏆';
            // 폰트어썸 클래스(fa-...)인지 일반 이모지인지 판별
            if (iconVal.startsWith('fa-')) {
                iconHtml = `<i class="fa-solid ${iconVal}"></i>`;
            } else {
                iconHtml = `<span style="font-size: 2rem;">${iconVal}</span>`;
            }
        } else {
            iconHtml = `<span style="font-size: 2rem; color: rgba(0,0,0,0.2);"><i class="fa-solid fa-question"></i></span>`;
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
    if (window.mailTypeTimer) clearInterval(window.mailTypeTimer);
    const modal = document.getElementById('letter-view-modal');
    if (modal) modal.style.display = 'none';
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
    // 1. 실제 농도 수치 반영
    const satValue = Math.floor(cylinderSaturation); 
    const satValEl = document.getElementById('sat-value');
    const satBarEl = document.getElementById('sat-bar-fill');
    if(satValEl) satValEl.innerText = `${satValue}%`;
    if(satBarEl) satBarEl.style.width = `${satValue}%`;
    
    // 2. 인벤토리 렌더링
    const grid = document.getElementById('sediment-grid');
    if (!grid) return;

    const inventory = masterData.inventory.byproducts;
    
    grid.innerHTML = byproductTable.map(item => {
        const count = inventory[item.id] || 0;
        const hasItem = count > 0;
        
        return `
            <div class="sediment-slot ${hasItem ? 'has-item' : ''}">
                <div class="sediment-icon">${hasItem ? item.icon : '<i class="fas fa-question"></i>'}</div>
                <div class="sediment-name">${hasItem ? item.name : '???'}</div>
                <div class="sediment-count">${hasItem ? 'x' + count : ''}</div>
            </div>
        `;
    }).join('');

    // 3. 연성 제단 업데이트 (조건 체크)
    window.updateAltarStatus(); 
};

// [renderer.js] 실린더 심층 부산물 데이터 정의
const byproductTable = [
    { id: 'ether_sludge', name: '에테르 슬러지', icon: '🌑', rarity: 'common', minSat: 50, chance: 0.12 },
    { id: 'bleached_scales', name: '탈색된 비늘', icon: '🍂', rarity: 'common', minSat: 50, chance: 0.10 },
    { id: 'petrified_memory', name: '석화된 기억', icon: '🪨', rarity: 'uncommon', minSat: 65, chance: 0.08 },
    { id: 'transparent_husk', name: '투명한 허물', icon: '🌬️', rarity: 'uncommon', minSat: 65, chance: 0.06 },
    { id: 'pulsing_crystal', name: '박동하는 결정', icon: '💎', rarity: 'rare', minSat: 80, chance: 0.04 },
    { id: 'floating_eye', name: '부유하는 안구', icon: '👁️', rarity: 'rare', minSat: 80, chance: 0.03 },
    { id: 'abyssal_dregs', name: '심연의 침전물', icon: '🌌', rarity: 'epic', minSat: 90, chance: 0.015 },
    { id: 'incomplete_fetus', name: '불완전한 태아', icon: '🧪', rarity: 'epic', minSat: 95, chance: 0.01 }
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

    // 4. [핵심] 아티스트님이 원하신 맞춤 토스트 문구
    // 현재 파트너가 누구인지 이름을 가져옵니다. (없으면 '호문클루스')
    const charName = window.currentPartner ? window.currentPartner.name : "호문클루스";
    
    if (window.showToast) {
        // 문구 예시: "모르가나가 실린더 속에서 '에테르 슬러지'를 건져 올렸습니다!"
        window.showToast(`${charName}이(가) 실린더 속에서 '${item.name}'을(를) 건져 올렸습니다!`, "info");
    }

    // 5. 연성소 UI가 열려있다면 즉시 갱신
    if (window.refreshSedimentUI) window.refreshSedimentUI();
    if (window.updateAltarStatus) window.updateAltarStatus();
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
            target: 15,
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
window.renderInventory = () => {
    const grid = document.getElementById('inventory-grid');
    const detailArea = document.getElementById('inventory-detail');
    if (!grid) return;

    grid.innerHTML = "";
    // 초기화 시 상세창 비우기
    if (detailArea) detailArea.innerHTML = `<div class="empty-bag-msg">아이템을 선택해 주세요.</div>`;

    // A. 상점 구매 아이템 (items) + B. 연성 부산물 (byproducts) 통합
    const invItems = masterData.inventory?.items || {};
    const invByproducts = masterData.inventory?.byproducts || {};
    
    // 모든 아이템 ID 수집
    const allItemIds = [...Object.keys(invItems), ...Object.keys(invByproducts)];
    const uniqueIds = [...new Set(allItemIds)];

    if (uniqueIds.length === 0) {
        grid.innerHTML = `<div class="empty-bag-msg">가방이 비어 있습니다.</div>`;
        return;
    }

    uniqueIds.forEach(id => {
        // 1. 개수 파악
        const count = (invItems[id] || 0) + (invByproducts[id] || 0);
        if (count <= 0) return;

        // 2. 정보 매칭 (shopItems 또는 byproductTable에서 찾기)
        let info = shopItems.find(i => i.id === id);
        if (!info) info = byproductTable.find(i => i.id === id);
        if (!info) return;

        // 3. 슬롯 생성
        const slot = document.createElement('div');
        slot.className = 'inventory-slot-glass';
        slot.innerHTML = `
            <div class="slot-icon">${info.icon}</div>
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
    
    // 남은 선물 횟수 계산
    let remainingText = '';
    if (isGift) {
        const charId = currentPartner.id;
        const today = new Date().toLocaleDateString('en-CA');
        const giftData = masterData.giftCounts?.[charId];
        const usedToday = (giftData?.date === today) ? giftData.count : 0;
        remainingText = `<div style="font-size:0.75rem; color:var(--primary-gold); margin-bottom:10px;">오늘 남은 횟수: ${3 - usedToday}/3</div>`;
    }

    detailArea.innerHTML = `
        <div id="detail-info-area">
            <div class="detail-icon-lg">${info.icon}</div>
            <div class="detail-name-lg">${info.name}</div>
            <div class="detail-desc-lg">${info.desc || info.description || ''}</div>
            ${remainingText}
            ${isGift ? `
                <button class="btn-inventory-action" onclick="window.useInventoryItem('${id}')">
                    호문클루스에게 선물하기
                </button>
            ` : `
                <div style="color:rgba(255,255,255,0.2); font-size:0.8rem;">연성로에서 사용 가능한 연성 재료입니다.</div>
            `}
        </div>
    `;
};

/**
 * 4. [핵심] 아이템 사용 및 선물 처리 (에러 발생했던 함수)
 */
window.useInventoryItem = (id) => {
    if (!currentPartner) return;

    const itemInfo = shopItems.find(i => i.id === id) || byproductTable.find(i => i.id === id);
    if (!itemInfo) return;

    const charId = currentPartner.id;
    const today = new Date().toLocaleDateString('en-CA'); 

    // 1. 선물일 경우 일일 한도 체크
    if (itemInfo.category === 'gift') {
        if (!masterData.giftCounts) masterData.giftCounts = {};
        if (!masterData.giftCounts[charId]) {
            masterData.giftCounts[charId] = { date: today, count: 0 };
        }
        if (masterData.giftCounts[charId].date !== today) {
            masterData.giftCounts[charId].date = today;
            masterData.giftCounts[charId].count = 0;
        }
        if (masterData.giftCounts[charId].count >= 3) {
            window.showToast("오늘은 선물을 충분히 주었습니다.", "error");
            return;
        }
    }

    // 2. 아이템 수량 차감
    let itemUsed = false;
    if (masterData.inventory.items && (masterData.inventory.items[id] || 0) > 0) {
        masterData.inventory.items[id]--;
        itemUsed = true;
    } else if (masterData.inventory.byproducts && (masterData.inventory.byproducts[id] || 0) > 0) {
        masterData.inventory.byproducts[id]--;
        itemUsed = true;
    }

    if (itemUsed) {
        if (itemInfo.category === 'gift') {
            masterData.giftCounts[charId].count++;

            // ★ [해금 로직 추가] 준 적 있는 선물 목록에 기록
            if (!givenGiftsMap[charId]) givenGiftsMap[charId] = [];
            if (!givenGiftsMap[charId].includes(itemInfo.name)) {
                givenGiftsMap[charId].push(itemInfo.name);
            }

            window.closeInventory();

            const prefs = currentPartner.preferences;
            const stageKey = isHatching ? 'egg' : currentStage; 
            const stageData = currentPartner.stages[stageKey] || currentPartner.stages['adult'];

            let prefType = 'normal';
            let points = 2;

            if (prefs.favorite.includes(itemInfo.name)) {
                prefType = 'favorite';
                points = 5;
            } else if (prefs.dislike.includes(itemInfo.name)) {
                prefType = 'dislike';
                points = 0.5;
            }

            charIntimacyMap[charId] = Math.min(100, (charIntimacyMap[charId] || 0) + points);
            
            setTimeout(() => {
                const responseText = stageData.gift_responses[prefType];
                window.showDialogue(responseText, 2);
                window.updateUI();
                window.showToast(`${itemInfo.name} 선물 완료! (오늘 ${masterData.giftCounts[charId].count}/3)`, "success");
                saveAllData();
            }, 100);
        } 
        else {
            window.showToast(`${itemInfo.name}을(를) 사용했습니다.`, "info");
            window.renderInventory();
            saveAllData();
            window.updateUI();
        }
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

window.cleanAppName = (name) => {
    if (!name) return "알 수 없음";
    // (32-bit), (64-bit) 및 앞의 공백을 찾아 삭제하는 정규식
    return name.replace(/\s*\(\d+-bit\)/gi, "").trim();
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

// [renderer.js] startEngine 함수 하단 혹은 적절한 위치에 추가
async function checkForUpdateMail() {
    const versionInfo = await ipcRenderer.invoke('get-version-update');
    
    if (versionInfo.latest && isNewerVersion(versionInfo.current, versionInfo.latest)) {
        // 이미 해당 버전의 업데이트 서신을 받았는지 확인 (중복 생성 방지)
        const mailId = `update_notice_${versionInfo.latest}`;
        const isAlreadyReceived = mailbox.receivedMails.some(m => m.id === mailId);

        if (!isAlreadyReceived) {
            // 새로운 서신 객체 생성
            const updateMail = {
                id: mailId,
                title: `새로운 연구 소식 (v${versionInfo.latest})`,
                sender: "연금술 도우미",
                content: `연금술사님, 연구실의 새로운 기능과 안정성이 개선된 v${versionInfo.latest} 버전이 준비되었습니다. 지금 GitHub에서 새로운 버전을 확인해 보세요!`,
                receivedDate: new Date().toISOString(),
                isRead: false,
                isRewardClaimed: false,
                reward: { type: 'point', value: 500 } // 업데이트 감사 보상
            };

            // 서신함에 추가 및 알림
            mailbox.receivedMails.unshift(updateMail);
            window.updateMailNotification();
            window.showToast("학회로부터 중요한 서신이 도착했습니다!", "event");
            saveAllData(); // 데이터 영구 저장
        }
    }
}

// 간단한 버전 비교 함수
function isNewerVersion(current, latest) {
    return latest !== current; // 단순 비교 혹은 세밀한 버전 파싱 로직 적용
}