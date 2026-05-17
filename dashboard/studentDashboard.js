import { auth, db }
from "../firebase/firebase-config.js";

import {
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  loadLayout
} from "../assets/js/components.js";

let studentData = null;
let selectedPricing = null;
let selectedClass = null;


/* =========================
   AUTH
========================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location = "../login.html";
    return;
  }

  try {

    const userSnap = await getDoc(
      doc(db, "users", user.uid)
    );

    if (!userSnap.exists()) return;

    studentData = userSnap.data();

    if (studentData.role !== "student") {
      alert("Akses hanya untuk student");
      return;
    }

    // LOAD LAYOUT
    await loadLayout("student");

    loadProfile(user);

    loadClasses();

  } catch (err) {
    console.error(err);
  }

});

/* =========================
   PROFILE
========================= */

async function loadProfile(user) {

  document.getElementById("studentName").innerText =
    studentData.name || "Student";

  document.getElementById("studentEmail").innerText =
    studentData.email || "-";

  document.getElementById("studentLevel").innerText =
    `${studentData.level} - ${studentData.curriculum}`;

  document.getElementById("studentAvatar").src =
    studentData.avatarURL ||
    "../assets/images/default-avatar.png";

  // HEADER
  const headerName =
    document.getElementById("headerNameHeader");

  if (headerName) {
    headerName.innerText =
      studentData.name || "Student";
  }

  const headerAvatar =
    document.getElementById("headerAvatarHeader");

  if (headerAvatar) {
    headerAvatar.src =
      studentData.avatarURL ||
      "../assets/images/default-avatar.png";
  }

  // MODAL
  const profileName =
    document.getElementById("profileName");

  if (profileName) {
    profileName.value =
      studentData.name || "";
  }

  const profileEmail =
    document.getElementById("profileEmail");

  if (profileEmail) {
    profileEmail.value =
      studentData.email || "";
  }
}

/* =========================
   LOAD CLASSES
========================= */

