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
const OFFLINE_CATEGORIES_KEY = "@offline_categories";
const OFFLINE_EXPENSES_KEY = "@offline_expenses";
const OFFLINE_ENTITIES_TO_DELETE = "@offline_entities_to_delete";

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
    const [onlineTravels, localTravels] = await Promise.all([
      fetchTravelFirestore(userId),
      fetchTravelLocal(),
    ]);

    // Combinar datos dando prioridad a los online
    const combined = [];
    const ids = new Set();

    onlineTravels.forEach((travel) => {
      if (!ids.has(travel.id)) {
        ids.add(travel.id);
        combined.push({ ...travel, isSynced: true });
      }
    });

    localTravels.forEach((travel) => {
      if (!travel.isSynced && !ids.has(travel.id)) {
        ids.add(travel.id);
        combined.push(travel);
      }
    });

    return combined;
  } catch (error) {
    console.error("Error getting travels:", error);
    return await fetchTravelLocal();
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
    // 1. Sincronizar viajes
    await syncTravels(userId);

    // 2. Sincronizar categorías
    await syncCategories(userId);

    // 3. Sincronizar gastos
    await syncExpenses(userId);

    return true;
  } catch (error) {
    console.error("Error in complete sync:", error);
    throw error;
  }
};
// Sincronización de viajes mejorada
const syncTravels = async (userId) => {
  const [localTravels, onlineTravels] = await Promise.all([
    fetchTravelLocal(),
    fetchTravelFirestore(userId),
  ]);

  const batch = writeBatch(db);
  const travelsRef = collection(db, "users", userId, "travels");
  let hasChanges = false;

  // Mapa para evitar duplicados
  const travelMap = new Map();

  // Procesar viajes existentes en la nube primero
  onlineTravels.forEach((travel) => {
    travelMap.set(travel.id, travel);
  });

  // Procesar viajes locales
  const unsyncedTravels = localTravels.filter((t) => !t.isSynced);
  for (const travel of unsyncedTravels) {
    // Generar clave única para comparación
    const travelKey = `${travel.name}-${travel.createdAt}`;

    const existsOnline = onlineTravels.some(
      (t) => `${t.name}-${t.createdAt}` === travelKey
    );

    if (!existsOnline) {
      const travelRef = doc(travelsRef);
      const newTravel = {
        ...travel,
        id: travelRef.id, // Usar ID de Firestore
        isSynced: true,
        createdAt: serverTimestamp(),
      };

      batch.set(travelRef, newTravel);
      travelMap.set(travelRef.id, newTravel);
      hasChanges = true;
    }
  }

  if (hasChanges) await batch.commit();

  // Actualizar almacenamiento local con nuevos IDs de Firestore
  const updatedLocalTravels = Array.from(travelMap.values()).map((t) => ({
    ...t,
    isSynced: true,
    syncedUpdate: true,
  }));

  await AsyncStorage.setItem(
    OFFLINE_TRAVELS_KEY,
    JSON.stringify(updatedLocalTravels)
  );
};
// Función para sincronizar categorías
const syncCategories = async (userId) => {
  const [localCategories, onlineCategories] = await Promise.all([
    fetchLocalCategories(),
    fetchOnlineCategories(userId),
  ]);

  const batch = writeBatch(db);
  const categoriesRef = collection(db, "users", userId, "categories");
  let hasChanges = false;

  // Procesar categorías nuevas
  const unsyncedCategories = localCategories.filter((c) => !c.isSynced);
  for (const category of unsyncedCategories) {
    const existsOnline = onlineCategories.some(
      (c) => c.name === category.name && c.travelId === category.travelId
    );

    if (!existsOnline) {
      const categoryRef = doc(categoriesRef);
      batch.set(categoryRef, {
        ...category,
        isSynced: true,
        createdAt: serverTimestamp(),
      });
      hasChanges = true;
    }
  }

  // Procesar actualizaciones
  const updatedCategories = localCategories.filter(
    (c) => c.isSynced && c.updatedAt && !c.syncedUpdate
  );
  for (const category of updatedCategories) {
    const onlineCategory = onlineCategories.find((c) => c.id === category.id);
    if (
      onlineCategory &&
      JSON.stringify(onlineCategory) !== JSON.stringify(category)
    ) {
      batch.update(doc(categoriesRef, category.id), {
        ...category,
        updatedAt: serverTimestamp(),
      });
      hasChanges = true;
    }
  }

  if (hasChanges) await batch.commit();

  // Procesar eliminaciones
  const toDelete = await AsyncStorage.getItem(OFFLINE_ENTITIES_TO_DELETE);
  const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];
  const categoriesToDelete = parsedToDelete.filter(
    (e) => e.type === "category"
  );

  if (categoriesToDelete.length > 0) {
    const deleteBatch = writeBatch(db);
    let hasDeletes = false;

    for (const { id } of categoriesToDelete) {
      if (id.length === 20) {
        deleteBatch.delete(doc(categoriesRef, id));
        hasDeletes = true;
      }
    }

    if (hasDeletes) await deleteBatch.commit();

    // Actualizar lista de eliminaciones
    const updatedToDelete = parsedToDelete.filter((e) => e.type !== "category");
    await AsyncStorage.setItem(
      OFFLINE_ENTITIES_TO_DELETE,
      JSON.stringify(updatedToDelete)
    );
  }

  // Actualizar almacenamiento local
  const updatedLocalCategories = localCategories.map((c) => ({
    ...c,
    isSynced: true,
    syncedUpdate: c.updatedAt ? true : c.syncedUpdate,
  }));

  await AsyncStorage.setItem(
    OFFLINE_CATEGORIES_KEY,
    JSON.stringify(updatedLocalCategories)
  );
};

// Función para sincronizar gastos (similar a las anteriores)
const syncExpenses = async (userId) => {
  // Implementación similar a syncCategories pero para gastos
  // ...
};

// Funciones auxiliares para obtener datos
const fetchOnlineCategories = async (userId) => {
  try {
    const categoriesRef = collection(db, "users", userId, "categories");
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching online categories:", error);
    return [];
  }
};

const fetchLocalCategories = async () => {
  try {
    const categories = await AsyncStorage.getItem(OFFLINE_CATEGORIES_KEY);
    return categories ? JSON.parse(categories) : [];
  } catch (error) {
    console.error("Error fetching local categories:", error);
    return [];
  }
};
