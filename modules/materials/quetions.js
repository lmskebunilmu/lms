import { auth, db } from "../../firebase/firebase-config.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadLayout } from "../../assets/js/components.js";

// ==========================
let questionsData = [];
let editId = null;
let deleteId = null;
let currentPage = 0;
let deleteYes, deleteNo, deleteModal, deleteMessage;
const pageSize = 10;

const exerciseId = new URLSearchParams(window.location.search).get("exerciseId");
const materialId = new URLSearchParams(window.location.search).get("materialId");
// ==========================
// AUTH
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) return window.location = "../../login.html";

  await loadLayout("superadmin");

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const data = userDoc.exists() ? userDoc.data() : {};

  if (data.role !== "super_admin") {
    alert("Akses ditolak!");
    return window.location = "../../login.html";
  }

  document.getElementById("headerNameHeader").innerText =
    data.name || user.displayName || "Admin";

  document.getElementById("headerAvatarHeader").src =
    data.avatar || user.photoURL || "/assets/images/default-avatar.png";

  loadQuestions();
});

// ==========================
// LOAD DATA
// ==========================
async function loadQuestions() {
  const snap = await getDocs(collection(db, "questions"));

  questionsData = snap.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .filter(q => q.exerciseId === exerciseId);

  renderPage(0);
}

// ==========================
// TYPE CHANGE (UX FIX)
// ==========================
function changeType() {
  const type = document.getElementById("type").value;
  const container = document.getElementById("dynamicFields");

  container.innerHTML = "";

  if (type === "pg") {
    container.innerHTML = `
      <label>Opsi Jawaban</label>
      <div id="optionsContainer"></div>
      <button type="button" onclick="addOption()">+ Tambah Opsi</button>

      <label style="margin-top:10px">Jawaban Benar</label>
      <input type="text" id="answer" placeholder="contoh: 0">
    `;
    addOption(); addOption();
  }

  else if (type === "checkbox") {
    container.innerHTML = `
      <label>Opsi (multi jawaban)</label>
      <div id="optionsContainer"></div>
      <button type="button" onclick="addOption()">+ Tambah Opsi</button>

      <label style="margin-top:10px">Jawaban Benar</label>
      <input type="text" id="answer" placeholder="contoh: 0,2">
    `;
    addOption(); addOption();
  }

  else if (type === "isian") {
    container.innerHTML = `
      <label>Jawaban Benar</label>
      <input type="text" id="answer">
    `;
  }

  else if (type === "match") {
    container.innerHTML = `
      <label>Pasangan</label>
      <div id="pairsContainer"></div>
      <button type="button" onclick="addPair()">+ Tambah Pasangan</button>
    `;
    addPair(); addPair();
  }

  // ✅ TAMBAHAN BARU
  else if (type === "multi_isian") {
    container.innerHTML = `
      <label>Isian Banyak (Label & Jawaban)</label>
      <div id="multiInputContainer"></div>
      <button type="button" onclick="addMultiInput()">+ Tambah Kolom</button>
    `;

    addMultiInput();
    addMultiInput();
  }
}

// ==========================
// OPTION & PAIR
// ==========================
function addOption(value = "") {
  const div = document.createElement("div");
  div.classList.add("option-row"); // 🔥 INI KUNCI

  div.innerHTML = `
    <input class="optionInput" value="${value}" placeholder="HTML / LaTeX">
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;

  document.getElementById("optionsContainer").appendChild(div);
}

function addPair(left = "", right = "") {
  const div = document.createElement("div");
  div.classList.add("pair-row"); // 🔥 INI PENTING

  div.innerHTML = `
    <input class="left" value="${left}" placeholder="Kiri">
    <input class="right" value="${right}" placeholder="Kanan">
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;

  document.getElementById("pairsContainer").appendChild(div);
}

// ==========================
// MODAL
// ==========================
function showAddForm() {
  editId = null;

  // reset input utama
  document.getElementById("questionText").value = "";
  document.getElementById("explanation").value = "";

  // reset type ke default (misalnya pg)
  document.getElementById("type").value = "pg";

  // generate ulang field sesuai type
  changeType();

  questionModal.classList.add("active");
}

