// schools.js (Full Fixed Version)
import { auth, db } from "../../firebase/firebase-config.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc,
  query   // 🔥 TAMBAH INI
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadLayout } from "../../assets/js/components.js";

// ==========================
// VARIABLES
// ==========================
let editId = null;
let schoolsData = [];
let currentPage = 0;
let materialsSubjects = [];
let deleteSchoolId = null;
let currentLogo = "";
const pageSize = 10;

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/djlvnubgn/image/upload";
const CLOUDINARY_PRESET = "lmsmultischool";

// ==========================
// AUTH & LAYOUT
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) window.location = "../../login.html";
  else {
    try {
      // 1️⃣ Load sidebar + header
      await loadLayout("superadmin");
await loadSubjectsFromMaterials();

      // 2️⃣ Load user profile di header
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const data = userDoc.exists() ? userDoc.data() : {};
      if (data.role !== "super_admin") {
  alert("Akses ditolak!");
  window.location = "../../login.html";
  return;
}

      const headerName = document.getElementById("headerNameHeader");
      const headerAvatar = document.getElementById("headerAvatarHeader");

      if (headerName) headerName.innerText = data.name || user.displayName || "Admin";
      if (headerAvatar) headerAvatar.src = data.avatar || user.photoURL || "/assets/images/default-avatar.png";

      // 3️⃣ Load sekolah
      loadSchoolsPaginated();

    } catch (err) {
      console.error("Gagal load layout atau data:", err);
      alert("Terjadi kesalahan saat load halaman sekolah");
    }
  }
});

// ==========================
// SHOW / EDIT MODAL
// ==========================
function showAddForm() {
  editId = null;
  currentLogo = "";

  document.getElementById("formTitle").innerText = "Tambah Sekolah";
  document.getElementById("schoolName").value = "";
  document.getElementById("schoolCode").value = "";
  document.getElementById("schoolLogoFile").value = "";
  document.getElementById("level").value = "SD";
  document.getElementById("curriculum").value = "Nasional";
  renderSubjectsCheckbox([]);

  document.getElementById("schoolModal").classList.add("active");
}

function editSchool(id, name, code, logo, level, curriculum, subjects) {
  editId = id;
  currentLogo = logo || "";

  document.getElementById("formTitle").innerText = "Edit Sekolah";
  document.getElementById("schoolName").value = name;
  document.getElementById("schoolCode").value = code;
  document.getElementById("level").value = level || "SD";
  document.getElementById("curriculum").value = curriculum || "Nasional";

  // FIX subjects aman
  renderSubjectsCheckbox(subjects || []);

  document.getElementById("schoolModal").classList.add("active");
}

function closeForm() {
  document.getElementById("schoolModal").classList.remove("active");
}

