import { auth, db }
from "../../firebase/firebase-config.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadLayout }
from "../../assets/js/components.js";

// ==========================
const exerciseId =
  new URLSearchParams(window.location.search)
    .get("exerciseId");

// ==========================
onAuthStateChanged(auth, async(user)=>{

  if(!user){
    window.location="../../login.html";
    return;
  }

  await loadLayout("guru");

  await loadExercise();
  await loadQuestions();

});

// ==========================
// LOAD EXERCISE
// ==========================
async function loadExercise(){

  const snap =
    await getDoc(doc(db,"exercises",exerciseId));

  if(!snap.exists()) return;

  const data = snap.data();

  document.getElementById("exerciseTitle")
    .innerText =
      data.title || "Latihan";

}

// ==========================
// LOAD QUESTIONS
// ==========================
async function loadQuestions(){

  const q = query(
    collection(db,"questions"),
    where("exerciseId","==",exerciseId)
  );

  const snap = await getDocs(q);

  const container =
    document.getElementById("questionsList");

  container.innerHTML = "";

  if(snap.empty){

    container.innerHTML =
      "<p>Belum ada soal</p>";

    return;
  }

  let no = 1;

  snap.forEach(d => {

    const q = d.data();

    const div = document.createElement("div");

    div.className = "card";

    div.style.marginTop = "15px";

    let html = `
      <h3>Soal ${no++}</h3>

      <div style="margin-top:10px">
        ${q.question || "-"}
      </div>
    `;

    // ======================
    // PG
    // ======================
    if(q.type === "pg"){

      html += `
        <ul>
          ${(q.options || []).map(opt => `
            <li>${opt}</li>
          `).join("")}
        </ul>
      `;
    }

    // ======================
    // ISIAN
    // ======================
    if(q.type === "isian"){

      html += `
        <p>
          <b>Jawaban:</b>
          ${q.answer || "-"}
        </p>
      `;
    }

    // ======================
    // PEMBAHASAN
    // ======================
    if(q.explanation){

      html += `
        <div style="
          background:#f5f5f5;
          padding:10px;
          border-radius:8px;
          margin-top:10px;
        ">
          <b>Pembahasan:</b>
          <div>${q.explanation}</div>
        </div>
      `;
    }

    div.innerHTML = html;

    container.appendChild(div);

    // MATHJAX
    if(window.MathJax){
      MathJax.typesetPromise([div]);
    }

  });

}