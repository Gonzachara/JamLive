import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { collection } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBP9xd4wvvA4RH29M0iN5NywtJbBzF2_ng",
    authDomain: "jamlive-83843.firebaseapp.com",
    projectId: "jamlive-83843",
    storageBucket: "jamlive-83843.appspot.com",
    messagingSenderId: "604465341639",
    appId: "1:604465341639:web:c0bada6945b9256f140ae2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const listenersRef = collection(db, 'listeners');