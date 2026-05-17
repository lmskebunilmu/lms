import { auth, db } from "../../firebase/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query, 
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadLayout } from "../../assets/js/components.js";

let materialsData = [];
let currentSchoolId = null;
let schoolData = null;

// ==========================
// AUTH
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location = "../../login.html";

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  if (userData.role !== "admin") {
    alert("Akses ditolak!");
    return window.location = "../../login.html";
  }

  currentSchoolId = userData.schoolId;

  await loadLayout("admin");

  // 🔥 WAJIB TAMBAH INI
  await waitForHeader();
  await loadProfileHeader(user);

  await loadSchoolData();
  if (!schoolData || schoolData.status !== "aktif") return;

renderActiveSubjects();
await loadSubjects();
await loadMaterials();
});

// ==========================
// LOAD SCHOOL
// ==========================
async function loadSchoolData() {
  const snap = await getDoc(doc(db, "schools", currentSchoolId));
  schoolData = snap.data();

  if (schoolData?.status !== "aktif") {
    showToast("Sekolah kamu nonaktif!", "error");
    lockDashboard();
    return;
  }

  // Sync approved agar hanya yang masih allowed
  const allowed = schoolData.allowedSubjects || [];
  let approved = schoolData.approvedSubjects || [];

  approved = approved.filter(sub => allowed.includes(sub));

  if (approved.length !== (schoolData.approvedSubjects || []).length) {
    await updateDoc(doc(db, "schools", currentSchoolId), {
      approvedSubjects: approved
    });

    schoolData.approvedSubjects = approved;
  }
}

// ==========================
// LOAD MATERIALS
// ==========================
async function loadMaterials() {
  if (!schoolData) return;

  const list = document.getElementById("materialList");
  if (list) {
    list.innerHTML = `<tr><td colspan="5">⏳ Memuat materi...</td></tr>`;
  }

  try {
    const q = query(
      collection(db, "materials"),
      where("level", "==", schoolData.level),
      where("curriculum", "==", schoolData.curriculum)
    );

    const snapshot = await getDocs(q);

    const approved = schoolData.approvedSubjects || [];

    materialsData = (snapshot.docs || [])
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => approved.includes(m.subject));

    renderMaterials(materialsData);

  } catch (err) {
    console.error(err);

    if (list) {
      list.innerHTML = `<tr><td colspan="5">❌ Gagal memuat data</td></tr>`;
    }
  }
}



