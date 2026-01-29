const path = require('path');

class SoundManager {
    constructor() {
        // ============================================================
        // [1. SFX (효과음) 초기화]
        // ============================================================
        this.sounds = {
            click: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'click.mp3')),
            paper: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'paper.mp3')),
            check: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'check.mp3')),
            send: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'send.mp3'))
        };

        // ============================================================
        // [2. BGM & Ambient 데이터 정의]
        // ============================================================
        this.trackData = {
            ambient: [
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

        // 오디오 객체 생성
        this.audios = {
            ambient: new Audio(),
            music: new Audio()
        };

        // 초기 상태 값 로드 (저장된 설정이 없으면 0)
        this.state = {
            ambient: { cur: this.getSavedIdx('ambient'), loop: true, shuffle: false },
            music: { cur: this.getSavedIdx('music'), loop: true, shuffle: false }
        };
    }

    /**
     * 저장된 인덱스를 가져오는 헬퍼 메서드
     */
    getSavedIdx(type) {
        // window.masterData가 로드된 시점에 호출되어야 정확함
        const s = (window.masterData && window.masterData.settings && window.masterData.settings.sound) ? window.masterData.settings.sound : null;
        if (!s) return 0;
        return (type === 'ambient' ? s.lastAmbient : s.lastMusic) || 0;
    }

    /**
     * SFX 재생 메서드
     */
    playSFX(key) {
        const s = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
        if (!s || !s.master || !s.system) return;

        const sound = this.sounds[key];
        if (sound) {
            try {
                sound.pause();
                sound.currentTime = 0;
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
    }

    /**
     * UI 리스트 갱신 메서드 (기존 refreshList 대체)
     */
    refreshList(type) {
        const container = document.getElementById(`list-${type}`);
        if (!container) return;
        
        container.innerHTML = this.trackData[type].map((item, idx) => `
            <div class="menu-item ${idx === this.state[type].cur ? 'selected' : ''}" data-idx="${idx}">
                <span>${item.name}</span>
                ${idx === this.state[type].cur ? '<i class="fa-solid fa-check"></i>' : ''}
            </div>
        `).join('');

        // 클릭 이벤트 연결
        container.querySelectorAll('.menu-item').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                this.playTrack(type, parseInt(el.dataset.idx));
            };
        });
    }

    /**
     * 트랙 재생 메서드
     */
    playTrack(type, idx, isAuto = false) {
        const list = this.trackData[type];
        // 인덱스 안전 처리
        idx = (idx + list.length) % list.length;
        
        this.state[type].cur = idx;
        const audio = this.audios[type];
        const prefix = type === 'ambient' ? 'amb' : 'mus';

        // 설정 저장
        if (window.masterData && window.masterData.settings && window.masterData.settings.sound) {
            if (type === 'ambient') window.masterData.settings.sound.lastAmbient = idx;
            else window.masterData.settings.sound.lastMusic = idx;
        }

        try {
            // [경로 수정] src 폴더 기준이므로 assets로 나가야 함
            audio.src = path.join(__dirname, '..', 'assets', 'sounds', type, list[idx].file);
            audio.loop = this.state[type].loop;
            
            audio.play().then(() => {
                const playBtn = document.getElementById(`play-${prefix}`);
                if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                
                const trigBtn = document.getElementById(`trig-${prefix}`);
                if (trigBtn) trigBtn.classList.add('active');
                
                if (!isAuto && window.saveAllData) window.saveAllData();
            }).catch(e => console.warn(`[SoundManager] ${type} 재생 실패:`, e));
        } catch (err) {
            console.error(`[SoundManager] 트랙 로드 에러:`, err);
        }
        
        this.refreshList(type);
    }

    /**
     * 다음 트랙 재생
     */
    nextTrack(type) {
        let nextIdx = this.state[type].shuffle 
            ? Math.floor(Math.random() * this.trackData[type].length) 
            : (this.state[type].cur + 1);
        this.playTrack(type, nextIdx);
    }

    /**
     * 이전 트랙 재생
     */
    prevTrack(type) {
        this.playTrack(type, this.state[type].cur - 1);
    }

    /**
     * [핵심] UI 이벤트 연결 및 초기화 (기존 initRestoredPlayer + window.setupEngine 대체)
     * renderer.js의 startEngine()에서 이 함수를 호출해야 합니다.
     */
    setupAudioEngine() {
        ['ambient', 'music'].forEach(type => {
            const prefix = type === 'ambient' ? 'amb' : 'mus';
            const panel = document.getElementById(`panel-${type}`);
            const trigBtn = document.getElementById(`trig-${prefix}`);
            const audio = this.audios[type];

            if (!panel || !trigBtn) return;

            this.refreshList(type);

            // 1. 패널 열기/닫기
            trigBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isActive = panel.classList.contains('active');
                // 다른 패널 닫기
                document.querySelectorAll('.player-panel').forEach(p => p.classList.remove('active'));
                
                if (!isActive) {
                    panel.classList.add('active');
                    this.refreshList(type);
                }
            };

            // 2. 반복(Loop) 버튼
            const loopBtn = document.getElementById(`loop-${prefix}`);
            if (loopBtn) {
                loopBtn.classList.toggle('active', this.state[type].loop);
                loopBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.state[type].loop = !this.state[type].loop;
                    audio.loop = this.state[type].loop;
                    loopBtn.classList.toggle('active', this.state[type].loop);
                };
            }

            // 3. 셔플(Shuffle) 버튼
            const shuffleBtn = document.getElementById(`shuffle-${prefix}`);
            if (shuffleBtn) {
                shuffleBtn.classList.toggle('active', this.state[type].shuffle);
                shuffleBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.state[type].shuffle = !this.state[type].shuffle;
                    shuffleBtn.classList.toggle('active', this.state[type].shuffle);
                };
            }

            // 4. 곡 종료 시 자동 재생 핸들러
            audio.onended = () => { 
                if (!this.state[type].loop) this.nextTrack(type); 
            };

            // 5. 재생/일시정지 버튼
            const playBtn = document.getElementById(`play-${prefix}`);
            if (playBtn) {
                playBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (audio.paused) {
                        audio.play();
                        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        trigBtn.classList.add('active');
                    } else {
                        audio.pause();
                        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        trigBtn.classList.remove('active');
                    }
                };
            }

            // 6. 이전/다음 버튼
            const prevBtn = panel.querySelector('.prev-btn');
            const nextBtn = panel.querySelector('.next-btn');
            if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); this.prevTrack(type); };
            if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); this.nextTrack(type); };

            // 7. 볼륨 슬라이더
            const volSlider = document.getElementById(`vol-${prefix}`);
            if (volSlider) {
                volSlider.oninput = (e) => { 
                    e.stopPropagation(); 
                    audio.volume = parseFloat(e.target.value); 
                };
            }

            // 8. 저장된 설정에 따른 자동 재생 (AutoPlay)
            const s = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
            if (s && s.autoPlay) {
                const savedIdx = type === 'ambient' ? s.lastAmbient : s.lastMusic;
                if (savedIdx !== undefined) this.playTrack(type, savedIdx, true);
            }
        });

        console.log("🔊 [SoundManager] 오디오 엔진 연결 완료");
    }

    /**
     * [추가] 오디오 엔진 잠금 해제 (브라우저 정책 우회용)
     * 사용자의 첫 클릭 시점에 호출되어야 합니다.
     */
    unlockAll() {
        // 1. 모든 효과음(SFX) 짧게 재생 후 정지
        Object.values(this.sounds).forEach(s => {
            s.play().then(() => { s.pause(); s.currentTime = 0; }).catch(() => {});
        });
        
        // 2. BGM/Ambient 오디오 객체도 잠금 해제
        Object.values(this.audios).forEach(a => {
            a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
        });
        
        console.log("🔊 [SoundManager] 오디오 엔진 잠금 해제 완료");
    }
}

module.exports = SoundManager;