async function loadClasses() {

  const container =
    document.getElementById("classContainer");

  container.innerHTML = "Loading...";

  // =======================
  // AMBIL CLASS
  // =======================

  const q = query(
    collection(db, "classes"),

    where(
      "level",
      "==",
      studentData.level
    ),

    where(
      "curriculum",
      "==",
      studentData.curriculum
    )
  );

  const snap =
  await getDocs(q);

  if (snap.empty) {

    container.innerHTML = `
      <p>Tidak ada kelas</p>
    `;

    return;
  }

  container.innerHTML = "";

  // =======================
// AMBIL KELAS YANG DIMILIKI STUDENT
// =======================

const classStudentQuery = query(
  collection(db, "class_students"),

  where(
    "studentId",
    "==",
    auth.currentUser.uid
  )
);

const classStudentSnap =
await getDocs(classStudentQuery);

const ownedClassIds =
classStudentSnap.docs.map(doc =>
  doc.data().classId
);

  // =======================
  // LOOP CLASS
  // =======================

  for (const docSnap of snap.docs) {

  const c = docSnap.data();

  const alreadyJoined =
  ownedClassIds.includes(docSnap.id);

  const div =
    document.createElement("div");

  div.className = "class-card";

  const thumbnail =
    c.thumbnail ||
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200";

  div.innerHTML = `

    <div class="class-image-wrap">

      <img
        src="${thumbnail}"
        class="class-image"
      >

      <div class="
        class-badge
        ${c.isPaid ? "badge-premium" : "badge-free"}
      ">
        ${c.isPaid ? "PREMIUM" : "FREE"}
      </div>

    </div>

    <div class="class-content">

      <h3 class="class-title">
        ${c.className || "-"}
      </h3>

      <p class="class-desc">
        ${c.description || "Kelas interaktif modern untuk meningkatkan skill belajar siswa."}
      </p>

      <div class="class-info">

        <div class="info-item">
          📚 ${c.subject || "-"}
        </div>

        <div class="info-item">
          👨‍🏫 ${c.teacherName || "-"}
        </div>

        <div class="info-item">
          🎓 ${c.level || "-"}
        </div>

        <div class="info-item">
  📘 ${c.curriculum || "-"}
</div>

      </div>

      <div class="class-footer">

        <div class="class-price">

  ${
    c.isPaid

    ? (() => {

        const monthly =
          c.pricing?.find(
            p => Number(p.billingPeriod) === 30
          );

        if (monthly) {

          return `
            Rp ${Number(monthly.price)
              .toLocaleString("id-ID")}
            / Bulan
          `;

        }

        return `
          Mulai Rp ${Number(
            c.pricing?.[0]?.price || 0
          ).toLocaleString("id-ID")}
        `;

      })()

    : "Gratis"
  }

</div>

        ${
          c.isPaid

          ? alreadyJoined

            ? `

            <button
              class="btn-modern btn-open"
              data-id="${docSnap.id}"
            >

              Masuk Kelas

            </button>

            `

            : `

            <button
              class="btn-modern btn-buy"
              data-id="${docSnap.id}"
            >

              Beli Kelas

            </button>

            `

          : `

          <button
            class="btn-modern btn-open"
            data-id="${docSnap.id}"
          >

            Masuk Kelas

          </button>

          `
        }

      </div>

    </div>
  `;

  container.appendChild(div);

  // BUTTON BELI
  const buyBtn =
    div.querySelector(".btn-buy");

  if (buyBtn) {

    buyBtn.onclick = () => {

      buyClass({
        id: docSnap.id,
        ...c
      });

    };

  }

  // BUTTON OPEN
  const openBtn =
    div.querySelector(".btn-open");

  if (openBtn) {

    openBtn.onclick = () => {

      openClass(docSnap.id);

    };

  }

}

}
async function buyClass(classItem) {

  selectedClass = classItem;

  selectedPricing = null;

  const pricingWrap =
    document.getElementById(
      "pricingOptions"
    );

  pricingWrap.innerHTML = "";

  classItem.pricing?.forEach((p, index) => {

    const label =
      p.billingPeriod == 30
      ? "1 Bulan"

      : p.billingPeriod == 90
      ? "3 Bulan"

      : p.billingPeriod == 180
      ? "6 Bulan"

      : "12 Bulan";

    const div =
      document.createElement("div");

    div.className = "item";

    div.style.cursor = "pointer";

    div.innerHTML = `

      <label style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      ">

        <div>

          <b>${label}</b>

          <br>

          Rp ${Number(p.price)
            .toLocaleString("id-ID")}

        </div>

        <input
  type="radio"
  name="pricing"
  value="${index}"
>

      </label>

    `;

    div.onclick = () => {

  document
    .querySelectorAll(
      '#pricingOptions .item'
    )
    .forEach(el => {

      el.style.border =
      "none";

      el.querySelector(
        "input"
      ).checked = false;

    });

  div.style.border =
  "2px solid #2563eb";

  div.querySelector(
    "input"
  ).checked = true;

  selectedPricing = p;

};

    pricingWrap.appendChild(div);

  });

  document
    .getElementById("paymentModal")
    .classList.add("active");

}

window.closePaymentModal = () => {
  document
    .getElementById("paymentModal")
    .classList.remove("active");

  selectedClass = null; // 🔥 penting
};



