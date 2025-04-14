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
import { convertCurrency } from "./currencyAPI";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OFFLINE_EXPENSES_KEY = "@offline_expenses";
const OFFLINE_EXPENSES_TO_DELETE = "@offline_expenses_to_delete";

// Guardar gasto (con relación a categoría)
export const saveExpense = async (expense, isOnline) => {
  if (!expense.categoryId || !expense.userId || !expense.amount) {
    throw new Error("Expense requires categoryId, userId and amount");
  }

  if (isOnline) {
    return await saveExpenseFirestore(expense);
  } else {
    return await saveExpenseLocal(expense);
  }
};

// Actualizar gasto (online/offline)
export const updateExpense = async (userId, expenseId, updates, isOnline) => {
  if (!expenseId || !userId) {
    throw new Error("Expense ID and userId are required");
  }

  if (isOnline) {
    await updateExpenseFirestore(userId, expenseId, updates);
  } else {
    await updateExpenseLocal(expenseId, updates);
  }
};

// Eliminar gasto (online/offline)
export const deleteExpense = async (userId, expenseId, isOnline) => {
  if (!expenseId || !userId) {
    throw new Error("Expense ID and userId are required");
  }

  if (isOnline) {
    await deleteExpenseFirestore(userId, expenseId);
  } else {
    await deleteExpenseLocal(expenseId);
  }
};

// Obtener gastos por categoría
export const getExpensesByCategory = async (userId, categoryId) => {
  try {
    // Primero intentamos obtener de Firestore
    const onlineExpenses = await fetchExpensesFirestore(userId, categoryId);

    // Si hay datos online, los devolvemos
    if (onlineExpenses.length > 0) {
      // Combinamos con los locales no sincronizados
      const localExpenses = await fetchExpensesLocal();
      const unsyncedExpenses = localExpenses.filter(
        (e) => !e.isSynced && e.categoryId === categoryId
      );
      return [...onlineExpenses, ...unsyncedExpenses];
    }

    // Si no hay datos online, devolvemos los locales
    return await fetchExpensesLocal(categoryId);
  } catch (error) {
    console.error("Error getting expenses by category:", error);
    return await fetchExpensesLocal(categoryId); // Fallback a local si hay error
  }
};

