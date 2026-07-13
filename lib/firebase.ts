import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
const NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
const NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

if (!NEXT_PUBLIC_FIREBASE_API_KEY) throw new Error("Firebase: variable de entorno NEXT_PUBLIC_FIREBASE_API_KEY no definida. Crea un archivo .env.local basado en .env.example")
if (!NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) throw new Error("Firebase: variable de entorno NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN no definida. Crea un archivo .env.local basado en .env.example")
if (!NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error("Firebase: variable de entorno NEXT_PUBLIC_FIREBASE_PROJECT_ID no definida. Crea un archivo .env.local basado en .env.example")
if (!NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) throw new Error("Firebase: variable de entorno NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no definida. Crea un archivo .env.local basado en .env.example")
if (!NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) throw new Error("Firebase: variable de entorno NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID no definida. Crea un archivo .env.local basado en .env.example")
if (!NEXT_PUBLIC_FIREBASE_APP_ID) throw new Error("Firebase: variable de entorno NEXT_PUBLIC_FIREBASE_APP_ID no definida. Crea un archivo .env.local basado en .env.example")

const firebaseConfig = {
  apiKey: NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)