function editQuestion(id) {
  const q = questionsData.find(x => x.id === id);
  if (!q) return;

  editId = id;

  document.getElementById("questionText").value = q.question;
  document.getElementById("explanation").value = q.explanation || "";
  document.getElementById("type").value = q.type;

  changeType();

  // 🔥 tunggu DOM siap TANPA setTimeout
  requestAnimationFrame(() => {

    // ==========================
    // PG / CHECKBOX
    // ==========================
    if (q.options) {
      const c = document.getElementById("optionsContainer");
      if (c) {
        c.innerHTML = "";
        q.options.forEach(opt => addOption(opt));
      }
    }

    // ==========================
    // ANSWER (FIX ALL TYPE)
    // ==========================
    const answerInput = document.getElementById("answer");

    if (answerInput && q.answer !== undefined && q.answer !== null) {

      if (Array.isArray(q.answer)) {
        // checkbox
        answerInput.value = q.answer.join(",");
      } else {
        // pg / isian
        answerInput.value = q.answer;
      }
    }

    // ==========================
    // MATCH
    // ==========================
    if (q.pairs) {
      const c = document.getElementById("pairsContainer");
      if (c) {
        c.innerHTML = "";
        q.pairs.forEach(p => addPair(p.left, p.right));
      }
    }

    // ==========================
    // MULTI ISIAN
    // ==========================
    if (q.fields) {
      const c = document.getElementById("multiInputContainer");
      if (c) {
        c.innerHTML = "";
        q.fields.forEach(f => addMultiInput(f.label, f.answer));
      }
    }

  });

  questionModal.classList.add("active");
}

function closeForm() {
  questionModal.classList.remove("active");
}

// ==========================
// SAVE
// ==========================
async function saveQuestion() {

  const question = document.getElementById("questionText").value.trim();
  const explanation = document.getElementById("explanation").value.trim();
  const type = document.getElementById("type").value;

  if (!question) return showToast("Isi soal dulu", "error");

  let data = {
    question,
    explanation,
    type,
    exerciseId
  };

  // hanya saat create
  if (!editId) {
    data.createdAt = new Date();
  }

  // ==========================
  // PG & CHECKBOX
  // ==========================
  if (type === "pg" || type === "checkbox") {
    const options = [...document.querySelectorAll(".optionInput")]
      .map(i => i.value.trim())
      .filter(Boolean);

    if (options.length < 2)
      return showToast("Minimal 2 opsi", "error");

    const raw = document.getElementById("answer").value.trim();
    if (!raw) return showToast("Isi jawaban benar", "error");

    data.options = options;

    // 🔥 parsing penting
    if (type === "pg") {
      const val = parseInt(raw);
      if (isNaN(val)) return showToast("Jawaban PG harus angka", "error");
      data.answer = val;
    }

    if (type === "checkbox") {
      const arr = raw.split(",").map(x => parseInt(x.trim()));
      if (arr.some(isNaN))
        return showToast("Format checkbox: 0,2,3", "error");

      data.answer = arr;
    }
  }

  // ==========================
  // ISIAN
  // ==========================
  if (type === "isian") {
    const ans = document.getElementById("answer").value.trim();
    if (!ans) return showToast("Isi jawaban", "error");

    data.answer = ans;
  }

  // ==========================
  // MATCH
  // ==========================
  if (type === "match") {
    const pairs = [...document.querySelectorAll("#pairsContainer > div")]
      .map(r => ({
        left: r.querySelector(".left").value.trim(),
        right: r.querySelector(".right").value.trim()
      }))
      .filter(p => p.left && p.right);

    if (pairs.length < 1)
      return showToast("Minimal 1 pasangan", "error");

    data.pairs = pairs;
  }

  // ==========================
  // MULTI ISIAN
  // ==========================
  if (type === "multi_isian") {
    const fields = [...document.querySelectorAll("#multiInputContainer > div")]
      .map(row => ({
        label: row.querySelector(".multi-label").value.trim(),
        answer: row.querySelector(".multi-answer").value.trim()
      }))
      .filter(f => f.label && f.answer);

    if (fields.length < 1)
      return showToast("Minimal 1 kolom isian", "error");

    data.fields = fields;
  }

  // ==========================
  // SAVE
  // ==========================
  if (editId) {
    await updateDoc(doc(db, "questions", editId), data);
  } else {
    await addDoc(collection(db, "questions"), data);
  }

  closeForm();
  loadQuestions();
  showToast("Berhasil");
}

// ==========================
// DELETE
// ==========================
function showDeleteModal(id, text) {
  deleteId = id;
  deleteMessage.innerText = `Hapus "${text}"?`;
  deleteModal.classList.add("active");
}


