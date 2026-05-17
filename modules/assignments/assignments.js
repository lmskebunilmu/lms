import { db, auth } 
from "../../firebase/firebase-config.js";
import { loadLayout } from "../../assets/js/components.js";
import {
 collection,
 addDoc,
 getDocs,
 doc,
 getDoc,
 updateDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
 onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("assignments.js loaded");

let currentRole = "";


// ==========================
// CEK ROLE USER
// ==========================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location = "../../login.html";
    return;
  }

  try {

    let uid = user.uid;

    let userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      alert("User tidak ditemukan");
      window.location = "../../login.html";
      return;
    }

    let userData = userDoc.data();

    currentRole = userData.role;

   // ==========================
// CEK STATUS SEKOLAH 🔥
// ==========================
if (userData.schoolId) {

  const schoolSnap = await getDoc(
    doc(db, "schools", userData.schoolId)
  );

  if (schoolSnap.exists()) {

    const schoolData = schoolSnap.data();

    if (schoolData.status !== "aktif") {

      lockPage();
      return;

    }

  }

}

// ==========================
// LOAD LAYOUT 🔥 (INI YANG KURANG)
// ==========================
await loadLayout(currentRole);
await waitForHeader();          // ⬅️ tambahan
await loadProfileHeader(user);  // ⬅️ tambahan



    // ==========================
    // ROLE UI
    // ==========================

    // Jika siswa
    // Jika siswa
if (currentRole == "siswa") {
  document.getElementById("assignmentSection").style.display = "none";
  document.getElementById("teacherSubmissionSection").style.display = "none";
  document.getElementById("submissionSectionStudent").style.display = "block"; // pastikan siswa lihat form mereka

  loadStudentGrades();
}

// Jika guru
if (currentRole == "guru") {
  document.getElementById("submissionSectionStudent").style.display = "none"; // sembunyikan form siswa untuk guru
  loadSubmissions();
}

    // ==========================
    // LOAD DATA
    // ==========================
    loadAssignments();

  } catch (err) {
    console.error(err);
    alert("Terjadi error");
  }

});


// ==========================
// TAMBAH TUGAS (GURU)
// ==========================

async function addAssignment(){

 if(currentRole != "guru"){

   alert("Hanya guru yang bisa membuat tugas");
   return;

 }

 let title =
 document.getElementById("assignmentTitle").value;

 let subject =
 document.getElementById("subjectName").value;

 let className =
 document.getElementById("className").value;

 let description =
 document.getElementById(
 "assignmentDescription"
 ).value;

 if(title=="" ||
    subject=="" ||
    className=="" ||
    description==""){

   alert("Isi semua data");
   return;

 }

 try {

   await addDoc(
     collection(db,"assignments"),
     {
       title: title,
       subject: subject,
       className: className,
       description: description,
       createdAt: new Date()
     }
   );

   alert("Tugas berhasil dibuat");

   loadAssignments();

 } catch(error){

   alert(error.message);

 }

}



// ==========================
// LOAD TUGAS
// ==========================

async function loadAssignments(){

 let list =
 document.getElementById("assignmentList");

 list.innerHTML = "";

 let querySnapshot =
 await getDocs(
   collection(db,"assignments")
 );

 querySnapshot.forEach((docSnap)=>{

   let data = docSnap.data();

   let li =
   document.createElement("li");

   li.innerHTML =
   "<b>" +
   data.title +
   "</b> - " +
   data.subject +
   " (" +
   data.className +
   ")";

   list.appendChild(li);

 });

}



// ==========================
// SUBMIT JAWABAN SISWA
// ==========================

async function submitAssignment(){

 if(currentRole != "siswa"){

   alert("Hanya siswa yang bisa kirim jawaban");
   return;

 }

 let studentName = document.getElementById("studentNameStudent").value;
let assignmentTitle = document.getElementById("assignmentTitleInputStudent").value;
let submission = document.getElementById("submissionTextStudent").value;
 if(studentName=="" ||
    assignmentTitle=="" ||
    submission==""){

   alert("Isi semua data");
   return;

 }

 try {

   await addDoc(
     collection(db,"submissions"),
     {
       studentName: studentName,
       assignmentTitle: assignmentTitle,
       submission: submission,
       createdAt: new Date()
     }
   );

   alert("Jawaban berhasil dikirim");

 } catch(error){

   alert(error.message);

 }

}



