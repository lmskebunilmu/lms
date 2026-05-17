import { db } 
from "../../firebase/firebase-config.js";

import {
 collection,
 addDoc,
 getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("subjects.js loaded");


// ==========================
// TAMBAH SUBJECT
// ==========================

async function addSubject(){

 let name =
 document.getElementById("subjectName").value;

 let schoolId =
 document.getElementById("schoolId").value;

 if(name=="" || schoolId==""){

   alert("Isi semua data");
   return;

 }

 try {

   await addDoc(
     collection(db,"subjects"),
     {
       name: name,
       schoolId: schoolId,
       createdAt: new Date()
     }
   );

   alert("Mata pelajaran berhasil ditambahkan");

   loadSubjects();

 } catch(error){

   alert(error.message);

 }

}



// ==========================
// LOAD SUBJECT
// ==========================

async function loadSubjects(){

 let list =
 document.getElementById("subjectList");

 list.innerHTML = "";

 let querySnapshot =
 await getDocs(collection(db,"subjects"));

 querySnapshot.forEach((doc)=>{

   let data = doc.data();

   let li =
   document.createElement("li");

   li.textContent =
   data.name + " (" + data.schoolId + ")";

   list.appendChild(li);

 });

}



// ==========================
// BACK DASHBOARD
// ==========================

function backDashboard(){

 window.location=
 "../../dashboard/admin.html";

}

window.addSubject = addSubject;
window.backDashboard = backDashboard;


// LOAD SAAT HALAMAN DIBUKA

loadSubjects();