// Funciones Firebase
const saveExpenseFirestore = async (expense) => {
  try {
    const expensesRef = collection(db, "users", expense.userId, "expenses");
    const docRef = await addDoc(expensesRef, {
      ...expense,
      categoryId: expense.categoryId,
      isSynced: true,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...expense, isSynced: true };
  } catch (error) {
    console.error("Error saving expense to Firestore:", error);
    throw error;
  }
};

const updateExpenseFirestore = async (userId, expenseId, updates) => {
  try {
    const expenseRef = doc(db, "users", userId, "expenses", expenseId);
    await updateDoc(expenseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating expense in Firestore:", error);
    throw error;
  }
};

const deleteExpenseFirestore = async (userId, expenseId) => {
  try {
    // Verifica si el ID es un ID de Firestore (longitud 20)
    if (expenseId.length === 20) {
      const expenseRef = doc(db, "users", userId, "expenses", expenseId);
      await deleteDoc(expenseRef);
    } else {
      console.log(
        "ID local detectado, eliminación solo en almacenamiento local"
      );
    }
  } catch (error) {
    console.error("Error deleting expense from Firestore:", error);
    throw error;
  }
};

const fetchExpensesFirestore = async (userId, categoryId = null) => {
  try {
    const expensesRef = collection(db, "users", userId, "expenses");
    let q = query(expensesRef);

    if (categoryId) {
      q = query(expensesRef, where("categoryId", "==", categoryId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
};

// Funciones locales
const saveExpenseLocal = async (expense) => {
  try {
    const existingExpenses = await AsyncStorage.getItem(OFFLINE_EXPENSES_KEY);
    const parsedExpenses = existingExpenses ? JSON.parse(existingExpenses) : [];
    const newExpense = {
      ...expense,
      id: Date.now().toString(), // ID temporal
      isSynced: false,
      createdAt: new Date().toISOString(),
    };
    const updatedExpenses = [...parsedExpenses, newExpense];

    await AsyncStorage.setItem(
      OFFLINE_EXPENSES_KEY,
      JSON.stringify(updatedExpenses)
    );
    return newExpense;
  } catch (error) {
    console.error("Error saving expense locally:", error);
    throw error;
  }
};

const updateExpenseLocal = async (expenseId, updates) => {
  try {
    const expenses = await fetchExpensesLocal();
    const updatedExpenses = expenses.map((expense) =>
      expense.id === expenseId
        ? { ...expense, ...updates, isSynced: false }
        : expense
    );

    await AsyncStorage.setItem(
      OFFLINE_EXPENSES_KEY,
      JSON.stringify(updatedExpenses)
    );
  } catch (error) {
    console.error("Error updating expense locally:", error);
    throw error;
  }
};

const deleteExpenseLocal = async (expenseId) => {
  try {
    // Guardamos en una lista separada para eliminación posterior
    const toDelete = await AsyncStorage.getItem(OFFLINE_EXPENSES_TO_DELETE);
    const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];

    // Solo agregamos a la lista de eliminación si es un ID de Firestore
    if (expenseId.length === 20) {
      await AsyncStorage.setItem(
        OFFLINE_EXPENSES_TO_DELETE,
        JSON.stringify([...parsedToDelete, expenseId])
      );
    }

    // Eliminamos de la lista principal (tanto Firestore como locales)
    const expenses = await fetchExpensesLocal();
    const updatedExpenses = expenses.filter(
      (expense) => expense.id !== expenseId
    );
    await AsyncStorage.setItem(
      OFFLINE_EXPENSES_KEY,
      JSON.stringify(updatedExpenses)
    );
  } catch (error) {
    console.error("Error deleting expense locally:", error);
    throw error;
  }
};

const fetchExpensesLocal = async (categoryId = null) => {
  try {
    const expenses = await AsyncStorage.getItem(OFFLINE_EXPENSES_KEY);
    const parsedExpenses = expenses ? JSON.parse(expenses) : [];

    if (categoryId) {
      return parsedExpenses.filter(
        (expense) => expense.categoryId === categoryId
      );
    }

    return parsedExpenses;
  } catch (error) {
    console.error("Error fetching local expenses:", error);
    return [];
  }
};

// Sincronización de datos locales con la nube
export const syncLocalExpenses = async (userId) => {
  try {
    // 1. Sincronizar gastos nuevos
    const localExpenses = await fetchExpensesLocal();
    const unsyncedExpenses = localExpenses.filter((e) => !e.isSynced);

    if (unsyncedExpenses.length > 0) {
      const batch = writeBatch(db);
      const expensesRef = collection(db, "users", userId, "expenses");

      for (const expense of unsyncedExpenses) {
        const expenseRef = doc(expensesRef);
        batch.set(expenseRef, {
          ...expense,
          isSynced: true,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await AsyncStorage.setItem(
        OFFLINE_EXPENSES_KEY,
        JSON.stringify(localExpenses.map((e) => ({ ...e, isSynced: true })))
      );
    }

    // 2. Sincronizar eliminaciones
    const toDelete = await AsyncStorage.getItem(OFFLINE_EXPENSES_TO_DELETE);
    const parsedToDelete = toDelete ? JSON.parse(toDelete) : [];

    if (parsedToDelete.length > 0) {
      const deleteBatch = writeBatch(db);
      let hasDeletes = false;

      for (const expenseId of parsedToDelete) {
        // Verificamos nuevamente que sea un ID de Firestore
        if (expenseId.length === 20) {
          const expenseRef = doc(db, "users", userId, "expenses", expenseId);
          deleteBatch.delete(expenseRef);
          hasDeletes = true;
        }
      }

      if (hasDeletes) {
        await deleteBatch.commit();
      }
      await AsyncStorage.removeItem(OFFLINE_EXPENSES_TO_DELETE);
    }

    // 3. Sincronizar actualizaciones
    const updatedExpenses = localExpenses.filter(
      (expense) =>
        expense.isSynced && expense.updatedAt && !expense.syncedUpdate
    );

    if (updatedExpenses.length > 0) {
      const updateBatch = writeBatch(db);

      for (const expense of updatedExpenses) {
        try {
          const expenseRef = doc(db, "users", userId, "expenses", expense.id);
          updateBatch.update(expenseRef, {
            ...expense,
            updatedAt: serverTimestamp(),
          });

          // Marcamos como sincronizado
          expense.syncedUpdate = true;
        } catch (error) {
          console.warn(`Could not update expense ${expense.id}`, error);
        }
      }

      try {
        await updateBatch.commit();
        // Actualizamos el almacenamiento local
        await AsyncStorage.setItem(
          OFFLINE_EXPENSES_KEY,
          JSON.stringify(localExpenses)
        );
      } catch (error) {
        console.error("Error syncing expense updates:", error);
      }
    }
  } catch (error) {
    console.error("Error syncing expenses:", error);
    throw error;
  }
};

// Conversión de moneda
export const convertAndSaveExpense = async (expense, userCurrency) => {
  if (!expense?.categoryId) {
    throw new Error("Expense must have a categoryId");
  }
  if (!expense?.amount) {
    throw new Error("Expense must have a amount");
  }

  if (expense.currency === userCurrency) {
    return await saveExpense(expense, true);
  }

  try {
    const convertedAmount = await convertCurrency(
      expense.currency,
      userCurrency,
      expense.amount
    );

    if (convertedAmount === 0) {
      throw new Error("La conversión retornó 0");
    }

    return await saveExpense(
      {
        ...expense,
        amount: convertedAmount,
        originalAmount: expense.amount,
        originalCurrency: expense.currency,
        currency: userCurrency,
        isSynced: true,
        conversionRate: convertedAmount / expense.amount,
      },
      true
    );
  } catch (error) {
    console.error("Error en convertAndSaveExpense:", error);

    // Guardar el gasto con la moneda original si falla la conversión
    return await saveExpense(
      {
        ...expense,
        conversionError: error.message,
        isSynced: false,
      },
      false
    );
  }
};
