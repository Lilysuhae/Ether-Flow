const { app, BrowserWindow, ipcMain, screen, shell, powerMonitor, net, dialog } = require('electron');
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
        width: 360,
        height: 900,
        minWidth: 320,
        minHeight: 500,
        frame: false,
        transparent: true,
        resizable: true,     // ✨ 필수
        maximizable: true,   // ✨ 필수
        thickFrame: true,    // ✨ 윈도우에서 표준 리사이즈 경계선을 강제로 생성
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
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

// 프로그램 자동 시작
ipcMain.on('set-auto-start', (event, value) => {
    app.setLoginItemSettings({
        openAtLogin: value,
        path: app.getPath('exe') // 현재 실행 파일 경로
    });
    console.log(`🚀 [System] 시작 프로그램 설정 완료: ${value}`);
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

/* ============================================================
   [데이터 내보내기/불러오기 핸들러 추가]
   ============================================================ */

// 1. 데이터 내보내기 (Save Dialog)
ipcMain.handle('export-data-file', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
        title: '연구 데이터 내보내기',
        defaultPath: `ether_flow_backup_${new Date().toISOString().slice(0,10)}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            return { success: true };
        } catch (err) {
            console.error("파일 저장 실패:", err);
            return { success: false, error: err.message };
        }
    }
    return { success: false }; // 취소 시
});

// 2. 데이터 불러오기 (Open Dialog)
ipcMain.handle('import-data-file', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
        title: '연구 데이터 불러오기',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
        try {
            const content = fs.readFileSync(filePaths[0], 'utf-8');
            const data = JSON.parse(content);
            return { success: true, data: data };
        } catch (err) {
            console.error("파일 읽기 실패:", err);
            return { success: false, error: err.message };
        }
    }
    return { success: false }; // 취소 시
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

// [main.js] 윈도우 모드 전환 로직 통합 수리
ipcMain.on('set-window-mode', (event, mode) => {
    if (!mainWindow) return;

    // 1. ✨ 모든 제약을 먼저 완전히 해제하여 초기화합니다.
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(0, 0);
    mainWindow.setMaximumSize(9999, 9999);

    // 2. 모드별 크기 적용
    if (mode === 'horizontal') {
        mainWindow.setSize(800, 800, true); // 시원하게 가로로 확장
        mainWindow.setMinimumSize(748, 666);
    } 
    else if (mode === 'vertical') {
        mainWindow.setSize(360, 800, true);
        mainWindow.setMinimumSize(360, 640); // 최소 높이 설정
    } 
    else if (mode === 'mini') {
        // ✨ 미니 모드: 이제 445(또는 436)로 정상적으로 줄어듭니다.
        mainWindow.setSize(360, 460, true); 
        mainWindow.setMinimumSize(360, 460);
        mainWindow.setMaximumSize(360, 460);
        mainWindow.setResizable(false);
    }
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
ipcMain.handle('get-version-update', async () => {
    try {
        const currentVersion = app.getVersion();
        // ✨ [핵심 수정] 중간의 f5fee... 같은 번호를 뺀 '최신 파일 전용' 주소입니다.
        const gistUrl = 'https://gist.githubusercontent.com/Lilysuhae/b15200761ed022377dd7d2aae8a206c3/raw/version.json';

        return new Promise((resolve) => {
            const request = net.request(gistUrl);
            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        // 만약 결과가 HTML(404페이지 등)이면 여기서 에러가 나지만 catch에서 처리됩니다.
                        const remoteData = JSON.parse(data);
                        resolve({
                            current: currentVersion,
                            latest: remoteData.latest,
                            downloadUrl: remoteData.downloadUrl
                        });
                    } catch (e) { 
                        console.error("❌ [Update] JSON 파싱 실패 (HTML이 수신되었을 가능성)");
                        resolve(null); 
                    }
                });
            });
            request.on('error', () => resolve(null));
            request.end();
        });
    } catch (err) {
        return null;
    }
});