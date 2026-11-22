// =========================================================
// RWA PAID TEST SERIES - PRO REVISION SUITE & 4-MONGODB SYNC
// Zero Backup/Restore • Zero PWA Install • Full Admin Sync
// =========================================================

window.NEW_PRO_API_BASE = "https://pdfsownlaoder.onrender.com";
const PRO_TS_STORE_KEY = "rwa_paid_ts_pro_suite_v1";

const TS_RAPID_QUIZ_POOL = [
    {
        q: "भारतीय संविधान का कौन-सा अनुच्छेद 'अस्पृश्यता के अंत' (Abolition of Untouchability) से संबंधित है?",
        opts: ["अनुच्छेद 15", "अनुच्छेद 16", "अनुच्छेद 17", "अनुच्छेद 18"],
        ans: 2,
        exp: "अनुच्छेद 17 अस्पृश्यता को समाप्त करता है और किसी भी रूप में इसके आचरण को निषिद्ध करता है।"
    },
    {
        q: "यदि किसी वस्तु को ₹720 में बेचने पर 20% का लाभ होता है, तो उसका क्रय मूल्य (Cost Price) क्या होगा?",
        opts: ["₹580", "₹600", "₹620", "₹640"],
        ans: 1,
        exp: "CP = (720 × 100) / 120 = ₹600."
    },
    {
        q: "Select the correctly spelt word:",
        opts: ["Accomodate", "Acommodate", "Accommodate", "Acomodate"],
        ans: 2,
        exp: "'Accommodate' has double 'c' and double 'm'."
    },
    {
        q: "भारत में 'श्वेत क्रांति' (White Revolution) के जनक किसे माना जाता है?",
        opts: ["एम.एस. स्वामीनाथन", "डॉ. वर्गीज कुरियन", "हीरालाल चौधरी", "दुर्गेश पटेल"],
        ans: 1,
        exp: "डॉ. वर्गीज कुरियन को ऑपरेशन फ्लड और श्वेत क्रांति का जनक माना जाता है।"
    },
    {
        q: "यदि A : B = 3 : 4 और B : C = 8 : 9 है, तो A : C का मान क्या होगा?",
        opts: ["2 : 3", "3 : 2", "1 : 3", "4 : 9"],
        ans: 0,
        exp: "A/C = (A/B) × (B/C) = (3/4) × (8/9) = 24/36 = 2 : 3."
    }
];

function createDefaultTsProStore() {
    return {
        mistake_bank: [],
        flashcards: [
            {
                id: "ts_fc_1",
                subject: "Maths Formula",
                front: "a और b का मध्यानुपाती (Mean Proportional) क्या होता है?",
                back: "Mean Proportional = √(a × b)",
                createdAt: new Date().toLocaleDateString()
            }
        ],
        planner_tasks: [],
        exam_countdown: { name: "SSC GD 2027", date: "" },
        study_stats: { dailyMinutes: {}, streak: 1, lastDate: "", totalMinutes: 0 },
        daily_quiz_history: {},
        preferences: { theme: "sky", fontSize: 16 },
        search_cache: { testSeries: [] }
    };
}

function loadTsProStore() {
    try {
        const raw = localStorage.getItem(PRO_TS_STORE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return {
                ...createDefaultTsProStore(),
                ...p,
                study_stats: { dailyMinutes: {}, streak: 1, lastDate: "", totalMinutes: 0, ...(p.study_stats || {}) },
                preferences: { theme: "sky", fontSize: 16, ...(p.preferences || {}) },
                search_cache: { testSeries: [], ...(p.search_cache || {}) }
            };
        }
    } catch {}
    return createDefaultTsProStore();
}

window.PRO_TS_STORE = loadTsProStore();
let _tsSyncTimer = null;
let _activeProToolsTab = "mistakes";
let _tsFlashIdx = 0;
let _tsRapidIdx = 0;
let _tsRapidScore = 0;
let _tsRapidAnswered = false;

let _tsPomo = {
    mode: "25",
    secondsLeft: 25 * 60,
    running: false,
    interval: null,
    audioCtx: null,
    noiseNode: null,
    soundOn: false
};

// =========================================================
// CORE HELPERS (TOAST, ESCAPE, USER INFO, STORE SAVE)
// =========================================================
window.escHtml = function(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
};

function tsTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

window.getTsActiveUserId = function() {
    try {
        if (Array.isArray(window.USER_TOKENS) && window.USER_TOKENS[0]) {
            return String(window.USER_TOKENS[0].userId || (typeof extractUidFromJwt === "function" ? extractUidFromJwt(window.USER_TOKENS[0].token) : "") || "");
        }
        const raw = localStorage.getItem("rwa_user_tokens_v2");
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr[0]) return String(arr[0].userId || "");
        }
    } catch {}
    return "";
};

window.getTsActiveUserName = function() {
    try {
        if (window.USER_PROFILE && window.USER_PROFILE.name) return window.USER_PROFILE.name;
        const raw = localStorage.getItem("rwa_user_profile_v2");
        if (raw) {
            const p = JSON.parse(raw);
            if (p && p.name) return p.name;
        }
    } catch {}
    return "RWA Student";
};

