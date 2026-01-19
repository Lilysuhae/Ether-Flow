const { app, BrowserWindow, ipcMain, screen, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

const userDataPath = app.getPath('userData');
const filePath = path.join(userDataPath, 'save_data.json');

// [추가] 활성 창 감지 라이브러리 임포트
const activeWin = require('active-win');

// [main.js] 상단 전역 변수 구역
let mainWindow;
let isQuitting = false; // [전략 C] 최종 저장 여부를 확인하는 플래그

function createWindow() {
    // 1. 브라우저 창 설정
    mainWindow = new BrowserWindow({
        width: 360,           // 기본 세로형 너비
        height: 900,          // 충분한 세로 공간 확보
        frame: false,         // 커스텀 타이틀바 사용을 위해 프레임 제거
        transparent: true,    // 글래스모피즘 디자인을 위한 투명화
        alwaysOnTop: true,     // 집중 도구 특성상 항상 위 유지
        resizable: true,      // 개발 및 레이아웃 조절 허용
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        }
    });

    // 마우스 이벤트 활성화
    mainWindow.setIgnoreMouseEvents(false);
    
    // HTML 파일 로드
    mainWindow.loadFile('index.html');

    // 2. [전략 C] 윈도우 '닫기' 시도 시 즉시 종료 방지 및 저장 요청
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            // 즉시 종료를 막고 렌더러에 최종 저장 신호를 보냅니다.
            e.preventDefault(); 
            mainWindow.webContents.send('request-final-save');
            console.log("Main: 최종 저장 요청을 렌더러에 보냈습니다.");
        }
    });

    // 3. 집중 감지 엔진: 1초마다 활성 창 정보 수집 및 전송
        setInterval(async () => {
            if (!mainWindow) return;
            try {
                // active-win v9.x 방식 (객체 내부의 activeWindow 함수 호출)
                const active = await activeWin.activeWindow(); 
                if (active) {
                    mainWindow.webContents.send('active-window-update', {
                        title: active.title,
                        owner: active.owner.name 
                    });
                }
            } catch (err) {
                // 에러가 나면 터미널에 찍어서 범인을 찾습니다.
                console.error("감지 오류:", err);
            }
        }, 1000);

    // [선택] 개발자 도구 (필요 시 주석 해제)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

// 4. [전략 C] 렌더러가 저장을 마쳤다는 신호를 보내면 앱을 진짜 종료
ipcMain.on('final-save-done', () => {
    isQuitting = true; // 플래그를 true로 변경하여 close 이벤트 통과
    console.log("Main: 저장이 완료되어 앱을 안전하게 종료합니다.");
    app.quit();
});

// --------------------------------------------------------------------------
// [IPC 핸들러] 데이터 및 시스템 감지
// --------------------------------------------------------------------------

ipcMain.handle('get-idle-time', () => powerMonitor.getSystemIdleTime());

ipcMain.handle('save-game-data', async (event, data) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (data === null) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return { success: true };
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('load-game-data', async () => {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return null;
    } catch (error) { return null; }
});

// --------------------------------------------------------------------------
// [윈도우 제어] 가로/세로 모드 크기 대폭 확장
// --------------------------------------------------------------------------

ipcMain.on('minimize-app', () => mainWindow.minimize());
ipcMain.on('set-always-on-top', (e, stayOnTop) => {
    if (!mainWindow) return;

    if (stayOnTop) {
        // [수정] 단순히 true만 주는 대신 레벨(level)을 명시합니다. 
        // 'screen-saver'는 윈도우에서 가장 높은 우선순위 레벨 중 하나입니다.
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        
        // 추가로 모든 작업 공간(가상 데스크톱)에서 보이도록 설정 가능
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
        mainWindow.setAlwaysOnTop(false, 'normal');
        mainWindow.setVisibleOnAllWorkspaces(false);
    }
});

