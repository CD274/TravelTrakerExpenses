import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firebaseConfig } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OFFLINE_TRAVELS_KEY = "@offline_travels";

// Guardar categoría (online/offline)

export const saveTravel = async (userId, Travel, isOnline) => {
  if (!travel.name || !userId) {
    throw new Error("Travel name and userId are required");
  }
  if (isOnline) {
    await saveTravelFirestore(userId, Travel);
  } else {
    await saveTravelLocal(Travel);
  }
};

// Obtener todas las categorías de un usuario
export const getTravel = async (userId) => {
  try {
    const onlineTravel = await fetchTravelFirestore(userId);
    if (onlineTravel.length > 0) {
      return onlineTravel;
    }
    return await fetchTravelLocal();
  } catch (error) {
    console.error("Error getting Travels:", error);
    return [];
  }
};

// Obtener categorías por viaje
export const getCategorysByTravels = async (userId, travelId) => {
  try {
    const categoryRef = collection(db, "users", userId, "categories");
    const q = query(
      categoryRef,
      where("travelId", "==", travelId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting expenses by travels:", error);
    return [];
  }
};

// Funciones Firebase
const saveTravelFirestore = async (userId, travel) => {
  try {
    const travelRef = collection(db, "users", userId, "travels");
    await addDoc(travelRef, {
      name: travel.name,
      isSynced: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving travel to Firestore:", error);
    throw error;
  }
};

const fetchTravelFirestore = async (userId) => {
  try {
    const travelRef = collection(db, "users", userId, "travels");
    const q = query(travelRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching travels:", error);
    return [];
  }
};

// Funciones locales (se mantienen igual)
const saveTravelLocal = async (travel) => {
  try {
    const existingTravels = await AsyncStorage.getItem(OFFLINE_TRAVELS_KEY);
    const parsedTravels = existingTravels ? JSON.parse(existingTravels) : [];
    const updatedTravels = [
      ...parsedTravels,
      {
        ...travel,
        isSynced: false,
        createdAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem(
      OFFLINE_TRAVELS_KEY,
      JSON.stringify(updatedTravels)
    );
  } catch (error) {
    console.error("Error saving travel locally:", error);
    throw error;
  }
};

const fetchTravelLocal = async () => {
  try {
    const travels = await AsyncStorage.getItem(OFFLINE_TRAVELS_KEY);
    return travels ? JSON.parse(travels) : [];
  } catch (error) {
    console.error("Error fetching local traveks:", error);
    return [];
  }
};

// Sincronización de categorías locales con la nube
export const syncLocalTravel = async (userId) => {
  const localTravels = await fetchTravelLocal();
  if (localTravels.length === 0) return;

  try {
    const batch = writeBatch(db);
    const travelsRef = collection(db, "users", userId, "travels");

    localTravels.forEach((travel) => {
      const travelRef = doc(travelsRef);
      batch.set(travelRef, {
        ...travel,
        isSynced: true,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    await AsyncStorage.removeItem(OFFLINE_TRAVELS_KEY);
  } catch (error) {
    console.error("Error syncing Travels:", error);
  }
};
