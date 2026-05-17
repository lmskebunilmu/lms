import { auth, db }
from "../../firebase/firebase-config.js";

import {
collection,
getDocs,
getDoc,
deleteDoc,
doc,
setDoc,
updateDoc,
query,
orderBy
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
loadLayout
}
from "../../assets/js/components.js";

// ======================
// DAYS
// ======================
let allSchedules = [];
let allBookings = [];
let allTeachers = [];
const days = [
"Senin",
"Selasa",
"Rabu",
"Kamis",
"Jumat",
"Sabtu",
"Minggu"
];

// ======================
// AUTH
// ======================
onAuthStateChanged(auth, async(user)=>{

if(!user){

window.location =
"../../login.html";

return;

}

await loadLayout("superadmin");

generateSessions();

await loadTeachers();

await loadSchedules();

await loadBookings();

setMinDate();

});

// ======================
// SET MIN DATE
// ======================
function setMinDate(){

const tomorrow =
new Date();

tomorrow.setDate(
tomorrow.getDate() + 1
);

const yyyy =
tomorrow.getFullYear();

const mm =
String(
tomorrow.getMonth() + 1
).padStart(2,"0");

const dd =
String(
tomorrow.getDate()
).padStart(2,"0");

document.getElementById(
"availabilityDate"
).min = `${yyyy}-${mm}-${dd}`;

}

// ======================
// GENERATE SESSIONS
// ======================
function generateSessions(){

days.forEach(day=>{

const container =
document.getElementById(
`${day}_sessions`
);

if(!container) return;

container.innerHTML = "";

let sesi = 1;

for(let hour=13; hour<21; hour++){

const start =
`${String(hour).padStart(2,"0")}:00`;

const end =
`${String(hour+1).padStart(2,"0")}:00`;

container.innerHTML += `

<label class="session-item">

<input
type="checkbox"
value="${start}-${end}"
data-sesi="${sesi}"
>

<span>

Sesi ${sesi}
(${start} - ${end})

</span>

</label>

`;

sesi++;

}

});

}

// ======================
// LOAD TEACHERS
// ======================
// ======================
// LOAD TEACHERS
// ======================
async function loadTeachers(){

const select =
document.getElementById(
"teacherSelect"
);

const availabilitySelect =
document.getElementById(
"availabilityTeacher"
);

select.innerHTML = `
<option value="">
Pilih Teacher
</option>
`;

availabilitySelect.innerHTML = `
<option value="">
Pilih Teacher
</option>
`;

const snap =
await getDocs(
collection(db,"teachers")
);

allTeachers = [];

snap.forEach(docSnap=>{

const data =
docSnap.data();

allTeachers.push({
id:docSnap.id,
...data
});

const option = `
<option value="${docSnap.id}">
${data.name}
</option>
`;

select.innerHTML += option;

availabilitySelect.innerHTML += option;

});

}

// ======================
// OPEN MODAL
// ======================
window.openScheduleModal =
async()=>{

const teacherId =
document.getElementById(
"teacherSelect"
).value;

if(!teacherId){

alert("Pilih teacher");

return;

}


clearCheckbox();

const modal =
document.getElementById(
"scheduleModal"
);

modal.style.display = "flex";

// LOAD EXISTING
const scheduleSnap =
await getDoc(
doc(db,"teacher_schedules",teacherId)
);

if(!scheduleSnap.exists()) return;

const data =
scheduleSnap.data();

Object.keys(
data.availability || {}
).forEach(day=>{

const sessions =
data.availability[day] || [];

sessions.forEach(session=>{

const checks =
document.querySelectorAll(
`#${day}_sessions input`
);

checks.forEach(item=>{

if(
Number(item.dataset.sesi)
=== session.sesi
){

item.checked = true;

}

});

});

});

};

// ======================
// CLOSE MODAL
// ======================
window.closeModal = ()=>{

document.getElementById(
"scheduleModal"
).style.display = "none";

};

