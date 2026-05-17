import { auth, db } from "../../firebase/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadLayout } from "../../assets/js/components.js";

// ==========================
let materialsData = [];
let editId = null;
let currentPage = 0;
let deleteId = null;
const pageSize = 10;
let selectedMaterial = null;

// ==========================
// AUTH
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) window.location = "../../login.html";
  else {
    await loadLayout("superadmin");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const data = userDoc.exists() ? userDoc.data() : {};

      // 🔥 VALIDASI ROLE
      if (data.role !== "super_admin") {
        alert("Akses ditolak!");
        window.location = "../../login.html";
        return;
      }

      // 🔥 SYNC HEADER (INI YANG KURANG)
      const headerName = document.getElementById("headerNameHeader");
      const headerAvatar = document.getElementById("headerAvatarHeader");

      if (headerName)
        headerName.innerText = data.name || user.displayName || "Admin";

      if (headerAvatar)
        headerAvatar.src =
          data.avatar ||
          user.photoURL ||
          "/assets/images/default-avatar.png";

      // LOAD DATA
      loadMaterials();

    } catch (err) {
      console.error(err);
      alert("Gagal load data user");
    }
  }
});

// ==========================
// MODAL
// ==========================
function showAddForm() {
  editId = null;
  document.getElementById("formTitle").innerText = "Tambah Materi";
  document.getElementById("materialTitle").value = "";
  document.getElementById("materialContent").value = "";

  document.getElementById("materialModal").classList.add("active");
  updatePreview();
}

function editMaterial(id) {
  editId = id;

  const data = materialsData.find(m => m.id === id);
  if (!data) return;

  document.getElementById("formTitle").innerText = "Edit Materi";

  document.getElementById("materialTitle").value = data.title || "";

  const contentEl = document.getElementById("materialContent");
  contentEl.value = data.content || "";

  document.getElementById("level").value = data.level || "SD";
  document.getElementById("curriculum").value = data.curriculum || "Nasional";
  document.getElementById("subject").value = data.subject || "";
  document.getElementById("chapter").value = data.chapter || "";
  document.getElementById("subChapter").value = data.subChapter || "";

  document.getElementById("materialModal").classList.add("active");

  // 🔥 LANGSUNG UPDATE PREVIEW SAAT MODAL DIBUKA
  updatePreview();

  // 🔥 PAKSA event 'input' supaya preview live update kalau user mulai ngetik
  contentEl.oninput = updatePreview;
}

function closeForm() {
  document.getElementById("materialModal").classList.remove("active");

  const preview = document.getElementById("previewFrame");
  if (preview) preview.srcdoc = "";
}
function generateContent(input) {
  let output = input;

  // =====================
  // YouTube
  // =====================
  output = output.replace(
    /(https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s<]+)/g,
    (url) => {
      let videoId = "";
      if (url.includes("watch?v=")) videoId = url.split("watch?v=")[1].split("&")[0];
      else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1].split("?")[0];
      return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
    }
  );

  // =====================
  // 🔥 GOOGLE DRIVE (TARUH DI SINI)
  // =====================
  output = output.replace(
    /https?:\/\/drive\.google\.com\/file\/d\/([^\/]+)\/view[^\s<]*/g,
    (match, fileId) => {
      return `<iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="500" style="border:none;"></iframe>`;
    }
  );

  // =====================
  // PDF
  // =====================
  output = output.replace(
    /(https?:\/\/[^\s<]+\.pdf)/g,
    (url) => `<iframe src="${url}" width="100%" height="500px"></iframe>`
  );

  // =====================
  // REMOVE SCRIPT
  // =====================
  output = output.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
<style>
body { font-family: Arial; padding: 15px; }
iframe { margin:10px 0; }
</style>
</head>
<body>
${output}
<script>
window.onload = () => {
  if (window.MathJax) MathJax.typeset();
};
</script>
</body>
</html>`;
}
// ==========================
// SAVE
// ==========================
async function saveMaterial() {
  const title = document.getElementById("materialTitle").value.trim();
  const contentInput = document.getElementById("materialContent").value.trim();

  const level = document.getElementById("level").value;
const curriculum = document.getElementById("curriculum").value;
const subject = document.getElementById("subject").value;
const chapter = document.getElementById("chapter").value;
const subChapter = document.getElementById("subChapter").value;

  if (!title || !contentInput) {
  return showToast("Judul & isi wajib diisi", "error");
}

  const content = contentInput; // ✅ simpan raw

  try {
    if (editId) {
      await updateDoc(doc(db, "materials", editId), {
  title,
  content,
  level,
  curriculum,
  subject,
  chapter,
  subChapter,
  updatedAt: new Date()
});
      showToast("Materi diupdate");
    } else {
const user = auth.currentUser;

// ambil data user dari Firestore
const userDoc = await getDoc(doc(db, "users", user.uid));
const userData = userDoc.exists() ? userDoc.data() : {};

await addDoc(collection(db, "materials"), {
  title,
  content,

  createdBy: user.uid,
  createdByName: userData.name || "Admin",

  level,
  curriculum,
  subject,
  chapter,
  subChapter,

  status: "pending", // 🔥 TAMBAHAN PENTING
  approvedSchools: [], // 🔥 list sekolah yg approve

  createdAt: new Date(),
  updatedAt: new Date()
});
      showToast("Materi ditambahkan");
    }

    closeForm();
    loadMaterials();

  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================
// LOAD
// ==========================

async function loadMaterials() {
  const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  materialsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPage(0);
}

function renderPage(page) {
  const list = document.getElementById("materialList");
  list.innerHTML = "";

  const start = page * pageSize;
  const end = start + pageSize;

  materialsData.slice(start, end).forEach(data => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${data.title}</td>
      <td>${data.createdByName || "-"}</td>
      <td>${data.level || "-"}</td>
      <td>${data.curriculum || "-"}</td>
      <td>${data.subject || "-"}</td>
      <td>${data.chapter || "-"} - ${data.subChapter || "-"}</td>
     <td>
  <div class="action-buttons">
    <button class="btn-view" title="Lihat">👁</button>
    <button class="btn-edit" title="Edit">✏</button>
    <button class="btn-exercise" title="Latihan">📝</button>
    <button class="btn-delete" title="Hapus">🗑</button>
  </div>
</td>
    `;

    // Pasang event listener
