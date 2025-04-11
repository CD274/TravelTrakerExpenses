import React, { createContext, useState, useEffect } from "react";
import { loginUser, registerUser } from "../services/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userCurrency, setUserCurrency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Cargar la moneda del usuario desde Firestore
        if (parsedUser?.uid) {
          const userRef = doc(db, "users", parsedUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().baseCurrency) {
            setUserCurrency(userSnap.data().baseCurrency);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const updateUserCurrency = async (userId, currency) => {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          baseCurrency: currency,
          currencySet: true,
        },
        { merge: true }
      );
      setUserCurrency(currency);
    } catch (error) {
      console.error("Error updating currency:", error);
      throw error;
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await loginUser(email, password);
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // Cargar moneda después de login
      const userRef = doc(db, "users", userData.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().baseCurrency) {
        setUserCurrency(userSnap.data().baseCurrency);
      }

      return userData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await registerUser(email, password);
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      setUser(null);
      setUserCurrency(null); // Resetear a moneda por defecto
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userCurrency,
        updateUserCurrency,
        loading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
