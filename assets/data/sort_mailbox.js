/**
 * [mailbox_pool.json] 파일 자체를 발신자 기준으로 정렬하여 다시 저장합니다.
 */
// function sortMailboxData() {
//     const filePath = 'mailbox_pool.json';

//     try {
//         // 1. 파일 읽기
//         const rawData = fs.readFileSync(filePath, 'utf8');
//         const mails = JSON.parse(rawData);

//         // 2. 발신자(sender) 기준 가나다 순 정렬
//         mails.sort((a, b) => {
//             const senderA = a.sender || "";
//             const senderB = b.sender || "";

//             // 한국어 로케일을 사용하여 가나다 순으로 정렬
//             return senderA.localeCompare(senderB, 'ko');
//         });

//         // 3. 파일 쓰기 (기존 파일 덮어쓰기)
//         // JSON.stringify의 세 번째 인자(4)는 가독성을 위한 들여쓰기 공백 수입니다.
//         fs.writeFileSync(filePath, JSON.stringify(mails, null, 4), 'utf8');

//         console.log("✨ 정렬 완료! 'mailbox_pool.json'의 데이터 순서가 발신자별로 재배치되었습니다.");

//     } catch (err) {
//         console.error("❌ 정렬 중 오류 발생:", err.message);
//     }
// }

// sortMailboxData();

const fs = require('fs');

/**
 * [mailbox_pool.json]을 지정한 순서로 정렬하고 통계를 출력합니다.
 */
function processMailbox() {
    const filePath = 'mailbox_pool.json';
    
    // 1. 아티스트님이 원하는 발신인 우선순위 설정
    const priorityOrder = [
        "연금술 길드",
        "이름 모를 연금술사",
        "수상한 그림자",
        "사념의 기록관",
        "메이벨",
        "인디고",
        "모르가나",
        "아우렐리아"
    ];

    try {
        // 2. 파일 로드 및 파싱
        const rawData = fs.readFileSync(filePath, 'utf8');
        let mails = JSON.parse(rawData);

        // 3. 커스텀 정렬 실행
        mails.sort((a, b) => {
            const senderA = a.sender || "알 수 없음";
            const senderB = b.sender || "알 수 없음";

            let indexA = priorityOrder.indexOf(senderA);
            let indexB = priorityOrder.indexOf(senderB);

            // 우선순위 목록에 없으면 맨 뒤로 보냄
            if (indexA === -1) indexA = priorityOrder.length + 1;
            if (indexB === -1) indexB = priorityOrder.length + 1;

            if (indexA !== indexB) return indexA - indexB;
            
            // 같은 발신인 내에서는 ID 가나다순으로 2차 정렬
            return (a.id || "").localeCompare(b.id || "");
        });

        // 4. 정렬된 데이터 저장 (파일 덮어쓰기)
        fs.writeFileSync(filePath, JSON.stringify(mails, null, 4), 'utf8');
        console.log("✨ 정렬 완료: 'mailbox_pool.json'이 지정된 순서로 재배치되었습니다.\n");

        // 5. 요약 통계 계산 및 출력
        const summary = mails.reduce((acc, mail) => {
            const sender = mail.sender || "알 수 없음";
            acc[sender] = (acc[sender] || 0) + 1;
            return acc;
        }, {});

        console.log("📊 [서신함 구성 요약]");
        console.log("---------------------------------");
        let total = 0;
        
        // 우선순위에 적힌 순서대로 요약 출력
        priorityOrder.forEach(sender => {
            if (summary[sender]) {
                console.log(`${sender.padEnd(12)} : ${summary[sender]}통`);
                total += summary[sender];
                delete summary[sender]; // 출력한 항목은 삭제
            }
        });

        // 목록에 없던 나머지 발신인 출력
        for (const [sender, count] of Object.entries(summary)) {
            console.log(`${sender.padEnd(12)} : ${count}통 (기타)`);
            total += count;
        }

        console.log("---------------------------------");
        console.log(`총 합계        : ${total}통`);

    } catch (err) {
        console.error("❌ 오류 발생:", err.message);
    }
}

processMailbox();