// ==========================
// RENDER
// ==========================
function renderMaterials(data) {
  const list = document.getElementById("materialList");
  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = `<tr><td colspan="5">Belum ada materi tersedia</td></tr>`;
    return;
  }

  data.forEach(m => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${m.title}</td>
      <td>
  <span style="background:#f1f1f1;padding:4px 8px;border-radius:5px;">
    ${m.subject}
  </span>
</td>
      <td>${m.level}</td>
      <td>${m.curriculum}</td>
      <td>
        <button class="primary" onclick="viewMaterial('${m.id}')">👁</button>
      </td>
    `;

    list.appendChild(tr);
  });
}

async function loadSubjects() {
  const select = document.getElementById("subjectSelect");
  if (!select || !schoolData) return;

  const allowedSubjects = schoolData.allowedSubjects || [];

  select.innerHTML = `<option value="">Pilih Mapel</option>`;

  allowedSubjects.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
}
async function loadProfileHeader(user) {
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  const name = data.name || "Admin";
  const avatar = data.avatarURL || "../../assets/images/default-avatar.png";

  // =========================
  // UPDATE HEADER
  // =========================
  const nameEl = document.getElementById("headerNameHeader");
  if (nameEl) nameEl.innerText = name;

  const avatarEl = document.getElementById("headerAvatarHeader");
  if (avatarEl) avatarEl.src = avatar;

  // =========================
  // LOAD SCHOOL INFO
  // =========================
  if (currentSchoolId) {
    const schoolSnap = await getDoc(doc(db, "schools", currentSchoolId));

    if (schoolSnap.exists()) {
      const school = schoolSnap.data();

      const schoolNameEl = document.getElementById("headerSchoolName");
      if (schoolNameEl) schoolNameEl.innerText = school.name || "-";

      const schoolLogoEl = document.getElementById("headerSchoolLogo");
      if (schoolLogoEl)
        schoolLogoEl.src =
          school.logoURL || "../../assets/images/default-logo.png";
    }
  }
}
// ==========================
// APPROVE
// ==========================
window.approveSubject = async () => {
  const subject = document.getElementById("subjectSelect").value;

  if (!subject) return showToast("Pilih mapel dulu");

  const allowedSubjects = schoolData.allowedSubjects || [];

  if (!allowedSubjects.includes(subject)) {
    return showToast("Mapel tidak diizinkan untuk sekolah ini", "error");
  }

  let subjects = schoolData.approvedSubjects || [];

  if (!subjects.includes(subject)) {
    subjects.push(subject);

    await updateDoc(doc(db, "schools", currentSchoolId), {
      approvedSubjects: subjects
    });

    showToast("Mapel berhasil diaktifkan");

    await loadSchoolData();
    renderActiveSubjects();
    await loadMaterials();
  } else {
    showToast("Mapel sudah aktif");
  }
};

window.removeSubject = async (subject) => {
  let subjects = schoolData.approvedSubjects || [];

  subjects = subjects.filter(s => s !== subject);

  await updateDoc(doc(db, "schools", currentSchoolId), {
    approvedSubjects: subjects
  });

  showToast("Mapel dinonaktifkan");

  await loadSchoolData();
renderActiveSubjects(); // 🔥 WAJIB
loadMaterials();
};
// ==========================
// VIEW
// ==========================
window.viewMaterial = (id) => {
  const data = materialsData.find(m => m.id === id);
  if (!data) return;

  const win = window.open("", "_blank");

  win.document.open();
  win.document.write(generateContent(data.content || ""));
  win.document.close();

  // 🔥 PAKSA MathJax render
  setTimeout(() => {
    if (win.MathJax) {
      win.MathJax.typeset();
    }
  }, 500);
};

// ==========================
// SEARCH
// ==========================
window.filterMaterials = () => {
  const search = document
    .getElementById("searchMaterial")
    .value.toLowerCase();

  const filtered = materialsData.filter(m =>
  m.title.toLowerCase().includes(search) ||
  m.subject.toLowerCase().includes(search)
);

  renderMaterials(filtered);
};

// ==========================
// TOAST
// ==========================
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.innerText = msg;

  t.classList.remove("error");
  if (type === "error") t.classList.add("error");

  t.classList.add("active");

  setTimeout(() => t.classList.remove("active"), 3000);
}

function waitForHeader() {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      const el = document.getElementById("headerAvatarHeader");
      if (el) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
  });
}

function renderActiveSubjects() {
  const container = document.getElementById("activeSubjects");
  if (!container) return;

  const subjects = schoolData.approvedSubjects || [];

  if (subjects.length === 0) {
    container.innerHTML = `<small>Belum ada mapel aktif</small>`;
    return;
  }

  container.innerHTML = subjects.map(sub => `
    <span style="
  background:#e3f2fd;
  color:#1976d2;
  padding:5px 10px;
  margin:3px;
  border-radius:20px;
  display:inline-flex;
  align-items:center;
">
      ${sub}
      <button onclick="removeSubject('${sub}')" style="margin-left:5px;">❌</button>
    </span>
  `).join("");
}

function lockDashboard() {
  const main = document.querySelector(".main");
  if (!main) return;

  main.innerHTML = `
    <div style="
      display:flex;
      justify-content:center;
      align-items:center;
      height:80vh;
      flex-direction:column;
      text-align:center;
    ">
      <h1 style="color:red;">🚫 Akses Ditolak</h1>
      <p>Sekolah kamu sedang <b>nonaktif</b></p>
      <button onclick="location.href='../../login.html'" class="primary">
        Logout
      </button>
    </div>
  `;
}

function generateContent(input) {
  let output = input;

  // YouTube
  output = output.replace(
    /(https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s<]+)/g,
    (url) => {
      let videoId = "";
      if (url.includes("watch?v="))
        videoId = url.split("watch?v=")[1].split("&")[0];
      else if (url.includes("youtu.be/"))
        videoId = url.split("youtu.be/")[1].split("?")[0];

      return `<iframe width="100%" height="315"
        src="https://www.youtube.com/embed/${videoId}"
        allowfullscreen></iframe>`;
    }
  );

  // Google Drive
  output = output.replace(
    /https?:\/\/drive\.google\.com\/file\/d\/([^\/]+)\/view[^\s<]*/g,
    (match, fileId) => {
      return `<iframe src="https://drive.google.com/file/d/${fileId}/preview"
        width="100%" height="500" style="border:none;"></iframe>`;
    }
  );

  // PDF
  output = output.replace(
    /(https?:\/\/[^\s<]+\.pdf)/g,
    (url) => `<iframe src="${url}" width="100%" height="500px"></iframe>`
  );

  // Remove script
  output = output.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  return `
  <html>
  <head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  </head>
  <body>
    ${output}
    <script>
      <script>
  document.addEventListener("DOMContentLoaded", function () {
    if (window.MathJax) {
      MathJax.typesetPromise();
    }
  });
</script>
    </script>
  </body>
  </html>
  `;
}