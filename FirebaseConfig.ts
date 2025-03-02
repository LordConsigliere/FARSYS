import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgSJzpK4ztl1mmyooq26fdM_ILmg7Yivs",
  authDomain: "teacher-appointment-db.firebaseapp.com",
  projectId: "teacher-appointment-db",
  storageBucket: "teacher-appointment-db.firebasestorage.app",
  messagingSenderId: "321583320362",
  appId: "1:321583320362:web:6e03fa380ec0395b072253",
  databaseURL: "https://teacher-appointment-db-default-rtdb.firebaseio.com" // Make sure this is included
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;