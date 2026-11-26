// =====================================
// ZAFELLE'S PLANNER
// Personal Schedule & To-Do Management
// =====================================

const $ = id => document.getElementById(id);

const STORAGE = {
    schedules: "zafelles_schedules",
    tasks: "zafelles_tasks"
};

function loadData(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

let schedules = loadData(STORAGE.schedules);
let tasks = loadData(STORAGE.tasks);

function saveData() {
    localStorage.setItem(STORAGE.schedules, JSON.stringify(schedules));
    localStorage.setItem(STORAGE.tasks, JSON.stringify(tasks));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 9);
}

function formatDate(date) {
    if (!date) return "Tanpa deadline";

    const parts = date.split("-").map(Number);
    const parsed = new Date(parts[0], parts[1] - 1, parts[2]);

    return parsed.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// =====================================
// DATE DISPLAY
// =====================================

function displayToday() {
    const now = new Date();

    $("todayDate").textContent = now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    $("scheduleDate").value =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");
}

displayToday();

// =====================================
// SCHEDULE MANAGEMENT
// =====================================

$("scheduleForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const title = $("scheduleTitle").value.trim();
    const date = $("scheduleDate").value;
    const time = $("scheduleTime").value;
    const note = $("scheduleNote").value.trim();

    if (!title || !date || !time) {
        alert("Lengkapi nama, tanggal, dan waktu kegiatan.");
        return;
    }

    schedules.push({
        id: createId(),
        title,
        date,
        time,
        note
    });

    saveData();
    renderSchedules();

    this.reset();
    $("scheduleDate").value = new Date().toLocaleDateString("en-CA");

    alert("Jadwal berhasil ditambahkan! ♡");
});

function renderSchedules() {
    const list = $("scheduleList");

    const sorted = [...schedules].sort((a, b) =>
        (a.date + a.time).localeCompare(b.date + b.time)
    );

    $("scheduleCount").textContent = schedules.length;
    $("scheduleTotal").textContent = schedules.length + " kegiatan";

    if (!sorted.length) {
        list.innerHTML = '<div class="empty">✿ Belum ada jadwal. Tambahkan kegiatanmu!</div>';
        return;
    }

    list.innerHTML = sorted.map(item => `
        <div class="item">
            <div class="item-info">
                <strong>${escapeHTML(item.title)}</strong>
                <small>▦ ${formatDate(item.date)} · ◷ ${escapeHTML(item.time)}</small>
                ${item.note ? `<small>♡ ${escapeHTML(item.note)}</small>` : ""}
            </div>
            <div class="item-actions">
                <button class="edit-btn" onclick="editSchedule('${item.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteSchedule('${item.id}')">Hapus</button>
            </div>
        </div>
    `).join("");
}

function editSchedule(id) {
    const item = schedules.find(s => s.id === id);
    if (!item) return;

    const title = prompt("Ubah nama kegiatan:", item.title);
    if (title === null) return;

    const date = prompt("Ubah tanggal (YYYY-MM-DD):", item.date);
    if (date === null) return;

    const time = prompt("Ubah jam (HH:MM):", item.time);
    if (time === null) return;

    if (!title.trim() || !date || !time ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^\d{2}:\d{2}$/.test(time)) {
        alert("Data tidak valid.");
        return;
    }

    item.title = title.trim();
    item.date = date;
    item.time = time;

    saveData();
    renderSchedules();
}

function deleteSchedule(id) {
    if (!confirm("Yakin ingin menghapus jadwal ini?")) return;

    schedules = schedules.filter(s => s.id !== id);

    saveData();
    renderSchedules();
}

// =====================================
// TASK MANAGEMENT
// =====================================

$("taskForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const title = $("taskTitle").value.trim();
    const date = $("taskDate").value;
    const priority = $("taskPriority").value;

    if (!title) {
        alert("Masukkan nama tugas terlebih dahulu.");
        return;
    }

    tasks.push({
        id: createId(),
        title,
        date,
        priority,
        completed: false
    });

    saveData();
    renderTasks();

    this.reset();

    alert("Tugas berhasil ditambahkan! ♡");
});

function renderTasks() {
    const list = $("taskList");
    const filter = $("taskFilter").value;

    let filtered = [...tasks];

    if (filter === "pending") {
        filtered = filtered.filter(t => !t.completed);
    } else if (filter === "completed") {
        filtered = filtered.filter(t => t.completed);
    }

    filtered.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
    });

    if (!filtered.length) {
        list.innerHTML = '<div class="empty">♡ Tidak ada tugas di kategori ini.</div>';
    } else {
        list.innerHTML = filtered.map(task => {
            const priorityClass =
                task.priority === "Mendesak" ? "urgent" :
                task.priority === "Penting" ? "important" : "";

            return `
                <div class="item ${task.completed ? "done" : ""}">
                    <div class="item-info">
                        <strong>${escapeHTML(task.title)}</strong>
                        <small>Deadline: ${formatDate(task.date)}</small>
                        <span class="priority ${priorityClass}">
                            ${escapeHTML(task.priority)}
                        </span>
                    </div>
                    <div class="item-actions">
                        <button class="check-btn"
                            onclick="toggleTask('${task.id}')">
                            ${task.completed ? "Batal" : "Selesai"}
                        </button>
                        <button class="edit-btn"
                            onclick="editTask('${task.id}')">Edit</button>
                        <button class="delete-btn"
                            onclick="deleteTask('${task.id}')">Hapus</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    updateStatistics();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;

    saveData();
    renderTasks();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const title = prompt("Ubah nama tugas:", task.title);
    if (title === null) return;

    const date = prompt(
        "Ubah deadline (YYYY-MM-DD), kosongkan jika tidak ada:",
        task.date
    );

    if (date === null) return;

    const priority = prompt(
        "Pilih prioritas: Normal, Penting, atau Mendesak",
        task.priority
    );

    if (priority === null) return;

    const allowed = ["Normal", "Penting", "Mendesak"];

    if (!title.trim() ||
        (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) ||
        !allowed.includes(priority)) {
        alert("Data yang dimasukkan tidak valid.");
        return;
    }

    task.title = title.trim();
    task.date = date;
    task.priority = priority;

    saveData();
    renderTasks();
}

function deleteTask(id) {
    if (!confirm("Yakin ingin menghapus tugas ini?")) return;

    tasks = tasks.filter(t => t.id !== id);

    saveData();
    renderTasks();
}

// =====================================
// FILTER TASKS
// =====================================

$("taskFilter").addEventListener("change", renderTasks);

// =====================================
// DASHBOARD STATISTICS
// =====================================

function updateStatistics() {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;

    const percentage = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    $("taskCount").textContent = tasks.length;
    $("completedCount").textContent = completed;
    $("pendingCount").textContent = pending;

    $("progressText").textContent = percentage + "%";
    $("progressBar").style.width = percentage + "%";
}

// =====================================
// INITIALIZE WEBSITE
// =====================================

function initialize() {
    renderSchedules();
    renderTasks();
    updateStatistics();
    saveData();
}

initialize();

console.log("Zafelle's Planner berhasil dijalankan! ♡");