window.proToast = function(msg, type = "info") {
    const stack = document.getElementById("proToastStack");
    if (!stack) return;
    const bgMap = {
        success: "bg-emerald-600",
        error: "bg-rose-600",
        warning: "bg-amber-600",
        info: "bg-indigo-600"
    };
    const el = document.createElement("div");
    el.className = `pro-toast ${bgMap[type] || bgMap.info}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 0.25s";
        setTimeout(() => el.remove(), 260);
    }, 3000);
};

function saveTsProStore(syncCloud = true) {
    try {
        localStorage.setItem(PRO_TS_STORE_KEY, JSON.stringify(window.PRO_TS_STORE));
    } catch {}
    if (syncCloud) {
        if (_tsSyncTimer) clearTimeout(_tsSyncTimer);
        _tsSyncTimer = setTimeout(() => pushPaidTsCloudSync(), 3500);
    }
}

// =========================================================
// 4-MONGODB CLOUD SYNC, [PAID-TS] ACTIVITY & ERROR LOGGING
// =========================================================
window.logPaidTsActivity = function(action, detail = "", meta = {}) {
    const uid = getTsActiveUserId();
    if (!uid) return;
    fetch(`${window.NEW_PRO_API_BASE}/api/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: uid,
            action: String(action || "VIEW").toUpperCase(),
            detail: `[PAID-TS] ${detail}`.slice(0, 290),
            meta: { name: getTsActiveUserName(), site: "paid_ts", ...meta }
        }),
        keepalive: true
    }).catch(() => {});
};

window.logPaidTsError = function(source, message, stack = "") {
    fetch(`${window.NEW_PRO_API_BASE}/api/error_log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            source: `[PAID-TS] ${source}`,
            message: String(message || "").slice(0, 500),
            user_id: getTsActiveUserId() || "Guest",
            stack: String(stack || "").slice(0, 1000)
        }),
        keepalive: true
    }).catch(() => {});
};

window.addEventListener("error", (e) => {
    if (e && e.message) logPaidTsError("WindowError", e.message, e.filename || "");
});
window.addEventListener("unhandledrejection", (e) => {
    if (e && e.reason) logPaidTsError("PromiseRejection", String(e.reason));
});

window.pushPaidTsCloudSync = async function() {
    const uid = getTsActiveUserId();
    if (!uid) return;
    try {
        const pausedMap = JSON.parse(localStorage.getItem("rwa_paused_tests_v1") || "{}");
        const payload = {
            user_id: uid,
            bookmarks: Array.isArray(window.BOOKMARKED_QUESTIONS) ? window.BOOKMARKED_QUESTIONS : [],
            mistake_bank: PRO_TS_STORE.mistake_bank || [],
            flashcards: PRO_TS_STORE.flashcards || [],
            planner_tasks: PRO_TS_STORE.planner_tasks || [],
            exam_countdown: PRO_TS_STORE.exam_countdown || {},
            study_stats: PRO_TS_STORE.study_stats || {},
            daily_quiz_history: PRO_TS_STORE.daily_quiz_history || {},
            paused_tests: pausedMap
        };
        await fetch(`${window.NEW_PRO_API_BASE}/api/sync/push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
        });
    } catch {}
};

function mergeByProp(localArr, remoteArr, prop) {
    const m = new Map();
    [...(remoteArr || []), ...(localArr || [])].forEach(it => {
        if (it && it[prop] !== undefined) m.set(String(it[prop]), it);
    });
    return Array.from(m.values());
}

window.pullPaidTsCloudSync = async function() {
    const uid = getTsActiveUserId();
    if (!uid) return;
    try {
        const res = await fetch(`${window.NEW_PRO_API_BASE}/api/sync/pull?user_id=${encodeURIComponent(uid)}`);
        const json = await res.json();
        if (!json || json.status !== "success") return;

        if (json.blocked) {
            showTsLockOverlay("blocked", json.block_reason || "Admin ne aapka account temporarily restrict kar diya hai.");
            return;
        }

        const remote = json.sync || {};
        if (Array.isArray(remote.mistake_bank) && remote.mistake_bank.length) {
            PRO_TS_STORE.mistake_bank = mergeByProp(PRO_TS_STORE.mistake_bank, remote.mistake_bank, "qId");
        }
        if (Array.isArray(remote.flashcards) && remote.flashcards.length) {
            PRO_TS_STORE.flashcards = mergeByProp(PRO_TS_STORE.flashcards, remote.flashcards, "id");
        }
        if (Array.isArray(remote.planner_tasks) && remote.planner_tasks.length) {
            PRO_TS_STORE.planner_tasks = mergeByProp(PRO_TS_STORE.planner_tasks, remote.planner_tasks, "id");
        }
        if (remote.exam_countdown && remote.exam_countdown.date && !PRO_TS_STORE.exam_countdown.date) {
            PRO_TS_STORE.exam_countdown = remote.exam_countdown;
        }
        if (remote.study_stats && remote.study_stats.streak) {
            PRO_TS_STORE.study_stats.streak = Math.max(PRO_TS_STORE.study_stats.streak || 1, remote.study_stats.streak);
        }

        // Sync remote bookmarks if formatted for this app
        if (Array.isArray(remote.bookmarks) && remote.bookmarks.length && Array.isArray(window.BOOKMARKED_QUESTIONS)) {
            const compatRemote = remote.bookmarks.filter(b => b && b.qKey);
            if (compatRemote.length) {
                window.BOOKMARKED_QUESTIONS = mergeByProp(window.BOOKMARKED_QUESTIONS, compatRemote, "qKey");
                localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(window.BOOKMARKED_QUESTIONS));
            }
        }

        saveTsProStore(false);
        updateProStreakAndCountdownUI();
        if (typeof window.updateDashboardUI === "function") window.updateDashboardUI();
    } catch {}
};

// =========================================================
// MAINTENANCE MODE, BLOCK GUARD & LIVE NOTICE BANNER
// =========================================================
function showTsLockOverlay(type, message) {
    const ov = document.getElementById("portalLockOverlay");
    if (!ov) return;
    document.getElementById("portalLockIcon").textContent = type === "blocked" ? "🚫" : "🚧";
    document.getElementById("portalLockTitle").textContent = type === "blocked" ? "Account Restricted" : "Portal Under Maintenance";
    document.getElementById("portalLockMsg").textContent = message || "Portal abhi update par hai.";
    const lBtn = document.getElementById("portalLockLogoutBtn");
    if (lBtn) lBtn.classList.toggle("hidden", type !== "blocked");
    ov.classList.remove("hidden");
}

