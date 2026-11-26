// =====================================
// ZAFELLE'S PLANNER - FIREBASE VERSION
// =====================================

// FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyATxasivvd4zG82TU_FuCFQE6uG8e2yvRA",
    authDomain: "zafelles-planner-60a40.firebaseapp.com",
    projectId: "zafelles-planner-60a40",
    storageBucket: "zafelles-planner-60a40.firebasestorage.app",
    messagingSenderId: "122625492366",
    appId: "1:122625492366:web:943fedbc8f9dbf021d10df",
    measurementId: "G-0E7RQXQZFF"
};

// INITIALIZE FIREBASE
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const $ = id => document.getElementById(id);

let schedules = [];
let tasks = [];
let currentUser = null;

let unsubscribeSchedules = null;
let unsubscribeTasks = null;

// =====================================
// HELPER FUNCTIONS
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
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

function showMessage(message, isError = false) {
    const element = $("authMessage");
    element.textContent = message;
    element.style.color = isError ? "#d95375" : "#6b9d75";
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

// =====================================
// AUTHENTICATION
// =====================================

$("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const button = $("loginButton");

    button.disabled = true;
    button.textContent = "Memproses...";

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showMessage("Login berhasil!");
    } catch (error) {
        console.error("Login error:", error);

        const messages = {
            "auth/invalid-email": "Format email tidak valid.",
            "auth/user-not-found": "Akun tidak ditemukan.",
            "auth/wrong-password": "Password salah.",
            "auth/invalid-credential": "Email atau password salah.",
            "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti."
        };

        showMessage(
            messages[error.code] || "Login gagal: " + error.message,
            true
        );
    } finally {
        button.disabled = false;
        button.textContent = "Login";
    }
});

$("logoutButton").addEventListener("click", async function() {
    if (!confirm("Yakin ingin keluar dari akun?")) return;

    try {
        await auth.signOut();
    } catch (error) {
        alert("Gagal logout: " + error.message);
    }
});

// =====================================
// AUTH STATE
// =====================================

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;

        $("loginScreen").hidden = true;
        $("appScreen").hidden = false;
        $("currentUser").textContent = user.email || "";

        displayToday();
        startDataListeners();
    } else {
        currentUser = null;

        stopDataListeners();

        schedules = [];
        tasks = [];

        $("appScreen").hidden = true;
        $("loginScreen").hidden = false;

        renderSchedules();
        renderTasks();
    }
});

// =====================================
// FIRESTORE PATHS
// =====================================

function userCollection(collectionName) {
    if (!currentUser) {
        throw new Error("Kamu belum login.");
    }

    return db.collection("users")
        .doc(currentUser.uid)
        .collection(collectionName);
}

// =====================================
// REALTIME DATA LISTENERS
// =====================================

function startDataListeners() {
    stopDataListeners();

    unsubscribeSchedules = userCollection("schedules")
        .orderBy("date")
        .onSnapshot(snapshot => {
            schedules = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            renderSchedules();
        }, error => {
            console.error("Schedule listener:", error);
            alert("Gagal memuat jadwal: " + error.message);
        });

    unsubscribeTasks = userCollection("tasks")
        .onSnapshot(snapshot => {
            tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            renderTasks();
            updateStatistics();
        }, error => {
            console.error("Task listener:", error);
            alert("Gagal memuat tugas: " + error.message);
        });
}

function stopDataListeners() {
    if (unsubscribeSchedules) {
        unsubscribeSchedules();
        unsubscribeSchedules = null;
    }

    if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
    }
}

// =====================================
// SCHEDULE MANAGEMENT
// =====================================

$("scheduleForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = $("scheduleTitle").value.trim();
    const date = $("scheduleDate").value;
    const time = $("scheduleTime").value;
    const note = $("scheduleNote").value.trim();

    if (!title || !date || !time) {
        alert("Lengkapi nama, tanggal, dan waktu kegiatan.");
        return;
    }

    try {
        await userCollection("schedules").add({
            title,
            date,
            time,
            note,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.reset();
        displayToday();

        alert("Jadwal berhasil ditambahkan! ♡");
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan jadwal: " + error.message);
    }
});

function renderSchedules() {
    const list = $("scheduleList");

    const sorted = [...schedules].sort((a, b) =>
        (a.date + a.time).localeCompare(b.date + b.time)
    );

    $("scheduleCount").textContent = schedules.length;
    $("scheduleTotal").textContent = schedules.length + " kegiatan";

    if (!sorted.length) {
        list.innerHTML =
            '<div class="empty">✿ Belum ada jadwal. Tambahkan kegiatanmu!</div>';
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
                <button class="edit-btn"
                    onclick="editSchedule('${item.id}')">Edit</button>
                <button class="delete-btn"
                    onclick="deleteSchedule('${item.id}')">Hapus</button>
            </div>
        </div>
    `).join("");
}

async function editSchedule(id) {
    const item = schedules.find(s => s.id === id);
    if (!item) return;

    const title = prompt("Ubah nama kegiatan:", item.title);
    if (title === null) return;

    const date = prompt("Ubah tanggal (YYYY-MM-DD):", item.date);
    if (date === null) return;

    const time = prompt("Ubah jam (HH:MM):", item.time);
    if (time === null) return;

    if (!title.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^\d{2}:\d{2}$/.test(time)) {
        alert("Data tidak valid.");
        return;
    }

    try {
        await userCollection("schedules").doc(id).update({
            title: title.trim(),
            date,
            time
        });
    } catch (error) {
        alert("Gagal mengubah jadwal: " + error.message);
    }
}

async function deleteSchedule(id) {
    if (!confirm("Yakin ingin menghapus jadwal ini?")) return;

    try {
        await userCollection("schedules").doc(id).delete();
    } catch (error) {
        alert("Gagal menghapus jadwal: " + error.message);
    }
}

// =====================================
// TASK MANAGEMENT
// =====================================

$("taskForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = $("taskTitle").value.trim();
    const date = $("taskDate").value;
    const priority = $("taskPriority").value;

    if (!title) {
        alert("Masukkan nama tugas terlebih dahulu.");
        return;
    }

    try {
        await userCollection("tasks").add({
            title,
            date,
            priority,
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.reset();

        alert("Tugas berhasil ditambahkan! ♡");
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan tugas: " + error.message);
    }
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
        return (a.date || "").localeCompare(b.date || "");
    });

    if (!filtered.length) {
        list.innerHTML =
            '<div class="empty">♡ Tidak ada tugas di kategori ini.</div>';
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

async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
        await userCollection("tasks").doc(id).update({
            completed: !task.completed
        });
    } catch (error) {
        alert("Gagal memperbarui tugas: " + error.message);
    }
}

async function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const title = prompt("Ubah nama tugas:", task.title);
    if (title === null) return;

    const date = prompt(
        "Ubah deadline (YYYY-MM-DD), kosongkan jika tidak ada:",
        task.date || ""
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

    try {
        await userCollection("tasks").doc(id).update({
            title: title.trim(),
            date,
            priority
        });
    } catch (error) {
        alert("Gagal mengubah tugas: " + error.message);
    }
}

async function deleteTask(id) {
    if (!confirm("Yakin ingin menghapus tugas ini?")) return;

    try {
        await userCollection("tasks").doc(id).delete();
    } catch (error) {
        alert("Gagal menghapus tugas: " + error.message);
    }
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
// INITIAL DISPLAY
// =====================================

displayToday();
renderSchedules();
renderTasks();

console.log("Zafelle's Planner Firebase siap! ♡");
