// admins.js
import { db, auth, storage } from "../../firebase/firebase-config.js";
import { collection, doc, getDocs, updateDoc, getDoc, setDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { loadLayout } from "../../assets/js/components.js";
import { createUserWithEmailAndPassword, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================
// GLOBAL VARIABLES
// ==========================
let editId = null;
let schoolsMap = {};
let schoolsList = [];
let adminsData = [];
let filteredData = null;
let currentPage = 0;
const pageSize = 5;

// ==========================
// MODAL FUNCTIONS
// ==========================
function showAddForm(admin = {}) {
  editId = admin.id || null;

  document.getElementById("formTitle").innerText = editId ? "Edit Admin" : "Tambah Admin";

  document.getElementById("adminName").value = admin.name || "";
  document.getElementById("adminEmail").value = admin.email || "";
  document.getElementById("adminEmail").disabled = !!editId;
  document.getElementById("adminPassword").value = "";
  document.getElementById("schoolId").value = admin.schoolId || "";
  document.getElementById("adminAvatar").value = "";
  document.getElementById("adminAvatarURL").value = admin.avatarURL || "";

  document.getElementById("adminModal").classList.add("active");
}

function closeForm() {
  document.getElementById("adminModal").classList.remove("active");
}

// ==========================
// TOAST
// ==========================
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.className = `toast ${type} active`;
  setTimeout(() => toast.classList.remove("active"), 3000);
}

// ==========================
// RESIZE IMAGE
// ==========================
function resizeImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => img.src = e.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > 200) { h *= 200 / w; w = 200; }
      if (h > 200) { w *= 200 / h; h = 200; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.8);
    };
    reader.readAsDataURL(file);
  });
}

// ==========================
// AUTH CHECK
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) return window.location = "../../login.html";

  try {
    await loadLayout("superadmin");

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.exists() ? userDoc.data() : {};

    document.getElementById("headerNameHeader").innerText =
      data.name || user.displayName || "Admin";

    document.getElementById("headerAvatarHeader").src =
      data.avatarURL || user.photoURL || "../../assets/images/default-avatar.png";

    await loadSchools(); // 🔥 ambil data sekolah dulu
loadAdmins();        // baru load admin

  } 
  catch (err) {
  console.error(err);
  showToast("Gagal load halaman admin", "error");
}
});

