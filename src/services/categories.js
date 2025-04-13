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
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firebaseConfig } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OFFLINE_CATEGORIES_KEY = "@offline_categories";
const OFFLINE_CATEGORIES_TO_DELETE = "@offline_categories_to_delete";

// Guardar categoría (online/offline)
export const saveCategory = async (userID, category, isOnline) => {
  if ((!category.travelId || !category.userId || !category.name, !userID)) {
    throw new Error("Category requires travelId, userId and name");
  }
  if (isOnline) {
    return await saveCategoryFirestore(category);
  } else {
    return await saveCategoryLocal(category);
  }
};

// Actualizar categoría (online/offline)
export const updateCategory = async (userId, categoryId, updates, isOnline) => {
  if (!categoryId || !userId) {
    throw new Error("Category ID and userId are required");
  }

  if (isOnline) {
    await updateCategoryFirestore(userId, categoryId, updates);
  } else {
    await updateCategoryLocal(categoryId, updates);
  }
};

// Eliminar categoría (online/offline)
export const deleteCategory = async (userId, categoryId, isOnline) => {
  if (!categoryId || !userId) {
    throw new Error("Category ID and userId are required");
  }

  if (isOnline) {
    await deleteCategoryFirestore(userId, categoryId);
  } else {
    await deleteCategoryLocal(categoryId);
  }
};
// Obtener todas las categorías de un usuario
export const getCategories = async (userId, travelId = null) => {
  try {
    // Primero intentamos obtener de Firestore
    const onlineCategories = await fetchCategoriesFirestore(userId, travelId);

    // Si hay datos online, los devolvemos
    if (onlineCategories.length > 0) {
      // Combinamos con los locales no sincronizados
      const localCategories = await fetchCategoriesLocal();
      const unsyncedCategories = localCategories.filter((c) => !c.isSynced);
      return [...onlineCategories, ...unsyncedCategories];
    }

    // Si no hay datos online, devolvemos los locales
    return await fetchCategoriesLocal(travelId);
  } catch (error) {
    console.error("Error getting categories:", error);
    return await fetchCategoriesLocal(travelId); // Fallback a local si hay error
  }
};
// Obtener gastos por categoría
export const getExpensesByCategory = async (userId, categoryId) => {
  try {
    const expensesRef = collection(db, "users", userId, "expenses");
    const q = query(expensesRef, where("categoryId", "==", categoryId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting expenses by category:", error);
    return [];
  }
};
// Funciones Firebase
const saveCategoryFirestore = async (category) => {
  try {
    const categoriesRef = collection(
      db,
      "users",
      category.userId,
      "categories"
    );
    const docRef = await addDoc(categoriesRef, {
      name: category.name,
      color: category.color,
      travelId: category.travelId,
      userId: category.userId,
      isSynced: true,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...category, isSynced: true };
  } catch (error) {
    console.error("Error saving category to Firestore:", error);
    throw error;
  }
};
const updateCategoryFirestore = async (userId, categoryId, updates) => {
  try {
    const categoryRef = doc(db, "users", userId, "categories", categoryId);
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating category in Firestore:", error);
    throw error;
  }
};
const deleteCategoryFirestore = async (userId, categoryId) => {
  try {
    // Verifica si el ID es un ID de Firestore (longitud 20)
    if (categoryId.length === 20) {
      const categoryRef = doc(db, "users", userId, "categories", categoryId);
      await deleteDoc(categoryRef);
    } else {
      console.log(
        "ID local detectado, eliminación solo en almacenamiento local"
      );
    }
  } catch (error) {
    console.error("Error deleting category from Firestore:", error);
    throw error;
  }
};
const fetchCategoriesFirestore = async (userId, travelId = null) => {
  try {
    const categoriesRef = collection(db, "users", userId, "categories");
    let q = query(categoriesRef);

    if (travelId) {
      q = query(categoriesRef, where("travelId", "==", travelId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};
// Funciones locales
const saveCategoryLocal = async (category) => {
  try {
    const existingCategories = await AsyncStorage.getItem(
      OFFLINE_CATEGORIES_KEY
    );
    const parsedCategories = existingCategories
      ? JSON.parse(existingCategories)
      : [];
    const newCategory = {
      ...category,
      id: Date.now().toString(), // ID temporal
      isSynced: false,
      createdAt: new Date().toISOString(),
    };
    const updatedCategories = [...parsedCategories, newCategory];

    await AsyncStorage.setItem(
      OFFLINE_CATEGORIES_KEY,
      JSON.stringify(updatedCategories)
    );
    return newCategory;
  } catch (error) {
    console.error("Error saving category locally:", error);
    throw error;
  }
};
const updateCategoryLocal = async (categoryId, updates) => {
  try {
    const categories = await fetchCategoriesLocal();
    const updatedCategories = categories.map((category) =>
      category.id === categoryId
        ? { ...category, ...updates, isSynced: false }
        : category
    );

    await AsyncStorage.setItem(
      OFFLINE_CATEGORIES_KEY,
      JSON.stringify(updatedCategories)
    );
  } catch (error) {
    console.error("Error updating category locally:", error);
    throw error;
  }
};
const deleteCategoryLocal = async (categoryId) => {
  try {
    // Guardamos en una lista separada para eliminación posterior
    const toDelete = await AsyncStorage.getItem(OFFLINE_CATEGORIES_TO_DELETE);
    const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];

    // Solo agregamos a la lista de eliminación si es un ID de Firestore
    if (categoryId.length === 20) {
      await AsyncStorage.setItem(
        OFFLINE_CATEGORIES_TO_DELETE,
        JSON.stringify([...parsedToDelete, categoryId])
      );
    }
    // Eliminamos de la lista principal (tanto Firestore como locales)
    const categories = await fetchCategoriesLocal();
    const updatedCategories = categories.filter(
      (category) => category.id !== categoryId
    );
    await AsyncStorage.setItem(
      OFFLINE_CATEGORIES_KEY,
      JSON.stringify(updatedCategories)
    );
  } catch (error) {
    console.error("Error deleting category locally:", error);
    throw error;
  }
};
const fetchCategoriesLocal = async (travelId = null) => {
  try {
    const categories = await AsyncStorage.getItem(OFFLINE_CATEGORIES_KEY);
    const parsedCategories = categories ? JSON.parse(categories) : [];

    if (travelId) {
      return parsedCategories.filter(
        (category) => category.travelId === travelId
      );
    }

    return parsedCategories;
  } catch (error) {
    console.error("Error fetching local categories:", error);
    return [];
  }
};
// Sincronización de datos locales con la nube
export const syncLocalCategories = async (userId) => {
  try {
    // 1. Sincronizar categorías nuevas
    const localCategories = await fetchCategoriesLocal();
    const unsyncedCategories = localCategories.filter((c) => !c.isSynced);

    if (unsyncedCategories.length > 0) {
      const batch = writeBatch(db);
      const categoriesRef = collection(db, "users", userId, "categories");

      for (const category of unsyncedCategories) {
        const categoryRef = doc(categoriesRef);
        batch.set(categoryRef, {
          name: category.name,
          color: category.color,
          travelId: category.travelId,
          userId: category.userId,
          isSynced: true,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await AsyncStorage.setItem(
        OFFLINE_CATEGORIES_KEY,
        JSON.stringify(localCategories.map((c) => ({ ...c, isSynced: true })))
      );
    }

    // 2. Sincronizar eliminaciones
    const toDelete = await AsyncStorage.getItem(OFFLINE_CATEGORIES_TO_DELETE);
    const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];

    if (parsedToDelete.length > 0) {
      const deleteBatch = writeBatch(db);
      let hasDeletes = false;

      for (const categoryId of parsedToDelete) {
        // Verificamos nuevamente que sea un ID de Firestore
        if (categoryId.length === 20) {
          const categoryRef = doc(
            db,
            "users",
            userId,
            "categories",
            categoryId
          );
          deleteBatch.delete(categoryRef);
          hasDeletes = true;
        }
      }

      if (hasDeletes) {
        await deleteBatch.commit();
      }
      await AsyncStorage.removeItem(OFFLINE_CATEGORIES_TO_DELETE);
    }

    // 3. Sincronizar actualizaciones
    const updatedCategories = localCategories.filter(
      (category) =>
        category.isSynced && category.updatedAt && !category.syncedUpdate
    );

    if (updatedCategories.length > 0) {
      const updateBatch = writeBatch(db);

      for (const category of updatedCategories) {
        try {
          const categoryRef = doc(
            db,
            "users",
            userId,
            "categories",
            category.id
          );
          updateBatch.update(categoryRef, {
            name: category.name,
            color: category.color,
            updatedAt: serverTimestamp(),
          });

          // Marcamos como sincronizado
          category.syncedUpdate = true;
        } catch (error) {
          console.warn(`Could not update category ${category.id}`, error);
        }
      }

      try {
        await updateBatch.commit();
        // Actualizamos el almacenamiento local
        await AsyncStorage.setItem(
          OFFLINE_CATEGORIES_KEY,
          JSON.stringify(localCategories)
        );
      } catch (error) {
        console.error("Error syncing category updates:", error);
      }
    }
  } catch (error) {
    console.error("Error syncing categories:", error);
    throw error;
  }
};