// ======================
// SAVE SCHEDULE
// ======================
window.saveSchedule =
async()=>{

const teacherId =
document.getElementById(
"teacherSelect"
).value;

if(!teacherId){

alert("Pilih teacher");

return;

}

const teacherName =
document.getElementById(
"teacherSelect"
).options[
document.getElementById(
"teacherSelect"
).selectedIndex
].text;

const availability = {};

days.forEach(day=>{

availability[day] = [];

const checked =
document.querySelectorAll(
`#${day}_sessions input:checked`
);

checked.forEach(item=>{

const value =
item.value.split("-");

availability[day].push({

sesi:Number(item.dataset.sesi),

start:value[0],

end:value[1]

});

});

});

await setDoc(
doc(db,"teacher_schedules",teacherId),
{
teacherId,
teacherName,
availability,
status:"active",
updatedAt:new Date()
}
);

alert(
"Jadwal berhasil disimpan"
);

closeModal();

loadSchedules();

};

// ======================
// LOAD SCHEDULES
// ======================
// ======================
// LOAD SCHEDULES
// ======================
async function loadSchedules(){

const table =
document.getElementById(
"scheduleTable"
);

table.innerHTML = `
<tr>
<td colspan="4">
Loading...
</td>
</tr>
`;

const snap =
await getDocs(
collection(db,"teacher_schedules")
);

allSchedules = [];

snap.forEach(docSnap=>{

allSchedules.push({
id:docSnap.id,
...docSnap.data()
});

});

renderSchedules(allSchedules);

}

// ======================
// RENDER SCHEDULES
// ======================
function renderSchedules(dataList){

const table =
document.getElementById(
"scheduleTable"
);

table.innerHTML = "";

if(dataList.length === 0){

table.innerHTML = `
<tr>
<td colspan="4">
Data tidak ditemukan
</td>
</tr>
`;

return;

}

dataList.forEach(data=>{

let total = 0;

Object.keys(
data.availability || {}
).forEach(day=>{

total +=
(data.availability[day] || []).length;

});

const tr =
document.createElement("tr");

tr.innerHTML = `

<td>
${data.teacherName}
</td>

<td>
${total} sesi
</td>

<td>

<span class="badge badge-active">
${data.status}
</span>

</td>

<td>

<div class="action-group">

<button
class="btn btn-primary"
onclick="viewSchedule('${data.id}')"
>

Lihat

</button>

<button
class="btn btn-warning"
onclick="editSchedule('${data.id}')"
>

Edit

</button>

<button
class="btn btn-danger"
onclick="deleteSchedule('${data.id}')"
>

Hapus

</button>

</div>

</td>
`;

table.appendChild(tr);

});

}
// ======================
// VIEW SCHEDULE
// ======================
window.viewSchedule =
async(id)=>{

const snap =
await getDoc(
doc(db,"teacher_schedules",id)
);

if(!snap.exists()) return;

const data =
snap.data();

const modal =
document.getElementById(
"viewModal"
);

const content =
document.getElementById(
"viewScheduleContent"
);

let html = "";

Object.keys(
data.availability || {}
).forEach(day=>{

html += `

<div
style="
margin-bottom:20px;
padding:18px;
border-radius:16px;
border:1px solid #e5e7eb;
"
>

<h3
style="
margin-bottom:15px;
"
>

${day}

</h3>

`;

(data.availability[day] || [])
.forEach(session=>{

html += `

<div
style="
padding:10px;
margin-bottom:10px;
border-radius:10px;
background:#f8fafc;
border:1px solid #e2e8f0;
"
>

Sesi ${session.sesi}
(${convertTimeByOffset(session.start, 1)} - ${convertTimeByOffset(session.end, 1)})

</div>

`;

});

html += `</div>`;

});

content.innerHTML = html;

modal.style.display = "flex";

};

// ======================
// CLOSE VIEW MODAL
// ======================
window.closeViewModal = ()=>{

document.getElementById(
"viewModal"
).style.display = "none";

};

