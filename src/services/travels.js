import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
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
const OFFLINE_TRAVELS_TO_DELETE = "@offline_travels_to_delete";

// Guardar viaje (online/offline)
export const saveTravel = async (userId, travel, isOnline) => {
  if (!travel.name || !userId) {
    throw new Error("Travel name and userId are required");
  }
  if (isOnline) {
    return await saveTravelFirestore(userId, travel);
  } else {
    return await saveTravelLocal(travel);
  }
};

// Actualizar viaje (online/offline)
export const updateTravel = async (userId, travelId, updates, isOnline) => {
  if (!travelId || !userId) {
    throw new Error("Travel ID and userId are required");
  }

  if (isOnline) {
    await updateTravelFirestore(userId, travelId, updates);
  } else {
    await updateTravelLocal(travelId, updates);
  }
};

// Eliminar viaje (online/offline)
export const deleteTravel = async (userId, travelId, isOnline) => {
  if (!travelId || !userId) {
    throw new Error("Travel ID and userId are required");
  }

  if (isOnline) {
    await deleteTravelFirestore(userId, travelId);
  } else {
    await deleteTravelLocal(travelId);
  }
};

// Obtener todos los viajes de un usuario
export const getTravel = async (userId) => {
  try {
    // Primero intentamos obtener de Firestore
    const onlineTravels = await fetchTravelFirestore(userId);

    // Si hay datos online, los devolvemos
    if (onlineTravels.length > 0) {
      // Combinamos con los locales no sincronizados
      const localTravels = await fetchTravelLocal();
      const unsyncedTravels = localTravels.filter((t) => !t.isSynced);
      return [...onlineTravels, ...unsyncedTravels];
    }

    // Si no hay datos online, devolvemos los locales
    return await fetchTravelLocal();
  } catch (error) {
    console.error("Error getting travels:", error);
    return await fetchTravelLocal(); // Fallback a local si hay error
  }
};

// Obtener categorías por viaje (solo online)
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
    console.error("Error getting categories by travels:", error);
    return [];
  }
};

