/**
 * [Ether Flow] 서신 트리거 무결성 검사기
 */
(function validateMailboxTriggers() {
    const pool = window.mailbox.mailPool;
    const managerCases = [
        'alchemist_level', 'total_focus', 'todo_count', 'habit_master', 
        'rich_alchemist', 'failed_attempt_count', 'owned_count', 'adult_count',
        'intimacy_level', 'daily_pet_limit', 'gift_total_count', 
        'gift_count_favorite', 'first_gift', 'gift_type_dislike', 
        'gift_connoisseur', 'marathon_focus', 'flow_state', 'night_owl', 
        'early_bird', 'weekend_alchemist', 'perfect_day', 'inactive_days', 
        'app_juggler', 'always', 'current_stage', 'specific_growth', 
        'partner_id', 'previous_streak'
    ];

    console.group("🧪 [Validator] 서신 트리거 정밀 진단 시작");
    let errorCount = 0;

    pool.forEach(mail => {
        const triggers = Array.isArray(mail.triggers) ? mail.triggers : (mail.trigger ? [mail.trigger] : []);
        
        triggers.forEach(t => {
            // 1. 정의되지 않은 트리거 타입 체크
            if (!managerCases.includes(t.type)) {
                console.error(`❌ [불일치] 서신 ID: "${mail.id}"`);
                console.warn(`   사유: "${t.type}" 타입은 매니저에 정의되어 있지 않습니다.`);
                errorCount++;
            }

            // 2. Boolean 타입 체크 (숫자를 기대하는 곳에 true/false가 있는지)
            if (['total_focus', 'todo_count', 'inactive_days', 'intimacy_level'].includes(t.type) && typeof t.value === 'boolean') {
                console.error(`❌ [타입 오류] 서신 ID: "${mail.id}"`);
                console.warn(`   사유: "${t.type}"은 숫자를 기대하지만 현재 값은 ${t.value}입니다.`);
                errorCount++;
            }
        });
    });

    if (errorCount === 0) {
        console.log("✅ 모든 서신 트리거가 매니저 로직과 완벽히 일치합니다.");
    } else {
        console.error(`⚠️ 총 ${errorCount}개의 잠재적 오류가 발견되었습니다. 수정이 필요합니다.`);
    }
    console.groupEnd();
})();