window.forceSwitchBlockedAccount = function() {
    localStorage.removeItem("rwa_user_tokens_v2");
    localStorage.removeItem("rwa_user_profile_v2");
    window.USER_TOKENS = [];
    window.USER_PROFILE = null;
    document.getElementById("portalLockOverlay")?.classList.add("hidden");
    if (typeof window.openLoginModal === "function") window.openLoginModal();
};

window.checkPortalStatusAndNotices = async function() {
    const uid = getTsActiveUserId();
    try {
        const res = await fetch(`${window.NEW_PRO_API_BASE}/api/portal/status?user_id=${encodeURIComponent(uid)}`);
        const json = await res.json();
        if (!json || json.status !== "success") return;

        if (json.maintenance_mode) {
            showTsLockOverlay("maintenance", json.maintenance_message);
            return;
        }
        if (json.user_blocked) {
            showTsLockOverlay("blocked", json.block_reason);
            return;
        }
        renderLiveNoticeBanner(json.notices || []);
    } catch {}
};

function renderLiveNoticeBanner(notices) {
    const box = document.getElementById("liveNoticeBanner");
    if (!box) return;
    if (!notices.length) {
        box.classList.add("hidden");
        return;
    }
    const latest = notices[0];
    const grads = {
        urgent: "from-rose-600 to-red-700 border-rose-300",
        warning: "from-amber-500 to-orange-600 border-amber-300",
        success: "from-emerald-500 to-teal-600 border-emerald-300",
        info: "from-indigo-600 to-blue-700 border-sky-300"
    };
    box.className = `rounded-2xl p-3.5 text-white bg-gradient-to-r ${grads[latest.level] || grads.info} border-2 shadow-md flex items-center justify-between gap-3`;
    box.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-xl shrink-0">📢</span>
            <div class="min-w-0">
                <div class="font-black text-xs uppercase tracking-wide">${escHtml(latest.title)}</div>
                <div class="text-xs opacity-95 truncate sm:whitespace-normal">${escHtml(latest.message)}</div>
            </div>
        </div>
        <button onclick="document.getElementById('liveNoticeBanner').classList.add('hidden')" class="text-white/80 hover:text-white font-black text-sm bg-transparent border-0 cursor-pointer shrink-0">✕</button>`;
    box.classList.remove("hidden");
}

// =========================================================
// THEME, STREAK, COUNTDOWN, TREND GRAPH & DATA HELPERS
// =========================================================
window.toggleTsPortalTheme = function() {
    const isDark = document.body.classList.toggle("dark-mode");
    PRO_TS_STORE.preferences.theme = isDark ? "dark" : "sky";
    saveTsProStore(false);
    const btn = document.getElementById("themeSwitchBtn");
    if (btn) btn.textContent = isDark ? "☀️" : "🌙";
    proToast(isDark ? "🌙 Dark Mode ON" : "☀️ Asmani Sky Theme ON", "info");
};

(function applySavedTsTheme() {
    if (PRO_TS_STORE.preferences.theme === "dark") {
        document.body.classList.add("dark-mode");
        const btn = document.getElementById("themeSwitchBtn");
        if (btn) btn.textContent = "☀️";
    }
})();

window.addTsStudyMinutes = function(mins) {
    const m = Math.max(0, Number(mins) || 0);
    if (!m) return;
    const today = tsTodayKey();
    const st = PRO_TS_STORE.study_stats;
    if (st.lastDate && st.lastDate !== today) {
        const diff = Math.round((new Date(today) - new Date(st.lastDate)) / 86400000);
        if (diff === 1) st.streak = (st.streak || 1) + 1;
        else if (diff > 1) st.streak = 1;
    }
    st.lastDate = today;
    st.dailyMinutes[today] = Number(((st.dailyMinutes[today] || 0) + m).toFixed(1));
    st.totalMinutes = Number(((st.totalMinutes || 0) + m).toFixed(1));
    saveTsProStore(true);
    updateProStreakAndCountdownUI();
};

window.addTsMistakes = function(wrongList, testMeta = {}) {
    if (!Array.isArray(wrongList) || !wrongList.length) return;
    wrongList.forEach(({ qObj, chosenOption }) => {
        const qId = String(qObj.id || qObj.question_id || ("m_" + (qObj.question || "").slice(0, 26)));
        const idx = PRO_TS_STORE.mistake_bank.findIndex(x => String(x.qId) === qId);
        const entry = {
            qId,
            testId: String(testMeta.id || ""),
            testTitle: testMeta.title || "Mock Test",
            subject: qObj._sectionName || qObj.subject || "General",
            wrongAns: chosenOption,
            questionObj: qObj,
            savedAt: new Date().toLocaleDateString()
        };
        if (idx >= 0) PRO_TS_STORE.mistake_bank[idx] = entry;
        else PRO_TS_STORE.mistake_bank.unshift(entry);
    });
    if (PRO_TS_STORE.mistake_bank.length > 300) PRO_TS_STORE.mistake_bank = PRO_TS_STORE.mistake_bank.slice(0, 300);
    saveTsProStore(true);
    updateProStreakAndCountdownUI();
};

window.addTsFlashcard = function(front, back, subject = "General") {
    if (!front || !back) return;
    PRO_TS_STORE.flashcards.unshift({
        id: "ts_fc_" + Date.now(),
        subject: subject || "General",
        front: front.trim(),
        back: back.trim(),
        createdAt: new Date().toLocaleDateString()
    });
    saveTsProStore(true);
    proToast("🃏 Flashcard Saved to Pro Vault!", "success");
};

window.updateProStreakAndCountdownUI = function() {
    const streakEl = document.getElementById("dashStreakPill");
    const st = PRO_TS_STORE.study_stats || { streak: 1 };
    if (streakEl) streakEl.textContent = `🔥 ${st.streak || 1} Day${(st.streak || 1) > 1 ? "s" : ""} Streak`;

    const cdEl = document.getElementById("dashCountdownLabel");
    const cd = PRO_TS_STORE.exam_countdown || { name: "SSC GD 2027", date: "" };
    if (cdEl) {
        if (cd.date) {
            const diff = Math.ceil((new Date(cd.date) - new Date(tsTodayKey())) / 86400000);
            cdEl.textContent = diff > 0 ? `${cd.name}: ${diff}d Left` : (diff === 0 ? `${cd.name}: Today!` : `${cd.name} ✓`);
        } else {
            cdEl.textContent = `${cd.name} (Set Date)`;
        }
    }

    const mEl = document.getElementById("dashMistakePillCount");
    if (mEl) mEl.textContent = (PRO_TS_STORE.mistake_bank || []).length;
};

window.renderProgressTrendGraph = function() {
    const card = document.getElementById("progressTrendCard");
    const barsEl = document.getElementById("progressTrendBars");
    if (!card || !barsEl) return;

    const entries = Object.values(window.ATTEMPTED_TESTS || {}).slice(-10);
    if (!entries.length) {
        card.classList.add("hidden");
        return;
    }
    card.classList.remove("hidden");
    barsEl.innerHTML = entries.map((t, i) => {
        const scPct = Math.max(5, Math.min(100, Math.round((Number(t.score || 0) / (Number(t.maxMarks || 100) || 100)) * 100)));
        const acPct = Math.max(5, Math.min(100, Math.round(Number(t.accuracy || 0))));
        return `
            <div class="flex-1 min-w-[44px] flex flex-col items-center gap-1 h-full justify-end" title="${escHtml(t.title)} — Score: ${t.score}/${t.maxMarks}, Acc: ${acPct}%">
                <div class="flex items-end gap-1 h-24 w-full justify-center">
                    <div class="w-3 bg-indigo-600 rounded-t-md" style="height:${scPct}%"></div>
                    <div class="w-3 bg-emerald-500 rounded-t-md" style="height:${acPct}%"></div>
                </div>
                <span class="text-[10px] font-black opacity-75">T${i + 1}</span>
            </div>`;
    }).join("");
};

// =========================================================
// MODALS: COUNTDOWN, REPORT ISSUE & GLOBAL SEARCH
// =========================================================
window.openCountdownModal = function() {
    document.getElementById("cdExamName").value = PRO_TS_STORE.exam_countdown.name || "";
    document.getElementById("cdExamDate").value = PRO_TS_STORE.exam_countdown.date || "";
    document.getElementById("countdownModal").classList.remove("hidden");
};
window.closeCountdownModal = function() {
    document.getElementById("countdownModal").classList.add("hidden");
};
window.saveExamCountdown = function() {
    PRO_TS_STORE.exam_countdown = {
        name: document.getElementById("cdExamName").value.trim() || "Target Exam",
        date: document.getElementById("cdExamDate").value
    };
    saveTsProStore(true);
    closeCountdownModal();
    updateProStreakAndCountdownUI();
    proToast("🎯 Exam Target Updated!", "success");
};

window.openReportIssueModal = function() {
    document.getElementById("reportIssueModal").classList.remove("hidden");
};
window.closeReportIssueModal = function() {
    document.getElementById("reportIssueModal").classList.add("hidden");
};
window.submitUserReport = async function() {
    const type = document.getElementById("repType").value;
    const subject = document.getElementById("repSubject").value.trim();
    const message = document.getElementById("repMessage").value.trim();
    if (!subject || !message) return proToast("Subject aur Details dono likhein.", "warning");

    const phone = (window.USER_PROFILE && window.USER_PROFILE.phone) ? window.USER_PROFILE.phone : "N/A";
    try {
        const res = await fetch(`${window.NEW_PRO_API_BASE}/api/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: getTsActiveUserId() || "Guest",
                user_name: getTsActiveUserName(),
                phone,
                type: `[PAID-TS] ${type}`,
                subject,
                message
            })
        });
        if (res.ok) {
            document.getElementById("repSubject").value = "";
            document.getElementById("repMessage").value = "";
            closeReportIssueModal();
            window.showRwaPopup({
                title: "Request Sent",
                message: "Aapki request/report directly Admin ko bhej di gayi hai!",
                type: "success"
            });
        } else {
            proToast("Server busy hai, thodi der baad retry karein.", "error");
        }
    } catch {
        proToast("Network error! Dobara try karein.", "error");
    }
};