// ==========================
// RENDER
// ==========================
function renderPage(page) {
  const list = document.getElementById("questionList");
  list.innerHTML = "";

  questionsData.slice(page * pageSize, (page + 1) * pageSize)
    .forEach(q => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td data-text="${escapeText(stripHTML(q.question))}">
  ${stripHTML(q.question).slice(0, 80)}...
</td>
        <td>${q.type}</td>
        <td>
  <button class="action-btn view" onclick="viewQuestion('${q.id}')">👁</button>
  <button class="action-btn edit" onclick="editQuestion('${q.id}')">✏</button>
  <button class="action-btn delete" onclick="showDeleteModal('${q.id}', this.parentElement.parentElement.querySelector('td').getAttribute('data-text'))">🗑</button>
</td>
      `;

      list.appendChild(tr);
    });

  currentPage = page;
}

// ==========================
// VIEW (HTML + LATEX SAFE)
// ==========================
function viewQuestion(id) {
  const q = questionsData.find(x => x.id === id);
  if (!q) return;

  const container = document.getElementById("viewContent");
  container.innerHTML = "";

  let html = `
    <div class="math">${q.question ? q.question : "-"}</div>
  `;

  // ================= PG / CHECKBOX =================
  if (q.type === "pg" || q.type === "checkbox") {
    html += "<ul>";
    (q.options || []).forEach((opt, i) => {
      html += `<li>${String.fromCharCode(65 + i)}. ${opt}</li>`;
    });
    html += "</ul>";
  }

  // ================= ISIAN =================
  if (q.type === "isian") {
    html += `<p><b>Jawaban:</b> ${q.answer || "-"}</p>`;
  }

  // ================= MATCH =================
  if (q.type === "match") {
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">`;

    (q.pairs || []).forEach(p => {
      html += `
        <div>${p.left}</div>
        <div>${p.right}</div>
      `;
    });

    html += `</div>`;
  }

  // ================= MULTI ISIAN =================
  if (q.type === "multi_isian") {
    html += "<ul>";

    (q.fields || []).forEach(f => {
      html += `<li>${f.label} : ${f.answer}</li>`;
    });

    html += "</ul>";
  }

  // ================= PEMBAHASAN =================
  if (q.explanation) {
    html += `
      <div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:6px">
        <b>Pembahasan:</b>
        <div class="math">${q.explanation}</div>
      </div>
    `;
  }

  container.innerHTML = html;

if (window.MathJax) {
  MathJax.typesetClear();
  MathJax.typesetPromise([container]);
}

  document.getElementById("viewModal").classList.add("active");
}

function createIframe(content) {
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.border = "none";

  iframe.srcdoc = generateContent(content);

  iframe.onload = () => {
    iframe.style.height =
      iframe.contentWindow.document.body.scrollHeight + 10 + "px";
  };

  return iframe;
}

function closeView() {
  document.getElementById("viewModal").classList.remove("active");
  document.getElementById("viewContent").innerHTML = "";
}

// ==========================
// MATHJAX
// ==========================
function generateContent(input) {
  return `
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  </head>
  <body>${input}</body>
  </html>`;
}

// ==========================
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.add("active");
  setTimeout(() => t.classList.remove("active"), 3000);
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function escapeText(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function addMultiInput(label = "", answer = "") {
  const div = document.createElement("div");
  div.classList.add("pair-row");

  div.innerHTML = `
    <input class="multi-label" placeholder="Label (contoh: Mata)" value="${label}">
    <input class="multi-answer" placeholder="Jawaban" value="${answer}">
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;

  document.getElementById("multiInputContainer").appendChild(div);
}
function nextPage() {
  const maxPage = Math.ceil(questionsData.length / pageSize) - 1;
  if (currentPage < maxPage) {
    renderPage(currentPage + 1);
  }
}

function prevPage() {
  if (currentPage > 0) {
    renderPage(currentPage - 1);
  }
}

function goBack() {
  window.location.href = `exercise.html?materialId=${materialId}`;
}
// ==========================
async function importQuestions() {
  const file = document.getElementById("importJson").files[0];
  if (!file) return;

  const data = JSON.parse(await file.text());

  for (const q of data) {
    await addDoc(collection(db, "questions"), {
  ...q,
  exerciseId,
  createdAt: new Date()
});
  }

  loadQuestions();
}

window.addEventListener("DOMContentLoaded", () => {

  deleteYes = document.getElementById("deleteYes");
  deleteNo = document.getElementById("deleteNo");
  deleteModal = document.getElementById("deleteModal");
  deleteMessage = document.getElementById("deleteMessage");

  deleteYes.onclick = async () => {
    try {
      if (!deleteId) return;

      await deleteDoc(doc(db, "questions", deleteId));

      showToast("Berhasil dihapus");
      deleteModal.classList.remove("active");

      loadQuestions();

    } catch (err) {
      console.error(err);
      showToast("Gagal hapus", "error");
    }
  };

  deleteNo.onclick = () => {
    deleteModal.classList.remove("active");
  };

});

// ==========================
window.showAddForm = showAddForm;
window.closeForm = closeForm;
window.saveQuestion = saveQuestion;
window.viewQuestion = viewQuestion;
window.closeView = closeView;
window.editQuestion = editQuestion;
window.showDeleteModal = showDeleteModal;
window.importQuestions = importQuestions;
window.changeType = changeType;
window.addOption = addOption;
window.addPair = addPair;
window.addMultiInput = addMultiInput;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.goBack = goBack;