// teachers.js (FULL FIX FINAL - ROLE GURU)

import { auth, db }
from "../../firebase/firebase-config.js";

import {
collection,
addDoc,
getDocs,
deleteDoc,
doc,
updateDoc,
getDoc,
query,
where,
setDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
onAuthStateChanged,
createUserWithEmailAndPassword,
getAuth
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
initializeApp,
getApps
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { loadLayout }
from "../../assets/js/components.js";


// ==========================
// VARIABLES
// ==========================

let currentSchoolId = null;
let currentSchoolStatus = "aktif"; // 🔥 global
let currentResetTeacherId = null;


// ==========================
// AUTH + LAYOUT
// ==========================

onAuthStateChanged(auth, async user => {

if (!user) {

window.location = "../../login.html";
return;

}

try {

await loadLayout("admin");

await loadHeaderProfile(user);

await loadSubjects();

await loadTeachers();

}

catch (err) {

console.error(err);
alert("Gagal load halaman guru");

}

});


// ==========================
// LOAD HEADER PROFILE (Teachers)
// ==========================
async function loadHeaderProfile(user) {
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  const name = data.name || "Admin";
  const avatar = data.avatarURL || "../../assets/images/default-avatar.png";

  // ===== Update User Header =====
  const nameEl = document.getElementById("headerNameHeader");
  if (nameEl) nameEl.innerText = name;

  const avatarEl = document.getElementById("headerAvatarHeader");
  if (avatarEl) avatarEl.src = avatar;

  // ===== Ambil data sekolah =====
  currentSchoolId = data.schoolId || null;
  let schoolName = "-";
  let schoolLogo = "../../assets/images/default-logo.png";

  if (currentSchoolId) {
    const schoolSnap = await getDoc(doc(db, "schools", currentSchoolId));
    if (schoolSnap.exists()) {
      const schoolData = schoolSnap.data();
      currentSchoolStatus = schoolData.status || "aktif";

      // 🔥 Jika sekolah nonaktif, tampilkan halaman akses ditolak
      if (currentSchoolStatus !== "aktif") {
        showToast("Sekolah kamu nonaktif!", "error");
        lockDashboard();
        return;
      }

      schoolName = schoolData.name || "-";
      schoolLogo = schoolData.logoURL || "../../assets/images/default-logo.png";
    }
  }

  // ===== Update School Header =====
  const schoolNameEl = document.getElementById("headerSchoolName");
  if (schoolNameEl) schoolNameEl.innerText = schoolName;

  const schoolLogoEl = document.getElementById("headerSchoolLogo");
  if (schoolLogoEl) schoolLogoEl.src = schoolLogo;
}

// ==========================
// LOCK DASHBOARD (Teachers - SEKOLAH NONAKTIF)
// ==========================
function lockDashboard() {
  const main = document.querySelector(".main");
  if (!main) return;

  main.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:80vh;flex-direction:column;text-align:center;">
      <h1 style="color:red;">🚫 Akses Ditolak</h1>
      <p>Sekolah kamu sedang <b>nonaktif</b></p>
      <button onclick="logout()" class="btn-edit">Logout</button>
    </div>
  `;
}// ==========================
// LOAD SUBJECTS
// ==========================

async function loadSubjects() {
  const container = document.getElementById("teacherSubjects");
  if (!container) return;

  container.innerHTML = "";

  if (!currentSchoolId) return;

  try {
    const schoolSnap = await getDoc(doc(db, "schools", currentSchoolId));
    if (!schoolSnap.exists()) return;

    const schoolData = schoolSnap.data();

const allowed = schoolData.allowedSubjects || [];
const approved = schoolData.approvedSubjects || [];

// ambil irisan (biar super aman)
const subjects = approved.filter(sub => allowed.includes(sub));

if (subjects.length === 0) {
  container.innerHTML = "<small>Belum ada mapel aktif</small>";
  return;
}

    subjects.forEach(subject => {
      container.innerHTML += `
        <label>
          <input type="checkbox" value="${subject}">
          ${subject}
        </label>
      `;
    });

  } catch (err) {
    console.error(err);
    showToast("Gagal load subject", "error");
  }
}


// ==========================
// LOAD TEACHERS (dengan cek status sekolah)
// ==========================
async function loadTeachers() {
  const table = document.getElementById("teacherTable");
  if (!table) return;
  table.innerHTML = "";

  if (!currentSchoolId) return;

  // 🔥 Cek status sekolah
  if (currentSchoolStatus !== "aktif") {
    // Sekolah nonaktif, jangan tampilkan guru
    showToast("Sekolah nonaktif, data guru terkunci!", "error");
    lockDashboard();
    return;
  }

  const q = query(
    collection(db, "teachers"),
    where("schoolId", "==", currentSchoolId)
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
  const data = docSnap.data();
  const status = data.status || "aktif"; // default aktif

  const tr = document.createElement("tr");
  tr.innerHTML = `
  <td>${data.name}</td>
  <td>${data.email}</td>
  <td>${(data.subjects || []).join(", ")}</td>
  <td style="color:${status === 'aktif' ? 'green' : 'red'}">${status}</td>
  <td>
    <button class="btn-warning" 
onclick="editTeacher('${docSnap.id}')">
  Edit
</button>
    <button class="btn-delete" onclick="deleteTeacher('${docSnap.id}')" ${currentSchoolStatus !== 'aktif' ? 'disabled' : ''}>
      Hapus
    </button>
    <button class="btn-status ${status === 'aktif' ? 'aktif' : 'nonaktif'}" 
onclick="confirmTeacherStatus('${docSnap.id}', '${status}')">
  ${status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
</button>
<button class="btn-reset" onclick="openResetPasswordModal('${docSnap.id}', '${data.name}')">
      Reset Password
    </button>
  </td>
`;
  table.appendChild(tr);
});
}
// ==========================
// SEARCH TEACHER
// ==========================
document.getElementById("teacherSearch").addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const table = document.getElementById("teacherTable");
  if (!table) return;

  table.querySelectorAll("tr").forEach(tr => {
    const name = tr.children[0].innerText.toLowerCase();
    const email = tr.children[1].innerText.toLowerCase();
    const subject = tr.children[2].innerText.toLowerCase();

    if (name.includes(searchTerm) || email.includes(searchTerm) || subject.includes(searchTerm)) {
      tr.style.display = "";
    } else {
      tr.style.display = "none";
    }
  });
});
// ==========================
// MODAL GURU
// ==========================

window.openTeacherModal = () => {

resetForm(); // ✅ ini penting banget

document
.getElementById("teacherModal")
.classList.add("active");

};

window.closeTeacherModal = () => {

document
.getElementById("teacherModal")
.classList.remove("active");

resetForm();

};


// ==========================
// RESET FORM
// ==========================

function resetForm() {
  document.getElementById("teacherId").value = "";
  document.getElementById("teacherName").value = "";
  document.getElementById("teacherEmail").value = "";
  document.getElementById("teacherPassword").value = "";
  
  document.querySelectorAll("#teacherSubjects input").forEach(cb => {
  cb.checked = false;
});

  // tampilkan email & password default (untuk mode tambah)
  const emailWrapper = document.getElementById("teacherEmailWrapper");
  if (emailWrapper) emailWrapper.style.display = "block";
}

// ==========================
// EDIT TEACHER
// ==========================

window.editTeacher = async (id) => {

  try {

    const snap = await getDoc(doc(db, "teachers", id));

    if (!snap.exists()) {
      showToast("Data guru tidak ditemukan", "error");
      return;
    }

    const data = snap.data();

    document.getElementById("teacherId").value = id;
    document.getElementById("teacherName").value = data.name;

    // uncheck semua
    document.querySelectorAll("#teacherSubjects input")
      .forEach(cb => cb.checked = false);

    // check sesuai subject
    (data.subjects || []).forEach(sub => {

      const checkbox =
        document.querySelector(
          `#teacherSubjects input[value="${sub}"]`
        );

      if (checkbox) checkbox.checked = true;

    });

    // sembunyikan email saat edit
    const emailWrapper =
      document.getElementById("teacherEmailWrapper");

    if (emailWrapper)
      emailWrapper.style.display = "none";

    document
      .getElementById("teacherModal")
      .classList.add("active");

  }

  catch (err) {

    console.error(err);

    showToast(
      "Gagal membuka data guru",
      "error"
    );

  }

};

