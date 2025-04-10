import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../firebase";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