window.openGlobalSearchModal = function() {
    document.getElementById("globalSearchModal").classList.remove("hidden");
    const inp = document.getElementById("globalSearchInput");
    inp.value = "";
    inp.focus();
    runGlobalSearch("");
};
window.closeGlobalSearchModal = function() {
    document.getElementById("globalSearchModal").classList.add("hidden");
};
window.runGlobalSearch = function(query) {
    const q = String(query || "").trim().toLowerCase();
    const resBox = document.getElementById("globalSearchResults");
    if (!resBox) return;

    const hits = [];
    (PRO_TS_STORE.search_cache.testSeries || []).forEach(ts => {
        if (!q || (ts.title || "").toLowerCase().includes(q)) {
            hits.push({
                tag: "🏆 Series",
                title: ts.title,
                fn: `closeGlobalSearchModal(); openTestSeriesSubjects('${ts.id}', '${(ts.title || "").replace(/'/g, "")}');`
            });
        }
    });
    Object.values(window.ATTEMPTED_TESTS || {}).forEach(att => {
        if (!q || (att.title || "").toLowerCase().includes(q)) {
            hits.push({
                tag: `📊 ${att.score}/${att.maxMarks}`,
                title: att.title,
                fn: `closeGlobalSearchModal(); switchAppTab('dashboard');`
            });
        }
    });
    (window.BOOKMARKED_QUESTIONS || []).forEach((b, idx) => {
        const hay = `${b.subject || ""} ${b.testTitle || ""} ${b.question || ""}`.toLowerCase();
        if (!q || hay.includes(q)) {
            hits.push({
                tag: "🔖 Bookmark",
                title: `${b.subject || "Saved"} — ${b.testTitle || "Mock"}`,
                fn: `closeGlobalSearchModal(); switchAppTab('bookmarks'); openBookmarkDetailView(${idx});`
            });
        }
    });
    (PRO_TS_STORE.mistake_bank || []).forEach(m => {
        const hay = `${m.subject || ""} ${m.testTitle || ""} ${(m.questionObj && m.questionObj.question) || ""}`.toLowerCase();
        if (!q || hay.includes(q)) {
            hits.push({
                tag: "❌ Mistake",
                title: `${m.subject || "Mistake"} — ${m.testTitle || "Mock"}`,
                fn: `closeGlobalSearchModal(); switchAppTab('protools'); renderProToolsTab('mistakes');`
            });
        }
    });

    const sliced = hits.slice(0, 20);
    resBox.innerHTML = sliced.length ? sliced.map(h => `
        <div onclick="${h.fn}" class="p-3 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 cursor-pointer hover:border-indigo-500 flex justify-between items-center gap-2">
            <span class="font-extrabold truncate">${escHtml(h.title)}</span>
            <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black shrink-0">${escHtml(h.tag)}</span>
        </div>`).join("") : `<div class="text-center py-6 opacity-70 font-bold">Koi result nahi mila.</div>`;
};

