import { auth, db } from "../../firebase/firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadLayout }
from "../../assets/js/components.js";

// ==========================
const materialId =
  new URLSearchParams(window.location.search)
    .get("materialId");

// ==========================
onAuthStateChanged(auth, async(user)=>{

  if(!user){
    window.location="../../login.html";
    return;
  }

  await loadLayout("guru");

  await loadMaterial();
  await loadExercises();

});

// ==========================
// LOAD MATERIAL
// ==========================
async function loadMaterial(){

  const snap =
    await getDoc(doc(db,"materials",materialId));

  if(!snap.exists()) return;

  const data = snap.data();

  document.getElementById("titlePage")
    .innerText =
      `Latihan: ${data.title}`;

}

// ==========================
// LOAD EXERCISES
// ==========================
async function loadExercises(){

  const q = query(
    collection(db,"exercises"),
    where("materialId","==",materialId)
  );

  const snap = await getDocs(q);

  const container =
    document.getElementById("exerciseList");

  container.innerHTML = "";

  if(snap.empty){

    container.innerHTML = `
      <p>Belum ada latihan</p>
    `;

    return;
  }

  snap.forEach(d => {

    const e = d.data();

    const div = document.createElement("div");

    div.className = "card";

    div.style.marginTop = "15px";

    div.innerHTML = `
      <h3>${e.title}</h3>

<p>
  📘 ${e.subject || "-"}
</p>

<p style="
  margin-top:8px;
  font-weight:600;
  color:
    ${
      e.status === "approved"
        ? "green"
        : e.status === "pending"
        ? "orange"
        : "gray"
    };
">

  ${
    e.status === "approved"
      ? "✅ Approved"
      : e.status === "pending"
      ? "⏳ Pending"
      : "📄 Draft"
  }

</p>

      <button
  onclick="openExercise('${d.id}')"

  ${
    e.status !== "approved"
      ? "disabled"
      : ""
  }

  style="
    opacity:
      ${e.status !== "approved" ? "0.5" : "1"};
    cursor:
      ${e.status !== "approved" ? "not-allowed" : "pointer"};
  "
>
  👁 Lihat
</button>
    `;

    container.appendChild(div);

  });

}

// ==========================
window.openExercise = (id) => {

  window.location.href =
    `exercise-view.html?exerciseId=${id}`;

};