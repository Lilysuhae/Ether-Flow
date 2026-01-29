// src/TaskManager.js

class TaskManager {
    constructor() {
        this.editingTodoId = null;
        this.dragSrcIndex = null;
    }

    /**
     * 초기화 및 전역 함수 바인딩
     */
    init() {
        // 전역 변수 참조 확인
        this.syncData();

        // HTML 호출용 전역 함수 바인딩
        window.addMolipTodo = this.addMolipTodo.bind(this);
        window.toggleTodo = this.toggleTodo.bind(this);
        window.deleteTodo = this.deleteTodo.bind(this);
        window.editTodo = this.editTodo.bind(this);
        window.saveInlineEdit = this.saveInlineEdit.bind(this);
        window.confirmEditTodo = this.confirmEditTodo.bind(this);
        
        window.addHabit = this.addHabit.bind(this);
        window.toggleHabit = this.toggleHabit.bind(this);
        window.deleteHabit = this.deleteHabit.bind(this);
        window.editHabit = this.editHabit.bind(this);
        window.saveHabitInlineEdit = this.saveHabitInlineEdit.bind(this);
        
        window.renderTodos = this.renderTodos.bind(this);
        window.renderHabits = this.renderHabits.bind(this);
        window.cleanupOldTasks = this.cleanupOldTasks.bind(this);
        window.checkHabitReset = this.checkHabitReset.bind(this);

        // 드래그 앤 드롭 핸들러 바인딩
        window.handleDragStart = this.handleDragStart.bind(this);
        window.handleDragOver = this.handleDragOver.bind(this);
        window.handleDragEnter = this.handleDragEnter.bind(this);
        window.handleDragLeave = this.handleDragLeave.bind(this);
        window.handleDragEnd = this.handleDragEnd.bind(this);
        window.handleDrop = this.handleDrop.bind(this);

        console.log("✅ [TaskManager] 할 일 및 습관 시스템 연결 완료");
    }

    /**
     * 데이터 접근자 (renderer.js에서 연결한 전역 변수 참조)
     */
    syncData() {
        // window.molipTodos와 window.molipHabits는 renderer.js에서 
        // masterData.todo / masterData.habit과 연결되어 있어야 합니다.
    }

    get todos() {
        return window.molipTodos || [];
    }

    get habits() {
        return window.molipHabits || [];
    }

    // ============================================================
    // [1] 투두 리스트 로직
    // ============================================================

    addMolipTodo() {
        const input = document.getElementById('todo-input');
        if (!input || !input.value.trim()) return;

        const molipToday = window.getMolipDate(); 

        this.todos.push({ 
            id: Date.now().toString(36), 
            text: input.value.trim(), 
            completed: false, 
            rewarded: false, 
            date: molipToday, 
            order: Date.now() 
        });

        input.value = ''; 
        this.renderTodos(); 
        if (window.saveAllData) window.saveAllData();
    }

    toggleTodo(id) {
        const index = this.todos.findIndex(t => String(t.id) === String(id));
        if (index === -1) return;

        if (window.playSFX) window.playSFX('check');
        const molipToday = window.getMolipDate(); 
        const wasCompleted = this.todos[index].completed;

        this.todos[index].completed = !this.todos[index].completed;

        // 과거 날짜의 미완료 항목을 체크 해제 시 오늘 날짜로 갱신
        if (!this.todos[index].completed && this.todos[index].date !== molipToday) {
            this.todos[index].date = molipToday;
            if (window.showToast) window.showToast("미완료된 과업을 오늘로 가져왔습니다.", "info");
        }

        // 완료 보상
        if (this.todos[index].completed && !wasCompleted) {
            // 대사 출력
            if (window.currentPartner && !window.isHatching) { 
                const stageData = window.currentPartner.stages[window.currentStage] || window.currentPartner.stages['adult'];
                const responses = stageData.todo_responses || ["수고하셨습니다!"];
                const text = Array.isArray(responses) 
                    ? responses[Math.floor(Math.random() * responses.length)] 
                    : responses;
                if (window.showDialogue) window.showDialogue(text);
            }

            // 보상 지급
            if (!this.todos[index].rewarded) {
                if (Math.random() < 0.05) { 
                    const bonusPoints = 50;
                    if (window.collection) window.collection.addPoints(bonusPoints);
                    if (window.showToast) window.showToast(`✨ 보너스! ${bonusPoints} Et 추가 획득`, "event");
                }
                if (window.collection) window.collection.addPoints(5);
                this.todos[index].rewarded = true;
                if (window.showToast) window.showToast("5 Et 획득!", "success");
                if (window.updateUI) window.updateUI();
            }
        }

        this.renderTodos();
        if (window.saveAllData) window.saveAllData();
    }