// [수정] 스크린샷의 잘림 현상을 방지하기 위해 사이즈를 키웠습니다.
ipcMain.on('set-layout-size', (e, isHorizontal) => {
    if (!mainWindow) return;

    // 1. [핵심] 크기 조절을 방해할 수 있는 모든 제약을 잠시 해제합니다.
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(100, 100); 
    mainWindow.setMaximumSize(9999, 9999);

    if (isHorizontal) {
        // 가로 모드 (넓게 보기): 너비 800
        // [수정] 세 번째 인자(animate)를 false로 설정하여 즉각 반응하게 합니다.
        mainWindow.setSize(800, 900, false); 
    } else {
        // 세로 모드 (기본): 너비 360
        mainWindow.setSize(360, 900, false);
    }
    
    // 2. 창이 작아질 때 화면 밖으로 나가는 것을 방지하기 위해 위치 재조정 (선택 사항)
    // mainWindow.center(); 

    console.log(`[레이아웃 변경] 가로모드: ${isHorizontal}, 현재 크기: ${mainWindow.getSize()}`);
});

ipcMain.on('save-log-image', async (event, rect) => {
    try {
        const page = await mainWindow.webContents.capturePage(rect); // 렌더러가 준 전체 영역 캡처
        if (page.isEmpty()) return;

        const savePath = path.join(app.getPath('downloads'), `Molip_Receipt_${Date.now()}.png`);
        fs.writeFileSync(savePath, page.toPNG());
        shell.showItemInFolder(savePath);
    } catch (err) { console.error(err); }
});

// --------------------------------------------------------------------------
// [앱 생명주기]
// --------------------------------------------------------------------------

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// [main.js] 맨 하단의 quit-app 핸들러를 다음과 같이 수정하세요.

ipcMain.on('quit-app', () => {
    isQuitting = true; // ★ 중요: 플래그를 true로 바꿔야 close 이벤트를 통과할 수 있습니다.
    app.quit();
});

// [main.js] 최하단 IPC 통신 구역
ipcMain.on('force-reset-file', (event) => {
    // 1. 오늘 날짜를 미리 생성 (무한 리셋 방지 핵심)
    const todayStr = new Date().toDateString(); 

    const nuclearData = {
        progress: { 
            level: 1, exp: 0, totalFocusTime: 0, todayFocusTime: 0, 
            lastSaveDate: todayStr // ★ 빈 값이 아닌 오늘 날짜를 주입
        },
        collection: { ownedIds: [], points: 0, activeEgg: null },
        mailbox: { mailHistory: [] },
        settings: { 
            workApps: [], distractionApps: [], isHorizontalMode: true, 
            isWindowMode: true, isAlwaysOnTop: false, font: 'paperlogy' 
        },
        character: { intimacyMap: {}, growthMap: {}, selectedPartnerId: null },
        achievements: [],
        todo: [],
        habit: [],
        stats: { dailyAppTimeMap: {} }
    };
    
    try {
        // 파일을 물리적으로 쓰고 강제 저장 확인
        fs.writeFileSync(filePath, JSON.stringify(nuclearData, null, 2), 'utf-8');
        console.log("Save file reset and date synced:", todayStr);
        event.reply('force-reset-complete');
    } catch (err) {
        console.error("File reset failed:", err);
    }
});


// 업데이트 서신
const axios = require('axios'); // 설치 필요: npm install axios

ipcMain.handle('get-version-update', async () => {
    try {
        // Lilysuhae님의 ether-flow 저장소 최신 릴리스 정보 가져오기
        const response = await axios.get('https://api.github.com/repos/Lilysuhae/ether-flow/releases/latest', {
            headers: { 'User-Agent': 'EtherFlow-App' } // GitHub API 필수 헤더
        });
        
        const latestVersion = response.data.tag_name.replace('v', '');
        return {
            current: app.getVersion(), // 현재 앱 버전 (0.5.0)
            latest: latestVersion,
            downloadUrl: response.data.html_url
        };
    } catch (error) {
        console.error("버전 체크 오류:", error.message);
        return null;
    }
});