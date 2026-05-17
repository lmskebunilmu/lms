import { auth, db } from "../../firebase/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadLayout } from "../../assets/js/components.js";

// ==========================
const materialId = new URLSearchParams(window.location.search).get("materialId");

let exercises = [];
let materialData = null;

// ==========================
// AUTH
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) return window.location = "../../login.html";

  await loadLayout("superadmin");

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.exists() ? userDoc.data() : {};

    if (data.role !== "super_admin") {
      alert("Akses ditolak!");
      window.location = "../../login.html";
      return;
    }

    // HEADER
    const headerName = document.getElementById("headerNameHeader");
    const headerAvatar = document.getElementById("headerAvatarHeader");

    if (headerName)
      headerName.innerText = data.name || user.displayName || "Admin";

    if (headerAvatar)
      headerAvatar.src =
        data.avatar ||
        user.photoURL ||
        "/assets/images/default-avatar.png";

    await loadMaterial();
    await loadExercises();

  } catch (err) {
    console.error(err);
    alert("Gagal load user");
  }
});

// ==========================
// BACK
// ==========================
window.goBackMaterials = function () {
  window.location.href = "materials.html";
};

// ==========================
// LOAD MATERIAL
// ==========================
async function loadMaterial() {
  const snap = await getDoc(doc(db, "materials", materialId));
  if (!snap.exists()) return;

  materialData = snap.data();

  const title = document.getElementById("materialTitle");
  if (title) {
    title.innerText = `Latihan: ${materialData.title}`;
  }
}

// ==========================
// LOAD EXERCISES
// ==========================
async function loadExercises() {
  const q = query(
    collection(db, "exercises"),
    where("materialId", "==", materialId),
  );

  const snap = await getDocs(q);

  let exercisesRaw = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  // ✅ SORT BERDASARKAN TITLE
  exercisesRaw.sort((a, b) => {
    return (a.title || "").localeCompare(b.title || "");
  });

  const withCount = await Promise.all(
    exercisesRaw.map(async (e) => {
      const qs = query(
        collection(db, "questions"),
        where("exerciseId", "==", e.id)
      );

      const snapQ = await getDocs(qs);

      return {
        ...e,
        questionCount: snapQ.size
      };
    })
  );

  exercises = withCount;

  renderExercises();
}