// =========================================================
// PRO REVISION VAULT TABS (NO BACKUP/RESTORE)
// =========================================================
window.renderProToolsTab = function(tab = "mistakes") {
    _activeProToolsTab = tab;
    document.querySelectorAll("#proToolsSubTabs [data-ptab]").forEach(btn => {
        btn.className = btn.dataset.ptab === tab ? "tab-pill active-pill" : "tab-pill";
    });
    const box = document.getElementById("proToolsBody");
    if (!box) return;

    if (tab === "mistakes") renderProMistakesTab(box);
    else if (tab === "custom_mock") renderProCustomMockTab(box);
    else if (tab === "flashcards") renderProFlashcardsTab(box);
    else if (tab === "pomodoro") renderProPomodoroTab(box);
    else if (tab === "planner") renderProPlannerTab(box);
    else if (tab === "rapid_quiz") renderProRapidQuizTab(box);
};

// 1. Mistake Bank
function renderProMistakesTab(box) {
    const list = PRO_TS_STORE.mistake_bank || [];
    box.innerHTML = `
        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div>
                <h3 class="font-black text-lg">❌ Smart Mistake Notebook (${list.length})</h3>
                <p class="text-xs opacity-70 font-semibold">Sabhi tests ke galat questions yahan auto-save hote hain</p>
            </div>
            ${list.length ? `<button onclick="launchMistakesReTest()" class="btn-watch text-xs">🔥 Re-Test All Mistakes</button>` : ""}
        </div>
        <div class="space-y-3">
            ${list.length ? list.map(m => `
                <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-slate-700 space-y-2">
                    <div class="flex justify-between items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">${escHtml(m.subject)} • ${escHtml(m.testTitle)}</span>
                        <button onclick="markTsMistakeMastered('${escHtml(m.qId)}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black border-0 cursor-pointer">✅ Mastered</button>
                    </div>
                    <div class="text-sm font-semibold">${(m.questionObj && m.questionObj.question) || ""}</div>
                    <details class="text-xs bg-sky-50 dark:bg-slate-900 p-3 rounded-xl">
                        <summary class="cursor-pointer font-black text-indigo-700 dark:text-sky-400">💡 View Correct Solution</summary>
                        <div class="mt-2 font-bold text-emerald-600">Correct Option: #${escHtml((m.questionObj && m.questionObj.answer) || "1")}</div>
                        <div class="mt-1">${(m.questionObj && (m.questionObj.solution_text || m.questionObj.explanation)) || ""}</div>
                    </details>
                </div>`).join("") : `<div class="py-10 text-center text-xs font-bold opacity-70">Koi pending mistake nahi hai! Jaise hi aap mock test denge, galat questions yahan aa jayenge.</div>`}
        </div>`;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([box]).catch(() => {});
}

window.markTsMistakeMastered = function(qId) {
    PRO_TS_STORE.mistake_bank = PRO_TS_STORE.mistake_bank.filter(m => String(m.qId) !== String(qId));
    saveTsProStore(true);
    updateProStreakAndCountdownUI();
    renderProToolsTab("mistakes");
    proToast("✅ Mistake Mastered!", "success");
};

function convertBookmarksToQuestionObjects() {
    return (window.BOOKMARKED_QUESTIONS || []).map((b, i) => ({
        id: b.qKey || `bm_${i}`,
        question: b.question || "",
        option_1: (b.options && b.options[0]) || "",
        option_2: (b.options && b.options[1]) || "",
        option_3: (b.options && b.options[2]) || "",
        option_4: (b.options && b.options[3]) || "",
        option_5: (b.options && b.options[4]) || "",
        answer: String(b.answer || "1"),
        solution_text: b.solution || "",
        positive_marks: "2",
        negative_marks: "0.5",
        section_id: "1",
        section_name: b.subject || "Bookmarked"
    }));
}

window.launchBookmarksPracticeTest = function() {
    const qs = convertBookmarksToQuestionObjects();
    if (!qs.length) return proToast("Pehle kuch questions bookmark karein!", "warning");
    if (typeof window.launchCustomQuestionsTcs === "function") {
        window.launchCustomQuestionsTcs(`🔖 Bookmarks Practice (${qs.length} Qs)`, qs, Math.max(5, Math.ceil(qs.length * 0.8)));
    }
};

window.launchMistakesReTest = function() {
    const qs = (PRO_TS_STORE.mistake_bank || []).map(x => x.questionObj).filter(Boolean);
    if (!qs.length) return proToast("Mistake Bank abhi khaali hai.", "warning");
    if (typeof window.launchCustomQuestionsTcs === "function") {
        window.launchCustomQuestionsTcs(`❌ Mistake Notebook Re-Test (${qs.length} Qs)`, qs, Math.max(5, Math.ceil(qs.length * 0.8)));
    }
};

