import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../firebase";

const app = initializeApp(firebaseConfig);
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (error) {
  if (error.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// Mapeo de errores de Firebase a mensajes amigables
const firebaseErrorMessages = {
  "auth/email-already-in-use": "El correo ya está registrado",
  "auth/invalid-email": "Correo electrónico inválido",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
  "auth/user-not-found": "Usuario no encontrado",
  "auth/wrong-password": "Contraseña incorrecta",
  "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
};

export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    const friendlyMessage =
      firebaseErrorMessages[error.code] ||
      "Error al registrar. Intenta nuevamente";
    throw new Error(friendlyMessage);
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    const friendlyMessage =
      firebaseErrorMessages[error.code] ||
      "Error al iniciar sesión. Intenta nuevamente";
    throw new Error(friendlyMessage);
  }
};
