// dashboard.js (Superadmin Dashboard)

import { auth, db } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged,
  updateEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadLayout } from "../assets/js/components.js";

await loadLayout("superadmin");

// ==========================
// CLOUDINARY CONFIG
// ==========================
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/djlvnubgn/image/upload";
const CLOUDINARY_PRESET = "lmsmultischool";

// ==========================
// AUTH STATE
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location = "../login.html";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      alert("User tidak ditemukan!");
      window.location = "../login.html";
      return;
    }

    const userData = userDoc.data();

    if (userData.role !== "super_admin") {
      alert("Akses ditolak!");
      window.location = "../login.html";
      return;
    }

    await loadProfileHeader(user);
    await loadDashboard();
    setupAvatarPreview();

  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan!");
  }
});

// ==========================
// UPLOAD CLOUDINARY
// ==========================
async function uploadToCloudinary(file) {

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("folder", "lms/avatars"); // optional (rapi)

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!data.secure_url) {
      console.error(data);
      throw new Error("Upload gagal");
    }

    return data.secure_url;

  } catch (error) {
    console.error(error);
    alert("Upload gambar gagal!");
    return null;
  }
}

// ==========================
// PREVIEW AVATAR
// ==========================
function setupAvatarPreview() {
  const fileInput = document.getElementById("avatarFile");
  if (!fileInput) return;

  fileInput.addEventListener("change", function () {

    const file = this.files[0];
    if (!file) return;

    // VALIDASI
    if (!file.type.startsWith("image/")) {
      alert("File harus gambar!");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Maksimal 2MB!");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const preview = document.getElementById("headerAvatarCard");
      if (preview) preview.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// ==========================
// LOAD PROFILE
// ==========================
async function loadProfileHeader(user) {

  const docSnap = await getDoc(doc(db, "users", user.uid));
  const data = docSnap.exists() ? docSnap.data() : {};

  const name = data.name || user.displayName || "Admin";
  const avatar =
  data.avatar ||
  user.photoURL ||
  "https://res.cloudinary.com/djlvnubgn/image/upload/v1710000000/default-avatar.png";
  const email = data.email || user.email;

  document.getElementById("headerNameCard").innerText = name;
  document.getElementById("headerAvatarCard").src = avatar;
  document.getElementById("headerEmailCard").innerText = email;

  const headerName = document.getElementById("headerNameHeader");
  const headerAvatar = document.getElementById("headerAvatarHeader");

  if (headerName) headerName.innerText = name;
  if (headerAvatar) headerAvatar.src = avatar;

  document.getElementById("profileName").value = name;
  document.getElementById("profileEmail").value = email;
  document.getElementById("profileAvatar").value = avatar;
}

// ==========================
// MODAL
// ==========================
window.openProfileModal = () => {
  document.getElementById("profileModal").classList.add("active");
};

window.closeProfileModal = () => {
  document.getElementById("profileModal").classList.remove("active");
};

// ==========================
// SAVE PROFILE
// ==========================
window.saveProfile = async () => {

  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("profileName").value.trim();
  const email = document.getElementById("profileEmail").value.trim();
  let avatar = document.getElementById("profileAvatar").value.trim();
  const fileInput = document.getElementById("avatarFile");

  if (!name || !email) {
    alert("Isi semua data!");
    return;
  }

  try {

    // upload avatar kalau ada file
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const uploadedUrl = await uploadToCloudinary(file);
      if (uploadedUrl) avatar = uploadedUrl;
    }

    await updateProfile(user, {
      displayName: name,
      photoURL: avatar
    });

    // update email (safe)
    if (email !== user.email) {
      try {
        await updateEmail(user, email);
      } catch (err) {
        if (err.code === "auth/requires-recent-login") {
          alert("Login ulang untuk ganti email!");
          return;
        } else {
          throw err;
        }
      }
    }

    await updateDoc(doc(db, "users", user.uid), {
      name,
      email,
      avatar
    });

    alert("Profil berhasil diperbarui!");

    closeProfileModal();
    await loadProfileHeader(user);

  } catch (err) {
    console.error(err);
    alert("Gagal update profil: " + err.message);
  }
};

// ==========================
// DASHBOARD
// ==========================
let chartInstance;

async function loadDashboard() {

  const totalSchoolsEl = document.getElementById("totalSchools");
  const totalAdminsEl = document.getElementById("totalAdmins");

  const schoolSnap = await getDocs(collection(db, "schools"));
  const userSnap = await getDocs(collection(db, "users"));

  totalSchoolsEl.innerText = schoolSnap.size;

  let adminCount = 0;
  const activity = [];

  userSnap.forEach(docSnap => {
    const data = docSnap.data();

    if (data.role === "admin") adminCount++;

    if (data.createdAt?.toDate) {
      activity.push({
        desc: `${data.name || "User"} dibuat`,
        time: data.createdAt.toDate()
      });
    }
  });

  totalAdminsEl.innerText = adminCount;

  renderTimeline(activity);
  renderCityChart(schoolSnap);
}

// ==========================
// TIMELINE
// ==========================
function renderTimeline(activity) {

  const el = document.getElementById("activityTimeline");
  el.innerHTML = "";

  activity.sort((a, b) => b.time - a.time);

  activity.forEach(a => {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.innerHTML = `${a.desc}<span>${a.time.toLocaleString()}</span>`;
    el.appendChild(div);
  });
}

// ==========================
// CHART
// ==========================
function renderCityChart(schoolSnap) {

  const cityCount = {};

  schoolSnap.forEach(docSnap => {
    const city = docSnap.data().city || "Lainnya";
    cityCount[city] = (cityCount[city] || 0) + 1;
  });

  const ctx = document.getElementById("schoolChart").getContext("2d");

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(cityCount),
      datasets: [{
        data: Object.values(cityCount),
        backgroundColor: "#3b82f6"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}