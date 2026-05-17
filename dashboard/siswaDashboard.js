import { auth, db } from "../firebase/firebase-config.js";

import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadLayout } from "../assets/js/components.js";

let currentSchoolName = "-";
let currentSchoolLogo = "../assets/images/default-logo.png";


// ==========================
// AUTH STATE
// ==========================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location = "../login.html";
    return;
  }

  try {

    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      alert("User tidak ditemukan");
      window.location = "../login.html";
      return;
    }

    const userData = userSnap.data();

    // ✅ VALIDASI SISWA
    if (userData.role !== "siswa") {
      alert("Akses hanya untuk siswa");
      window.location = "../login.html";
      return;
    }

    // ==========================
    // LOAD LAYOUT
    // ==========================
    await loadLayout("siswa");

    await waitForHeader();

    await loadProfileHeader(user);
    await loadStats(user);
    await loadClassAndSubjects(user);

  } catch (err) {
    console.error(err);
  }

});


// ==========================
// WAIT HEADER
// ==========================
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


// ==========================
// LOAD PROFILE + SEKOLAH
// ==========================
async function loadProfileHeader(user) {

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  const name = data.name || user.displayName || "Siswa";
  const email = data.email || user.email;
  const avatar =
    data.avatarURL ||
    user.photoURL ||
    "../assets/images/default-avatar.png";

  const schoolId = data.schoolId || null;

  // ==========================
  // AMBIL SEKOLAH
  // ==========================
  let schoolName = "-";
  let schoolLogo = "../assets/images/default-logo.png";

  if (schoolId) {

    const schoolSnap = await getDoc(doc(db, "schools", schoolId));

    if (schoolSnap.exists()) {

      const schoolData = schoolSnap.data();

      // 🚨 CEK STATUS
      if (schoolData.status !== "aktif") {
        showToast("Sekolah nonaktif", "error");
        lockDashboard();
        return;
      }

      schoolName = schoolData.name || "-";
      schoolLogo = schoolData.logoURL || schoolLogo;
    }
  }

  currentSchoolName = schoolName;
  currentSchoolLogo = schoolLogo;

  // ==========================
  // HEADER
  // ==========================
  const nameHeader = document.getElementById("headerNameHeader");
  if (nameHeader) nameHeader.innerText = name;

  const avatarHeader = document.getElementById("headerAvatarHeader");
  if (avatarHeader) avatarHeader.src = avatar;

  const schoolNameEl = document.getElementById("headerSchoolName");
  if (schoolNameEl) schoolNameEl.innerText = schoolName;

  const schoolLogoEl = document.getElementById("headerSchoolLogo");
  if (schoolLogoEl) schoolLogoEl.src = schoolLogo;

  // ==========================
  // PROFILE CARD
  // ==========================
  const nameCard = document.getElementById("headerNameCard");
  if (nameCard) nameCard.innerText = name;

  const emailCard = document.getElementById("headerEmailCard");
  if (emailCard) emailCard.innerText = email;

  const avatarCard = document.getElementById("headerAvatarCard");
  if (avatarCard) avatarCard.src = avatar;

  const schoolCard = document.getElementById("headerSchoolCard");
  if (schoolCard) schoolCard.innerText = schoolName;

}


// ==========================
// LOAD STATS (KHUSUS SISWA)
// ==========================
async function loadStats(user) {

  try {

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const data = userSnap.data();

    const classId = data.classId;
    const schoolId = data.schoolId;

    if (!classId) return;

    // ==========================
    // MATERIALS
    // ==========================
    const qMaterials = query(
      collection(db, "materials"),
      where("classId", "==", classId),
      where("schoolId", "==", schoolId)
    );

    const snapMaterials = await getDocs(qMaterials);

    const matEl = document.getElementById("totalMaterials");
    if (matEl) matEl.innerText = snapMaterials.size;

    // ==========================
    // ASSIGNMENTS
    // ==========================
    const qAssignments = query(
      collection(db, "assignments"),
      where("classId", "==", classId),
      where("schoolId", "==", schoolId)
    );

    const snapAssignments = await getDocs(qAssignments);

    const assEl = document.getElementById("totalAssignments");
    if (assEl) assEl.innerText = snapAssignments.size;

  } catch (err) {
    console.error(err);
  }

}


// ==========================
// MODAL PROFILE (SAMA KAYAK GURU)
// ==========================
window.openProfileModal = () => {
  document.getElementById("profileModal")?.classList.add("active");
};

window.closeProfileModal = () => {
  document.getElementById("profileModal")?.classList.remove("active");
};