// 2. Custom Mock Test Builder
function renderProCustomMockTab(box) {
    const mCnt = (PRO_TS_STORE.mistake_bank || []).length;
    const bCnt = (window.BOOKMARKED_QUESTIONS || []).length;
    box.innerHTML = `
        <div class="max-w-lg mx-auto space-y-4">
            <h3 class="font-black text-lg">🛠️ Custom Timed Mock Builder</h3>
            <p class="text-xs opacity-75 font-semibold">Apne Bookmarks aur Mistake Bank se custom TCS exam generate karein!</p>
            <div>
                <label class="text-xs font-extrabold">Question Source</label>
                <select id="tsCmSource" class="search-input-field w-full border-2 border-sky-200 rounded-xl p-3 text-xs font-bold mt-1">
                    <option value="mix">🔥 Mix (Mistakes + Bookmarks: ${mCnt + bCnt} Qs)</option>
                    <option value="mistakes">❌ Only Mistake Bank (${mCnt} Qs)</option>
                    <option value="bookmarks">🔖 Only Bookmarks (${bCnt} Qs)</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-xs font-extrabold">Questions Count</label>
                    <input id="tsCmCount" type="number" value="20" min="2" max="100" class="search-input-field w-full border-2 border-sky-200 rounded-xl p-3 text-xs font-bold mt-1">
                </div>
                <div>
                    <label class="text-xs font-extrabold">Time (Minutes)</label>
                    <input id="tsCmTime" type="number" value="15" min="2" max="120" class="search-input-field w-full border-2 border-sky-200 rounded-xl p-3 text-xs font-bold mt-1">
                </div>
            </div>
            <button onclick="buildTsCustomMock()" class="btn-watch w-full py-3 text-sm">🚀 Start Custom Mock Test</button>
        </div>`;
}

window.buildTsCustomMock = function() {
    const src = document.getElementById("tsCmSource").value;
    const count = Math.max(1, parseInt(document.getElementById("tsCmCount").value || "20", 10));
    const mins = Math.max(2, parseInt(document.getElementById("tsCmTime").value || "15", 10));
    let pool = [];
    if (src === "mistakes") pool = (PRO_TS_STORE.mistake_bank || []).map(x => x.questionObj);
    else if (src === "bookmarks") pool = convertBookmarksToQuestionObjects();
    else pool = [...(PRO_TS_STORE.mistake_bank || []).map(x => x.questionObj), ...convertBookmarksToQuestionObjects()];

    pool = pool.filter(Boolean).sort(() => Math.random() - 0.5).slice(0, count);
    if (!pool.length) return proToast("Pehle kuch questions bookmark karein ya ek test attempt karein!", "warning");
    if (typeof window.launchCustomQuestionsTcs === "function") {
        window.launchCustomQuestionsTcs(`🛠️ Custom Mock (${pool.length} Qs)`, pool, mins);
    }
};

// 3. 3D Formula & Vocab Flashcards
function renderProFlashcardsTab(box) {
    const cards = PRO_TS_STORE.flashcards || [];
    if (_tsFlashIdx >= cards.length) _tsFlashIdx = 0;
    const cur = cards[_tsFlashIdx];
    box.innerHTML = `
        <div class="max-w-xl mx-auto space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="font-black text-lg">🃏 Formula & Vocab Flashcards (${cards.length})</h3>
                <span class="text-xs font-extrabold opacity-70">${cards.length ? `${_tsFlashIdx + 1}/${cards.length}` : "0"}</span>
            </div>
            ${cur ? `
                <div class="flashcard-stage" onclick="this.classList.toggle('flipped')">
                    <div class="flashcard-inner">
                        <div class="flashcard-face flashcard-front">
                            <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black mb-2">${escHtml(cur.subject)} • TAP TO FLIP</span>
                            <div class="font-black text-base">${escHtml(cur.front)}</div>
                        </div>
                        <div class="flashcard-face flashcard-back">
                            <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black mb-2">ANSWER / TRICK</span>
                            <div class="font-black text-base">${escHtml(cur.back)}</div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-between items-center gap-2">
                    <button onclick="stepTsFlashcard(-1)" class="btn-nav bg-slate-800 text-white border-0">⬅ Prev</button>
                    <button onclick="deleteTsFlashcard()" class="btn-nav bg-rose-600 text-white border-0 text-xs">🗑 Delete</button>
                    <button onclick="stepTsFlashcard(1)" class="btn-nav bg-slate-800 text-white border-0">Next ➡</button>
                </div>` : `<div class="text-center py-6 text-xs font-bold opacity-70">Niche form se apna flashcard banayein!</div>`}

            <div class="p-4 rounded-2xl bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 space-y-2.5">
                <div class="font-black text-xs">➕ Add New Flashcard</div>
                <input id="tsFcSub" type="text" placeholder="Subject (Maths / GK / Vocab)" class="search-input-field w-full border border-sky-300 rounded-xl p-2.5 text-xs outline-none">
                <input id="tsFcFront" type="text" placeholder="Front: Question / Word / Formula" class="search-input-field w-full border border-sky-300 rounded-xl p-2.5 text-xs outline-none">
                <textarea id="tsFcBack" rows="2" placeholder="Back: Answer / Short Trick" class="search-input-field w-full border border-sky-300 rounded-xl p-2.5 text-xs outline-none"></textarea>
                <button onclick="submitTsFlashcard()" class="btn-watch w-full text-xs">💾 Save Flashcard</button>
            </div>
        </div>`;
}

