// src/TaskManager.js

class TaskManager {
    constructor() {
        this.editingTodoId = null;
        this.dragSrcIndex = null;
        this.priorityScore = { 'high': 3, 'mid': 2, 'low': 1 };
    }

    /**
     * 초기화 및 전역 함수 바인딩
     */
    init() {
        window.addMolipTodo = this.addMolipTodo.bind(this);
        window.toggleTodo = this.toggleTodo.bind(this);
        window.deleteTodo = this.deleteTodo.bind(this);
        window.editTodo = this.editTodo.bind(this);
        window.saveInlineEdit = this.saveInlineEdit.bind(this);
        
        window.addHabit = this.addHabit.bind(this);
        window.toggleHabit = this.toggleHabit.bind(this);
        window.deleteHabit = this.deleteHabit.bind(this);
        window.editHabit = this.editHabit.bind(this);
        window.saveHabitInlineEdit = this.saveHabitInlineEdit.bind(this);
        
        window.renderTodos = this.renderTodos.bind(this);
        window.renderHabits = this.renderHabits.bind(this);
        window.cleanupOldTasks = this.cleanupOldTasks.bind(this);
        window.checkHabitReset = this.checkHabitReset.bind(this);

        window.handleDragStart = this.handleDragStart.bind(this);
        window.handleDragOver = this.handleDragOver.bind(this);
        window.handleDragEnter = this.handleDragEnter.bind(this);
        window.handleDragLeave = this.handleDragLeave.bind(this);
        window.handleDragEnd = this.handleDragEnd.bind(this);
        window.handleDrop = this.handleDrop.bind(this);

        this.initMainDatePicker();   
        this.initHabitDatePicker();  
        this.initHabitEvents();      

        console.log("✅ [TaskManager] 시간 비우기 기능이 추가된 시스템 가동");
    }

    get todos() { return window.molipTodos || []; }
    get habits() { return window.molipHabits || []; }

