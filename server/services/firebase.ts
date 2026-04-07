import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';

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
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if ((change.type === "added" || change.type === "modified")) {
        const data = change.doc.data();
        
        if (!data.processed) {
          onDana(data.text || '', change.doc.id);
          
          await setDoc(doc(db, "auto_dana_incoming", change.doc.id), 
            { processed: true }, { merge: true });
        }
      }
    });
  });
}

export async function syncDashboardToFirebase(summary: any) {
  try {
    await setDoc(doc(db, "mobile_sync", "dashboard"), {
      ...summary,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error("[FIREBASE] Dashboard Sync Error:", error);
  }
}

export function listenToMobileInput(onInput: (data: any, docId: string) => void) {
  const q = collection(db, "mobile_input");
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        if (!data.processed) {
          onInput(data, change.doc.id);
          await setDoc(doc(db, "mobile_input", change.doc.id), 
            { processed: true }, { merge: true });
        }
      }
    });
  });
}

let globalSyncLastRequest: string | null = null;

export function listenToSyncRequests(onSyncRequest: (month: number, year: number) => void) {
  const docRef = doc(db, "mobile_sync", "request");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.requestedAt && (!globalSyncLastRequest || data.requestedAt !== globalSyncLastRequest)) {
        globalSyncLastRequest = data.requestedAt;
        onSyncRequest(data.month, data.year);
      }
    }
  });
}

export async function syncStoreMetadata(settings: any) {
  try {
    const metaRef = doc(db, "metadata", "shop_info");
    await setDoc(metaRef, {
      storeName: settings.storeName || "DM POS",
      ownerNumber: settings.ownerNumber || "",
      lastUpdated: serverTimestamp()
    }, { merge: true });
    console.log("[FIREBASE] Shop Metadata synced successfully");
  } catch (e) {
    console.error("[FIREBASE] Sync Metadata Error:", e);
  }
}
