// classessiperadmin.js

import { db, auth } from "../../firebase/firebase-config.js";

import {

  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {

  onAuthStateChanged

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadLayout }
from "../../assets/js/components.js";

/* =========================
   GLOBAL VARIABLES
========================= */

let editId = null;

let classesData = [];

let filteredData = null;


let currentPage = 0;

let selectedClass = null;

const pageSize = 5;

/* =========================
   AUTH CHECK
========================= */

onAuthStateChanged(auth, async user => {

  if (!user)
    return window.location =
    "../../login.html";

  try {

    await loadLayout("superadmin");

    const userDoc =
    await getDoc(
      doc(db, "users", user.uid)
    );

    const data =
    userDoc.exists()
    ? userDoc.data()
    : {};

    document
    .getElementById("headerNameHeader")
    .innerText =
      data.name ||
      "Super Admin";

    await loadSubjects();

    await loadClasses();
await loadTransactions();
  }

  catch(err){

    console.error(err);

    showToast(
      "Gagal load halaman",
      "error"
    );

  }

});

/* =========================
   MODAL
========================= */

function showAddForm(classData = {}) {

  editId =
  classData.id || null;

  document
  .getElementById("formTitle")
  .innerText =
  editId
  ? "Edit Kelas"
  : "Tambah Kelas";

  document
  .getElementById("className")
  .value =
  classData.className || "";

  document
  .getElementById("level")
  .value =
  classData.level || "";

  document
  .getElementById("curriculum")
  .value =
  classData.curriculum || "";

  document
  .getElementById("subject")
  .value =
  classData.subject || "";

  document.getElementById("classThumbnail").value = "";

 
  document
  .getElementById("isPaid")
  .checked =
  classData.isPaid || false;

const pricingContainer =
document.getElementById("pricingContainer");

pricingContainer.innerHTML = "";

if (
  classData.pricing &&
  classData.pricing.length
){

  classData.pricing.forEach(p => {

    const div =
    document.createElement("div");

    div.className =
    "pricing-item";

    div.innerHTML = `

  <div style="
    display:flex;
    gap:10px;
    align-items:center;
  ">

    <select class="billingPeriod">

      <option value="30"
        ${p.billingPeriod == 30 ? "selected" : ""}
      >
        1 Bulan
      </option>

      <option value="90"
        ${p.billingPeriod == 90 ? "selected" : ""}
      >
        3 Bulan
      </option>

      <option value="180"
        ${p.billingPeriod == 180 ? "selected" : ""}
      >
        6 Bulan
      </option>

      <option value="365"
        ${p.billingPeriod == 365 ? "selected" : ""}
      >
        12 Bulan
      </option>

    </select>

    <input
      type="number"
      class="priceInput"
      value="${p.price || 0}"
      placeholder="Harga"
    >

    <button
      type="button"
      class="danger"
      onclick="removePricingRow(this)"
    >
      🗑
    </button>

  </div>

`;

    pricingContainer.appendChild(div);

  });

}
else{

  addPricingRow();

}
  document
  .getElementById("classModal")
  .classList.add("active");

}

function closeForm(){

  document
  .getElementById("classModal")
  .classList.remove("active");

  document
  .getElementById("className")
  .value = "";

  document
  .getElementById("level")
  .value = "";

  document
  .getElementById("curriculum")
  .value = "";

  document
  .getElementById("subject")
  .value = "";

  document.getElementById("classThumbnail").value = "";

  document.getElementById(
  "pricingContainer"
).innerHTML = "";

addPricingRow();
  
  editId = null;

}

function addPricingRow(){

  const container =
  document.getElementById(
    "pricingContainer"
  );

  const div =
  document.createElement("div");

  div.className =
  "pricing-item";

  div.style.marginTop = "10px";

  div.innerHTML = `

  <div style="
    display:flex;
    gap:10px;
    align-items:center;
  ">

    <select class="billingPeriod">

      <option value="30">
        1 Bulan
      </option>

      <option value="90">
        3 Bulan
      </option>

      <option value="180">
        6 Bulan
      </option>

      <option value="365">
        12 Bulan
      </option>

    </select>

    <input
      type="number"
      class="priceInput"
      placeholder="Harga"
    >

    <button
      type="button"
      class="danger"
      onclick="removePricingRow(this)"
    >
      🗑
    </button>

  </div>

`;

  container.appendChild(div);

}
/* =========================
   TOAST
========================= */

function showToast(
  msg,
  type = "success"
){

  const toast =
  document.getElementById("toast");

  if (!toast) return;

  toast.innerText = msg;

  toast.className =
  `toast ${type} active`;

  setTimeout(() => {

    toast.classList.remove("active");

  }, 3000);

}

/* =========================
   LOAD SUBJECTS
========================= */

async function loadSubjects(){

  const select =
  document.getElementById("subject");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      Pilih Subject
    </option>
  `;

  try {

    const snapshot =
    await getDocs(
      collection(db, "materials")
    );

    const subjects =
    new Set();

    snapshot.forEach(docSnap => {

      const data =
      docSnap.data();

      if (data.subject) {

        subjects.add(data.subject);

      }

    });

    subjects.forEach(subject => {

      const option =
      document.createElement("option");

      option.value =
      subject;

      option.textContent =
      subject;

      select.appendChild(option);

    });

  }

  catch(err){

    console.error(err);

    showToast(
      "Gagal load subject",
      "error"
    );

  }

}

/* =========================
   SAVE CLASS
========================= */

async function saveClass(){

    const saveBtn =
document.querySelector(".modal-actions .primary");

saveBtn.disabled = true;
saveBtn.innerText = "Menyimpan...";

  const className =
  document
  .getElementById("className")
  .value
  .trim();

  const level =
  document
  .getElementById("level")
  .value;

  const curriculum =
  document
  .getElementById("curriculum")
  .value;

  const subject =
  document
  .getElementById("subject")
  .value;

  const pricingItems = [
  ...document.querySelectorAll(".pricing-item")
];

const pricing = pricingItems.map(item => ({

  billingPeriod:
    item.querySelector(".billingPeriod").value,

  price:
    Number(
      item.querySelector(".priceInput").value
    )

}));

const isPaid =
document.getElementById("isPaid").checked;

const thumbnailFile =
document.getElementById("classThumbnail")
.files[0];

  if (
  !className ||
  !level ||
  !curriculum ||
  !subject
) {

  showToast(
    "Lengkapi data",
    "error"
  );

  saveBtn.disabled = false;
  saveBtn.innerText = "Simpan";

  return;
}

  if (isPaid) {

  const invalidPrice = pricing.some(p =>
    !p.price || p.price <= 0
  );

  if (invalidPrice) {

  showToast(
    "Harga harus lebih dari 0",
    "error"
  );

  saveBtn.disabled = false;
  saveBtn.innerText = "Simpan";

  return;
}

}

  try {
let thumbnail = "";

if (editId) {

  const oldDoc = await getDoc(
    doc(db, "classes", editId)
  );

  if (oldDoc.exists()) {
    thumbnail =
    oldDoc.data().thumbnail || "";
  }

}

// upload baru
if (thumbnailFile) {

  const formData = new FormData();

  formData.append(
    "file",
    thumbnailFile
  );

  formData.append(
    "upload_preset",
    "kelas_kursus"
  );

  const cloudName =
  "djlvnubgn";

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await res.json();

  if (!data.secure_url) {

    throw new Error(
      "Upload thumbnail gagal"
    );

  }

  thumbnail =
  data.secure_url;

}

    if (editId) {

      await updateDoc(
  doc(db, "classes", editId),
  {

    className,
    level,
    curriculum,
    subject,
    thumbnail,

    isPaid,
    pricing:
  isPaid
  ? pricing
  : [],
    updatedAt:
    new Date()

  }
);
      showToast(
        "Kelas berhasil diupdate"
      );

    }

    else {

      await addDoc(
  collection(db, "classes"),
  {

    className,
    level,
    curriculum,
    subject,
    thumbnail,

    isPaid,

    pricing:
  isPaid
  ? pricing
  : [],

    createdBy:
      auth.currentUser.uid,

    createdAt:
      new Date()

  }
);
      showToast(
        "Kelas berhasil dibuat"
      );

    }

    closeForm();

    await loadClasses();

  }

  catch(err){

  console.error(err);

  showToast(
    err.message,
    "error"
  );

}

finally {

  saveBtn.disabled = false;
  saveBtn.innerText = "Simpan";

}

}

/* =========================
   LOAD CLASSES
========================= */

async function loadClasses(){

  try {

    const snapshot =
    await getDocs(
      collection(db, "classes")
    );

    classesData =
snapshot.docs
.map(docSnap => ({

  id:
  docSnap.id,

  ...docSnap.data()

}))

.filter(classItem =>

  classItem.createdBy ===
  auth.currentUser.uid

);

    filteredData = null;

    renderPage(0);

  }

  catch(err){

    console.error(err);

    showToast(
      "Gagal load kelas",
      "error"
    );

  }

}

/* =========================
   LOAD TRANSACTIONS
========================= */

async function loadTransactions(){

  const wrap =
  document.getElementById(
    "transactionList"
  );

  wrap.innerHTML = "Loading...";

  try {

    const snap =
    await getDocs(
      collection(db, "transactions")
    );

    if (snap.empty) {

      wrap.innerHTML =
      "<p>Tidak ada transaksi</p>";

      return;

    }

    wrap.innerHTML = "";

   for (const docSnap of snap.docs) {

  const data =
  docSnap.data();

  // AMBIL DATA USER
  const userSnap = await getDoc(
    doc(db, "users", data.userId)
  );

  const userData =
  userSnap.exists()
  ? userSnap.data()
  : null;

  const div =
  document.createElement("div");

      div.className = "item";

      div.innerHTML = `

        <b>
          ${data.className}
        </b>

        <br>

        👤 ${userData?.name || "Unknown User"}

        <br>

        💳 ${data.paymentMethod}

        <br>

        💰 Rp ${Number(
          data.price || 0
        ).toLocaleString("id-ID")}

        <br>

        📌 Status:
        ${data.paymentStatus}

        <br><br>

        ${
          data.paymentStatus === "pending"

          ? `

          <button
            class="primary btn-confirm"
            data-id="${docSnap.id}"
          >

            ✅ Konfirmasi

          </button>

          `

          : `

          <button disabled>
            Sudah Dibayar
          </button>

          `
        }

      `;

      wrap.appendChild(div);

      // BUTTON KONFIRMASI
      const btn =
      div.querySelector(".btn-confirm");

      if (btn) {

        btn.onclick = async () => {
             // cegah double click
  btn.disabled = true;
  btn.innerText = "Memproses...";

  try {

    // UPDATE STATUS
    await updateDoc(
      doc(
        db,
        "transactions",
        docSnap.id
      ),
      {

        paymentStatus: "paid"

      }
    );

    // =========================
    // AUTO MASUK KELAS
    // =========================

    const enrollQuery = query(
      collection(db, "class_students"),

      where(
        "classId",
        "==",
        data.classId
      ),

      where(
        "studentId",
        "==",
        data.userId
      )
    );

    const enrollSnap =
    await getDocs(enrollQuery);

    // kalau belum masuk kelas
    if (enrollSnap.empty) {

      await addDoc(
        collection(db, "class_students"),
        {

          classId: data.classId,

          studentId: data.userId,

          joinedAt: new Date(),

          paymentStatus: "paid"

        }
      );

    }

    showToast(
      "Pembayaran dikonfirmasi & siswa masuk kelas"
    );

    loadTransactions();

  }

  catch(err){

    console.error(err);

    showToast(
      "Gagal konfirmasi",
      "error"
    );

  }

};

      }

    }

  }

  catch(err){

    console.error(err);

    wrap.innerHTML =
    "Gagal load transaksi";

  }

}
/* =========================
   RENDER PAGE
========================= */

function renderPage(page){

  const list =
  document.getElementById("classList");

  if (!list) return;

  list.innerHTML = "";

  const data =
  filteredData ||
  classesData;

  const start =
  page * pageSize;

  const end =
  start + pageSize;

  const pageData =
  data.slice(start, end);

  if (pageData.length === 0) {

    list.innerHTML =
    "<li>Tidak ada kelas</li>";

    return;

  }

  pageData.forEach(classItem => {

    const li =
    document.createElement("li");

    li.innerHTML = `

<div style="
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:15px;
  flex-wrap:wrap;
">

  <!-- LEFT -->
  <div style="
    display:flex;
    gap:14px;
    align-items:flex-start;
    flex:1;
    min-width:250px;
  ">

    <!-- IMAGE -->
    <img
      src="${
        classItem.thumbnail ||
        'https://via.placeholder.com/120x80'
      }"
      style="
        width:120px;
        height:80px;
        object-fit:cover;
        border-radius:12px;
        box-shadow:0 4px 12px rgba(0,0,0,0.08);
      "
    >

    <!-- INFO -->
    <div>

      <b style="
        font-size:16px;
        color:#111827;
      ">
        ${classItem.className}
      </b>

      <br><br>

      🎓 ${classItem.level}
      -
      🌐 ${classItem.curriculum}

      <br><br>

      📚 ${classItem.subject}

      <br><br>

      <span style="
        font-weight:700;
        color:#2563eb;
      ">
      💰 ${
  classItem.isPaid

  ? classItem.pricing
      ?.map(p => {

        const label =
          p.billingPeriod == 30
          ? "1 Bulan"

          : p.billingPeriod == 90
          ? "3 Bulan"

          : p.billingPeriod == 180
          ? "6 Bulan"

          : "12 Bulan";

        return `
          Rp ${Number(p.price)
            .toLocaleString("id-ID")}
          / ${label}
        `;

      })
      .join("<br>")
      
  : "Gratis"
}
      </span>

    </div>

  </div>

  <!-- RIGHT BUTTON -->
  <div style="
    display:flex;
    gap:6px;
    flex-wrap:wrap;
    justify-content:flex-end;
  ">

    <button
      class="btn-manage btn-students"
    >
      👨‍🎓 Siswa
    </button>

    <button class="btn-manage-material">
      📚 Kelola
    </button>

    <button
      class="btn-edit"
    >
      ✏ Edit
    </button>

    <button
      class="btn-delete"
    >
      🗑 Hapus
    </button>

  </div>

</div>

`;

    list.appendChild(li);

    li.querySelector(".btn-students")
.addEventListener("click", () =>
  openStudentModal(classItem)
);

   li.querySelector(".btn-manage-material")
.addEventListener("click", () =>
  openManageModal(classItem)
);

    li.querySelector(".btn-edit")
    .addEventListener("click", () =>
      showAddForm(classItem)
    );

    li.querySelector(".btn-delete")
    .addEventListener("click", () =>
      deleteClass(classItem.id)
    );

  });

  currentPage = page;

}

/* =========================
   DELETE
========================= */

async function deleteClass(id){

  if (
    !confirm(
      "Yakin hapus kelas ini?"
    )
  ) return;

  try {

    await deleteDoc(
      doc(db, "classes", id)
    );

    showToast(
      "Kelas berhasil dihapus"
    );

    await loadClasses();

  }

  catch(err){

    console.error(err);

    showToast(
      err.message,
      "error"
    );

  }

}

async function openManageModal(classItem){

  selectedClass = classItem;

  document
  .getElementById("manageTitle")
  .innerText =
  `Kelola ${classItem.className}`;

  document
  .getElementById("manageModal")
  .classList.add("active");

  await loadManageContent();

}

function closeManageModal(){

  document
  .getElementById("manageModal")
  .classList.remove("active");

}

/* =========================
   STUDENT MODAL
========================= */

async function openStudentModal(classItem){

  selectedClass = classItem;

  document
    .getElementById("studentTitle")
    .innerText =
    `Siswa ${classItem.className}`;

  document
    .getElementById("studentModal")
    .classList.add("active");

  await loadStudents();

}

function closeStudentModal(){

  document
    .getElementById("studentModal")
    .classList.remove("active");

}

async function loadStudents(){

  const studentList =
    document.getElementById("studentList");

  const availableList =
    document.getElementById("availableStudentList");

  studentList.innerHTML = "Loading...";
  availableList.innerHTML = "Loading...";

  // =========================
  // SISWA DALAM KELAS
  // =========================

  const enrollQuery = query(
    collection(db, "class_students"),

    where(
      "classId",
      "==",
      selectedClass.id
    )
  );

  const enrollSnap =
    await getDocs(enrollQuery);

  studentList.innerHTML = "";

  const joinedStudentIds = [];

  for (const enrollDoc of enrollSnap.docs){

    const enrollData =
      enrollDoc.data();

    joinedStudentIds.push(
      enrollData.studentId
    );

    const userSnap = await getDoc(
      doc(
        db,
        "users",
        enrollData.studentId
      )
    );

    if (!userSnap.exists()) continue;

    const user =
      userSnap.data();

    const div =
      document.createElement("div");

    div.className = "item";

    div.innerHTML = `

      👤 ${user.name || "-"}

      <br>

      📧 ${user.email || "-"}

      <br><br>

      <button
        class="danger remove-student"
      >
        Hapus
      </button>

    `;

    studentList.appendChild(div);

    div
    .querySelector(".remove-student")
    .onclick = async () => {

      if (
        !confirm(
          "Hapus siswa dari kelas?"
        )
      ) return;

      await deleteDoc(
        doc(
          db,
          "class_students",
          enrollDoc.id
        )
      );

      loadStudents();

    };

  }

  if (enrollSnap.empty){

    studentList.innerHTML =
      "<p>Belum ada siswa</p>";

  }

  // =========================
  // SISWA TERSEDIA
  // =========================

  const usersQuery = query(
    collection(db, "users"),

    where("role", "==", "student"),

    where(
      "level",
      "==",
      selectedClass.level
    ),

    where(
      "curriculum",
      "==",
      selectedClass.curriculum
    )
  );

  const usersSnap =
    await getDocs(usersQuery);

  availableList.innerHTML = "";

  usersSnap.forEach(userDoc => {

    if (
      joinedStudentIds.includes(
        userDoc.id
      )
    ) return;

    const user =
      userDoc.data();

    const div =
      document.createElement("div");

    div.className = "item";

    div.innerHTML = `

      👤 ${user.name || "-"}

      <br>

      📧 ${user.email || "-"}

      <br><br>

      <button
        class="primary add-student"
      >
        Tambah
      </button>

    `;

    availableList.appendChild(div);

    div
    .querySelector(".add-student")
    .onclick = async () => {

      await addDoc(
        collection(db, "class_students"),
        {

          classId:
            selectedClass.id,

          studentId:
            userDoc.id,

          joinedAt:
            new Date(),

          paymentStatus:
            "manual"

        }
      );

      loadStudents();

    };

  });

}
/* =========================
   FILTER
========================= */

function filterClasses(){

  const search =
  document
  .getElementById("searchClass")
  .value
  .toLowerCase();

  filteredData =
  classesData.filter(c =>

    c.className
    ?.toLowerCase()
    .includes(search)

    ||

    c.subject
    ?.toLowerCase()
    .includes(search)

    ||

    c.level
    ?.toLowerCase()
    .includes(search)

  );

  renderPage(0);

}


/* =========================
   MANAGE CONTENT
========================= */

async function loadManageContent(){

  const wrap =
  document.getElementById("manageContent");

  wrap.innerHTML = "Loading...";

  const materialQuery = query(
    collection(db, "materials"),

    where(
      "level",
      "==",
      selectedClass.level
    ),

    where(
      "curriculum",
      "==",
      selectedClass.curriculum
    ),

    where(
      "subject",
      "==",
      selectedClass.subject
    )
  );

  const exerciseQuery = query(
  collection(db, "exercises"),

  where(
    "level",
    "==",
    selectedClass.level
  ),

  where(
    "curriculum",
    "==",
    selectedClass.curriculum
  ),

  where(
    "subject",
    "==",
    selectedClass.subject
  )
);

  const [
    materialSnap,
    exerciseSnap
  ] = await Promise.all([

    getDocs(materialQuery),
    getDocs(exerciseQuery)

  ]);

  const materialRelSnap =
await getDocs(
  query(
    collection(db, "class_materials"),

    where(
      "classId",
      "==",
      selectedClass.id
    )
  )
);

const exerciseRelSnap =
await getDocs(
  query(
    collection(db, "class_exercises"),

    where(
      "classId",
      "==",
      selectedClass.id
    )
  )
);

const selectedMaterialIds =
materialRelSnap.docs.map(doc =>
  doc.data().materialId
);

const selectedExerciseIds =
exerciseRelSnap.docs.map(doc =>
  doc.data().exerciseId
);



  wrap.innerHTML = "";

  const grouped = Object.create(null);

// ======================
// MATERIALS
// ======================

materialSnap.forEach(docSnap => {

  const data = {

    id: docSnap.id,
    type: "material",
    ...docSnap.data()

  };

  const chapter =
  data.chapter || "Tanpa Chapter";

  const subChapter =
  data.subChapter || "Tanpa Sub Chapter";

  if (!grouped[chapter]) {

    grouped[chapter] = {};

  }

  if (!grouped[chapter][subChapter]) {

  grouped[chapter][subChapter] = [];

}

grouped[chapter][subChapter].push({

  material: data,
  exercises: []

});

});

// ======================
// EXERCISES
// ======================

exerciseSnap.forEach(docSnap => {

  const data = {

    id: docSnap.id,
    type: "exercise",
    ...docSnap.data()

  };

  const chapter =
  data.chapter || "Tanpa Chapter";

  const subChapter =
  data.subChapter || "Tanpa Sub Chapter";

  if (
    grouped[chapter] &&
    grouped[chapter][subChapter]
  ) {

    grouped[chapter][subChapter]
    .forEach(item => {

      // cocokkan materialId
      if (
        item.material.id ===
        data.materialId
      ) {

        item.exercises.push(data);

      }

    });

  }

});

  Object.keys(grouped)
.forEach(chapter => {

    const card =
    document.createElement("div");

    card.className = "card";

   let html = `

<div style="
  display:flex;
  align-items:center;
  gap:10px;
">

  <input
    type="checkbox"
    class="chapter-checkbox"
    data-chapter="${chapter}"
  >

  <h2>
    📘 ${chapter}
  </h2>

</div>

`;

    Object.keys(grouped[chapter])
.forEach(subChapter => {

      html += `

        <div style="
          margin-top:20px;
          padding-left:15px;
        ">

          <div style="
  display:flex;
  align-items:center;
  gap:10px;
">

  <input
    type="checkbox"
    class="subchapter-checkbox"
    data-chapter="${chapter}"
    data-subchapter="${subChapter}"
  >

  <h3>
    📖 ${subChapter}
  </h3>

</div>

      `;

      grouped[chapter][subChapter]
.forEach(item => {

const material =
item.material;

const exercises =
item.exercises;

const materialChecked =
selectedMaterialIds.includes(
  material.id
);

html += `

<label style="
  display:flex;
  gap:10px;
  margin:
    8px
    0
    8px
    20px;
">

  <input
  type="checkbox"
  value="${material.id}"
  data-type="material"
  data-chapter="${chapter}"
  data-subchapter="${subChapter}"
    ${
      materialChecked
      ? "checked"
      : ""
    }
  >

  📚 ${material.title}

</label>

`;
// ======================
// EXERCISES DI BAWAH MATERIAL
// ======================

exercises.forEach(exercise => {

  const exerciseChecked =
  selectedExerciseIds.includes(
    exercise.id
  );

  html += `

  <label style="
    display:flex;
    gap:10px;
    margin:
      6px
      0
      6px
      45px;
    opacity:0.9;
  ">

    <input
      type="checkbox"
      value="${exercise.id}"
      data-type="exercise"
      data-chapter="${chapter}"
data-subchapter="${subChapter}"
      ${
        exerciseChecked
        ? "checked"
        : ""
      }
    >

    📝 ${exercise.title}

  </label>

  `;

});
});
      html += `
        </div>
      `;

    });

    card.innerHTML = html;

    wrap.appendChild(card);

    // ======================
// SUBCHAPTER CHECKBOX
// ======================

card
.querySelectorAll(".subchapter-checkbox")
.forEach(subCheckbox => {

  subCheckbox.addEventListener(
  "change",
  async () => {

    const chapter =
    subCheckbox.dataset.chapter;

    const subChapter =
    subCheckbox.dataset.subchapter;

    const checked =
    subCheckbox.checked;

    const allItems =
    card.querySelectorAll(
      `input[data-chapter="${chapter}"][data-subchapter="${subChapter}"][data-type]`
    );

    for (const item of allItems) {

      await toggleItem(
        item,
        checked
      );

    }

  }
);

});

// ======================
// CHAPTER CHECKBOX
// ======================

card
.querySelectorAll(".chapter-checkbox")
.forEach(chapterCheckbox => {

  chapterCheckbox.addEventListener(
    "change",
    async () => {

      const chapter =
      chapterCheckbox.dataset.chapter;

      const checked =
      chapterCheckbox.checked;

      // CHECK SUBCHAPTER
      const subCheckboxes =
      card.querySelectorAll(
        `.subchapter-checkbox[data-chapter="${chapter}"]`
      );

      subCheckboxes.forEach(sub => {

        sub.checked = checked;

      });

      // CHECK MATERIAL & EXERCISE
      const allItems =
      card.querySelectorAll(
        `input[data-chapter="${chapter}"][data-type]`
      );

      for (const item of allItems) {

        await toggleItem(
          item,
          checked
        );

      }

    }
  );

});

card
.querySelectorAll("input[data-type]")
.forEach(el => {

  el.addEventListener(
    "change",
    async () => {

      const id = el.value;

      const type =
      el.dataset.type;

      // MATERIAL
      if (type === "material") {

        if (el.checked) {

  const q = query(
    collection(
      db,
      "class_materials"
    ),

    where(
      "classId",
      "==",
      selectedClass.id
    ),

    where(
      "materialId",
      "==",
      id
    )
  );

  const snap =
  await getDocs(q);

  if (snap.empty) {

    await addDoc(
      collection(
        db,
        "class_materials"
      ),
      {

        classId:
        selectedClass.id,

        materialId: id,

        createdAt:
        new Date()

      }
    );

  }

}

        else {

          const q = query(
            collection(
              db,
              "class_materials"
            ),

            where(
              "classId",
              "==",
              selectedClass.id
            ),

            where(
              "materialId",
              "==",
              id
            )
          );

          const snap =
          await getDocs(q);

          for (const d of snap.docs) {

            await deleteDoc(
              doc(
                db,
                "class_materials",
                d.id
              )
            );

          }

        }

      }

      // EXERCISE
      else {

        if (el.checked) {

  const q = query(
    collection(
      db,
      "class_exercises"
    ),

    where(
      "classId",
      "==",
      selectedClass.id
    ),

    where(
      "exerciseId",
      "==",
      id
    )
  );

  const snap =
  await getDocs(q);

  if (snap.empty) {

    await addDoc(
      collection(
        db,
        "class_exercises"
      ),
      {

        classId:
        selectedClass.id,

        exerciseId: id,

        createdAt:
        new Date()

      }
    );

  }

}

        else {

          const q = query(
            collection(
              db,
              "class_exercises"
            ),

            where(
              "classId",
              "==",
              selectedClass.id
            ),

            where(
              "exerciseId",
              "==",
              id
            )
          );

          const snap =
          await getDocs(q);

          for (const d of snap.docs) {

            await deleteDoc(
              doc(
                db,
                "class_exercises",
                d.id
              )
            );

          }

        }

      }

      

    }
  );

});

  });

}



/* =========================
   PAGINATION
========================= */

function nextPage(){

  const data =
  filteredData ||
  classesData;

  if (
    (currentPage + 1)
    * pageSize
    < data.length
  ) {

    renderPage(
      currentPage + 1
    );

  }

}

function prevPage(){

  if (currentPage > 0) {

    renderPage(
      currentPage - 1
    );

  }

}

async function toggleItem(
  el,
  checked
){

  el.checked = checked;

  const id = el.value;

  const type =
  el.dataset.type;

  const collectionName =
    type === "material"
    ? "class_materials"
    : "class_exercises";

  const fieldName =
    type === "material"
    ? "materialId"
    : "exerciseId";

  const q = query(
    collection(
      db,
      collectionName
    ),

    where(
      "classId",
      "==",
      selectedClass.id
    ),

    where(
      fieldName,
      "==",
      id
    )
  );

  const snap =
  await getDocs(q);

  if (checked) {

    if (snap.empty) {

      await addDoc(
        collection(
          db,
          collectionName
        ),
        {

          classId:
          selectedClass.id,

          [fieldName]:
          id,

          createdAt:
          new Date()

        }
      );

    }

  }

  else {

    for (const d of snap.docs) {

      await deleteDoc(
        doc(
          db,
          collectionName,
          d.id
        )
      );

    }

  }

}

function removePricingRow(button){

  const pricingItem =
  button.closest(".pricing-item");

  pricingItem.remove();

}

/* =========================
   EXPORT GLOBAL
========================= */

window.showAddForm =
showAddForm;

window.closeForm =
closeForm;

window.saveClass =
saveClass;

window.deleteClass =
deleteClass;

window.filterClasses =
filterClasses;

window.nextPage =
nextPage;

window.prevPage =
prevPage;


window.closeManageModal =
closeManageModal;

window.closeStudentModal =
closeStudentModal;

window.addPricingRow =
addPricingRow;

window.removePricingRow =
removePricingRow;