import { auth, db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadLayout } from "../../assets/js/components.js";

let students = [];

// ==========================
// AUTH
// ==========================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location = "../../login.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    alert("User tidak ditemukan");
    return;
  }

  const userData = userSnap.data();

  if (userData.role !== "guru") {
    alert("Akses hanya guru");
    return;
  }

  await loadLayout("guru");

  await loadClasses(user);

  // 🔥 LOAD MAPEL PERTAMA
  const firstClass =
    document.getElementById("classSelect").value;

  await loadSubjects(firstClass, user.uid);

  document.getElementById("attendanceDate").value =
    new Date().toISOString().split("T")[0];

  // 🔥 GANTI EVENT INI
  document
    .getElementById("classSelect")
    .addEventListener("change", async () => {

      await loadSubjects(
        document.getElementById("classSelect").value,
        user.uid
      );

      await loadStudents();

    });

  await loadStudents();

});

// ==========================
// LOAD KELAS
// ==========================
async function loadClasses(user) {

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  const q = query(
    collection(db, "classes"),
    where("teacherIds", "array-contains", user.uid),
    where("schoolId", "==", userData.schoolId)
  );

  const snap = await getDocs(q);

  const select = document.getElementById("classSelect");

  select.innerHTML = "";

  snap.forEach((d) => {

    const data = d.data();

    const opt = document.createElement("option");

    opt.value = d.id;
    opt.textContent = data.name;

    select.appendChild(opt);

  });

}

// ==========================
// LOAD SISWA
// ==========================
async function loadStudents() {

  const classId =
    document.getElementById("classSelect").value;

  if (!classId) return;

  const q = query(
    collection(db, "students"),
    where("classId", "==", classId)
  );

  const snap = await getDocs(q);

  students = [];

  snap.forEach((d) => {
    students.push({
      id: d.id,
      ...d.data()
    });
  });

  renderStudents();

}

// ==========================
// RENDER
// ==========================
function renderStudents() {

  const container =
    document.getElementById("studentList");

  container.innerHTML = "";

  if (students.length === 0) {

    container.innerHTML = `
      <p>Tidak ada siswa</p>
    `;

    return;
  }

  students.forEach((siswa) => {

    siswa.status = "hadir";

    const div = document.createElement("div");

    div.className = "student-card";

    div.innerHTML = `

      <div class="student-top">

        <div>

          <div class="student-name">
            ${siswa.name || "-"}
          </div>

          <small>
            NIS: ${siswa.nis || "-"}
          </small>

        </div>

      </div>

      <div class="status-group">

        <button class="status-btn izin"
          onclick="setStatus('${siswa.id}','izin', this)">
          Izin
        </button>

        <button class="status-btn sakit"
          onclick="setStatus('${siswa.id}','sakit', this)">
          Sakit
        </button>

        <button class="status-btn alpha"
          onclick="setStatus('${siswa.id}','alpha', this)">
          Alpha
        </button>

      </div>

      <textarea
        id="note-${siswa.id}"
        placeholder="Catatan..."
      ></textarea>

    `;

    container.appendChild(div);

  });

}

// ==========================
// SET STATUS
// ==========================
window.setStatus = (studentId, status, btn) => {

  const siswa =
    students.find(s => s.id === studentId);

  if (!siswa) return;

  const parent = btn.parentElement;

  parent.querySelectorAll(".status-btn")
    .forEach(b => b.classList.remove("active"));

  // klik status yg sama = kembali hadir
  if (siswa.status === status) {

    siswa.status = "hadir";

    return;
  }

  siswa.status = status;

  btn.classList.add("active");

};

// ==========================
// SIMPAN ABSENSI
// ==========================
window.saveAttendance = async () => {

  const classId =
    document.getElementById("classSelect").value;

  const subject =
    document.getElementById("subjectSelect").value;

  const date =
    document.getElementById("attendanceDate").value;

  if (!classId) {

    showToast("Pilih kelas", "error");

    return;
  }

  const absentStudents = [];

  students.forEach((siswa) => {

    if (siswa.status === "hadir") return;

    const note =
      document.getElementById(`note-${siswa.id}`).value;

    absentStudents.push({

      studentId: siswa.id,

      name: siswa.name || "",

      status: siswa.status,

      note: note || ""

    });

  });

  await addDoc(collection(db, "attendance"), {

    classId,

    subject,

    teacherId: auth.currentUser.uid,

    date,

    absentStudents,

    createdAt: serverTimestamp()

  });

  showToast("Absensi berhasil disimpan");

};

// ==========================
// TOAST
// ==========================
function showToast(msg, type = "success") {

  const t = document.getElementById("toast");

  t.innerText = msg;

  t.className =
    type === "error"
      ? "toast error active"
      : "toast active";

  setTimeout(() => {
    t.classList.remove("active");
  }, 3000);

}

async function loadSubjects(classId, userId) {

  const classSnap =
    await getDoc(doc(db, "classes", classId));

  if (!classSnap.exists()) return;

  const classData = classSnap.data();

  const teacherSubjects =
    classData.teacherMap?.[userId] || [];

  const select =
    document.getElementById("subjectSelect");

  select.innerHTML = "";

  teacherSubjects.forEach(subject => {

    const opt = document.createElement("option");

    opt.value = subject;
    opt.textContent = subject;

    select.appendChild(opt);

  });

}