// Funciones Firebase
const saveTravelFirestore = async (userId, travel) => {
  try {
    const travelRef = collection(db, "users", userId, "travels");
    const docRef = await addDoc(travelRef, {
      name: travel.name,
      isSynced: true,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...travel, isSynced: true };
  } catch (error) {
    console.error("Error saving travel to Firestore:", error);
    throw error;
  }
};

const updateTravelFirestore = async (userId, travelId, updates) => {
  try {
    const travelRef = doc(db, "users", userId, "travels", travelId);
    await updateDoc(travelRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating travel in Firestore:", error);
    throw error;
  }
};

const deleteTravelFirestore = async (userId, travelId) => {
  try {
    // Verifica si el ID es un ID de Firestore (longitud 20)
    if (travelId.length === 20) {
      const travelRef = doc(db, "users", userId, "travels", travelId);
      await deleteDoc(travelRef);
    } else {
      console.log(
        "ID local detectado, eliminación solo en almacenamiento local"
      );
    }
  } catch (error) {
    console.error("Error deleting travel from Firestore:", error);
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
    console.error("Error fetching travels from Firestore:", error);
    return [];
  }
};

// Funciones locales
const saveTravelLocal = async (travel) => {
  try {
    const existingTravels = await AsyncStorage.getItem(OFFLINE_TRAVELS_KEY);
    const parsedTravels = existingTravels ? JSON.parse(existingTravels) : [];
    const newTravel = {
      ...travel,
      id: Date.now().toString(), // ID temporal
      isSynced: false,
      createdAt: new Date().toISOString(),
    };
    const updatedTravels = [...parsedTravels, newTravel];

    await AsyncStorage.setItem(
      OFFLINE_TRAVELS_KEY,
      JSON.stringify(updatedTravels)
    );
    return newTravel;
  } catch (error) {
    console.error("Error saving travel locally:", error);
    throw error;
  }
};

const updateTravelLocal = async (travelId, updates) => {
  try {
    const travels = await fetchTravelLocal();
    const updatedTravels = travels.map((travel) =>
      travel.id === travelId
        ? { ...travel, ...updates, isSynced: false }
        : travel
    );

    await AsyncStorage.setItem(
      OFFLINE_TRAVELS_KEY,
      JSON.stringify(updatedTravels)
    );
  } catch (error) {
    console.error("Error updating travel locally:", error);
    throw error;
  }
};

const deleteTravelLocal = async (travelId) => {
  try {
    // Guardamos en una lista separada para eliminación posterior
    const toDelete = await AsyncStorage.getItem(OFFLINE_TRAVELS_TO_DELETE);
    const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];

    // Solo agregamos a la lista de eliminación si es un ID de Firestore
    if (travelId.length === 20) {
      await AsyncStorage.setItem(
        OFFLINE_TRAVELS_TO_DELETE,
        JSON.stringify([...parsedToDelete, travelId])
      );
    }

    // Eliminamos de la lista principal (tanto Firestore como locales)
    const travels = await fetchTravelLocal();
    const updatedTravels = travels.filter((travel) => travel.id !== travelId);
    await AsyncStorage.setItem(
      OFFLINE_TRAVELS_KEY,
      JSON.stringify(updatedTravels)
    );
  } catch (error) {
    console.error("Error deleting travel locally:", error);
    throw error;
  }
};

const fetchTravelLocal = async () => {
  try {
    const travels = await AsyncStorage.getItem(OFFLINE_TRAVELS_KEY);
    return travels ? JSON.parse(travels) : [];
  } catch (error) {
    console.error("Error fetching local travels:", error);
    return [];
  }
};

// Sincronización de datos locales con la nube
export const syncLocalTravel = async (userId) => {
  try {
    // 1. Sincronizar viajes nuevos
    const localTravels = await fetchTravelLocal();
    const unsyncedTravels = localTravels.filter((t) => !t.isSynced);

    if (unsyncedTravels.length > 0) {
      const batch = writeBatch(db);
      const travelsRef = collection(db, "users", userId, "travels");

      for (const travel of unsyncedTravels) {
        const travelRef = doc(travelsRef);
        batch.set(travelRef, {
          name: travel.name,
          isSynced: true,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await AsyncStorage.setItem(
        OFFLINE_TRAVELS_KEY,
        JSON.stringify(localTravels.map((t) => ({ ...t, isSynced: true })))
      );
    }

    // 2. Sincronizar eliminaciones
    const toDelete = await AsyncStorage.getItem(OFFLINE_TRAVELS_TO_DELETE);
    const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];

    if (parsedToDelete.length > 0) {
      const deleteBatch = writeBatch(db);
      let hasDeletes = false;

      for (const travelId of parsedToDelete) {
        // Verificamos nuevamente que sea un ID de Firestore
        if (travelId.length === 20) {
          const travelRef = doc(db, "users", userId, "travels", travelId);
          deleteBatch.delete(travelRef);
          hasDeletes = true;
        }
      }

      if (hasDeletes) {
        await deleteBatch.commit();
      }
      await AsyncStorage.removeItem(OFFLINE_TRAVELS_TO_DELETE);
    }

    // 3. Sincronizar actualizaciones
    const updatedTravels = localTravels.filter(
      (travel) => travel.isSynced && travel.updatedAt && !travel.syncedUpdate
    );

    if (updatedTravels.length > 0) {
      const updateBatch = writeBatch(db);

      for (const travel of updatedTravels) {
        try {
          const travelRef = doc(db, "users", userId, "travels", travel.id);
          updateBatch.update(travelRef, {
            name: travel.name,
            updatedAt: serverTimestamp(),
          });

          // Marcamos como sincronizado
          travel.syncedUpdate = true;
        } catch (error) {
          console.warn(`Could not update travel ${travel.id}`, error);
        }
      }

      try {
        await updateBatch.commit();
        // Actualizamos el almacenamiento local
        await AsyncStorage.setItem(
          OFFLINE_TRAVELS_KEY,
          JSON.stringify(localTravels)
        );
      } catch (error) {
        console.error("Error syncing travel updates:", error);
      }
    }
  } catch (error) {
    console.error("Error syncing travels:", error);
    throw error;
  }
};