// ==========================
// LOAD JAWABAN SISWA (GURU)
// ==========================

async function loadSubmissions(){

 let list =
 document.getElementById("submissionList");

 list.innerHTML = "";

 let querySnapshot =
 await getDocs(
   collection(db,"submissions")
 );

 querySnapshot.forEach((docSnap)=>{

   let data = docSnap.data();
   let docId = docSnap.id;

   let li =
   document.createElement("li");

   li.innerHTML =
   "<b>" +
   data.studentName +
   "</b> - " +
   data.assignmentTitle +
   "<br>Jawaban: " +
   data.submission +

   "<br><br>Nilai: " +

   "<input type='number' id='grade_"+docId+"' placeholder='Nilai'>" +

   "<button onclick='saveGrade(\""+docId+"\")'>Simpan Nilai</button>";

   list.appendChild(li);

 });

}

// ==========================
// SIMPAN NILAI
// ==========================

async function saveGrade(docId){

 let grade =
 document.getElementById(
   "grade_"+docId
 ).value;

 if(grade==""){

   alert("Isi nilai dulu");
   return;

 }

 try {

   await updateDoc(
     doc(db,"submissions",docId),
     {
       grade: grade
     }
   );

   alert("Nilai berhasil disimpan");

 } catch(error){

   alert(error.message);

 }

}
// ==========================
// LOAD NILAI SISWA
// ==========================

async function loadStudentGrades(){

 let list =
 document.getElementById("gradeList");

 list.innerHTML = "";

 let querySnapshot =
 await getDocs(
   collection(db,"submissions")
 );

 querySnapshot.forEach((docSnap)=>{

   let data = docSnap.data();

   if(data.grade){

     let li =
     document.createElement("li");

     li.innerHTML =
     "<b>" +
     data.assignmentTitle +
     "</b>" +
     "<br>Nilai: " +
     data.grade;

     list.appendChild(li);

   }

 });

}

function lockPage() {

  document.body.innerHTML = `
    <div style="
      display:flex;
      justify-content:center;
      align-items:center;
      height:100vh;
      flex-direction:column;
      text-align:center;
    ">
      <h1 style="color:red;">🚫 Akses Ditolak</h1>
      <p>Sekolah kamu sedang <b>nonaktif</b></p>
      <button onclick="window.location='../../login.html'">
        Logout
      </button>
    </div>
  `;

}
function waitForHeader(){
  return new Promise(resolve=>{
    const interval = setInterval(()=>{
      const el = document.getElementById("headerAvatarHeader");
      if(el){
        clearInterval(interval);
        resolve();
      }
    },50);
  });
}
async function loadProfileHeader(user){

  const userSnap = await getDoc(doc(db,"users",user.uid));
  if(!userSnap.exists()) return;

  const data = userSnap.data();

  const name = data.name || user.displayName || "Guru";
  const avatar = data.avatarURL || user.photoURL || "../assets/images/default-avatar.png";

  let schoolName = "-";
  let schoolLogo = "../assets/images/default-logo.png";

  if(data.schoolId){
    const schoolSnap = await getDoc(doc(db,"schools",data.schoolId));
    if(schoolSnap.exists()){
      const schoolData = schoolSnap.data();
      schoolName = schoolData.name || "-";
      schoolLogo = schoolData.logoURL || "../assets/images/default-logo.png";
    }
  }

  // isi header
  const nameHeader = document.getElementById("headerNameHeader");
  if(nameHeader) nameHeader.innerText = name;

  const avatarHeader = document.getElementById("headerAvatarHeader");
  if(avatarHeader) avatarHeader.src = avatar;

  const schoolNameEl = document.getElementById("headerSchoolName");
  if(schoolNameEl) schoolNameEl.innerText = schoolName;

  const schoolLogoEl = document.getElementById("headerSchoolLogo");
  if(schoolLogoEl) schoolLogoEl.src = schoolLogo;
}
// ==========================
// BACK DASHBOARD
// ==========================

function backDashboard(){

 window.location=
 "../../dashboard/guru.html";

}

window.addAssignment = addAssignment;
window.submitAssignment = submitAssignment;
window.saveGrade = saveGrade;
window.backDashboard = backDashboard;