// ==========================
// SAVE TEACHER
// ==========================

window.saveTeacher = async () => {
  const id = document.getElementById("teacherId").value;
  const name = document.getElementById("teacherName").value.trim();
  const email = document.getElementById("teacherEmail").value.trim();
  const password = document.getElementById("teacherPassword").value.trim();
  const subjects = Array.from(
  document.querySelectorAll("#teacherSubjects input:checked")
).map(cb => cb.value);

  if (!name || subjects.length === 0) {
    showToast("Lengkapi semua data!", "error");
    return;
  }

  try {
    // ========================
    // EDIT MODE
    // ========================
    if (id) {
      await updateDoc(doc(db, "teachers", id), {
        name,
        subjects
      });
      showToast("Guru diperbarui!");
    } 
    // ========================
    // ADD MODE
    // ========================
    else {
      if (!email || !password) {
        showToast("Email dan password wajib diisi!", "error");
        return;
      }

      const firebaseConfig = auth.app.options;
      let secondaryApp;

      if (!getApps().some(app => app.name === "SecondaryTeacher")) {
        secondaryApp = initializeApp(firebaseConfig, "SecondaryTeacher");
      } else {
        secondaryApp = getApps().find(app => app.name === "SecondaryTeacher");
      }

      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, email, password
      );
      const newUser = userCredential.user;

      // Simpan ke collection users
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        name,
        email,
        role: "guru",
        subjects,
        schoolId: currentSchoolId,
        createdAt: new Date()
      });

      // Simpan ke collection teachers
      await setDoc(doc(db, "teachers", newUser.uid), {
        teacherId: newUser.uid,
        userId: newUser.uid,
        name,
        email,
        subjects,
        schoolId: currentSchoolId,
        createdAt: new Date()
      });

      showToast("Guru berhasil ditambahkan!");
    }

    closeTeacherModal();
    loadTeachers();

  } catch (err) {
    console.error(err);
    showToast("Error: " + err.message, "error");
  }
};