// ==========================
// TOAST NOTIFICATION
// ==========================
function showToast(message, type="success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.className = `toast ${type} active`;
  setTimeout(() => { toast.classList.remove("active"); }, 3000);
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!data.secure_url) throw new Error("Upload gagal");

    return data.secure_url;

  } catch (err) {
    console.error(err);
    showToast("Upload logo gagal!", "error");
    return null;
  }
}
// ==========================
// SAVE / UPDATE SCHOOL DENGAN STATUS
// ==========================
async function saveSchool() {
  const name = document.getElementById("schoolName")?.value.trim();
  const code = document.getElementById("schoolCode")?.value.trim();
  const fileInput = document.getElementById("schoolLogoFile");

  const level = document.getElementById("level")?.value || "SD";
  const curriculum = document.getElementById("curriculum")?.value || "Nasional";

  // 🔥 Ambil subject yang dicentang
  const selectedSubjects = Array.from(
  document.querySelectorAll("#subjectsCheckboxList input[type='checkbox']:checked")
).map(cb => cb.value);
await saveSubjectsToCollection(selectedSubjects);
  let logo = currentLogo;

  if (!name || !code) {
    showToast("Isi semua data!", "error");
    return;
  }

  if (selectedSubjects.length === 0) {
    showToast("Pilih minimal 1 mata pelajaran!", "error");
    return;
  }

  const exist = schoolsData.find(s => s.code === code && s.id !== editId);
  if (exist) {
    showToast("Kode sekolah sudah dipakai!", "error");
    return;
  }

  try {
    // Upload logo jika ada file baru
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];

      if (file.size > 2 * 1024 * 1024) {
        showToast("Ukuran gambar max 2MB!", "error");
        return;
      }

      const uploadedUrl = await uploadToCloudinary(file);
      if (uploadedUrl) logo = uploadedUrl;
    }

    // ==========================
    // UPDATE SEKOLAH
    // ==========================
    if (editId) {
      await updateDoc(doc(db, "schools", editId), {
        name,
        code,
        logoURL: logo || currentLogo,
        level,
        curriculum,

        // 🔥 Subject resmi sekolah
        allowedSubjects: selectedSubjects,

        // 🔥 Default subject aktif admin sekolah
        approvedSubjects: selectedSubjects
      });

      showToast("Sekolah berhasil diupdate");
    }

    // ==========================
    // TAMBAH SEKOLAH BARU
    // ==========================
    else {
      const newDocRef = doc(collection(db, "schools"));

      await setDoc(newDocRef, {
        schoolId: newDocRef.id,
        name,
        code,
        logoURL: logo || "",
        level,
        curriculum,

        // 🔥 Subject resmi sekolah
        allowedSubjects: selectedSubjects,

        // 🔥 Admin sekolah hanya bisa pakai ini
        approvedSubjects: selectedSubjects,

        status: "aktif",
        createdAt: new Date()
      });

      showToast("Sekolah berhasil ditambahkan");
    }

    closeForm();
    loadSchoolsPaginated();

  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}
