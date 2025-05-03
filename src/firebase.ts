import { initializeApp } from "firebase/app"
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAqbGG2JFquCPcRkyM_QeS9jZrAm_fG8j0",
    authDomain: "trashinnout-1e035.firebaseapp.com",
    projectId: "trashinnout-1e035",
    storageBucket: "trashinnout-1e035.firebasestorage.app",
    messagingSenderId: "1086811142141",
    appId: "1:1086811142141:web:8ed416fae68521f49e8b94"
}


// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const firestore = getFirestore(app)
export const storage = getStorage(app)

// Enable offline persistence with better error handling
const enableOfflineSupport = async () => {
  try {
    // Enable multi-tab persistence
    await enableMultiTabIndexedDbPersistence(firestore)
    console.log("Firestore offline persistence enabled")
  } catch (error: any) {
    if (error.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Firestore persistence unavailable - multiple tabs open")
    } else if (error.code === "unimplemented") {
      // The current browser doesn't support persistence
      console.warn("Firestore persistence not supported by this browser")
    } else {
      console.error("Error enabling Firestore persistence:", error)
    }
  }
}

// Only enable offline support in production to avoid development issues
if (import.meta.env.PROD) {
  enableOfflineSupport()
}

export default app
