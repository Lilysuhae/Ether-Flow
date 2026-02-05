/**
 * [src/NoteManager.js]
 * 타이틀 줄바꿈(Textarea) 및 자동 높이 조절 기능이 적용된 버전입니다.
 */
const NoteManager = {
    isDragging: false,
    isResizing: false,
    dragTarget: null,
    offsetX: 0, offsetY: 0,
    startW: 0, startH: 0,
    COLORS: ['#fff9c4', '#c5cae9', '#c8e6c9', '#f8bbd0', '#e1bee7'],

    init() {
        if (!Array.isArray(window.masterData.notes)) {
            window.masterData.notes = [];
        }
        window.masterData.notes.forEach(note => {
            if (!note.w) note.w = 220;
            if (!note.h) note.h = 150;
            if (!note.color) note.color = this.COLORS[0];
            if (!note.title) note.title = "메모";
        });
        this.renderAll();
        this.renderAddButton();
    },

    renderAll() {
        document.querySelectorAll('.floating-note').forEach(n => n.remove());
        window.masterData.notes.forEach(noteData => this.createNoteElement(noteData));
    },

    createNoteElement(data) {
        const note = document.createElement('div');
        note.className = 'floating-note';
        note.id = `note-${data.id}`;
        if (data.isMinimized) note.classList.add('minimized');
        
        note.style.cssText = `
            position: fixed; left: ${data.x}px; top: ${data.y}px;
            width: ${data.w}px; height: ${data.h}px;
            background-color: ${data.color}; -webkit-app-region: no-drag;
        `;

        // ✨ [수정] 타이틀을 textarea로 변경하여 줄바꿈 지원
        note.innerHTML = `
            <div class="note-header" 
                 onmousedown="NoteManager.startDrag(event, ${data.id})"
                 ondblclick="NoteManager.toggleMinimize(${data.id})">
                <textarea class="note-title-area" 
                       oninput="NoteManager.autoResizeTitle(this); NoteManager.updateTitle(${data.id}, this.value)"
                       onkeydown="if(event.key === 'Enter' && !event.shiftKey) { this.blur(); event.preventDefault(); }"
                       onmousedown="event.stopPropagation()"
                       placeholder="제목" rows="1">${data.title}</textarea>
                <div class="note-controls">
                    <button onclick="NoteManager.toggleMinimize(${data.id})"><i class="fa-solid fa-minus"></i></button>
                    <button onclick="NoteManager.deleteNote(${data.id})"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <textarea class="note-body" 
                      oninput="NoteManager.updateContent(${data.id}, this.value)"
                      onkeydown="if(event.key === 'Enter' && !event.shiftKey) this.blur()"
                      onmousedown="event.stopPropagation()">${data.content}</textarea>
            <div class="note-resize-handle" onmousedown="NoteManager.startResize(event, ${data.id})"></div>
        `;

        document.body.appendChild(note);
        // 생성 후 초기 높이 조절
        const titleArea = note.querySelector('.note-title-area');
        this.autoResizeTitle(titleArea);
    },

    /**
     * ✨ 타이틀 입력 시 높이 자동 조절 헬퍼
     */
    autoResizeTitle(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
    },

    updateTitle(id, val) {
        const data = window.masterData.notes.find(n => n.id === id);
        if (data) {
            data.title = val;
            if (window.saveAllData) window.saveAllData();
        }
    },

    updateContent(id, val) {
        const data = window.masterData.notes.find(n => n.id === id);
        if (data) {
            data.content = val;
            if (window.saveAllData) window.saveAllData();
        }
    },

    // --- 드래그, 리사이즈, 삭제 로직 (기존 유지) ---
    
    startResize(e, id) {
        e.stopPropagation(); e.preventDefault();
        this.isResizing = true;
        this.dragTarget = document.getElementById(`note-${id}`);
        this.startW = this.dragTarget.offsetWidth;
        this.startH = this.dragTarget.offsetHeight;
        this.offsetX = e.clientX; this.offsetY = e.clientY;

        const move = (me) => {
            if (!this.isResizing) return;
            const newW = Math.min(500, Math.max(180, this.startW + (me.clientX - this.offsetX)));
            const newH = Math.min(600, Math.max(120, this.startH + (me.clientY - this.offsetY)));
            this.dragTarget.style.width = `${newW}px`;
            this.dragTarget.style.height = `${newH}px`;
            const data = window.masterData.notes.find(n => n.id === id);
            if (data) { data.w = newW; data.h = newH; }
        };
        const stop = () => {
            this.isResizing = false;
            if (window.saveAllData) window.saveAllData();
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', stop);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop);
    },

    startDrag(e, id) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
        e.stopPropagation();
        this.isDragging = true;
        this.dragTarget = document.getElementById(`note-${id}`);
        this.offsetX = e.clientX - this.dragTarget.offsetLeft;
        this.offsetY = e.clientY - this.dragTarget.offsetTop;

        const move = (me) => {
            if (!this.isDragging) return;
            const x = me.clientX - this.offsetX;
            const y = me.clientY - this.offsetY;
            this.dragTarget.style.left = `${x}px`;
            this.dragTarget.style.top = `${y}px`;
            const data = window.masterData.notes.find(n => n.id === id);
            if (data) { data.x = x; data.y = y; }
        };
        const stop = () => {
            this.isDragging = false;
            if (window.saveAllData) window.saveAllData();
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', stop);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop);
    },

    toggleMinimize(id) {
        const data = window.masterData.notes.find(n => n.id === id);
        if (data) {
            data.isMinimized = !data.isMinimized;
            const el = document.getElementById(`note-${id}`);
            if (el) el.classList.toggle('minimized', data.isMinimized);
            if (window.saveAllData) window.saveAllData();
        }
    },

    deleteNote(id) {
        if (window.showConfirm) {
            window.showConfirm("연구 메모 파기", "이 메모를 삭제하시겠습니까?", () => {
                window.masterData.notes = window.masterData.notes.filter(n => n.id !== id);
                document.getElementById(`note-${id}`)?.remove();
                if (window.saveAllData) window.saveAllData();
            });
        }
    },

    addNote() {
        const newNote = {
            id: Date.now(), title: "새 메모",
            x: 150, y: 150, w: 220, h: 150,
            content: "", isMinimized: false,
            color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)]
        };
        window.masterData.notes.push(newNote);
        this.createNoteElement(newNote);
        if (window.saveAllData) window.saveAllData();
    },

    renderAddButton() {
        if (document.getElementById('add-note-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'add-note-btn';
        btn.innerHTML = '<i class="fa-regular fa-pen-to-square"></i>';
        btn.onclick = () => this.addNote();
        document.body.appendChild(btn);
    },
    
    updateTheme() {} 
};

window.NoteManager = NoteManager;