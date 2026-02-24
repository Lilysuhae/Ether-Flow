/**
 * [src/introManager.js]
 * 신규 유저 인트로 시퀀스 및 첫 계약 시스템을 담당하는 매니저입니다.
 */

/* ============================================================
   [1] 인트로 스크립트 데이터
   ============================================================ */
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

let isReadingStarted = false; // 타이핑 중복 실행 방지 플래그

/* ============================================================
   [2] 단계별 시퀀스 제어 (봉인 -> 독서 -> 공명)
   ============================================================ */

/**
 * [1단계] 봉인 해제: 편지를 열고 읽기 시퀀스를 트리거합니다.
 */
window.breakSeal = () => {
    console.log("🕯️ [Intro] 봉인 해제 시퀀스 시작");
    const envelope = document.getElementById('ritual-envelope');
    const letter = document.getElementById('legacy-letter');
    
    if (envelope) envelope.classList.remove('active');
    
    if (letter) {
        // ✨ 레이어 순서와 가시성을 스크립트로 즉시 보정합니다.
        letter.style.display = 'flex';
        letter.style.opacity = '1';
        letter.style.visibility = 'visible';
        letter.style.zIndex = '999999'; 
        letter.classList.add('active');
        
        if (window.playSFX) window.playSFX('paper'); // 효과음 재생
        
        // 중복 실행 방지 및 타이핑 시작
        if (!isReadingStarted) {
            isReadingStarted = true;
            window.startReading(); 
        }
    }
};

/**
 * [2단계] 몰입의 독서: 서신 내용을 한 글자씩 타이핑하여 출력합니다.
 */
window.startReading = async function() {
    const container = document.getElementById('letter-content');
    if (!container) {
        console.error("❌ [Intro] 'letter-content' 엘리먼트를 찾을 수 없습니다.");
        return;
    }

    // ✨ [띄어쓰기 수리] 부모 컨테이너에 pre-wrap을 주어 공백이 무시되지 않게 합니다.
    container.innerHTML = ''; 
    container.style.color = '#333333';
    container.style.whiteSpace = 'pre-wrap';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    
    for (let text of introScript) {
        const p = document.createElement('p');
        p.className = 'intro-text-line';
        
        // ✨ [핵심 수정] 띄어쓰기 유지 속성 및 글자색 #333 강제 적용
        p.style.whiteSpace = 'pre-wrap'; 
        p.style.color = '#333333'; 
        p.style.fontWeight = '500';
        p.style.opacity = '1';
        p.style.visibility = 'visible';
        p.style.marginBottom = '12px';
        p.style.textAlign = 'center';
        p.style.fontSize = '1.05rem';
        p.style.lineHeight = '1.6';
        
        container.appendChild(p);
        
        // ✨ 문장별 타이핑 연출
        await new Promise(resolve => {
            let i = 0;
            const timer = setInterval(() => {
                if (i < text.length) {
                    p.innerText += text[i];
                    i++;
                } else {
                    clearInterval(timer);
                    resolve();
                }
            }, 55); // 타이핑 속도
        });
        
        // 문장 사이의 대기 시간
        await new Promise(resolve => setTimeout(resolve, 700));
    }
    
    // 모든 문장 출력 후 안내 가이드 표시
    const guide = document.querySelector('#legacy-letter .click-guide');
    if (guide) {
        guide.style.opacity = 1;
        guide.style.visibility = 'visible';
        guide.style.color = '#666666'; 
    }
};

/**
 * [3단계] 공명 단계 진입: 서신을 치우고 알 선택 화면을 띄웁니다.
 */
window.resonanceStage = function() {
    console.log("✨ [Intro] 공명 단계 진입");
    const letter = document.getElementById('legacy-letter');
    const resonanceStep = document.getElementById('resonance-stage');
    
    if (letter) letter.style.display = 'none';
    if (resonanceStep) {
        resonanceStep.style.display = 'flex';
        resonanceStep.classList.add('active');
        resonanceStep.style.zIndex = '999999';
    }

    window.renderResonanceSpheres();
};

/* ============================================================
   [3] 알(Sphere) 렌더링 및 선택 로직
   ============================================================ */
window.renderResonanceSpheres = function() {
    const container = document.getElementById('sphere-container');
    const psDesc = document.getElementById('ps-description');
    
    if (!container) return;
    container.innerHTML = ''; 

    // 인트로 타겟 캐릭터 ID 리스트
    const targetIds = ['char_01', 'char_02', 'char_04', 'char_05'];
    const introPool = (window.charData && window.charData.characters) 
                      ? window.charData.characters.filter(char => targetIds.includes(char.id))
                      : [];

    if (introPool.length === 0) {
        console.error("❌ [Intro] 캐릭터 데이터를 찾을 수 없습니다.");
        return;
    }

    introPool.forEach((char) => {
        const sphere = document.createElement('div');
        sphere.className = 'sphere';
        sphere.style.webkitAppRegion = "no-drag"; 
        
        const eggImg = document.createElement('img');
        eggImg.src = char.stages.egg.sprite; 
        eggImg.className = 'egg-preview-silhouette';
        eggImg.style.pointerEvents = "none";
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

        sphere.onclick = (e) => {
            e.stopPropagation();
            const modal = document.getElementById('intro-confirm-modal');
            const msg = document.getElementById('intro-confirm-msg');
            const confirmBtn = document.getElementById('intro-confirm-btn');

            if (modal && msg && confirmBtn) {
                modal.style.zIndex = "1000000";
                modal.style.display = "flex";
                modal.style.opacity = "1";
                modal.style.visibility = "visible";

                msg.innerHTML = `<strong>[${char.egg_name || "알"}]</strong>로 고를까요?<br><span style="font-size:12px; opacity:0.7;">이 선택은 되돌릴 수 없습니다.</span>`;
                
                confirmBtn.onclick = () => {
                    if (typeof window.finalizeContract === 'function') {
                        window.finalizeContract(char); 
                        window.closeIntroConfirm();
                    }
                };
            }
        };

        container.appendChild(sphere);
    });
};

window.closeIntroConfirm = function() {
    const modal = document.getElementById('intro-confirm-modal');
    if (modal) modal.style.display = 'none';
};

window.renderIntroChoices = function() {
    console.log("🎨 [Intro] renderIntroChoices 호출됨");
};

console.log("📜 [System] introManager 전문 로드 완료 (띄어쓰기 보정됨)");