tr.querySelector(".btn-view").addEventListener("click", () => viewMaterial(data.id));
tr.querySelector(".btn-edit").addEventListener("click", () => editMaterial(data.id));
tr.querySelector(".btn-delete").addEventListener("click", () => showDeleteModal(data.id, data.title));
tr.querySelector(".btn-exercise")
  .addEventListener("click", () => openExercisePage(data.id));
    list.appendChild(tr);
  });

  currentPage = page;
}

// ==========================
// DELETE
// ==========================
function showDeleteModal(id, title) {
  deleteId = id;
  document.getElementById("deleteMaterialMessage").innerText =
    `Hapus materi "${title}"?`;
  document.getElementById("deleteMaterialModal").classList.add("active");
}

document.getElementById("deleteMaterialYes").onclick = async () => {
  if (!deleteId) return;
  await deleteDoc(doc(db, "materials", deleteId));
  showToast("Materi dihapus");
  document.getElementById("deleteMaterialModal").classList.remove("active");
  loadMaterials();
};

document.getElementById("deleteMaterialNo").onclick = () => {
  document.getElementById("deleteMaterialModal").classList.remove("active");
};

// ==========================
// SEARCH
// ==========================
function filterMaterials() {
  const search = document.getElementById("searchMaterial").value.toLowerCase();

  const filtered = materialsData.filter(m =>
    (m.title || "").toLowerCase().includes(search)
  );

  const list = document.getElementById("materialList");
  list.innerHTML = "";

  filtered.forEach(data => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${data.title}</td>
      <td>${data.createdByName || "-"}</td>
      <td>${data.level || "-"}</td>
      <td>${data.curriculum || "-"}</td>
      <td>${data.subject || "-"}</td>
      <td>${data.chapter || "-"}</td>
      <td>
        <button class="primary btn-view">👁</button>
        <button class="warning btn-edit">✏</button>
        <button class="success btn-exercise">📝</button>
        <button class="danger btn-delete">🗑</button>
      </td>
    `;

    // pasang event lagi (WAJIB karena DOM baru)
    tr.querySelector(".btn-view")
      .addEventListener("click", () => viewMaterial(data.id));

    tr.querySelector(".btn-edit")
      .addEventListener("click", () => editMaterial(data.id));

    tr.querySelector(".btn-delete")
      .addEventListener("click", () => showDeleteModal(data.id, data.title));

    tr.querySelector(".btn-exercise")
      .addEventListener("click", () => openExercisePage(data.id));

    list.appendChild(tr);
  });
}

// ==========================
// PAGINATION
// ==========================
function nextPage() {
  if ((currentPage + 1) * pageSize < materialsData.length)
    renderPage(currentPage + 1);
}

function prevPage() {
  if (currentPage > 0)
    renderPage(currentPage - 1);
}

let previewTimeout;

function updatePreview() {
  clearTimeout(previewTimeout);

  previewTimeout = setTimeout(() => {
    const inputEl = document.getElementById("materialContent");
    const preview = document.getElementById("previewFrame");

    if (!inputEl || !preview) return;

    const content = generateContent(inputEl.value);
    preview.srcdoc = content;
  }, 200); // delay dikit biar smooth
}

function viewMaterial(id) {
  const data = materialsData.find(m => m.id === id);
  if (!data) return;

  document.getElementById("viewMaterialTitle").innerText = data.title;
  const frame = document.getElementById("viewMaterialFrame");
  frame.srcdoc = generateContent(data.content || "");

  document.getElementById("viewMaterialModal").classList.add("active");
}

function closeViewModal() {
  document.getElementById("viewMaterialModal").classList.remove("active");
  document.getElementById("viewMaterialFrame").srcdoc = "";
}

function openExercisePage(materialId) {
  window.location.href = `exercise.html?materialId=${materialId}`;
}
// ==========================
// TOAST
// ==========================
function showToast(msg, type="success") {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.className = `toast ${type} active`;
  setTimeout(() => t.classList.remove("active"), 3000);
}

// ==========================
// EXPORT
// ==========================
window.showAddForm = showAddForm;
window.editMaterial = editMaterial;
window.closeForm = closeForm;
window.saveMaterial = saveMaterial;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.filterMaterials = filterMaterials;
window.viewMaterial = viewMaterial;
window.closeViewModal = closeViewModal;
window.openExercisePage = openExercisePage;