// ======================
// EDIT
// ======================
window.editSchedule = async(id)=>{
  const snap = await getDoc(doc(db,"teacher_schedules",id));

  if(!snap.exists()) return;

  const data = snap.data();

  // isi dropdown sesuai teacherId
  document.getElementById("teacherSelect").value = data.teacherId;

  await openScheduleModal();
};

// ======================
// DELETE
// ======================
window.deleteSchedule =
async(id)=>{

if(
!confirm(
"Hapus jadwal teacher?"
)
)return;

await deleteDoc(
doc(db,"teacher_schedules",id)
);

loadSchedules();

};

// ======================
// LOAD BOOKINGS
// ======================
// ======================
// LOAD BOOKINGS
// ======================
async function loadBookings(){

const table =
document.getElementById(
"bookingTable"
);

table.innerHTML = `
<tr>
<td colspan="7">
Loading...
</td>
</tr>
`;

const q = query(
collection(db,"student_bookings"),
orderBy("createdAt","desc")
);

const snap =
await getDocs(q);

allBookings = [];

snap.forEach(docSnap=>{

allBookings.push({
id:docSnap.id,
...docSnap.data()
});

});

renderBookings(allBookings);

}

// ======================
// RENDER BOOKINGS
// ======================
function renderBookings(dataList){

const table =
document.getElementById(
"bookingTable"
);

table.innerHTML = "";

if(dataList.length === 0){

table.innerHTML = `
<tr>
<td colspan="7">
Data booking kosong
</td>
</tr>
`;

return;

}

dataList.forEach(data=>{

const tr =
document.createElement("tr");

tr.innerHTML = `

<td>
${data.studentName || "-"}
</td>

<td>
${data.teacherName || "-"}
</td>

<td>
${data.bookingDate || "-"}
</td>

<td>
${data.day || "-"}
</td>

<td>

Sesi ${data.session || "-"}

<br>

${data.startTime || "-"}
-
${data.endTime || "-"}

</td>

<td>

<span class="badge ${
data.status === "approved"
? "badge-approved"
:
data.status === "rejected"
? "badge-rejected"
:
"badge-pending"
}">

${data.status}

</span>

</td>

<td>

<div class="action-group">

<button
class="btn btn-success"
onclick="approveBooking('${data.id}')"
>

Approve

</button>

<button
class="btn btn-warning"
onclick="rejectBooking('${data.id}')"
>

Reject

</button>

<button
class="btn btn-danger"
onclick="deleteBooking('${data.id}')"
>

Hapus

</button>

</div>

</td>

`;

table.appendChild(tr);

});

}
// ======================
// APPROVE
// ======================
window.approveBooking =
async(id)=>{

await updateDoc(
doc(db,"student_bookings",id),
{
status:"approved"
}
);

await loadBookings();

if(
document.getElementById("availabilityTeacher").value &&
document.getElementById("availabilityDate").value
){
loadAvailability();
}

};

// ======================
// REJECT
// ======================
window.rejectBooking =
async(id)=>{

await updateDoc(
doc(db,"student_bookings",id),
{
status:"rejected"
}
);

loadBookings();

};


