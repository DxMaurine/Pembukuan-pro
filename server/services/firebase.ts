import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAobTZcu_KxyjZImpskRrnXpdY7fZMioGA",
  authDomain: "pembukuan-toko-pro.firebaseapp.com",
  projectId: "pembukuan-toko-pro",
  storageBucket: "pembukuan-toko-pro.firebasestorage.app",
  messagingSenderId: "109867212877",
  appId: "1:109867212877:web:3d62060af177980cc2fec4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function syncQRISToFirebase(entry: any) {
  try {
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

export function listenToFirebaseUpdates(onUpdate: (id: string, status: string) => void) {
  const q = collection(db, "qris_notifications");
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "modified") {
        const data = change.doc.data();
        onUpdate(change.doc.id, data.status);
      }
    });
  });
}

export function listenDanaIncoming(onDana: (text: string, docId: string) => void) {
  const q = collection(db, "auto_dana_incoming");
  console.log("[FIREBASE] Listener Dana/Gopay Aktif (Versi Stabil)...");
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if ((change.type === "added" || change.type === "modified")) {
        const data = change.doc.data();
        if (!data.processed) {
          console.log(`[FIREBASE] Menangkap Pesan Baru: ${data.text ? data.text.substring(0, 50) : 'Tanpa Teks'}`);
          onDana(data.text || '', change.doc.id);
          await setDoc(doc(db, "auto_dana_incoming", change.doc.id), 
            { processed: true }, { merge: true });
        }
      }
    });
  });
}
