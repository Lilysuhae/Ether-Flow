const path = require('path');

class SoundManager {
    constructor() {
        // [1. 효과음 및 알림음 데이터 설정]
        // 각 소리에 'type'을 부여하여 설정창의 슬라이더(sfx, notif, timer)와 연동합니다.
        this.sounds = {
            // SFX (버튼 및 상호작용)
            click: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'click.mp3')), type: 'sfx' },
            paper: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'paper.mp3')), type: 'sfx' },
            check: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'check.mp3')), type: 'sfx' },
            coin: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'drop-coin.mp3')), type: 'sfx' },
            pet: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'cotton.mp3')), type: 'sfx' },

            // Notification (알림)
            letterbox: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'letterbox.mp3')), type: 'notif' },
            hatch: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'egg-cracking.mp3')), type: 'notif' },
            evolve: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'magicwand.mp3')), type: 'notif' },

            // // Timer (타이머 전용 소리가 있다면 여기에 추가)
            // timer_end: { audio: new Audio(path.join(__dirname, '..', 'assets', 'sounds', 'timer.mp3')), type: 'timer' }
        };

        // [2. BGM & Ambient 데이터]
        this.trackData = {
            ambient: [
                { name: '음식점', file: 'busy-restaurant.mp3' },
                { name: '물 끓는 소리', file: 'pot-of-water-boiling.mp3' },
                { name: '후라이팬으로 요리', file: 'food-cooking-in-frying-pan.mp3' },
                { name: '숲 속의 캠프파이어', file: 'campfire-in-the-woods.mp3' },
                { name: '밤의 숲', file: 'forest-night-time.mp3' },
                { name: '숲 속을 걷다', file: 'walking-in-a-forest.mp3' },
                { name: '가벼운 비', file: 'light-rain.mp3' },
                { name: '부드러운 파도 소리', file: 'beautiful-ocean-waves.mp3' },
                { name: '큰 파도 소리', file: 'rough-ocean-waves.mp3' },
                { name: '바닷속', file: 'abyss-sea.mp3' },
                { name: '시냇물', file: 'river.mp3' },
                { name: '마을 광장', file: 'old-town-city-center.mp3' },
                { name: '유리 풍경', file: 'wind-chime.mp3' }
            ],
            music: [
                { name: 'Whispers in the Lab', file: 'Whispers in the Lab.mp3' },
                { name: 'theme_mabel', file: 'theme_mabel.mp3' },
                { name: 'theme_indigo', file: 'theme_indigo.mp3' },
                { name: 'theme_morgana', file: 'theme_morgana.mp3' },
                { name: 'theme_aurelia', file: 'theme_aurelia.mp3' },
                { name: 'theme_cordelia', file: 'theme_cordelia.mp3' },
                { name: 'theme_linxia', file: 'theme_linxia.mp3' },
                { name: 'theme_dende', file: 'theme_dende.mp3' }
            ]
        };

        this.audios = {
            ambient: new Audio(),
            music: new Audio()
        };

        this.state = {
            ambient: { cur: this.getSavedIdx('ambient'), loop: true, shuffle: false },
            music: { cur: this.getSavedIdx('music'), loop: true, shuffle: false }
        };
    }

    /**
     * 저장된 인덱스 가져오기
     */
    getSavedIdx(type) {
        const s = (window.masterData && window.masterData.settings && window.masterData.settings.sound) ? window.masterData.settings.sound : null;
        if (!s) return 0;
        return (type === 'ambient' ? s.lastAmbient : s.lastMusic) || 0;
    }

    /**
     * [핵심] 모든 오디오 객체에 마스터 데이터의 볼륨/음소거 설정을 실시간 적용합니다.
     */
    applyVolumeSettings() {
        const s = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
        if (!s || !s.master) {
            // 마스터 사운드가 꺼져 있으면 모든 볼륨을 0으로
            Object.values(this.sounds).forEach(item => item.audio.volume = 0);
            this.audios.ambient.volume = 0;
            this.audios.music.volume = 0;
            return;
        }

        // 1. 효과음/알림/타이머 볼륨 적용
        Object.keys(this.sounds).forEach(key => {
            const item = this.sounds[key];
            const type = item.type; // 'sfx', 'notif', 'timer'
            const baseVol = (s[`${type}Vol`] !== undefined ? s[`${type}Vol`] : 80) / 100;
            const isMuted = !!s[`${type}Mute`];
            
            item.audio.volume = isMuted ? 0 : baseVol;
        });

        // 2. 환경음/음악 플레이어 볼륨 적용
        const ambVol = (s.ambVol !== undefined ? s.ambVol : 80) / 100;
        const musVol = (s.musVol !== undefined ? s.musVol : 80) / 100;
        
        this.audios.ambient.volume = ambVol;
        this.audios.music.volume = musVol;
    }

    /**
     * SFX 재생 (중단 에러 방지 및 실시간 볼륨 적용 버전)
     */
    playSFX(key) {
        const s = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
        if (!s || !s.master) return;

        const item = this.sounds[key];
        if (item) {
            this.applyVolumeSettings(); // 재생 직전 최신 볼륨값 동기화
            const audio = item.audio;
            try {
                audio.currentTime = 0; // pause() 없이 시간만 초기화하여 AbortError 방지
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        if (e.name !== 'AbortError') console.warn("SFX 재생 오류:", e);
                    });
                }
            } catch (err) { console.error("SFX 엔진 오류:", err); }
        }
    }

    /**
     * 플레이어 UI 리스트 갱신
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

        container.querySelectorAll('.menu-item').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                this.playTrack(type, parseInt(el.dataset.idx));
            };
        });
    }

    /**
     * 트랙 재생 및 볼륨 설정 유지
     */
    playTrack(type, idx, isAuto = false) {
        const list = this.trackData[type];
        idx = (idx + list.length) % list.length;
        this.state[type].cur = idx;
        const audio = this.audios[type];
        const prefix = type === 'ambient' ? 'amb' : 'mus';

        if (window.masterData && window.masterData.settings && window.masterData.settings.sound) {
            if (type === 'ambient') window.masterData.settings.sound.lastAmbient = idx;
            else window.masterData.settings.sound.lastMusic = idx;
        }

        try {
            audio.src = path.join(__dirname, '..', 'assets', 'sounds', type, list[idx].file);
            audio.loop = this.state[type].loop;
            
            // 재생 전 현재 마스터 데이터에 저장된 볼륨 적용
            this.applyVolumeSettings();

            audio.play().then(() => {
                const playBtn = document.getElementById(`play-${prefix}`);
                if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                const trigBtn = document.getElementById(`trig-${prefix}`);
                if (trigBtn) trigBtn.classList.add('active');
                if (!isAuto && window.saveAllData) window.saveAllData();
            }).catch(e => console.warn(`[SoundManager] ${type} 재생 실패:`, e));
        } catch (err) { console.error(`[SoundManager] 트랙 로드 에러:`, err); }
        
        this.refreshList(type);
    }

    nextTrack(type) {
        let nextIdx = this.state[type].shuffle 
            ? Math.floor(Math.random() * this.trackData[type].length) 
            : (this.state[type].cur + 1);
        this.playTrack(type, nextIdx);
    }

    prevTrack(type) {
        this.playTrack(type, this.state[type].cur - 1);
    }

    /**
     * 오디오 엔진 설정 (플레이어 볼륨 슬라이더 저장 기능 포함)
     */
    setupAudioEngine() {
        ['ambient', 'music'].forEach(type => {
            const prefix = type === 'ambient' ? 'amb' : 'mus';
            const panel = document.getElementById(`panel-${type}`);
            const trigBtn = document.getElementById(`trig-${prefix}`);
            const audio = this.audios[type];

            if (!panel || !trigBtn) return;
            this.refreshList(type);

            // [추가] 볼륨 슬라이더 실시간 저장 로직
            const volSlider = document.getElementById(`vol-${prefix}`);
            if (volSlider) {
                // 초기 슬라이더 위치 설정
                const s = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
                if (s) {
                    const savedVol = (s[`${prefix}Vol`] !== undefined ? s[`${prefix}Vol`] : 80) / 100;
                    volSlider.value = savedVol;
                    audio.volume = savedVol;
                }

                volSlider.oninput = (e) => { 
                    e.stopPropagation(); 
                    const val = parseFloat(e.target.value);
                    audio.volume = val; 
                    // masterData에 실시간 기록 및 저장
                    if (window.masterData && window.masterData.settings.sound) {
                        window.masterData.settings.sound[`${prefix}Vol`] = Math.round(val * 100);
                        if (window.saveAllData) window.saveAllData();
                    }
                };
            }

            // --- 기존 플레이어 컨트롤 로직 ---
            trigBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const isActive = panel.classList.contains('active');
                document.querySelectorAll('.player-panel').forEach(p => p.classList.remove('active'));
                if (!isActive) panel.classList.add('active');
            };

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

            const shuffleBtn = document.getElementById(`shuffle-${prefix}`);
            if (shuffleBtn) {
                shuffleBtn.classList.toggle('active', this.state[type].shuffle);
                shuffleBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.state[type].shuffle = !this.state[type].shuffle;
                    shuffleBtn.classList.toggle('active', this.state[type].shuffle);
                };
            }

            audio.onended = () => { if (!this.state[type].loop) this.nextTrack(type); };

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

            const prevBtn = panel.querySelector('.prev-btn');
            const nextBtn = panel.querySelector('.next-btn');
            if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); this.prevTrack(type); };
            if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); this.nextTrack(type); };

            const sSetting = (window.masterData && window.masterData.settings) ? window.masterData.settings.sound : null;
            if (sSetting && sSetting.autoPlay) {
                const savedIdx = type === 'ambient' ? sSetting.lastAmbient : sSetting.lastMusic;
                if (savedIdx !== undefined) this.playTrack(type, savedIdx, true);
            }
        });
        console.log("🔊 [SoundManager] 오디오 엔진 통합 완료");
    }

    unlockAll() {
        Object.values(this.sounds).forEach(s => {
            s.audio.play().then(() => { s.audio.pause(); s.audio.currentTime = 0; }).catch(() => {});
        });
        Object.values(this.audios).forEach(a => {
            a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
        });
    }
}

module.exports = SoundManager;