window.selectPayment = async (paymentMethod) => {

  if (!selectedClass) return;

  if (!selectedPricing) {

    alert("Pilih paket terlebih dahulu");

    return;

  }

  try {

    const user = auth.currentUser;

    if (!user) {

      alert("User tidak ditemukan");

      return;

    }

    const price =
      Number(selectedPricing.price || 0);

    const billingPeriod =
      Number(selectedPricing.billingPeriod || 30);

    // CASH
    if (paymentMethod === "cash") {

      await addDoc(
        collection(db, "transactions"),
        {

          userId: user.uid,

          classId: selectedClass.id,

          className:
            selectedClass.className || "-",

          studentName:
            studentData.name || "-",

          studentEmail:
            studentData.email || "-",

          price,

          billingPeriod,

          paymentMethod: "cash",

          paymentStatus: "pending",

          status: "waiting_confirmation",

          createdAt:
            serverTimestamp()

        }
      );

      alert(
        "Request pembayaran cash berhasil dikirim"
      );

      closePaymentModal();

      return;
    }

    // MIDTRANS
    const res = await fetch(
      "/api/createTransaction.php",
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          price,

          name:
            studentData.name,

          email:
            studentData.email

        })

      }
    );

    const result =
      await res.json();

    if (!result.success) {

      throw new Error(
        result.message
      );

    }

    snap.pay(result.snapToken, {

      onSuccess: async function(response){

        await addDoc(
          collection(db, "transactions"),
          {

            userId: user.uid,

            classId:
              selectedClass.id,

            className:
              selectedClass.className,

            price,

            billingPeriod,

            paymentMethod:
              "midtrans",

            paymentStatus:
              "paid",

            orderId:
              result.orderId,

            midtransResponse:
              response,

            createdAt:
              serverTimestamp()

          }
        );

        // AUTO JOIN
        await addDoc(
          collection(db, "class_students"),
          {

            classId:
              selectedClass.id,

            studentId:
              user.uid,

            joinedAt:
              new Date(),

            paymentStatus:
              "paid",

            billingPeriod

          }
        );

        alert("Pembayaran berhasil");

        closePaymentModal();

        loadClasses();

      },

      onPending: function(){

        alert(
          "Menunggu pembayaran"
        );

      },

      onError: function(){

        alert(
          "Pembayaran gagal"
        );

      }

    });

  }

  catch(err){

    console.error(err);

    alert(err.message);

  }

};

window.openProfileModal = () => {

  document
    .getElementById("profileModal")
    .classList.add("active");

};

window.closeProfileModal = () => {

  document
    .getElementById("profileModal")
    .classList.remove("active");

};

window.saveProfile = async () => {

  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("profileName").value.trim();
  const file = document.getElementById("profileAvatarFile").files[0];

  if (!name) {
    alert("Nama wajib diisi");
    return;
  }

  try {

    let avatarURL =
      studentData.avatarURL ||
      "../assets/images/default-avatar.png";

    // UPLOAD AVATAR
    if (file) {

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "avatar_upload");

      const cloudName = "djlvnubgn";

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await res.json();

      if (!data.secure_url) {
        throw new Error("Upload gagal");
      }

      avatarURL = data.secure_url;
    }

    // UPDATE AUTH (HANYA NAME + FOTO)
    await updateProfile(user, {
      displayName: name,
      photoURL: avatarURL
    });

    // UPDATE FIRESTORE
    await updateDoc(doc(db, "users", user.uid), {
      name,
      avatarURL
    });

    // update local
    studentData.name = name;
    studentData.avatarURL = avatarURL;

    await loadProfile(user);
    closeProfileModal();

    alert("Profil berhasil diupdate");

  } catch (err) {
    console.error(err);
    alert("Gagal update profil");
  }
};



async function openClass(classId){

  const classDoc = await getDoc(
    doc(db, "classes", classId)
  );

  if (!classDoc.exists()) {
    return alert("Kelas tidak ditemukan");
  }

  const classData = classDoc.data();

  // =========================
  // GRATIS → AUTO JOIN
  // =========================

  if (!classData.isPaid) {

    const q = query(
      collection(db, "class_students"),

      where(
        "classId",
        "==",
        classId
      ),

      where(
        "studentId",
        "==",
        auth.currentUser.uid
      )
    );

    const snap = await getDocs(q);

    if (snap.empty) {

      await addDoc(
        collection(db, "class_students"),
        {

          classId,

          studentId:
          auth.currentUser.uid,

          joinedAt:
          new Date(),

          paymentStatus:
          "free"

        }
      );

    }

  }

  window.location =
  `./classDetail.html?id=${classId}`;

}