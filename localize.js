const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'renderer.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log("🚀 에테르 플로우: 안전 수리 및 UI 번역 시스템 가동...");

/**
 * [PHASE 1] 로직 수리: 변수 참조를 함수 호출()로 변경 (가장 중요)
 * renderer.js에 실제로 존재하는 함수들을 대상으로 합니다.
 */
// 1. 상점 아이템 참조 변경: shopItems -> window.getShopItems()
content = content.replace(/shopItems\.find/g, "window.getShopItems().find");
content = content.replace(/shopItems\.filter/g, "window.getShopItems().filter");

// 2. 부산물 테이블 참조 변경: byproductTable -> window.getByproductTable()
content = content.replace(/byproductTable\.filter/g, "window.getByproductTable().filter");
content = content.replace(/byproductTable\.find/g, "window.getByproductTable().find");
content = content.replace(/byproductTable\.map/g, "window.getByproductTable().map");

// 3. 업적 리스트 참조 변경: achievementList -> window.getAchievementList()
content = content.replace(/achievementList\.find/g, "window.getAchievementList().find");
content = content.replace(/achievementList\.forEach/g, "window.getAchievementList().forEach");

/**
 * [PHASE 2] UI 레이블 및 토스트 메시지 정밀 치환
 * 따옴표 구조를 깨뜨리지 않기 위해 단순 replace 대신 정밀 매칭을 사용합니다.
 */
const uiMap = {
    "내 연구실": "ui.my_lab",
    "부재 중": "header.status.away",
    "집중 중": "header.status.working",
    "딴짓 중": "header.status.distracting",
    "대기 중": "header.status.waiting",
    "연구 기록이 보존되었습니다.": "toast.save_success",
    "데이터 저장 실패! 저장 공간을 확인해 주세요.": "toast.save_fail",
    "에테르가 부족합니다.": "toast.ether_shortage",
    "아이템 수량이 부족합니다.": "toast.item_shortage",
    "부화 성공! 새로운 인연이 시작되었습니다.": "toast.hatch_success",
    "과업이 수정되었습니다.": "toast.edit_success",
    "습관이 수정되었습니다.": "toast.habit_edit_success",
    "내용을 입력해주세요.": "toast.input_required",
    "구매 완료!": "toast.buy_success",
    "정말 초기화하시겠습니까?": "ui.reset_btn_confirm"
};

Object.entries(uiMap).forEach(([ko, key]) => {
    // 문자열 전체가 한글인 경우만 window.t('key')로 안전하게 교체
    content = content.split(`'${ko}'`).join(`window.t('${key}')`);
    content = content.split(`"${ko}"`).join(`window.t('${key}')`);
});

/**
 * [PHASE 3] HTML 태그 내부 한글 처리 (Span 등)
 */
const htmlMap = {
    "기록 없음": "ui.no_record",
    "가방이 비어있습니다.": "modals.inventory.bag_empty",
    "판매 중인 물품이 없습니다.": "modals.shop.empty",
    "호문클루스에게 선물하기": "modals.inventory.btn_use"
};

Object.entries(htmlMap).forEach(([ko, key]) => {
    // HTML 태그 사이에 낀 한글만 ${window.t()}로 교체 (백틱 내부용)
    const regex = new RegExp(`>\\s*${ko}\\s*<`, 'g');
    content = content.replace(regex, `>\${window.t('${key}')}<`);
});

// [PHASE 4] 찌꺼기 및 버그 수정
content = content.replace(/28812.*?<\/div>`;/g, "</div>`;"); // 쓰레기 값 제거

fs.writeFileSync(path.join(__dirname, 'renderer_fixed.js'), content);
console.log("✅ 수리 완료! 'renderer_fixed.js'가 생성되었습니다.");