// ==========================
// RENDER
// ==========================
function renderExercises() {
  const list = document.getElementById("exerciseList");
  list.innerHTML = "";

  if (!exercises.length) {
    list.innerHTML = "<p>Belum ada latihan</p>";
    return;
  }

  exercises.forEach(e => {

    // hitung jumlah soal
    const questionCount = e.questionCount || 0;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${e.title}</h3>

      <p style="font-size:13px;color:gray;">
        📘 ${e.subject || "-"} <br>
        📗 ${e.chapter || "-"} <br>
        📙 ${e.subChapter || "-"}
      </p>

      <p style="margin-top:5px;font-weight:600;">
        🧠 ${questionCount} soal
      </p>

      <div style="display:flex;gap:10px;margin-top:10px;">
  <button class="primary btn-view">👁 Lihat Soal</button>
  <button class="primary btn-questions">⚙ Kelola</button>
  <button class="primary btn-edit">✏ Edit</button>
  <button class="danger btn-delete">🗑 Hapus</button>
</div>
    `;

    div.querySelector(".btn-view").onclick = () => viewQuestions(e.id);
    div.querySelector(".btn-questions").onclick = () => openQuestions(e.id);
    div.querySelector(".btn-delete").onclick = () => deleteExercise(e.id);
    div.querySelector(".btn-edit").onclick = () => editExercise(e.id, e.title);

    list.appendChild(div);
  });
}

// ==========================
// CREATE
// ==========================
window.createExercise = async function () {

  const title = prompt("Nama latihan:");
  if (!title) return;

  await addDoc(collection(db, "exercises"), {
    title,
    materialId,
    subject: materialData?.subject || "",
    chapter: materialData?.chapter || "",
    subChapter: materialData?.subChapter || "",
    status: "pending",
    createdAt: new Date()
  });

  await loadExercises();
};

// ==========================
// DELETE
// ==========================
async function deleteExercise(id) {
  const ok = confirm("Hapus latihan & semua soal?");
  if (!ok) return;

  try {
    // 1. ambil semua soal
    const q = query(
      collection(db, "questions"),
      where("exerciseId", "==", id)
    );

    const snap = await getDocs(q);

    // 2. hapus satu per satu
    const deletes = snap.docs.map(d =>
      deleteDoc(doc(db, "questions", d.id))
    );

    await Promise.all(deletes);

    // 3. baru hapus exercise
    await deleteDoc(doc(db, "exercises", id));

    alert("Latihan & semua soal berhasil dihapus");
    await loadExercises();

  } catch (err) {
    console.error(err);
    alert("Gagal hapus data");
  }
}

window.deleteExercise = deleteExercise;

// ==========================
// OPEN QUESTIONS (EDIT MODE)
// ==========================
function openQuestions(exerciseId) {
  window.location.href = `questions.html?exerciseId=${exerciseId}&materialId=${materialId}`;
}

window.openQuestions = openQuestions;

// ==========================
// VIEW QUESTIONS (MODAL)
// ==========================
async function viewQuestions(exerciseId) {
  const q = query(
    collection(db, "questions"),
    where("exerciseId", "==", exerciseId)
  );

  const snap = await getDocs(q);

  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";

  if (snap.empty) {
    container.innerHTML = "<p>Belum ada soal di latihan ini</p>";
    return;
  }

  const questions = snap.docs.map(d => d.data());

  questions.forEach((q, i) => {
    const div = document.createElement("div");

    div.style.cssText = `
      padding:10px;
      border:1px solid #ddd;
      margin-bottom:10px;
      border-radius:8px;
    `;

    let html = `
      <b>Soal ${i + 1}</b>
      <p>${q.question || "-"}</p>
    `;

    // ================= PG / CHECKBOX =================
    if (q.type === "pg" || q.type === "checkbox") {
      html += "<ul>";
      (q.options || []).forEach((opt, idx) => {
        html += `<li>${String.fromCharCode(65 + idx)}. ${opt}</li>`;
      });
      html += "</ul>";
    }

    // ================= ISIAN =================
    if (q.type === "isian") {
      html += `<p><i>Jawaban: ${q.answer || "-"}</i></p>`;
    }

    // ================= MATCH =================
    if (q.type === "match") {

  const left = (q.pairs || []).map(p => p.left);
  const right = (q.pairs || []).map(p => p.right);

  // optional: acak kanan
  right.sort(() => Math.random() - 0.5);

  html += `
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:20px;
      margin-top:10px;
    ">
      
      <!-- KIRI -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${left.map(item => `
          <div style="
            padding:10px;
            border:1px solid #ddd;
            border-radius:8px;
            background:#f9f9f9;
          ">
            ${item}
          </div>
        `).join("")}
      </div>

      <!-- KANAN -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${right.map(item => `
          <div style="
            padding:10px;
            border:1px solid #ddd;
            border-radius:8px;
            background:#f5f7ff;
          ">
            ${item}
          </div>
        `).join("")}
      </div>

    </div>
  `;
}

    // ================= MULTI ISIAN =================
    if (q.type === "multi_isian") {
      html += "<ul>";

      (q.fields || []).forEach(f => {
        html += `<li>${f.label} : ${f.answer}</li>`;
      });

      html += "</ul>";
    }

    // ================= JAWABAN (GLOBAL FIX) =================
    if (q.answer && q.type !== "isian") {
      html += `<p><b>Jawaban:</b> ${q.answer}</p>`;
    }

    // ================= PEMBAHASAN =================
    if (q.explanation) {
      html += `
        <div style="margin-top:10px;padding:8px;background:#f5f5f5;border-radius:6px">
          <b>Pembahasan:</b>
          <div>${q.explanation}</div>
        </div>
      `;
    }

    div.innerHTML = html;
container.appendChild(div);

// 🔥 TAMBAH INI
if (window.MathJax) {
  MathJax.typesetPromise([div]);
}
  });

  document.getElementById("viewQuestionsModal").classList.add("active");
}

async function editExercise(id, oldTitle) {
  const newTitle = prompt("Edit judul latihan:", oldTitle);

  if (!newTitle || newTitle.trim() === "") return;

  try {
    await updateDoc(doc(db, "exercises", id), {
      title: newTitle
    });

    alert("Judul berhasil diupdate");
    await loadExercises();

  } catch (err) {
    console.error(err);
    alert("Gagal update judul");
  }
}

window.editExercise = editExercise;
// ==========================
// CLOSE MODAL
// ==========================
function closeQuestionsModal() {
  document.getElementById("viewQuestionsModal").classList.remove("active");
}

window.viewQuestions = viewQuestions;
window.closeQuestionsModal = closeQuestionsModal;