    deleteTodo(id) { 
        // 🛠️ [수정] filter 대신 splice를 사용하여 원본 배열 직접 삭제 (참조 유지)
        const index = this.todos.findIndex(t => String(t.id) === String(id));
        if (index !== -1) {
            this.todos.splice(index, 1); // 배열에서 해당 인덱스 항목 제거
            this.renderTodos(); 
            if (window.saveAllData) window.saveAllData(); 
        }
    }

    editTodo(id) {
        const todoItem = document.querySelector(`.todo-item[data-id="${id}"]`);
        if (!todoItem) return;

        const textSpan = todoItem.querySelector('.todo-text');
        const currentText = textSpan.innerText;

        textSpan.innerHTML = `
            <input type="text" class="inline-edit-input" 
                   value="${currentText}" 
                   onkeydown="if(event.key==='Enter') { this.onblur = null; window.saveInlineEdit('${id}', this.value); } 
                              if(event.key==='Escape') { this.onblur = null; window.renderTodos(); }"
                   onblur="window.saveInlineEdit('${id}', this.value)">
        `;

        const input = textSpan.querySelector('input');
        input.focus();
        input.select();
    }

    saveInlineEdit(id, newText) {
        const trimmedText = newText.trim();
        if (!trimmedText) {
            this.renderTodos(); 
            return;
        }

        const index = this.todos.findIndex(t => String(t.id) === String(id));
        if (index !== -1) {
            this.todos[index].text = trimmedText;
            this.renderTodos(); 
            if (window.saveAllData) window.saveAllData();
            if (window.showToast) window.showToast("수정되었습니다.", "success");
        }
    }

    confirmEditTodo() {
        const input = document.getElementById('todo-edit-input');
        if (!input) return;
        
        const newText = input.value.trim();
        if (newText === "") {
            if (window.showToast) window.showToast("내용을 입력해주세요.", "warning");
            return;
        }
        
        // renderer.js의 window.editingTodoId 전역 변수 사용
        const targetId = window.editingTodoId || this.editingTodoId;
        const index = this.todos.findIndex(t => String(t.id) === String(targetId));
        
        if (index !== -1) {
            this.todos[index].text = newText;
            this.renderTodos(); 
            if (window.saveAllData) window.saveAllData();       
            if (window.closeAllModals) window.closeAllModals();
            if (window.showToast) window.showToast("수정되었습니다.", "success");
        }
        if (window.editingTodoId !== undefined) window.editingTodoId = null;
        this.editingTodoId = null;
    }

