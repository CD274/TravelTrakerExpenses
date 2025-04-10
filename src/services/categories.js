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

const OFFLINE_CATEGORIES_KEY = "@offline_categories";

// Guardar categoría (online/offline)
export const saveCategory = async (category, isOnline) => {
  if (!category.travelId) {
    throw new Error("Category must have a travelId");
  }
  if (isOnline) {
    await saveCategoryFirestore(category);
  } else {
    await saveCategoryLocal(category);
  }
};

// Obtener todas las categorías de un usuario
export const getCategories = async (userId, travelId = null) => {
  try {
    const categoriesRef = collection(db, "users", userId, "categories");
    let q = query(categoriesRef, orderBy("createdAt", "desc"));

    if (travelId) {
      q = query(
        categoriesRef,
        where("travelId", "==", travelId),
        orderBy("createdAt", "desc")
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting categories:", error);
    return await fetchCategoriesLocal(travelId); // Añade filtro local también
  }
};

// Obtener gastos por categoría
export const getExpensesByCategory = async (userId, categoryId) => {
  try {
    const expensesRef = collection(db, "users", userId, "expenses");
    const q = query(
      expensesRef,
      where("categoryId", "==", categoryId),
      orderBy("createdAt", "desc")
    );

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
    await addDoc(categoriesRef, {
      name: category.name,
      color: category.color,
      travelId: category.travelId,
      userId: category.userId,
      isSynced: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving category to Firestore:", error);
    throw error;
  }
};

const fetchCategoriesFirestore = async (userId) => {
  try {
    const categoriesRef = collection(db, "users", userId, "categories");
    const q = query(categoriesRef, orderBy("createdAt", "desc"));
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

// Funciones locales (se mantienen igual)
const saveCategoryLocal = async (category) => {
  try {
    const existingCategories = await AsyncStorage.getItem(
      OFFLINE_CATEGORIES_KEY
    );
    const parsedCategories = existingCategories
      ? JSON.parse(existingCategories)
      : [];
    const updatedCategories = [
      ...parsedCategories,
      {
        ...category,
        isSynced: false,
        createdAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem(
      OFFLINE_CATEGORIES_KEY,
      JSON.stringify(updatedCategories)
    );
  } catch (error) {
    console.error("Error saving category locally:", error);
    throw error;
  }
};

const fetchCategoriesLocal = async () => {
  try {
    const categories = await AsyncStorage.getItem(OFFLINE_CATEGORIES_KEY);
    return categories ? JSON.parse(categories) : [];
  } catch (error) {
    console.error("Error fetching local categories:", error);
    return [];
  }
};

// Sincronización de categorías locales con la nube
export const syncLocalCategories = async (userId) => {
  const localCategories = await fetchCategoriesLocal();
  if (localCategories.length === 0) return;

  try {
    const batch = writeBatch(db);
    const categoriesRef = collection(db, "users", userId, "categories");

    localCategories.forEach((category) => {
      const categoryRef = doc(categoriesRef);
      batch.set(categoryRef, {
        ...category,
        isSynced: true,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    await AsyncStorage.removeItem(OFFLINE_CATEGORIES_KEY);
  } catch (error) {
    console.error("Error syncing categories:", error);
  }
};