// ==========================
// SAVE PROFILE
// ==========================
window.saveProfile = async () => {

  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("profileName").value.trim();
  const email = document.getElementById("profileEmail").value.trim();

  if (!name || !email) {
    showToast("Isi semua data", "error");
    return;
  }

  try {

    await updateProfile(user, {
      displayName: name
    });

    if (email !== user.email) {
      await updateEmail(user, email);
    }

    await updateDoc(doc(db, "users", user.uid), {
      name,
      email
    });

    showToast("Profil berhasil diupdate");

    closeProfileModal();

    await loadProfileHeader(user);

  } catch (err) {
    console.error(err);
    showToast("Gagal update profil", "error");
  }

};
async function loadClassAndSubjects(user) {

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  const classId = userData.classId;
  const schoolId = userData.schoolId;

  if (!classId) return;

  // ======================
  // AMBIL KELAS
  // ======================
  const classSnap = await getDoc(doc(db, "classes", classId));

  if (!classSnap.exists()) return;

  const classData = classSnap.data();

  let html = `<h4>🏫 ${classData.name}</h4>`;

  // ======================
  // AMBIL TEACHER IDS DARI KELAS
  // ======================
  const teacherIds = classData.teacherIds || [];

  if (teacherIds.length === 0) {
    html += `<p>Belum ada guru di kelas ini</p>`;
    document.getElementById("classContainer").innerHTML = html;
    return;
  }

  // ======================
  // AMBIL DATA GURU (DARI COLLECTION teachers)
  // ======================
  const subjectsSet = new Set();

  for (const teacherId of teacherIds) {

    const q = query(
      collection(db, "teachers"),
      where("teacherId", "==", teacherId),
      where("schoolId", "==", schoolId)
    );

    const snap = await getDocs(q);

    snap.forEach(docSnap => {
      const data = docSnap.data();

      if (data.subject) {
        subjectsSet.add(data.subject);
      }
    });

  }

  const subjects = [...subjectsSet];

  // ======================
  // RENDER
  // ======================
  if (subjects.length === 0) {
    html += `<p>Belum ada mata pelajaran</p>`;
  } else {

    subjects.forEach(subject => {

  html += `
  <div class="subject-card"
       style="padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:8px; cursor:pointer;"
       onclick="loadSubjectDetail('${subject}','${classId}','${schoolId}')">

    📘 ${subject}

  </div>
`;
});

  }

  document.getElementById("classContainer").innerHTML = html;
}


window.loadSubjectDetail = async (subjectName, classId, schoolId) => {

  const schoolSnap = await getDoc(doc(db, "schools", schoolId));
  const schoolData = schoolSnap.data();

  const curriculum = schoolData.curriculum;
  const level = schoolData.level;

  const q = query(
    collection(db, "materials"),
    where("subject", "==", subjectName),
    where("classId", "==", classId),
    where("schoolId", "==", schoolId),
    where("curriculum", "==", curriculum),
    where("level", "==", level)
    // ❌ sementara jangan pakai status dulu
  );

  const snap = await getDocs(q);

  let html = `<h3>📘 ${subjectName}</h3>`;

  if (snap.empty) {
    html += `<p>Belum ada materi</p>`;
    document.getElementById("classContainer").innerHTML = html;
    return;
  }

  let grouped = {};

  snap.forEach(docSnap => {
    const d = docSnap.data();

    const chapter = d.chapter || "Tanpa Bab";
    const sub = d.subChapter || "Tanpa Sub Bab";

    if (!grouped[chapter]) grouped[chapter] = {};
    if (!grouped[chapter][sub]) grouped[chapter][sub] = [];

    grouped[chapter][sub].push({
      id: docSnap.id,
      ...d
    });
  });

  for (const chapter in grouped) {
    html += `<h4>📚 ${chapter}</h4>`;

    for (const sub in grouped[chapter]) {
      html += `<h5 style="margin-left:10px;">📖 ${sub}</h5>`;

      grouped[chapter][sub].forEach(item => {
        html += `
          <div class="card"
               style="margin-left:20px;padding:10px;border-left:3px solid #2563eb;cursor:pointer"
               onclick="openMaterial('${item.id}')">

            ${item.title}

          </div>
        `;
      });
    }
  }

  document.getElementById("classContainer").innerHTML = html;
};


window.openMaterial = async (id) => {

  const snap = await getDoc(doc(db, "materials", id));

  if (!snap.exists()) {
    alert("Materi tidak ditemukan");
    return;
  }

  const data = snap.data();

  document.getElementById("classContainer").innerHTML = `
    <div class="card">
      ${data.content}
    </div>
  `;
};
// ==========================
// LOCK DASHBOARD
// ==========================
function lockDashboard() {

  const main = document.querySelector(".main");

  if (!main) return;

  main.innerHTML = `
    <div style="text-align:center; padding:50px;">
      <h2>🚫 Akses Ditolak</h2>
      <p>Sekolah kamu nonaktif</p>
      <button onclick="window.location='../login.html'">
        Logout
      </button>
    </div>
  `;
}