window.stepTsFlashcard = function(d) {
    const len = PRO_TS_STORE.flashcards.length;
    if (!len) return;
    _tsFlashIdx = (_tsFlashIdx + d + len) % len;
    renderProToolsTab("flashcards");
};
window.deleteTsFlashcard = function() {
    if (!PRO_TS_STORE.flashcards.length) return;
    PRO_TS_STORE.flashcards.splice(_tsFlashIdx, 1);
    saveTsProStore(true);
    renderProToolsTab("flashcards");
};
window.submitTsFlashcard = function() {
    const sub = document.getElementById("tsFcSub").value.trim() || "General";
    const front = document.getElementById("tsFcFront").value.trim();
    const back = document.getElementById("tsFcBack").value.trim();
    if (!front || !back) return proToast("Front aur Back dono likhein.", "warning");
    addTsFlashcard(front, back, sub);
    _tsFlashIdx = 0;
    renderProToolsTab("flashcards");
};

// 4. Pomodoro Focus Timer + Rain Sound
function renderProPomodoroTab(box) {
    const m = String(Math.floor(_tsPomo.secondsLeft / 60)).padStart(2, "0");
    const s = String(_tsPomo.secondsLeft % 60).padStart(2, "0");
    box.innerHTML = `
        <div class="max-w-md mx-auto text-center space-y-4 py-3">
            <h3 class="font-black text-xl">⏱️ Pomodoro Exam Focus Timer</h3>
            <div class="flex justify-center gap-2">
                <button onclick="setTsPomo(25)" class="tab-pill ${_tsPomo.mode === "25" ? "active-pill" : ""}">25m Focus</button>
                <button onclick="setTsPomo(50)" class="tab-pill ${_tsPomo.mode === "50" ? "active-pill" : ""}">50m Deep</button>
                <button onclick="setTsPomo(5)" class="tab-pill ${_tsPomo.mode === "5" ? "active-pill" : ""}">5m Break</button>
            </div>
            <div id="tsPomoClock" class="text-6xl font-black font-mono text-indigo-600 dark:text-sky-400 py-3">${m}:${s}</div>
            <div class="flex justify-center gap-3">
                <button onclick="toggleTsPomo()" class="btn-watch px-8 py-3 text-sm">${_tsPomo.running ? "⏸ Pause" : "▶ Start Focus"}</button>
                <button onclick="setTsPomo(parseInt(_tsPomo.mode,10)||25)" class="btn-nav bg-slate-200 text-slate-900 border-0 px-5">🔄 Reset</button>
            </div>
            <div class="p-4 rounded-2xl bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 flex justify-between items-center">
                <div class="text-left">
                    <div class="font-black text-xs">🌧️ Soft Rain Study Sound</div>
                    <div class="text-[11px] opacity-70">Exam preparation focus audio</div>
                </div>
                <button onclick="toggleTsRainSound()" class="btn-nav ${_tsPomo.soundOn ? "bg-emerald-600" : "bg-slate-700"} text-white border-0 text-xs">${_tsPomo.soundOn ? "🔊 ON" : "🔇 OFF"}</button>
            </div>
        </div>`;
}

window.setTsPomo = function(mins) {
    if (_tsPomo.interval) clearInterval(_tsPomo.interval);
    _tsPomo.running = false;
    _tsPomo.mode = String(mins);
    _tsPomo.secondsLeft = mins * 60;
    renderProToolsTab("pomodoro");
};
window.toggleTsPomo = function() {
    if (_tsPomo.running) {
        clearInterval(_tsPomo.interval);
        _tsPomo.running = false;
        renderProToolsTab("pomodoro");
        return;
    }
    _tsPomo.running = true;
    _tsPomo.interval = setInterval(() => {
        if (_tsPomo.secondsLeft <= 0) {
            clearInterval(_tsPomo.interval);
            _tsPomo.running = false;
            const minsDone = parseInt(_tsPomo.mode, 10) || 25;
            if (minsDone >= 15) {
                addTsStudyMinutes(minsDone);
                logPaidTsActivity("POMODORO", `Completed ${minsDone}m Focus Session`);
            }
            proToast("🎉 Focus Session Complete!", "success");
            if (_activeProToolsTab === "pomodoro") renderProToolsTab("pomodoro");
            return;
        }
        _tsPomo.secondsLeft--;
        const clk = document.getElementById("tsPomoClock");
        if (clk) clk.textContent = `${String(Math.floor(_tsPomo.secondsLeft / 60)).padStart(2, "0")}:${String(_tsPomo.secondsLeft % 60).padStart(2, "0")}`;
    }, 1000);
    renderProToolsTab("pomodoro");
};
window.toggleTsRainSound = function() {
    if (_tsPomo.soundOn) {
        try { _tsPomo.noiseNode.stop(); _tsPomo.audioCtx.close(); } catch {}
        _tsPomo.soundOn = false;
        renderProToolsTab("pomodoro");
        return;
    }
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        const buf = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
        const out = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < out.length; i++) {
            const w = Math.random() * 2 - 1;
            out[i] = ((last + 0.02 * w) / 1.02) * 0.25;
            last = out[i];
        }
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const gain = ctx.createGain(); gain.gain.value = 0.18;
        src.connect(gain); gain.connect(ctx.destination); src.start(0);
        _tsPomo.audioCtx = ctx; _tsPomo.noiseNode = src; _tsPomo.soundOn = true;
        renderProToolsTab("pomodoro");
    } catch { proToast("Audio browser ne block kiya.", "warning"); }
};