// ==========================
// LOAD SCHOOLS
// ==========================
async function loadSchoolsPaginated() {
  const snapshot = await getDocs(collection(db, "schools"));
  schoolsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const now = new Date();

  for (const school of schoolsData) {
    if (school.expiredAt && school.status === "aktif") {
      const expiredDate = school.expiredAt.toDate 
        ? school.expiredAt.toDate() 
        : new Date(school.expiredAt);

      if (expiredDate < now) {
        // 🔥 AUTO NONAKTIF
        await updateDoc(doc(db, "schools", school.id), {
          status: "tidak aktif"
        });

        school.status = "tidak aktif"; // update local biar langsung ke UI
      }
    }
  }

  renderPage(0);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderPage(page) {
  const list = document.getElementById("schoolList");
  if (!list) return;

  list.innerHTML = "";

  const start = page * pageSize;
  const end = start + pageSize;

  schoolsData.slice(start, end).forEach(data => {
    const li = document.createElement("li");
    li.classList.add("school-item");

    // Subject sekolah
    const subjects = data.allowedSubjects || [];
    const subjectText =
      subjects.length > 0 ? subjects.join(", ") : "Belum diatur";

    // Escape semua data biar aman
    const safeId = escapeHtml(data.id);
    const safeName = escapeHtml(data.name || "");
    const safeCode = escapeHtml(data.code || "");
    const safeLogo = escapeHtml(data.logoURL || "");
    const safeLevel = escapeHtml(data.level || "SD");
    const safeCurriculum = escapeHtml(data.curriculum || "Nasional");
    const safeStatus = escapeHtml(data.status || "aktif");

    // Subject JSON aman untuk onclick
    
    li.innerHTML = `
      <div class="school-info-row">
        <img class="school-logo"
             src="${safeLogo || '/assets/images/default-school.png'}"
             onerror="this.src='/assets/images/default-school.png'">

        <div class="school-text">
          <b>${safeName}</b><br>
          <span>${safeCode}</span> |
          <span>${safeLevel}</span> |
          <span>${safeCurriculum}</span> |
          <span>Status: ${safeStatus}</span>
          <br>
          <small><b>Mapel:</b> ${escapeHtml(subjectText)}</small>
        </div>
      </div>

      <div class="school-actions">
        <button 
  class="warning edit-btn"
  data-id='${safeId}'
  data-name='${safeName}'
  data-code='${safeCode}'
  data-logo='${safeLogo}'
  data-level='${safeLevel}'
  data-curriculum='${safeCurriculum}'
  data-subjects='${encodeURIComponent(JSON.stringify(subjects))}'
>
✏ Edit
</button>

        <button class="primary" onclick='toggleSchoolStatus(
"${safeId}",
"${safeStatus}"
)'>
          ${safeStatus === "aktif" ? "Nonaktifkan" : "Aktifkan"}
        </button>

        <button class="primary" onclick='setExpired("${safeId}")'>
          ⏳ Atur Masa Aktif
        </button>

        <button class="danger" onclick='showDeleteSchoolModal(
"${safeId}",
"${safeName}"
)'>
          🗑 Hapus
        </button>
      </div>
    `;

    list.appendChild(li);
    li.querySelector(".edit-btn").addEventListener("click", function () {
  editSchool(
    this.dataset.id,
    this.dataset.name,
    this.dataset.code,
    this.dataset.logo,
    this.dataset.level,
    this.dataset.curriculum,
    JSON.parse(decodeURIComponent(this.dataset.subjects))
  );
});
  });

  currentPage = page;
}
function renderFiltered(filtered) {
  const list = document.getElementById("schoolList");
  if (!list) return;

  list.innerHTML = "";

  filtered.forEach(data => {
    const li = document.createElement("li");
    li.classList.add("school-item");

    const subjects = data.allowedSubjects || [];
    const subjectText =
      subjects.length > 0 ? subjects.join(", ") : "Belum diatur";

    const safeId = escapeHtml(data.id || "");
    const safeName = escapeHtml(data.name || "");
    const safeCode = escapeHtml(data.code || "");
    const safeLogo = escapeHtml(data.logoURL || "");
    const safeLevel = escapeHtml(data.level || "SD");
    const safeCurriculum = escapeHtml(data.curriculum || "Nasional");
    const safeSubjectsJson = escapeHtml(JSON.stringify(subjects));

    li.innerHTML = `
      <div class="school-info-row">
        <img src="${safeLogo || '../../assets/images/default-school.png'}"
             class="school-logo"
             onerror="this.src='../../assets/images/default-school.png'">

        <div class="school-text">
          <b>${safeName}</b><br>
          <span>${safeCode}</span> |
          <span>${safeLevel}</span> |
          <span>${safeCurriculum}</span>
          <br>
          <small><b>Mapel:</b> ${escapeHtml(subjectText)}</small>
        </div>
      </div>

      <div class="school-actions">
        <div class="school-actions">
  <button 
    class="warning edit-btn"
    data-id='${safeId}'
    data-name='${safeName}'
    data-code='${safeCode}'
    data-logo='${safeLogo}'
    data-level='${safeLevel}'
    data-curriculum='${safeCurriculum}'
    data-subjects='${encodeURIComponent(JSON.stringify(subjects))}'
  >
    ✏ Edit
  </button>

  <button class="danger" onclick='showDeleteSchoolModal(
"${safeId}",
"${safeName}"
)'>🗑 Hapus</button>
</div>

        <button class="danger" onclick='showDeleteSchoolModal(
"${safeId}",
"${safeName}"
)'>🗑 Hapus</button>
      </div>
    `;

    list.appendChild(li);
    li.querySelector(".edit-btn").addEventListener("click", function () {
  editSchool(
    this.dataset.id,
    this.dataset.name,
    this.dataset.code,
    this.dataset.logo,
    this.dataset.level,
    this.dataset.curriculum,
    JSON.parse(decodeURIComponent(this.dataset.subjects))
  );
});
  });
}

async function setExpired(schoolId) {
  const days = prompt("Masukkan jumlah hari aktif (contoh: 30)");

  if (!days || isNaN(days)) {
    showToast("Input tidak valid", "error");
    return;
  }

  const expiredAt = new Date();
  expiredAt.setDate(expiredAt.getDate() + parseInt(days));

  try {
    await updateDoc(doc(db, "schools", schoolId), {
      expiredAt: expiredAt,
      status: "aktif" // otomatis aktif lagi
    });

    showToast(`Masa aktif ditambah ${days} hari`);
    loadSchoolsPaginated();

  } catch (err) {
    showToast(err.message, "error");
  }
}
// ==========================
// DELETE SCHOOL
// ==========================
async function deleteSchool(id) {
  if (!confirm("Yakin ingin menghapus sekolah ini?")) return;
  try {
    await deleteDoc(doc(db, "schools", id));
    showToast("Sekolah berhasil dihapus");
    loadSchoolsPaginated();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==========================
// SEARCH / FILTER
// ==========================
function filterSchools() {
  const search = document.getElementById("searchSchool")?.value.toLowerCase() || "";
  const filtered = schoolsData.filter(data => data.name.toLowerCase().includes(search) || data.code.toLowerCase().includes(search));
  renderFiltered(filtered);
}

// ==========================
// PAGINATION
// ==========================
function nextPage() { if ((currentPage+1)*pageSize < schoolsData.length) renderPage(currentPage+1); }
function prevPage() { if (currentPage > 0) renderPage(currentPage-1); }


// ==========================
// MODAL DELETE SEKOLAH
// ==========================


function showDeleteSchoolModal(id, name) {
  deleteSchoolId = id;
  document.getElementById("deleteSchoolMessage").innerText = `Yakin ingin menghapus sekolah "${name}"?`;
  document.getElementById("deleteSchoolModal").classList.add("active");
}

function closeDeleteSchoolModal() {
  deleteSchoolId = null;
  document.getElementById("deleteSchoolModal").classList.remove("active");
}

document.getElementById("deleteSchoolYes").addEventListener("click", async () => {
  if (!deleteSchoolId) return;
  try {
    await deleteDoc(doc(db, "schools", deleteSchoolId));
    showToast("Sekolah berhasil dihapus");
    closeDeleteSchoolModal();
    loadSchoolsPaginated();
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("deleteSchoolNo").addEventListener("click", () => {
  closeDeleteSchoolModal();
  showToast("Batal dihapus", "error"); // bisa pakai "success" atau "info"
});// ==========================

async function loadSubjectsFromMaterials() {
  try {
    const snapshot = await getDocs(collection(db, "materials"));

    const subjectSet = new Set();

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.subject) {
        subjectSet.add(data.subject);
      }
    });

    materialsSubjects = [...subjectSet];

// 🔥 TAMBAH INI
await saveSubjectsToCollection(materialsSubjects);

renderSubjectsCheckbox();

  } catch (err) {
    console.error(err);
    showToast("Gagal load mata pelajaran", "error");
  }
}


function renderSubjectsCheckbox(selectedSubjects = []) {
  const container = document.getElementById("subjectsCheckboxList");
  if (!container) return;

  container.innerHTML = "";

  materialsSubjects.forEach(subject => {
    const checked = selectedSubjects.includes(subject) ? "checked" : "";

    container.innerHTML += `
      <label class="subject-item">
        <input type="checkbox" value="${subject}" ${checked}>
        ${subject}
      </label>
    `;
  });
}
async function toggleSchoolStatus(schoolId, currentStatus) {
  let newStatus;
  let updateData = {};

  if (currentStatus === "aktif") {
    newStatus = "tidak aktif";
    updateData.status = newStatus;
  } else {
    newStatus = "aktif";

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30); // default 30 hari

    updateData = {
      status: newStatus,
      expiredAt: expiredAt
    };
  }

  try {
    await updateDoc(doc(db, "schools", schoolId), updateData);

    showToast(`Sekolah ${newStatus}`);
    loadSchoolsPaginated();

  } catch (err) {
    showToast(err.message, "error");
  }
}


async function saveSubjectsToCollection(subjectList) {
  try {
    for (const subject of subjectList) {
      const subjectRef = doc(db, "subjects", subject.toLowerCase());

      await setDoc(subjectRef, {
        name: subject,
        createdAt: new Date()
      }, { merge: true }); // biar ga duplicate
    }
  } catch (err) {
    console.error("Gagal sync subjects:", err);
  }
}


// export supaya bisa dipakai di onclick
window.toggleSchoolStatus = toggleSchoolStatus;
// EXPORT GLOBAL
// ==========================
window.showAddForm = showAddForm;
window.closeForm = closeForm;
window.saveSchool = saveSchool;
window.editSchool = editSchool;
window.deleteSchool = deleteSchool;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.filterSchools = filterSchools;
window.showDeleteSchoolModal = showDeleteSchoolModal;
window.closeDeleteSchoolModal = closeDeleteSchoolModal;
window.setExpired = setExpired;