    renderTodos() {
        const list = document.getElementById('todo-list');
        const badge = document.getElementById('todo-count-badge');
        if (!list) return;

        const molipToday = window.getMolipDate();

        let displayTodos = this.todos.filter(t => {
            if (!t) return false;
            const isToday = t.date === molipToday;
            const isUnfinishedPast = !t.completed && t.date !== molipToday;
            const isFinishedPast = t.completed && t.date !== molipToday;

            if (isToday) return true;
            if (isUnfinishedPast) return true;
            if (isFinishedPast && window.showPastCompleted) return true;
            return false;
        });

        // 뱃지 업데이트
        const todayPool = this.todos.filter(t => t && t.date === molipToday);
        const total = todayPool.length;
        const completed = todayPool.filter(t => t.completed).length;

        if (badge) {
            badge.innerText = `${completed}/${total}`;
            badge.classList.toggle('all-completed', total > 0 && completed === total);
        }

        if (window.hideCompleted) {
            displayTodos = displayTodos.filter(t => !t.completed);
        }

        displayTodos.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (a.order || 0) - (b.order || 0);
        });

        if (displayTodos.length === 0) {
            list.innerHTML = '<li class="empty-list-msg">할 일이 없습니다.</li>';
            return;
        }

        list.innerHTML = displayTodos.map((todo, index) => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" 
                data-id="${todo.id}"
                draggable="true"
                ondragstart="window.handleDragStart(event, ${index})"
                ondragover="window.handleDragOver(event)"
                ondragenter="window.handleDragEnter(event)"
                ondragleave="window.handleDragLeave(event)"
                ondrop="window.handleDrop(event, ${index})"
                ondragend="window.handleDragEnd(event)">
                <div class="todo-checkbox" onclick="window.toggleTodo('${todo.id}')">
                    ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <span class="todo-text">${todo.text}</span>
                <div class="todo-actions">
                    <button class="btn-todo-action btn-edit" onclick="window.editTodo('${todo.id}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-todo-action btn-trash" onclick="window.deleteTodo('${todo.id}')">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>
            </li>`).join('');
    }

    cleanupOldTasks() {
        if (!window.autoDeleteOldTasks || !this.todos) return;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        let deletedCount = 0;
        
        // 🛠️ [수정] 역순 순회하며 splice로 안전하게 삭제
        for (let i = this.todos.length - 1; i >= 0; i--) {
            const t = this.todos[i];
            if (t.completed) {
                const taskDate = new Date(t.date);
                if (taskDate < sevenDaysAgo) {
                    this.todos.splice(i, 1);
                    deletedCount++;
                }
            }
        }

        if (deletedCount > 0) {
            console.log(`[시스템] 오래된 할 일 ${deletedCount}개가 정리되었습니다.`);
            this.renderTodos();
            if (window.saveAllData) window.saveAllData();
        }
    }

    // ============================================================
    // [2] 습관(Habit) 로직
    // ============================================================

    addHabit() {
        const input = document.getElementById('habit-input');
        if (!input || !input.value.trim()) return;
        
        this.habits.push({
            id: 'habit_' + Date.now().toString(36),
            text: input.value.trim(),
            completed: false,
            rewarded: false,
            streak: 0,
            lastCompletedDate: null
        });
        
        input.value = '';
        this.renderHabits();
        if (window.saveAllData) window.saveAllData();
        if (window.showToast) window.showToast("새로운 습관을 새겼습니다.", "success");
    }

    toggleHabit(id) {
        const habit = this.habits.find(h => h.id === id);
        if (!habit) return;

        if (window.playSFX) window.playSFX('check');

        const molipToday = window.getMolipDate();
        const wasCompleted = habit.completed;

        habit.completed = !habit.completed;

        if (habit.completed && !wasCompleted) {
            const lastDate = habit.lastCompletedDate;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-CA');

            if (lastDate === yesterdayStr) {
                habit.streak += 1;
            } else if (!lastDate || lastDate !== molipToday) {
                habit.streak = 1; 
            }
            
            habit.lastCompletedDate = molipToday;

            if (!habit.rewarded) {
                if (window.collection) window.collection.addPoints(10);
                habit.rewarded = true;
                if (window.showToast) window.showToast(`습관 완수! ${habit.streak}일째입니다. +10 Et`, "success");
            } else {
                if (window.showToast) window.showToast(`오늘의 수련은 이미 마쳤습니다. (${habit.streak}일째)`, "info");
            }
        } 
        
        this.renderHabits();
        if (window.updateUI) window.updateUI();
        if (window.saveAllData) window.saveAllData();
    }

    renderHabits() {
        const list = document.getElementById('habit-list');
        const badge = document.getElementById('habit-count-badge');
        if (!list) return;

        const total = this.habits.length;
        const completed = this.habits.filter(h => h && h.completed).length;

        if (badge) {
            badge.innerText = `${completed}/${total}`;
            badge.classList.toggle('all-completed', total > 0 && completed === total);
        }

        let displayHabits = this.habits;
        if (window.hideCompleted) {
            displayHabits = this.habits.filter(h => !h.completed);
        }

        if (displayHabits.length === 0) {
            list.innerHTML = '<li class="empty-list-msg">등록된 습관이 없습니다.</li>';
            return;
        }

        list.innerHTML = displayHabits.map(habit => `
            <li class="todo-item habit-item ${habit.completed ? 'completed' : ''}" data-id="${habit.id}">
                <div class="todo-checkbox" onclick="window.toggleHabit('${habit.id}')">
                    ${habit.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="habit-content-wrap">
                    <span class="todo-text">${habit.text}</span>
                    ${habit.streak > 0 ? `<span class="habit-streak-badge"><i class="fas fa-fire"></i> ${habit.streak}</span>` : ''}
                </div>
                <div class="todo-actions">
                    <button class="btn-todo-action btn-edit" onclick="window.editHabit('${habit.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-todo-action btn-trash" onclick="window.deleteHabit('${habit.id}')"><i class="fas fa-trash-can"></i></button>
                </div>
            </li>`).join('');
    }

    checkHabitReset() {
        const molipToday = window.getMolipDate();
        let isChanged = false;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        if (!this.habits) return;

        this.habits.forEach(habit => {
            if (!habit) return;

            if (habit.completed && habit.lastCompletedDate !== molipToday) {
                habit.completed = false; 
                habit.rewarded = false;  
                isChanged = true;
            }
            
            if (habit.lastCompletedDate !== molipToday && habit.lastCompletedDate !== yesterdayStr) {
                if (habit.streak > 0) {
                    habit.streak = 0; 
                    isChanged = true;
                }
            }
        });

        if (isChanged) {
            this.renderHabits();
            if (window.saveAllData) window.saveAllData();
        }
    }

    editHabit(id) {
        const habitItem = document.querySelector(`.habit-item[data-id="${id}"]`);
        if (!habitItem) return;

        const textSpan = habitItem.querySelector('.todo-text');
        const currentText = textSpan.innerText;

        textSpan.innerHTML = `
            <input type="text" class="inline-edit-input" 
                   value="${currentText}" 
                   onkeydown="if(event.key==='Enter') { this.onblur = null; window.saveHabitInlineEdit('${id}', this.value); } 
                              if(event.key==='Escape') { this.onblur = null; window.renderHabits(); }"
                   onblur="window.saveHabitInlineEdit('${id}', this.value)">
        `;

        const input = textSpan.querySelector('input');
        input.focus();
        input.select();
    }

    saveHabitInlineEdit(id, newText) {
        const trimmedText = newText.trim();
        if (!trimmedText) {
            this.renderHabits(); 
            return;
        }

        const index = this.habits.findIndex(h => String(h.id) === String(id));
        if (index !== -1) {
            this.habits[index].text = trimmedText;
            this.renderHabits(); 
            if (window.saveAllData) window.saveAllData();
            if (window.showToast) window.showToast("습관이 수정되었습니다.", "success");
        }
    }

    deleteHabit(id) {
        const performDelete = () => {
            // 🛠️ [수정] splice 사용
            const index = this.habits.findIndex(h => String(h.id) === String(id));
            if (index !== -1) {
                this.habits.splice(index, 1);
                this.renderHabits();
                if (window.saveAllData) window.saveAllData();
            }
        };

        if (window.showConfirm) {
            window.showConfirm("습관 파기", "삭제 시 연속 달성 기록이 모두 사라집니다.", performDelete);
        } else {
            performDelete();
        }
    }

    // ============================================================
    // [3] 드래그 앤 드롭 로직
    // ============================================================

    handleDragStart(e, index) {
        this.dragSrcIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
    }

    handleDragOver(e) { 
        e.preventDefault(); 
        return false; 
    }

    handleDragEnter(e) {
        const item = e.target.closest('.todo-item');
        if (item && !item.classList.contains('dragging')) {
            item.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const item = e.target.closest('.todo-item');
        if (item) item.classList.remove('drag-over');
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
        this.dragSrcIndex = null;
    }

    handleDrop(e, targetIndex) {
        e.preventDefault(); 
        document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over', 'dragging'));
        
        if (this.dragSrcIndex === null || this.dragSrcIndex === targetIndex) return;

        const molipToday = window.getMolipDate();
        
        // 정렬 및 필터링된 현재 뷰를 재구성
        const todayTodos = this.todos.filter(t => t && t.date === molipToday);
        let currentDisplay = todayTodos;

        if (window.showPastCompleted) {
            const pastCompleted = this.todos.filter(t => t && t.date !== molipToday && t.completed);
            currentDisplay = [...currentDisplay, ...pastCompleted];
        }
        
        if (window.hideCompleted) {
            currentDisplay = currentDisplay.filter(t => !t.completed);
        }

        currentDisplay.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (a.order || 0) - (b.order || 0);
        });

        // 항목 이동
        const [movedItem] = currentDisplay.splice(this.dragSrcIndex, 1);
        currentDisplay.splice(targetIndex, 0, movedItem);

        // 변경된 순서(order) 부여
        currentDisplay.forEach((todo, idx) => {
            todo.order = idx; 
        });

        this.renderTodos(); 
        if (window.saveAllData) window.saveAllData(); 
        
        if (window.showToast) window.showToast("순서가 변경되었습니다.", "info");
    }
}

module.exports = TaskManager;