// ==========================
// LOAD ADMINS
// ==========================
async function loadAdmins() {
  try {
    // pastikan schools sudah ke-load
    if (Object.keys(schoolsMap).length === 0) {
      await loadSchools();
    }

    const snapshot = await getDocs(collection(db, "users"));
    adminsData = snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(a => a.role === "admin");

    filteredData = null;
    renderPage(0);

  } catch (err) {
    console.error(err);
    showToast("Gagal load data admin", "error");
  }
}
// ==========================
// RENDER LIST & PAGINATION
// ==========================
function renderPage(page) {
  const list = document.getElementById("adminList");
  if (!list) return;

  list.innerHTML = "";
  const data = filteredData || adminsData;
  const start = page * pageSize;
  const end = start + pageSize;
  const pageData = data.slice(start, end);

  if (pageData.length === 0) {
    showToast("Tidak ada admin di halaman ini", "info");
    return;
  }

  pageData.forEach(admin => {

  const school = schoolsMap[admin.schoolId]; // 🔥 TARUH DI SINI

  const li = document.createElement("li");
  li.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      ${admin.avatarURL ? `<img src="${admin.avatarURL}" width="40" style="border-radius:50%">` : ""}
      <div style="flex:1;">
        <b>${admin.name}</b><br>
        📧 ${admin.email}<br>
        🏫 ${school ? school.name : "Tidak diketahui"}
        ${school && school.status !== "aktif" ? " (Nonaktif)" : ""}
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn-edit">✏ Edit</button>
        <button class="btn-delete">🗑 Hapus</button>
      </div>
    </div>
  `;

  list.appendChild(li);

  li.querySelector(".btn-edit").addEventListener("click", () => showAddForm(admin));
  li.querySelector(".btn-delete").addEventListener("click", () => deleteAdmin(admin.id));
});

  currentPage = page;
}

function nextPage() { const data = filteredData || adminsData; if ((currentPage+1)*pageSize < data.length) renderPage(currentPage+1); }
function prevPage() { if (currentPage>0) renderPage(currentPage-1); }

// ==========================
// FILTER
// ==========================
function filterAdmins() {
  const search = document.getElementById("searchAdmin").value.toLowerCase();
  filteredData = adminsData.filter(a =>
    a.name.toLowerCase().includes(search) ||
    a.email.toLowerCase().includes(search) ||
    a.schoolId.toLowerCase().includes(search)
  );

  if (filteredData.length === 0) {
    showToast("Admin tidak ditemukan", "error");
  }

  renderPage(0);
}

// ==========================
// SAVE ADMIN
// ==========================
async function saveAdmin() {
  const name = document.getElementById("adminName").value.trim();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  const schoolId = document.getElementById("schoolId").value.trim();
  const avatarFile = document.getElementById("adminAvatar").files[0];
  const avatarURLInput = document.getElementById("adminAvatarURL").value.trim();

  if (!name || !email || (!editId && password.length < 6) || !schoolId) {
    return showToast("Isi data dengan benar!", "error");
  }

  try {
    let avatarURL = "";

    // Upload avatar ke Cloudinary jika ada
    if (avatarFile) {
      const resizedBlob = await resizeImage(avatarFile); // gunakan resizeImage
      const formData = new FormData();
      formData.append("file", resizedBlob);
      formData.append("upload_preset", "lmsmultischool");

      const res = await fetch("https://api.cloudinary.com/v1_1/djlvnubgn/image/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      avatarURL = data.secure_url || "";
    } else if (avatarURLInput) {
      avatarURL = avatarURLInput;
    }

    // ✅ Begin Update / Create
    if (editId) {
      // update admin di Firestore
      await updateDoc(doc(db, "users", editId), {
        name,
        schoolId,
        avatarURL,
        updatedAt: new Date()
      });

      showToast("Admin berhasil diperbarui!");
    } else {
      // buat admin baru
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // saat create admin baru
await setDoc(doc(db, "users", uid), {
  name,
  email,
  schoolId,
  avatarURL,
  role: "admin",
  status: "aktif", // 🔥 tambahkan status
  createdAt: new Date()
});

      showToast("Admin berhasil dibuat!");
    }

    closeForm();
    loadAdmins();

  } catch (err) {
    console.error(err);
    showToast(err.message || "Terjadi error", "error");
  }
}
// ==========================
// ==========================
// DELETE ADMIN TANPA CLOUD FUNCTIONS
// ==========================
async function deleteAdmin(id) {
  const confirmDelete = await showConfirm("Yakin hapus admin ini?");
if (!confirmDelete) {
  showToast("Hapus admin dibatalkan", "info");
  return;
}
  try {
    // Hapus admin dari Firestore
    await deleteDoc(doc(db, "users", id));
    
    // Reload data admin dulu
    await loadAdmins();

    // Tampilkan toast sukses
    showToast("Admin berhasil dihapus dari Firestore", "success");
  } catch (err) {
    console.error(err);
    showToast(err.message || "Gagal hapus admin", "error");
  }
}

function editAdmin(id, name, email, schoolId, avatarURL) {
  editId = id;

  document.getElementById("formTitle").innerText = "Edit Admin";
  document.getElementById("adminName").value = name;
  document.getElementById("adminEmail").value = email;
  document.getElementById("adminEmail").disabled = true; // email tidak bisa diubah
  document.getElementById("schoolId").value = schoolId;
  document.getElementById("adminAvatar").value = "";
  document.getElementById("adminAvatarURL").value = avatarURL || "";

  document.getElementById("adminModal").classList.add("active");
}

function showConfirm(message) {
  return new Promise(resolve => {
    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    msg.innerText = message;
    modal.classList.add("active");

    function cleanup(result) {
      modal.classList.remove("active");
      yesBtn.removeEventListener("click", onYes);
      noBtn.removeEventListener("click", onNo);
      resolve(result);
    }

    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }

    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
  });
}
async function loadSchools() {
  const snapshot = await getDocs(collection(db, "schools"));
  schoolsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const select = document.getElementById("schoolId");
  if (!select) return;

  select.innerHTML = `<option value="">Pilih Sekolah</option>`;
  schoolsMap = {}; // 🔥 reset map

  schoolsList.forEach(school => {
    schoolsMap[school.id] = {
  name: school.name,
  status: school.status
};
    if (school.status !== "aktif") return;

    const option = document.createElement("option");
    option.value = school.id;
    option.textContent = `${school.name} (${school.code})`;
    select.appendChild(option);
  });
}
// ==========================
// ==========================
// EXPORT GLOBAL
// ==========================
window.showAddForm = showAddForm;
window.closeForm = closeForm;
window.saveAdmin = saveAdmin;       // ✅ tambahkan ini
window.deleteAdmin = deleteAdmin;   // ✅ tambahkan ini
window.nextPage = nextPage;
window.prevPage = prevPage;
window.filterAdmins = filterAdmins;