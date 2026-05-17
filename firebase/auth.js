import { auth, db }
from "./firebase-config.js";

import {
 signInWithEmailAndPassword
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
 doc,
 getDoc
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



// ==========================
// LOGIN FUNCTION
// ==========================

export async function loginUser(
 email,
 password
){

 try{

  // Login Firebase Auth
  const userCred =
  await signInWithEmailAndPassword(
   auth,
   email,
   password
  );

  const user =
  userCred.user;


  // Ambil data user dari Firestore
  const userRef =
  doc(db,"users",user.uid);

  const userSnap =
  await getDoc(userRef);


  if(userSnap.exists()){

   const userData =
   userSnap.data();


   // Simpan role
   localStorage.setItem(
    "role",
    userData.role
   );

   localStorage.setItem(
    "userName",
    userData.name
   );

   localStorage.setItem(
    "photoURL",
    userData.photoURL || ""
   );


   // Redirect sesuai role
   redirectByRole(
    userData.role
   );

  }

 }catch(error){

  alert(error.message);

 }

}



// ==========================
// REDIRECT BERDASARKAN ROLE
// ==========================

function redirectByRole(role){

 if(role === "superadmin"){

  window.location =
  "/dashboard/superadmin.html";

 }

 if(role === "admin"){

  window.location =
  "/dashboard/admin.html";

 }

 if(role === "guru"){

  window.location =
  "/dashboard/guru.html";

 }

 if(role === "siswa"){

  window.location =
  "/dashboard/siswa.html";

 }

}