let firebaseCache: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyAobTZcu_KxyjZImpskRrnXpdY7fZMioGA",
  authDomain: "pembukuan-toko-pro.firebaseapp.com",
  projectId: "pembukuan-toko-pro",
  storageBucket: "pembukuan-toko-pro.firebasestorage.app",
  messagingSenderId: "109867212877",
  appId: "1:109867212877:web:3d62060af177980cc2fec4"
};

async function getFirebase() {
  if (firebaseCache) return firebaseCache;
  
  try {
    console.log("[FIREBASE] Menginisialisasi Firebase SDK via Dynamic Import...");
    // Use eval import to bypass CJS transformation
    const { initializeApp } = await (eval('import("firebase/app")') as Promise<any>);
    const fStore = await (eval('import("firebase/firestore")') as Promise<any>);
    
    const app = initializeApp(firebaseConfig);
    const db = fStore.getFirestore(app);
    
    firebaseCache = { db, ...fStore };
    console.log("[FIREBASE] SDK Berhasil dimuat & Firestore Terkoneksi!");
    return firebaseCache;
  } catch (error) {
    console.error("[FIREBASE-FATAL] Gagal mengimpor Firebase SDK:", error);
    throw error;
  }
}

export async function syncQRISToFirebase(entry: any) {
  try {
    const { db, doc, setDoc } = await getFirebase();
    await setDoc(doc(db, "qris_notifications", entry.id.toString()), {
      ...entry,
      updatedAt: new Date().toISOString()
    });
    console.log("[FIREBASE] QRIS Entry synced");
  } catch (error) {
    console.error("[FIREBASE] Sync Error:", error);
  }
}

export async function updateFirebaseQRISStatus(id: string, status: string) {
  try {
    const { db, doc, setDoc } = await getFirebase();
    const docRef = doc(db, "qris_notifications", id);
    await setDoc(docRef, { 
      status, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    console.log(`[FIREBASE] Status updated for ${id}: ${status}`);
  } catch (error) {
    console.error("[FIREBASE] Update Error:", error);
  }
}

export async function listenToFirebaseUpdates(onUpdate: (id: string, status: string) => void) {
  try {
    const { db, collection, onSnapshot } = await getFirebase();
    const q = collection(db, "qris_notifications");
    console.log("[FIREBASE] Memulai Listener QRIS Updates...");
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const data = change.doc.data();
          onUpdate(change.doc.id, data.status);
        }
      });
    }, (error) => console.error("[FIREBASE-ERROR] QRIS Listener:", error));
  } catch (error) {
    console.error("[FIREBASE-FATAL] Gagal memulai QRIS listener:", error);
  }
}

export async function listenDanaIncoming(onDana: (text: string, docId: string) => void) {
  try {
    const { db, collection, onSnapshot, doc, setDoc } = await getFirebase();
    const q = collection(db, "auto_dana_incoming");
    console.log("[FIREBASE] Memulai Listener Dana/Gopay Incoming...");
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        try {
          if (change.type === "added") {
            const data = change.doc.data();
            if (!data.processed) {
              onDana(data.text, change.doc.id);
              await setDoc(doc(db, "auto_dana_incoming", change.doc.id), 
                { processed: true }, { merge: true });
            }
          }
        } catch (err) {
          console.error("[FIREBASE-ERROR] Gagal memproses dokumen:", change.doc.id, err);
        }
      });
    }, (error) => console.error("[FIREBASE-ERROR] Dana Listener:", error));
  } catch (error) {
    console.error("[FIREBASE-FATAL] Gagal memulai Dana listener:", error);
  }
}