    /**
     * 투두 마감일 선택기: allowInput 추가
     */
    initMainDatePicker() {
        if (typeof flatpickr === 'function') {
            const locale = (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.ko) ? "ko" : "default";
            flatpickr("#todo-deadline-input", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                locale: locale,
                disableMobile: true,
                allowInput: true // ✨ 백스페이스로 지우기 허용
            });
        }
    }

    /**
     * 습관 시간 선택기: allowInput 추가
     */
    initHabitDatePicker() {
        if (typeof flatpickr === 'function') {
            const locale = (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.ko) ? "ko" : "default";
            flatpickr("#habit-time-input", {
                enableTime: true,
                noCalendar: true,
                dateFormat: "H:i",
                time_24hr: true,
                locale: locale,
                disableMobile: true,
                allowInput: true // ✨ 백스페이스로 지우기 허용
            });
        }
    }

    initHabitEvents() {
        const dayButtons = document.querySelectorAll('.day-btn');
        dayButtons.forEach(btn => {
            btn.classList.add('active'); 
            btn.onclick = () => btn.classList.toggle('active');
        });
    }

    // ============================================================
    // [1] 투두 리스트 로직
    // ============================================================

    addMolipTodo() {
        const input = document.getElementById('todo-input');
        const prioritySelect = document.getElementById('todo-priority-select');
        const deadlineInput = document.getElementById('todo-deadline-input');

        if (!input || !input.value.trim()) return;

        this.todos.push({ 
            id: Date.now().toString(36), 
            text: input.value.trim(), 
            completed: false, 
            rewarded: false, 
            date: window.getMolipDate(), 
            order: Date.now(),
            priority: prioritySelect ? prioritySelect.value : 'low', 
            deadline: deadlineInput ? deadlineInput.value : '' 
        });

        input.value = ''; 
        if (deadlineInput && deadlineInput._flatpickr) deadlineInput._flatpickr.clear(); // 등록 후 비우기
        if (prioritySelect) prioritySelect.value = 'low';

        this.renderTodos(); 
        if (window.saveAllData) window.saveAllData();
        if (window.playSFX) window.playSFX('click');
    }

    formatDeadline(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    /**
     * 마감 기한 포맷팅 (월-일 및 시간 분리)
     */
    formatDeadline(isoString) {
        if (!isoString) return null;
        const date = new Date(isoString);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        
        return {
            date: `${mm}-${dd}`,
            time: `${hh}:${min}`
        };
    }

    /**
     * 할 일 목록 렌더링 (습관과 동일한 규칙 적용)
     */
    renderTodos() {
        const list = document.getElementById('todo-list');
        const badge = document.getElementById('todo-count-badge');
        if (!list) return;

        const molipToday = window.getMolipDate();
        let displayTodos = this.todos.filter(t => t && (t.date === molipToday || (!t.completed && t.date !== molipToday)));

        if (badge) {
            const todayPool = this.todos.filter(t => t.date === molipToday);
            const comp = todayPool.filter(t => t.completed).length;
            badge.innerText = `${comp}/${todayPool.length}`;
            badge.classList.toggle('all-completed', todayPool.length > 0 && comp === todayPool.length);
        }

        if (window.hideCompleted) displayTodos = displayTodos.filter(t => !t.completed);

        displayTodos.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pA = this.priorityScore[a.priority] || 1;
            const pB = this.priorityScore[b.priority] || 1;
            if (pA !== pB) return pB - pA;
            return (a.order || 0) - (b.order || 0);
        });

        if (displayTodos.length === 0) {
            list.innerHTML = '<li class="empty-list-msg">할 일이 없습니다.</li>';
            return;
        }

        list.innerHTML = displayTodos.map((todo, index) => {
            const deadline = this.formatDeadline(todo.deadline); // ✨ 날짜/시간 객체 수령
            return `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" draggable="true"
                ondragstart="window.handleDragStart(event, ${index})" ondragover="window.handleDragOver(event)"
                ondrop="window.handleDrop(event, ${index})" ondragend="window.handleDragEnd(event)">
                <div class="drag-handle"><i class="fas fa-bars"></i></div>
                <div class="todo-checkbox" onclick="window.toggleTodo('${todo.id}')">
                    ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="todo-content-wrapper">
                    <div class="todo-text-main">${todo.text}</div>
                    ${deadline ? `
                        <div class="todo-deadline-text">
                            <i class="fas fa-calendar-alt"></i> ${deadline.date} | <i class="fas fa-clock"></i> ${deadline.time}
                        </div>` : ''}
                </div>
                <div class="todo-actions">
                    <button class="btn-todo-action" onclick="window.editTodo('${todo.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-todo-action" onclick="window.deleteTodo('${todo.id}')"><i class="fas fa-trash-can"></i></button>
                </div>
                <div class="priority-dot priority-${todo.priority || 'low'}"></div>
            </li>`;
        }).join('');
    }

    toggleTodo(id) {
        const index = this.todos.findIndex(t => String(t.id) === String(id));
        if (index === -1) return;
        const wasCompleted = this.todos[index].completed;
        this.todos[index].completed = !wasCompleted;
        if (window.playSFX) {
            window.playSFX('check'); // 또는 'level_up', 'click' 등 등록된 키워드
        }

        if (this.todos[index].completed && !wasCompleted) {
            const partner = window.currentPartner;
            const stage = window.currentStage || 'child';
            if (partner && partner.stages[stage]?.todo_responses) {
                const res = partner.stages[stage].todo_responses;
                if (window.showDialogue) window.showDialogue(res[Math.floor(Math.random() * res.length)], 3);
            }
            if (!this.todos[index].rewarded && window.collection) {
                window.collection.addPoints(5);
                this.todos[index].rewarded = true;
                if (window.showToast) window.showToast("5 Et 획득!", "success");
            }
        }
        this.renderTodos();
        if (window.saveAllData) window.saveAllData();
    }

    /**
     * 투두 수정: 지우기 버튼 추가
     */
    editTodo(id) {
        const todo = this.todos.find(t => String(t.id) === String(id));
        const item = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (!todo || !item) return;

        item.innerHTML = `
            <div class="drag-handle"><i class="fas fa-bars"></i></div>
            <select class="inline-priority-edit">
                <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>⚪</option>
                <option value="mid" ${todo.priority === 'mid' ? 'selected' : ''}>🟡</option>
                <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>🔴</option>
            </select>
            <div class="todo-content-wrapper" style="flex:1;">
                <input type="text" class="inline-text-edit" value="${todo.text}">
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="text" class="inline-deadline-edit" value="${todo.deadline || ''}" placeholder="기한 없음" style="flex:1;">
                    <button class="btn-clear-date" onclick="this.previousElementSibling._flatpickr.clear()" title="기한 지우기" 
                            style="background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer;">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            </div>
            <div class="todo-actions" style="display:flex; opacity:1;">
                <button class="btn-todo-action" onclick="window.saveInlineEdit('${id}')"><i class="fas fa-check"></i></button>
            </div>
        `;
        flatpickr(item.querySelector(".inline-deadline-edit"), { 
            enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, locale: "ko", allowInput: true 
        });
    }

    saveInlineEdit(id) {
        const item = document.querySelector(`.todo-item[data-id="${id}"]`);
        const idx = this.todos.findIndex(t => String(t.id) === String(id));
        if (idx !== -1 && item) {
            this.todos[idx].text = item.querySelector('.inline-text-edit').value.trim();
            this.todos[idx].priority = item.querySelector('.inline-priority-edit').value;
            this.todos[idx].deadline = item.querySelector('.inline-deadline-edit').value;
            this.renderTodos();
            if (window.saveAllData) window.saveAllData();
        }
    }

    deleteTodo(id) {
        const idx = this.todos.findIndex(t => String(t.id) === String(id));
        if (idx !== -1) { this.todos.splice(idx, 1); this.renderTodos(); if (window.saveAllData) window.saveAllData(); }
    }

    // ============================================================
    // [2] 습관 로직
    // ============================================================

    addHabit() {
        const input = document.getElementById('habit-input');
        const timeInput = document.getElementById('habit-time-input');
        const activeDays = Array.from(document.querySelectorAll('.day-btn.active')).map(btn => parseInt(btn.dataset.day));

        if (!input || !input.value.trim()) return;

        this.habits.push({
            id: 'habit_' + Date.now().toString(36),
            text: input.value.trim(),
            completed: false,
            rewarded: false,
            streak: 0,
            lastCompletedDate: null,
            days: activeDays.length > 0 ? activeDays : [0,1,2,3,4,5,6],
            time: timeInput ? timeInput.value : ""
        });

        // 입력창 및 시간 선택기 초기화
        input.value = '';
        if (timeInput && timeInput._flatpickr) timeInput._flatpickr.clear();
        
        // ✨ [수정] 등록 완료 후 모든 요일 버튼을 다시 활성화(active) 상태로 되돌립니다.
        document.querySelectorAll('.day-btn').forEach(btn => btn.classList.add('active'));

        this.renderHabits();
        if (window.saveAllData) window.saveAllData();
        if (window.showToast) window.showToast("새로운 습관을 새겼습니다.", "success");
    }

    /**
     * 습관 목록 렌더링 (빈 목록 메시지 추가 버전)
     */
    renderHabits() {
        const list = document.getElementById('habit-list');
        const badge = document.getElementById('habit-count-badge');
        if (!list) return;

        const today = new Date().getDay();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // 1. 뱃지 업데이트
        if (badge) {
            const completedCount = this.habits.filter(h => h.completed).length;
            badge.innerText = `${completedCount}/${this.habits.length}`;
            badge.classList.toggle('all-completed', this.habits.length > 0 && completedCount === this.habits.length);
        }

        // 2. 목록 없음 처리
        if (this.habits.length === 0) {
            list.innerHTML = '<li class="empty-list-msg">등록된 습관이 없습니다.</li>';
            return;
        }

        // 3. 습관 리스트 생성
        list.innerHTML = this.habits.map(h => {
            // ✨ [핵심 수정] h.days가 없거나 깨져있을 경우 빈 배열로 처리하여 에러 방지
            const safeDays = Array.isArray(h.days) ? h.days : [];
            
            const isToday = safeDays.includes(today);
            const dayText = safeDays.length === 7 ? "매일" : safeDays.map(d => dayNames[d]).join(', ');

            return `
            <li class="todo-item habit-item ${h.completed ? 'completed' : ''} ${!isToday ? 'not-today' : ''}" data-id="${h.id}">
                <div class="todo-checkbox" onclick="window.toggleHabit('${h.id}')">
                    ${h.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="habit-content-wrap">
                    <span class="todo-text">${h.text}</span>
                    <div class="habit-info-text">
                        <span class="habit-streak ${h.streak > 0 ? 'active' : ''}">
                            <i class="fas fa-fire"></i> ${h.streak || 0}일째
                        </span>
                        
                        <span class="habit-info-sep">|</span>
                        
                        <span class="habit-days">
                            <i class="fas fa-calendar-alt"></i> ${dayText}
                        </span>

                        ${h.time ? `
                        <span class="habit-info-sep">|</span>
                        <span class="habit-time">
                            <i class="fas fa-clock"></i> ${h.time}
                        </span>` : ''}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="btn-todo-action" onclick="window.editHabit('${h.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-todo-action" onclick="window.deleteHabit('${h.id}')"><i class="fas fa-trash-can"></i></button>
                </div>
            </li>`;
        }).join('');
    }

    /**
     * 습관 달성 토글 (연속 달성 기록 로직 포함)
     */
    toggleHabit(id) {
        const h = this.habits.find(habit => habit.id === id);
        if (!h) return;

        if (window.playSFX) {
            window.playSFX('check'); // 또는 'level_up', 'click' 등 등록된 키워드
        }

        const molipToday = window.getMolipDate();
        // 오늘 이미 달성해서 기록이 남았는지 확인
        const wasAlreadyDoneToday = (h.lastCompletedDate === molipToday);

        if (!h.completed) {
            // [체크하기]
            h.completed = true;
            if (!wasAlreadyDoneToday) {
                h.streak = (h.streak || 0) + 1; // 오늘 처음 체크하는 거라면 연속 기록 +1
                h.lastCompletedDate = molipToday;
            }

            // 에테르 보상 (최초 1회만)
            if (!h.rewarded) { 
                if (window.collection) window.collection.addPoints(10); 
                h.rewarded = true; 
                if (window.showToast) window.showToast("습관 달성! 10 Et 획득", "success");
            }
        } else {
            // [체크 해제] 실수로 눌렀을 때를 대비해 연속 기록 복구
            h.completed = false;
            if (wasAlreadyDoneToday) {
                h.streak = Math.max(0, (h.streak || 0) - 1);
                h.lastCompletedDate = null;
            }
        }

        this.renderHabits();
        if (window.saveAllData) window.saveAllData();
    }

    /**
     * 습관 수정: 지우기 버튼 추가
     */
    editHabit(id) {
        const h = this.habits.find(habit => habit.id === id);
        const item = document.querySelector(`.habit-item[data-id="${id}"]`);
        if (!h || !item) return;

        item.innerHTML = `
            <div class="todo-content-wrapper" style="flex:1;">
                <input type="text" class="inline-habit-text" value="${h.text}" style="width:100%; background:rgba(255,255,255,0.1); border:none; color:white; border-radius:4px;">
                <div style="display:flex; align-items:center; gap:5px; margin-top:4px;">
                    <input type="text" class="inline-habit-time" value="${h.time || ''}" placeholder="시간 없음" style="flex:1; font-size:0.75rem; background:transparent; border:none; color:var(--primary-gold);">
                    <button class="btn-clear-date" onclick="this.previousElementSibling._flatpickr.clear()" title="시간 지우기" 
                            style="background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer;">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            </div>
            <div class="todo-actions" style="display:flex; opacity:1;">
                <button class="btn-todo-action" onclick="window.saveHabitInlineEdit('${id}')"><i class="fas fa-check"></i></button>
            </div>
        `;
        flatpickr(item.querySelector(".inline-habit-time"), { 
            enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, locale: "ko", allowInput: true 
        });
    }

    saveHabitInlineEdit(id) {
        const item = document.querySelector(`.habit-item[data-id="${id}"]`);
        const idx = this.habits.findIndex(h => h.id === id);
        if (idx !== -1 && item) {
            this.habits[idx].text = item.querySelector('.inline-habit-text').value.trim();
            this.habits[idx].time = item.querySelector('.inline-habit-time').value;
            this.renderHabits();
            if (window.saveAllData) window.saveAllData();
        }
    }

    deleteHabit(id) {
        const idx = this.habits.findIndex(h => h.id === id);
        if (idx !== -1) { this.habits.splice(idx, 1); this.renderHabits(); if (window.saveAllData) window.saveAllData(); }
    }

    /**
     * 날짜 변경 시 습관 상태 초기화 및 연속 기록 검증
     */
    checkHabitReset() {
        const molipToday = window.getMolipDate();
        // renderer.js의 updateLoop가 날짜를 갱신하기 전의 '어제' 날짜를 가져옵니다.
        const lastDateStr = window.masterData.progress.lastSaveDate;
        const lastDay = new Date(lastDateStr).getDay();

        this.habits.forEach(h => {
            const safeDays = Array.isArray(h.days) ? h.days : [];
            
            // 1. 연속 달성 파괴 로직: 어제가 실천 요일이었는데 달성하지 않았다면 리셋
            if (safeDays.includes(lastDay) && !h.completed && h.lastCompletedDate !== molipToday) {
                h.streak = 0; 
                console.log(`🔥 [Habit] 연속 기록 파괴: ${h.text}`);
            }

            // 2. 일일 상태 초기화
            if (h.completed && h.lastCompletedDate !== molipToday) {
                h.completed = false;
                h.rewarded = false;
            }
        });
        
        this.renderHabits();
    }

    cleanupOldTasks() {
        if (!window.autoDeleteOldTasks || !this.todos) return;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        for (let i = this.todos.length - 1; i >= 0; i--) {
            if (this.todos[i].completed && new Date(this.todos[i].date) < sevenDaysAgo) { this.todos.splice(i, 1); }
        }
        this.renderTodos();
        if (window.saveAllData) window.saveAllData();
    }

    handleDragStart(e, index) { this.dragSrcIndex = index; e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('dragging'); }
    handleDragOver(e) { e.preventDefault(); return false; }
    
    /**
     * 할 일 드래그 앤 드롭 결과 처리 (순서 및 상태 동기화)
     */
    handleDrop(e, targetIndex) {
        if (this.dragSrcIndex === null || this.dragSrcIndex === targetIndex) return;

        // 1. 현재 화면에 표시된 리스트(필터링 및 정렬 완료된 상태)를 동일하게 구성합니다.
        const molipToday = window.getMolipDate();
        let displayTodos = this.todos.filter(t => t && (t.date === molipToday || (!t.completed && t.date !== molipToday)));

        // renderTodos와 동일한 정렬 기준으로 정렬된 상태를 가져옵니다.
        displayTodos.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pA = this.priorityScore[a.priority] || 1;
            const pB = this.priorityScore[b.priority] || 1;
            if (pA !== pB) return pB - pA;
            return (a.order || 0) - (b.order || 0);
        });

        // 2. 드래그한 아이템과 타겟 아이템을 특정합니다.
        const movedItem = displayTodos[this.dragSrcIndex];
        const targetItem = displayTodos[targetIndex];

        if (!movedItem || !targetItem) return;

        // 3. ✨ [핵심 수정] 드래그 위치에 따라 중요도와 완료 상태를 타겟 아이템과 동기화합니다.
        // 이렇게 해야 정렬 우선순위 때문에 아이템이 제자리로 튕겨 나가는 것을 방지할 수 있습니다.
        movedItem.priority = targetItem.priority;
        movedItem.completed = targetItem.completed;
        movedItem.date = targetItem.date;

        // 4. 전체 리스트에서 드래그한 아이템을 제거하고 새로운 위치(타겟 앞/뒤)에 삽입합니다.
        const actualSrcIdx = this.todos.indexOf(movedItem);
        this.todos.splice(actualSrcIdx, 1);
        
        const actualTargetIdx = this.todos.indexOf(targetItem);
        this.todos.splice(actualTargetIdx, 0, movedItem);

        // 5. ✨ [순서 기억] 현재 배열의 물리적 순서를 'order' 속성에 박제합니다.
        this.todos.forEach((t, idx) => {
            t.order = idx;
        });

        // UI 갱신 및 영구 저장
        this.renderTodos();
        if (window.saveAllData) window.saveAllData();
        
        // 초기화
        this.dragSrcIndex = null;
    }
    handleDragEnd(e) { e.currentTarget.classList.remove('dragging'); }
    handleDragEnter(e) {} handleDragLeave(e) {}
}

module.exports = TaskManager;