// [introManager.js] 
// 주의: 상단에 require('../assets/data/characters.json') 등이 있으면 중복 선언 에러가 발생하므로 모두 제거했습니다.

/**
 * [introManager.js 또는 인트로 렌더링 함수]
 * 첫 계약 후보 리스트를 생성할 때 선물 전용 캐릭터를 제외합니다.
 */
function renderIntroChoices() {
    // 1. 전체 캐릭터 데이터에서 '선물 전용'이 아닌 것들만 추출
    const introPool = charData.characters.filter(char => char.isGiftOnly !== true);

    // 2. 필터링된 introPool을 사용하여 선택지 UI를 생성
    const choiceContainer = document.getElementById('intro-choice-container');
    if (!choiceContainer) return;

    choiceContainer.innerHTML = introPool.map(char => `
        <div class="intro-char-card" onclick="window.selectFirstPartner('${char.id}')">
            <img src="${char.stages.child.expressions.good.sprite}" alt="${char.name}">
            <h3>${char.name}</h3>
            <p>${char.description}</p>
        </div>
    `).join('');
}

// 1. 인트로 스크립트 데이터
const introScript = [
    "세상은 더 이상 깊이를 갈망하지 않아.", 
    "사람들은 흩어지는 연기처럼 가벼운 자극만을 쫓고,",
    "인류를 진보시켰던 위대한 집중의 불꽃은 꺼져버렸지.",
    "그러나 여기,",
    "잊혀진 고대의 지혜가 살아날 가능성이 네게 남아 있구나.",
    "너의 연구를 이해해 줄 '호문클루스'의 알을 남기고 간다.",
    "오직 네가 스스로를 태워 쏟아붓는",
    "순수한 시간의 정수, 에테르만이",
    "알을 깨우고 호문클루스를 자라게 할 것이다."
];

// 2. [1단계] 봉인 해제 함수
// [renderer.js] 하단에 추가
window.breakSeal = () => {
    const envelope = document.getElementById('ritual-envelope');
    const letter = document.getElementById('legacy-letter');
    if (envelope) envelope.classList.remove('active');
    if (letter) {
        letter.classList.add('active');
        if (window.playSFX) window.playSFX('paper'); // 효과음 재생
    }
};

// 3. [2단계] 몰입의 독서 (텍스트 출력)
window.startReading = async function() {
    const container = document.getElementById('letter-content');
    if (!container) return;

    container.innerHTML = ''; 
    for (let text of introScript) {
        const p = document.createElement('p');
        p.className = 'intro-text-line';
        p.innerText = text;
        container.appendChild(p);
        
        // 글자가 나타나는 효과 (CSS 애니메이션 연동)
        await new Promise(resolve => setTimeout(resolve, 800));
        p.style.opacity = 1;
    }
    
    // 마지막 안내 문구 표시
    const guide = document.querySelector('.click-guide');
    if (guide) guide.style.opacity = 1;
};

// 4. [3단계] 공명 단계 진입 (알 목록 생성)
window.resonanceStage = function() {
    document.getElementById('legacy-letter').style.display = 'none';
    const resonanceStep = document.getElementById('resonance-stage');
    resonanceStep.style.display = 'flex';
    resonanceStep.classList.add('active');

    window.renderResonanceSpheres();
};

// 5. 알(Sphere) 렌더링 및 클릭 이벤트 엔진
window.renderResonanceSpheres = function() {
    console.log("🔍 알 렌더링 시퀀스 시작...");
    const container = document.getElementById('sphere-container');
    const psDesc = document.getElementById('ps-description');
    
    const allCharacters = (window.charData && window.charData.characters) ? window.charData.characters : []; 

    // ✨ 1. [수정] 나타낼 캐릭터 ID 목록을 정의합니다.
    const targetIds = ['char_01', 'char_02', 'char_04', 'char_05'];

    // ✨ 2. [수정] 전체 캐릭터 중 위 목록에 포함된 캐릭터만 선별합니다.
    const introPool = allCharacters.filter(char => targetIds.includes(char.id));

    if (!container || introPool.length === 0) {
        console.error("❌ 에러: 컨테이너가 없거나 지정된 캐릭터 데이터 로드 실패", window.charData);
        return;
    }

    container.innerHTML = ''; 

    introPool.forEach((char) => {
        const sphere = document.createElement('div');
        sphere.className = 'sphere';
        // 클릭 영역 보장 (Electron 드래그 무시)
        sphere.style.webkitAppRegion = "no-drag"; 
        
        const eggImg = document.createElement('img');
        eggImg.src = char.stages.egg.sprite; 
        eggImg.className = 'egg-preview-silhouette';
        eggImg.style.pointerEvents = "none"; // 이미지가 클릭을 방해하지 않게 설정
        sphere.appendChild(eggImg);

        sphere.onmouseenter = () => {
            eggImg.classList.add('reveal');
            if (psDesc) {
                psDesc.innerHTML = `<span class="ps-label">P.S.</span> ${char.description}`;
                psDesc.classList.add('active');
            }
        };

        sphere.onmouseleave = () => {
            eggImg.classList.remove('reveal');
            if (psDesc) psDesc.classList.remove('active');
        };

        // ★ 알 클릭 이벤트 디버깅 및 실행 ★
        // [introManager.js] sphere.onclick 구역 수정
        sphere.onclick = (e) => {
            e.stopPropagation();
            console.log(`🎯 알 클릭 감지! ID: ${char.id}`);

            const modal = document.getElementById('intro-confirm-modal');
            const msg = document.getElementById('intro-confirm-msg');
            const confirmBtn = document.getElementById('intro-confirm-btn');

            if (modal && msg && confirmBtn) {
                // 1. [강제 주입] 모달이 무조건 맨 앞으로 오도록 스타일 강제 조정
                modal.style.zIndex = "999999";
                modal.style.display = "flex";
                modal.style.position = "fixed";
                modal.style.pointerEvents = "auto"; 
                modal.style.opacity = "1";
                modal.style.visibility = "visible";

                msg.innerHTML = `<strong>[${char.egg_name || "알"}]</strong>로 고를까요?<br><span style="font-size:12px; opacity:0.7;">이 선택은 되돌릴 수 없습니다.</span>`;
                
                // 2. [확인 버튼] 클릭 시 실행될 함수 연결
                confirmBtn.onclick = () => {
                    console.log("✨ 최종 선택 버튼 클릭됨!");
                    if (typeof window.finalizeContract === 'function') {
                        window.finalizeContract(char); 
                        window.closeIntroConfirm();
                    } else {
                        console.error("❌ 에러: renderer.js에 finalizeContract 함수가 없습니다!");
                        alert("시스템 에러: 계약 함수를 찾을 수 없습니다.");
                    }
                };
                
                console.log("✅ 모달 출력 명령 완료 (display: flex)");
            } else {
                console.error("❌ 에러: 모달 구성 요소 중 일부가 없습니다.", { modal, msg, confirmBtn });
            }
        };

        container.appendChild(sphere);
    });
    console.log("✅ 모든 알 렌더링 완료.");
};

window.closeIntroConfirm = function() {
    document.getElementById('intro-confirm-modal').style.display = 'none';
};