// ======================
// LOAD AVAILABILITY
// ======================
window.loadAvailability =
async()=>{

const teacherId =
document.getElementById(
"availabilityTeacher"
).value;

const date =
document.getElementById(
"availabilityDate"
).value;

const table =
document.getElementById(
"availabilityTable"
);

if(!teacherId || !date){

alert(
"Pilih teacher dan tanggal"
);

return;

}

table.innerHTML = `
<tr>
<td colspan="3">
Loading...
</td>
</tr>
`;

// ======================
// GET DAY NAME
// ======================
const dateObj =
new Date(date);

const dayIndex =
dateObj.getDay();

const dayMap = [
"Minggu",
"Senin",
"Selasa",
"Rabu",
"Kamis",
"Jumat",
"Sabtu"
];

const dayName =
dayMap[dayIndex];

// ======================
// GET SCHEDULE
// ======================
const scheduleSnap =
await getDoc(
doc(db,"teacher_schedules",teacherId)
);

if(!scheduleSnap.exists()){

table.innerHTML = `
<tr>
<td colspan="3">
Teacher belum punya jadwal
</td>
</tr>
`;

return;

}

const scheduleData =
scheduleSnap.data();

const sessions =
scheduleData
.availability?.[dayName] || [];

if(sessions.length === 0){

table.innerHTML = `
<tr>
<td colspan="3">
Tidak ada sesi tersedia
</td>
</tr>
`;

return;

}

// ======================
// GET BOOKINGS
// ======================
const bookingSnap =
await getDocs(
collection(db,"student_bookings")
);

const bookings = [];

bookingSnap.forEach(docSnap=>{

const data =
docSnap.data();

bookings.push(data);

});

// ======================
// RENDER
// ======================
table.innerHTML = "";

sessions.forEach(session=>{

const booked =
bookings.find(item=>

item.teacherId === teacherId &&
item.bookingDate === date &&
item.session === session.sesi &&
item.status !== "rejected"

);

const tr =
document.createElement("tr");

tr.innerHTML = `

<td>
Sesi ${session.sesi}
</td>

<td>
${session.start}
-
${session.end}
</td>

<td>

${
booked
?

`
<span class="badge badge-rejected">
Sudah Dibooking
</span>
`

:

`
<span class="badge badge-approved">
Tersedia
</span>
`
}

</td>

`;

table.appendChild(tr);

});

};
// ======================
// CLEAR CHECKBOX
// ======================
function clearCheckbox(){

days.forEach(day=>{

const checks =
document.querySelectorAll(
`#${day}_sessions input`
);

checks.forEach(item=>{

item.checked = false;

});

});

}

// ======================
// FILTER SCHEDULE
// ======================
const scheduleSearch =
document.getElementById(
"scheduleSearch"
);

if(scheduleSearch){

scheduleSearch.addEventListener(
"keyup",
()=>{

const keyword =
scheduleSearch.value.toLowerCase();

const filtered =
allSchedules.filter(item=>

(item.teacherName || "")
.toLowerCase()
.includes(keyword)

);

renderSchedules(filtered);

}
);

}

// ======================
// FILTER BOOKINGS
// ======================
const bookingSearch =
document.getElementById(
"bookingSearch"
);

const bookingStatus =
document.getElementById(
"bookingStatus"
);

function filterBookings(){

const keyword =
bookingSearch.value.toLowerCase();

const status =
bookingStatus.value.toLowerCase();

const filtered =
allBookings.filter(item=>{

const matchKeyword =

(item.studentName || "")
.toLowerCase()
.includes(keyword)

||

(item.teacherName || "")
.toLowerCase()
.includes(keyword);

const matchStatus =

!status ||
(item.status || "")
.toLowerCase() === status;

return (
matchKeyword &&
matchStatus
);

});

renderBookings(filtered);

}

if(bookingSearch){

bookingSearch.addEventListener(
"keyup",
filterBookings
);

}

if(bookingStatus){

bookingStatus.addEventListener(
"change",
filterBookings
);

}

// ======================
// DELETE BOOKING
// ======================
window.deleteBooking =
async(id)=>{

const confirmDelete =
confirm(
"Yakin ingin menghapus booking ini?"
);

if(!confirmDelete) return;

try{

await deleteDoc(
doc(db,"student_bookings",id)
);

alert(
"Booking berhasil dihapus"
);

await loadBookings();

// refresh availability
if(
document.getElementById("availabilityTeacher").value &&
document.getElementById("availabilityDate").value
){
loadAvailability();
}

}
catch(err){

console.error(err);

alert(
"Gagal menghapus booking"
);

}

};

function convertTimeByOffset(time, offsetHour) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h + offsetHour, m, 0);

  return date.toTimeString().slice(0,5);
}