// 5. Daily Study Planner
function renderProPlannerTab(box) {
    const tasks = PRO_TS_STORE.planner_tasks || [];
    const done = tasks.filter(t => t.done).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    box.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="font-black text-lg">📅 Daily Mock & Study Planner</h3>
                <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">${done}/${tasks.length} (${pct}%)</span>
            </div>
            <div class="w-full h-2.5 bg-sky-100 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 transition-all" style="width:${pct}%"></div>
            </div>
            <div class="flex gap-2">
                <input id="tsPlanInp" type="text" placeholder="e.g. SSC GD Mock 04 + Mistake Revision" onkeydown="if(event.key==='Enter') addTsPlanTask()"
                       class="search-input-field flex-1 border-2 border-sky-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none">
                <button onclick="addTsPlanTask()" class="btn-watch text-xs">➕ Add</button>
            </div>
            <div class="space-y-2">
                ${tasks.length ? tasks.map(t => `
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 flex items-center justify-between gap-2">
                        <label class="flex items-center gap-2.5 cursor-pointer flex-1 text-xs font-bold ${t.done ? "line-through opacity-55" : ""}">
                            <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTsPlanTask('${escHtml(t.id)}')" class="w-4 h-4 accent-emerald-600">
                            <span>${escHtml(t.text)}</span>
                        </label>
                        <button onclick="deleteTsPlanTask('${escHtml(t.id)}')" class="text-rose-600 font-black bg-transparent border-0 cursor-pointer">✕</button>
                    </div>`).join("") : `<div class="text-center py-8 text-xs font-bold opacity-65">Aaj ka koi study target add nahi hai.</div>`}
            </div>
        </div>`;
}
window.addTsPlanTask = function() {
    const txt = (document.getElementById("tsPlanInp")?.value || "").trim();
    if (!txt) return;
    PRO_TS_STORE.planner_tasks.unshift({ id: "tp_" + Date.now(), text: txt, done: false, date: tsTodayKey() });
    saveTsProStore(true);
    renderProToolsTab("planner");
};
window.toggleTsPlanTask = function(id) {
    const t = PRO_TS_STORE.planner_tasks.find(x => x.id === id);
    if (t) t.done = !t.done;
    saveTsProStore(true);
    renderProToolsTab("planner");
};
window.deleteTsPlanTask = function(id) {
    PRO_TS_STORE.planner_tasks = PRO_TS_STORE.planner_tasks.filter(x => x.id !== id);
    saveTsProStore(true);
    renderProToolsTab("planner");
};

// 6. Daily 5-Minute Rapid Quiz
function renderProRapidQuizTab(box) {
    const today = tsTodayKey();
    const done = PRO_TS_STORE.daily_quiz_history[today];
    if (done && _tsRapidIdx === 0 && !_tsRapidAnswered) {
        box.innerHTML = `
            <div class="max-w-md mx-auto text-center py-8 space-y-3">
                <div class="text-5xl">🏆</div>
                <h3 class="font-black text-xl">Today's Rapid Quiz Completed!</h3>
                <div class="text-2xl font-black text-emerald-600">${done.score} / ${done.total}</div>
                <button onclick="restartTsRapidQuiz()" class="btn-watch text-xs px-6">🔄 Play Again</button>
            </div>`;
        return;
    }
    const q = TS_RAPID_QUIZ_POOL[_tsRapidIdx];
    box.innerHTML = `
        <div class="max-w-xl mx-auto space-y-4">
            <div class="flex justify-between items-center">
                <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">⚡ Daily Quiz • Q${_tsRapidIdx + 1}/${TS_RAPID_QUIZ_POOL.length}</span>
                <span class="font-black text-xs text-emerald-600">Score: ${_tsRapidScore}</span>
            </div>
            <div class="p-4 rounded-2xl bg-sky-50 dark:bg-slate-800 font-extrabold text-sm">${escHtml(q.q)}</div>
            <div id="tsRapidOpts" class="space-y-2">
                ${q.opts.map((o, idx) => `<button onclick="answerTsRapidQ(${idx})" class="w-full text-left p-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-sky-200 dark:border-slate-700 font-bold text-xs cursor-pointer hover:border-indigo-500">${["A", "B", "C", "D"][idx]}. ${escHtml(o)}</button>`).join("")}
            </div>
            <div id="tsRapidExp" class="hidden p-3 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800"></div>
            <button id="tsRapidNextBtn" onclick="nextTsRapidQ()" class="hidden btn-watch w-full text-xs">Next Question ➔</button>
        </div>`;
}
window.restartTsRapidQuiz = function() {
    _tsRapidIdx = 0; _tsRapidScore = 0; _tsRapidAnswered = false;
    delete PRO_TS_STORE.daily_quiz_history[tsTodayKey()];
    renderProToolsTab("rapid_quiz");
};
window.answerTsRapidQ = function(chosen) {
    if (_tsRapidAnswered) return;
    _tsRapidAnswered = true;
    const q = TS_RAPID_QUIZ_POOL[_tsRapidIdx];
    document.querySelectorAll("#tsRapidOpts button").forEach((b, i) => {
        if (i === q.ans) b.className = "w-full text-left p-3.5 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-black text-xs";
        else if (i === chosen) b.className = "w-full text-left p-3.5 rounded-xl bg-rose-100 border-2 border-rose-500 text-rose-950 font-black text-xs";
    });
    if (chosen === q.ans) _tsRapidScore++;
    const exp = document.getElementById("tsRapidExp");
    exp.textContent = "💡 " + q.exp;
    exp.classList.remove("hidden");
    const nxt = document.getElementById("tsRapidNextBtn");
    nxt.textContent = _tsRapidIdx === TS_RAPID_QUIZ_POOL.length - 1 ? "🏁 Finish Quiz" : "Next ➔";
    nxt.classList.remove("hidden");
};
window.nextTsRapidQ = function() {
    _tsRapidAnswered = false;
    if (_tsRapidIdx < TS_RAPID_QUIZ_POOL.length - 1) {
        _tsRapidIdx++;
        renderProToolsTab("rapid_quiz");
    } else {
        PRO_TS_STORE.daily_quiz_history[tsTodayKey()] = { score: _tsRapidScore, total: TS_RAPID_QUIZ_POOL.length };
        addTsStudyMinutes(5);
        logPaidTsActivity("RAPID_QUIZ", `Scored ${_tsRapidScore}/${TS_RAPID_QUIZ_POOL.length}`);
        _tsRapidIdx = 0;
        renderProToolsTab("rapid_quiz");
    }
};
