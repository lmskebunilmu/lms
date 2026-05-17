// bookingStudent.js (FULL FIX FINAL)

import { auth, db }
from "../firebase/firebase-config.js";

import {
  onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
  doc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  loadLayout
}
from "../assets/js/components.js";

// ==========================
// VARIABLES
// ==========================

let currentStudentData = null;
let currentSchoolId = null;

// ==========================
// AUTH + LOAD LAYOUT
// ==========================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location = "../login.html";
    return;

  }

  try {

    // ==========================
    // LOAD USER DATA
    // ==========================

    const userSnap =
    await getDoc(
      doc(db, "users", user.uid)
    );

    if (!userSnap.exists()) {

      alert("User tidak ditemukan");
      return;

    }

    currentStudentData =
    userSnap.data();

    currentSchoolId =
    currentStudentData.schoolId || null;

    // ==========================
    // LOAD LAYOUT
    // ==========================

    await loadLayout("student");

    // ==========================
    // LOAD HEADER PROFILE
    // ==========================

    await loadHeaderProfile(user);

    // ==========================
    // LOAD BOOKINGS
    // ==========================

    await loadBookings();

  }

  catch (err) {

    console.error(err);

    showToast(
      "Gagal load halaman booking",
      "error"
    );

  }

});

// ==========================
// LOAD HEADER PROFILE
// ==========================

async function loadHeaderProfile(user) {

  try {

    const data =
    currentStudentData;

    const name =
    data.name || "Student";

    const avatar =
    data.avatarURL ||
    "../assets/images/default-avatar.png";

    // ==========================
    // HEADER USER
    // ==========================

    const nameEl =
    document.getElementById(
      "headerNameHeader"
    );

    if (nameEl)
    nameEl.innerText = name;

    const avatarEl =
    document.getElementById(
      "headerAvatarHeader"
    );

    if (avatarEl)
    avatarEl.src = avatar;

    // ==========================
    // SCHOOL HEADER
    // ==========================

    let schoolName = "-";

    let schoolLogo =
    "../assets/images/default-logo.png";

    if (currentSchoolId) {

      const schoolSnap =
      await getDoc(
        doc(db, "schools", currentSchoolId)
      );

      if (schoolSnap.exists()) {

        const schoolData =
        schoolSnap.data();

        schoolName =
        schoolData.name || "-";

        schoolLogo =
        schoolData.logoURL ||
        "../assets/images/default-logo.png";

      }

    }

    const schoolNameEl =
    document.getElementById(
      "headerSchoolName"
    );

    if (schoolNameEl)
    schoolNameEl.innerText =
    schoolName;

    const schoolLogoEl =
    document.getElementById(
      "headerSchoolLogo"
    );

    if (schoolLogoEl)
    schoolLogoEl.src =
    schoolLogo;

  }

  catch (err) {

    console.error(err);

  }

}

// ==========================
// LOAD BOOKINGS
// ==========================

async function loadBookings() {

  const container =
  document.getElementById(
    "bookingContainer"
  );

  if (!container) return;

  container.innerHTML = `

    <div class="empty-state">
      <h3>⏳ Memuat jadwal booking...</h3>
    </div>

  `;

  try {

    // ==========================
    // QUERY SCHEDULE
    // ==========================

    let bookingQuery;

    if (currentSchoolId) {

      bookingQuery =
      query(
        collection(db, "teacher_schedules"),

        where(
          "schoolId",
          "==",
          currentSchoolId
        )
      );

    }

    else {

      bookingQuery =
      collection(
        db,
        "teacher_schedules"
      );

    }

    const snap =
    await getDocs(
      bookingQuery
    );

    // ==========================
    // EMPTY
    // ==========================

    if (snap.empty) {

      container.innerHTML = `

        <div class="empty-state">

          <h3>
            📭 Belum ada jadwal booking
          </h3>

          <p>
            Teacher belum membuat jadwal
          </p>

        </div>

      `;

      return;

    }

    container.innerHTML = "";

    // ==========================
    // LOOP BOOKINGS
    // ==========================

    snap.forEach(docSnap => {

      const data =
      docSnap.data();

      const div =
      document.createElement("div");

      div.className =
      "booking-card";

      const days =
      Array.isArray(data.days)
      ? data.days.join(", ")
      : "-";

      div.innerHTML = `

        <div class="teacher-top">

          <img
            src="${
              data.teacherPhoto ||
              "../assets/images/default-avatar.png"
            }"
            class="teacher-avatar"
          >

          <div>

            <div class="teacher-name">
              ${data.teacherName || "-"}
            </div>

            <div class="teacher-subject">
              ${data.subject || "Teacher"}
            </div>

          </div>

        </div>

        <div class="booking-info">

          <div class="info-badge">
            📅 ${days}
          </div>

          <div class="info-badge">
            ⏰ ${data.startTime || "-"} - ${data.endTime || "-"}
          </div>

          <div class="info-badge">
            👥 Kuota ${data.quota || 0}
          </div>

          <div class="info-badge">
            🏫 ${data.mode || "Online"}
          </div>

        </div>

        <div class="booking-footer">

          <div class="booking-status">
            ● ${data.status || "active"}
          </div>

          <button
            class="btn-book"
            onclick="bookTeacher('${docSnap.id}')"
          >

            Booking Sekarang

          </button>

        </div>

      `;

      container.appendChild(div);

    });

  }

  catch (err) {

    console.error(err);

    container.innerHTML = `

      <div class="empty-state">

        <h3>
          ❌ Gagal load booking
        </h3>

      </div>

    `;

  }

}

// ==========================
// BOOK TEACHER
// ==========================

window.bookTeacher =
async (scheduleId) => {

  try {

    const user =
    auth.currentUser;

    if (!user) {

      showToast(
        "User tidak ditemukan",
        "error"
      );

      return;

    }

    // ==========================
    // CEK DUPLIKAT BOOKING
    // ==========================

    const q =
    query(
      collection(db, "student_bookings"),

      where(
        "studentId",
        "==",
        user.uid
      ),

      where(
        "scheduleId",
        "==",
        scheduleId
      )
    );

    const existingSnap =
    await getDocs(q);

    if (!existingSnap.empty) {

      showToast(
        "Kamu sudah booking jadwal ini",
        "error"
      );

      return;

    }

    // ==========================
    // SAVE BOOKING
    // ==========================

    await addDoc(
      collection(db, "student_bookings"),
      {

        scheduleId,

        studentId:
        user.uid,

        studentName:
        currentStudentData.name || "-",

        studentEmail:
        currentStudentData.email || "-",

        schoolId:
        currentSchoolId || null,

        createdAt:
        serverTimestamp(),

        status:
        "pending"

      }
    );

    showToast(
      "Booking berhasil dibuat"
    );

  }

  catch (err) {

    console.error(err);

    showToast(
      "Gagal booking",
      "error"
    );

  }

};

// ==========================
// TOAST
// ==========================

function showToast(
  message,
  type = "success"
) {

  const toast =
  document.getElementById("toast");

  if (!toast) {

    alert(message);
    return;

  }

  toast.innerText =
  message;

  toast.className =
  type === "error"
  ? "toast error active"
  : "toast active";

  setTimeout(() => {

    toast.classList.remove(
      "active"
    );

  }, 3000);

}