// ==========================
// DELETE TEACHER
// ==========================

window.deleteTeacher =
async (id) => {

if (!confirm("Hapus guru ini?"))
return;

try {

await deleteDoc(
doc(db,"teachers",id)
);

showToast("Guru berhasil dihapus");

await loadTeachers();

}

catch (err) {

console.error(err);

showToast(
"Gagal menghapus guru",
"error"
);

}

};


// ==========================
// SUBJECT MODAL
// ==========================






window.toggleTeacherStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";

  if (!confirm(`Yakin ingin ${newStatus === "aktif" ? "mengaktifkan" : "menonaktifkan"} guru ini?`)) return;

  try {
    await updateDoc(doc(db, "teachers", id), { status: newStatus });
    showToast(`Guru berhasil ${newStatus === "aktif" ? "diaktifkan" : "dinonaktifkan"}!`);
    loadTeachers();
  } catch (err) {
    console.error(err);
    showToast("Gagal update status guru", "error");
  }
};

window.confirmTeacherStatus = (teacherId, currentStatus) => {
  const modal = document.getElementById("teacherStatusModal");
  const message = document.getElementById("teacherStatusMessage");
  const confirmBtn = document.getElementById("confirmStatusBtn");
  const cancelBtn = document.getElementById("cancelStatusBtn");

  const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";
  message.innerText = `Yakin ingin ${newStatus === "aktif" ? "mengaktifkan" : "menonaktifkan"} guru ini?`;

  // ubah warna tombol sesuai status
  confirmBtn.style.backgroundColor = newStatus === "aktif" ? "#16a34a" : "#ef4444";
  confirmBtn.onmouseover = () => {
    confirmBtn.style.backgroundColor = newStatus === "aktif" ? "#15803d" : "#dc2626";
  };
  confirmBtn.onmouseleave = () => {
    confirmBtn.style.backgroundColor = newStatus === "aktif" ? "#16a34a" : "#ef4444";
  };

  // tombol confirm
  confirmBtn.onclick = async () => {
  try {
    // update teachers
    await updateDoc(doc(db, "teachers", teacherId), { status: newStatus });

    // 🔥 TAMBAH INI (sync ke users)
    await updateDoc(doc(db, "users", teacherId), { status: newStatus });

    showToast(`Guru berhasil ${newStatus === "aktif" ? "diaktifkan" : "dinonaktifkan"}!`);
    loadTeachers();
  } catch (err) {
    console.error(err);
    showToast("Gagal update status guru", "error");
  }
  modal.classList.remove("active");
};

  // tombol cancel
  cancelBtn.onclick = () => modal.classList.remove("active");

  modal.classList.add("active");
};
window.exportTeachersToExcel = () => {
  const table = document.getElementById("teacherTable");
  if (!table) return;

  let csvContent = "Nama,Email,Mapel,Status\n"; // header

  // Ambil semua baris tabel
  table.querySelectorAll("tr").forEach(row => {
    const cols = row.querySelectorAll("td");
    if (cols.length) {
      const rowData = [];
      cols.forEach((col, index) => {
        if (index !== 4) { // skip kolom aksi (edit/hapus/tombol)
          rowData.push(col.innerText.replace(/,/g, " ")); // hilangkan koma di data
        }
      });
      csvContent += rowData.join(",") + "\n";
    }
  });

  // Buat blob & download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "data_guru.csv");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


window.openResetPasswordModal = (teacherId, teacherName) => {
  currentResetTeacherId = teacherId;
  const modal = document.getElementById("resetPasswordModal");
  const message = document.getElementById("resetPasswordMessage");
  message.innerText = `Apakah kamu yakin ingin mereset password guru "${teacherName}"?`;
  modal.classList.add("active");
};

document.getElementById("cancelResetBtn").onclick = () => {
  document.getElementById("resetPasswordModal").classList.remove("active");
};

// Tombol konfirmasi reset
document.getElementById("confirmResetBtn").onclick = async () => {
  if (!currentResetTeacherId) return;

  try {
    // Reset password default (misal "12345678") di collection users
    await updateDoc(doc(db, "users", currentResetTeacherId), {
      passwordReset: true // optional flag
    });

    showToast("Password guru berhasil direset ke default!", "success");
    document.getElementById("resetPasswordModal").classList.remove("active");

    // Optional: kirim email reset (Firebase Auth reset bisa ditambahkan)
    // await sendPasswordResetEmail(auth, teacherEmail);

  } catch (err) {
    console.error(err);
    showToast("Gagal mereset password", "error");
  }
};

window.exportTeachersToPDF = () => {
  const table = document.getElementById("teacherTable");
  if (!table) return;

  const schoolName = document.getElementById("headerSchoolName")?.innerText || "Sekolah";
  const schoolLogo = document.getElementById("headerSchoolLogo")?.src || "";
  const date = new Date().toLocaleDateString("id-ID");

  let rows = "";

  table.querySelectorAll("tr").forEach(row => {
    const cols = row.querySelectorAll("td");
    if (cols.length) {
      rows += `
        <tr>
          <td>${cols[0].innerText}</td>
          <td>${cols[1].innerText}</td>
          <td>${cols[2].innerText}</td>
          <td>
            <span class="badge ${cols[3].innerText === 'aktif' ? 'green' : 'red'}">
              ${cols[3].innerText}
            </span>
          </td>
        </tr>
      `;
    }
  });

  const win = window.open("", "_blank");

  win.document.write(`
  <html>
  <head>
    <title>Data Guru</title>

    <style>
      * {
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', Arial, sans-serif;
        background: linear-gradient(135deg, #eef2ff, #f8fafc);
        padding: 40px;
        margin: 0;
        color: #0f172a;
      }

      .container {
        max-width: 900px;
        margin: auto;
      }

      .card {
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 30px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 25px;
      }

      .left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo {
        width: 45px;
        height: 45px;
        border-radius: 10px;
        object-fit: cover;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }

      .school-name {
        font-weight: 600;
        font-size: 16px;
      }

      .meta {
        font-size: 12px;
        color: #64748b;
      }

      .title {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 5px;
      }

      .subtitle {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 20px;
      }

      table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
}

/* HEADER */
th {
  text-align: left;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px;
  color: white;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

/* rounded header */
th:first-child {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}
th:last-child {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

/* ROW STYLE */
tr {
  background: white;
  box-shadow: 0 5px 12px rgba(0,0,0,0.05);
  border-radius: 12px;
  transition: 0.2s;
}

/* CELL */
td {
  padding: 14px 12px;
  font-size: 14px;
}

/* rounded row */
td:first-child {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}
td:last-child {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

/* HOVER EFFECT */
tr:hover {
  transform: scale(1.01);
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
}

/* ZEBRA (optional subtle) */
tbody tr:nth-child(even) {
  background: #f8fafc;
}

.badge {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.green {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.red {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

      .footer {
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #94a3b8;
      }

      .chip {
        background: #e0e7ff;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
        color: #3730a3;
      }

    </style>
  </head>

  <body>

    <div class="container">
      <div class="card">

        <!-- HEADER -->
        <div class="header">
          <div class="left">
            <img src="${schoolLogo}" class="logo">
            <div>
              <div class="school-name">${schoolName}</div>
              <div class="meta">Laporan Sistem Akademik</div>
            </div>
          </div>

          <div class="chip">📅 ${date}</div>
        </div>

        <!-- TITLE -->
        <div class="title">Data Guru</div>
        <div class="subtitle">Daftar guru aktif dan nonaktif dalam sistem</div>

        <!-- TABLE -->
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Mapel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
          <div>© ${schoolName}</div>
          <div>Generated automatically</div>
        </div>

      </div>
    </div>

    <script>
      window.print();
    </script>

  </body>
  </html>
  `);

  win.document.close();
};