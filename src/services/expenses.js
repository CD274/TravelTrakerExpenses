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
import { convertCurrency } from "./currencyAPI";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OFFLINE_EXPENSES_KEY = "@offline_expenses";

// Guardar gasto (con relación a categoría)
export const saveExpense = async (expense, isOnline) => {
  if (!expense.categoryId || !expense.travelId) {
    throw new Error("Expense must have categoryId and travelId");
  }

  if (isOnline) {
    await saveFirestore(expense);
  } else {
    await saveLocal(expense);
  }
};
export const getExpensesByCategory = async (userId, categoryId) => {
  try {
    const expensesRef = collection(db, "users", userId, "expenses");
    const q = query(expensesRef, where("categoryId", "==", categoryId));

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Ordenar localmente si es necesario
    return expenses.sort(
      (a, b) =>
        new Date(b.createdAt?.seconds * 1000 || b.createdAt) -
        new Date(a.createdAt?.seconds * 1000 || a.createdAt)
    );
  } catch (error) {
    console.error("Error getting expenses by category:", error);
    return [];
  }
};

// Funciones Firebase
const saveFirestore = async (expense) => {
  try {
    const expensesRef = collection(db, "users", expense.userId, "expenses");
    await addDoc(expensesRef, {
      ...expense,
      categoryId: expense.categoryId,
      isSynced: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving expense to Firestore:", error);
    throw error;
  }
};

const fetchFireStore = async (userId) => {
  try {
    const expensesRef = collection(db, "users", userId, "expenses");
    const q = query(expensesRef, orderBy("createdAt", "desc"));
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
// Funciones locales (se mantienen igual)
const saveLocal = async (expense) => {
  try {
    const existingExpenses = await AsyncStorage.getItem(OFFLINE_EXPENSES_KEY);
    const parsedExpenses = existingExpenses ? JSON.parse(existingExpenses) : [];
    const updatedExpenses = [
      ...parsedExpenses,
      {
        ...expense,
        isSynced: false,
        createdAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem(
      OFFLINE_EXPENSES_KEY,
      JSON.stringify(updatedExpenses)
    );
  } catch (error) {
    console.error("Error saving expense locally:", error);
    throw error;
  }
};

const fetchLocal = async (categoryId = null) => {
  try {
    const expenses = await AsyncStorage.getItem(OFFLINE_EXPENSES_KEY);
    const parsedExpenses = expenses ? JSON.parse(expenses) : [];

    return categoryId
      ? parsedExpenses.filter((e) => e.categoryId === categoryId)
      : parsedExpenses;
  } catch (error) {
    console.error("Error fetching local expenses:", error);
    return [];
  }
};

// Sincronización
export const syncLocalExpenses = async (userId) => {
  const localExpenses = await fetchLocal();
  if (localExpenses.length === 0) return;

  try {
    const batch = writeBatch(db);
    const expensesRef = collection(db, "users", userId, "expenses");

    localExpenses.forEach((expense) => {
      const expenseRef = doc(expensesRef);
      batch.set(expenseRef, {
        ...expense,
        isSynced: true,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    await AsyncStorage.removeItem(OFFLINE_EXPENSES_KEY);
  } catch (error) {
    console.error("Error syncing expenses:", error);
  }
};

// Conversión de moneda
export const convertAndSaveExpense = async (expense, userCurrency) => {
  if (!expense.categoryId) {
    throw new Error("Expense must have a categoryId");
  }

  if (expense.currency === userCurrency) {
    await saveExpense(expense, true);
    return;
  }

  try {
    const convertedAmount = await convertCurrency(
      expense.currency,
      userCurrency,
      expense.amount
    );

    await saveExpense(
      {
        ...expense,
        amount: convertedAmount,
        originalAmount: expense.amount,
        originalCurrency: expense.currency,
        currency: userCurrency,
        isSynced: true,
      },
      true
    );
  } catch (error) {
    console.error("Error converting currency:", error);
    await saveExpense(
      {
        ...expense,
        isSynced: false,
      },
      false
    );
  }
};
