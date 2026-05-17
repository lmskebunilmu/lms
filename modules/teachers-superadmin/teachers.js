import { auth, db } from "../../firebase/firebase-config.js";

import {
collection,
addDoc,
getDocs,
getDoc,
deleteDoc,
updateDoc,
setDoc,
doc,
query,
where
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadLayout } from "../../assets/js/components.js";
import {
createUserWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentSchoolId = null;

// =========================
// AUTH
// =========================
onAuthStateChanged(auth, async user => {

if (!user)
return window.location = "../../login.html";

// 🔥 LOAD LAYOUT DULU
await loadLayout("superadmin");

// ambil data user login
const userSnap =
await getDoc(doc(db,"users",user.uid));

if (userSnap.exists()) {

currentSchoolId =
userSnap.data().schoolId || null;

}

await loadMaterialOptions();

await loadTeachers();

initSearch();

});
async function loadMaterialOptions() {

const snap = await getDocs(collection(db, "materials"));

const subjects = new Set();
const levels = new Set();
const curriculums = new Set();

snap.forEach(docSnap => {

const data = docSnap.data();

if(data.subject){
subjects.add(data.subject);
}

if(data.level){
levels.add(data.level);
}

if(data.curriculum){
curriculums.add(data.curriculum);
}

});

renderCheckboxGroup(
"subjectGroup",
[...subjects]
);

renderCheckboxGroup(
"levelGroup",
[...levels]
);

renderCheckboxGroup(
"curriculumGroup",
[...curriculums]
);

}

function renderCheckboxGroup(id, items){

const el = document.getElementById(id);

el.innerHTML = items.map(item => `
<label>
<input type="checkbox" value="${item}">
${item}
</label>
`).join("");

}
// =========================
// LOAD TEACHERS
// =========================
async function loadTeachers() {

const table = document.getElementById("teacherTable");
table.innerHTML = "⏳ Loading...";

const q = query(collection(db,"teachers"), where("schoolId","==",currentSchoolId));
const snap = await getDocs(q);

table.innerHTML = "";

if (snap.empty) {
table.innerHTML = "<tr><td colspan='5'>Belum ada data</td></tr>";
return;
}

snap.forEach(docSnap => {
const data = docSnap.data();

const tr = document.createElement("tr");

tr.innerHTML = `
<td>${data.name}</td>
<td>${(data.subjects || []).join(", ")}</td>
<td>${(data.levels || []).join(", ")}</td>
<td>${(data.curriculums || []).join(", ")}</td>
<td>
<button onclick="editTeacher('${docSnap.id}')">Edit</button>
<button onclick="deleteTeacher('${docSnap.id}')">Hapus</button>
</td>
`;

table.appendChild(tr);
});
}

// =========================
// OPEN MODAL
// =========================
window.openTeacherModal = () => {

document.getElementById("teacherId").value = "";
document.getElementById("teacherName").value = "";
document.getElementById("teacherEmail").value = "";
document.getElementById("teacherPassword").value = "";

document.getElementById("teacherPassword").style.display = "block";

document.getElementById("teacherModalTitle").innerText = "Tambah Guru";

document.getElementById("teacherModal").classList.add("active");

document
.querySelectorAll('#teacherModal input[type="checkbox"]')
.forEach(cb => cb.checked = false);

};

window.closeTeacherModal = () => {
document.getElementById("teacherModal").classList.remove("active");
};

// =========================
// SAVE TEACHER
// =========================
window.saveTeacher = async () => {

const id =
document.getElementById("teacherId").value;

const name =
document.getElementById("teacherName").value;

const email =
document.getElementById("teacherEmail").value;

const password =
document.getElementById("teacherPassword").value;

const subjects = Array.from(
document.querySelectorAll("#subjectGroup input:checked")
).map(cb => cb.value);

const levels = Array.from(
document.querySelectorAll("#levelGroup input:checked")
).map(cb => cb.value);

const curriculums = Array.from(
document.querySelectorAll("#curriculumGroup input:checked")
).map(cb => cb.value);

try {

// =========================
// EDIT MODE
// =========================

if (id) {

await updateDoc(
doc(db,"teachers",id),
{
name,
email,
subjects,
levels,
curriculums,
schoolId: currentSchoolId
}
);

}

// =========================
// ADD MODE
// =========================

else {

// 🔥 CREATE AUTH USER
const userCredential =
await createUserWithEmailAndPassword(
auth,
email,
password
);

const uid =
userCredential.user.uid;

// 🔥 SAVE TEACHER
await setDoc(
doc(db,"teachers",uid),
{
teacherId: uid,
name,
email,
subjects,
levels,
curriculums,
schoolId: currentSchoolId,
role: "guru",
createdAt: new Date()
}
);

// 🔥 SAVE USERS
await setDoc(
doc(db,"users",uid),
{
uid,
name,
email,
role: "guru",
schoolId: currentSchoolId
}
);

}

closeTeacherModal();

loadTeachers();

showToast("Guru berhasil disimpan");

}

catch(err){

console.error(err);

showToast(err.message,"error");

}

};

// =========================
// EDIT
// =========================
window.editTeacher = async (id) => {

const snap = await getDoc(doc(db,"teachers",id));
const data = snap.data();

document.getElementById("teacherId").value = id;
document.getElementById("teacherName").value = data.name;
document.getElementById("teacherEmail").value = data.email || "";

setCheckboxGroup("subjectGroup", data.subjects);
setCheckboxGroup("levelGroup", data.levels);
setCheckboxGroup("curriculumGroup", data.curriculums);

document.getElementById("teacherModalTitle").innerText = "Edit Guru";
document.getElementById("teacherModal").classList.add("active");
document.getElementById("teacherPassword").style.display = "none";

};

function setCheckboxGroup(groupId, values = []) {

const checkboxes =
document.querySelectorAll(`#${groupId} input[type="checkbox"]`);

checkboxes.forEach(cb => {

cb.checked = values.includes(cb.value);

});

}

// =========================
// DELETE
// =========================
window.deleteTeacher = async (id) => {
if (!confirm("Hapus guru ini?")) return;

await deleteDoc(doc(db,"teachers",id));
loadTeachers();
};

// =========================
// SEARCH
// =========================
function initSearch() {
const input = document.getElementById("teacherSearch");

input.addEventListener("keyup", () => {
const keyword = input.value.toLowerCase();

document.querySelectorAll("#teacherTable tr").forEach(row => {
row.style.display = row.innerText.toLowerCase().includes(keyword)
? ""
: "none";
});
});
}