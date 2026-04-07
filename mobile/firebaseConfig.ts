import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAobTZcu_KxyjZImPskRrnxpdY7fZMioGA",
  authDomain: "pembukuan-toko-pro.firebaseapp.com",
  projectId: "pembukuan-toko-pro",
  storageBucket: "pembukuan-toko-pro.firebasestorage.app",
  messagingSenderId: "1098676212877",
  appId: "1:1098676212877:web:c70c7cdcd0a2daaac2fec4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
