import { useState, useEffect, useContext } from "react";
import { Alert } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import NetInfo from "@react-native-community/netinfo";

export const useEntityManager = (entityConfig) => {
  const { user } = useContext(AuthContext);
  const [isOnline, setIsOnline] = useState(true);
  const {
    entityName,
    loadService,
    saveService,
    updateService,
    deleteService,
    syncService,
    additionalParams = {},
    navigation,
    route,
    customValidation,
  } = entityConfig;

  // Estados comunes
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "USD",
    ...entityConfig.additionalParams,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
    });

    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Cargar datos (ahora maneja online/offline automáticamente)
  const loadData = async () => {
    if (!user) return;

    try {
      setIsRefreshing(true);
      const params = [
        user.uid,
        ...(route?.params?.travelId ? [route.params.travelId] : []),
      ];
      const data = await loadService(...params);
      setItems(data);
    } catch (error) {
      Alert.alert("Error", `No se pudieron cargar los ${entityName}`);
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Función base para guardar (ahora maneja online/offline)
  const baseHandleAdd = async (data) => {
    if (isSubmitting || (customValidation && !customValidation(data))) return;

    try {
      setIsSubmitting(true);
      const completeData = {
        ...data,
        userId: user.uid,
        ...additionalParams,
      };
      // Pasamos el estado de conexión al servicio
      await saveService(user.uid, completeData, isOnline);
      setIsModalVisible(false);
      loadData();
    } catch (error) {
      handleError("guardar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función especializada para gastos (ahora maneja online/offline)
  const expenseHandleAdd = async (data) => {
    if (isSubmitting || (customValidation && !customValidation(data))) return;

    try {
      setIsSubmitting(true);
      const completeData = {
        ...data,
        userId: user.uid,
        ...additionalParams,
        createdAt: new Date().toISOString(),
        currency: data.currency || additionalParams.userCurrency,
      };

      const defaultCurrency =
        additionalParams.defaultCurrency || additionalParams.userCurrency;

      // Pasamos el estado de conexión al servicio
      await saveService(completeData, defaultCurrency, isOnline);
      setIsModalVisible(false);
      loadData();
    } catch (error) {
      handleError("guardar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determina qué función de guardado usar
  const handleAdd = entityName === "gasto" ? expenseHandleAdd : baseHandleAdd;

  // Actualizar (ahora maneja online/offline)
  const handleUpdate = async (id, data) => {
    if (isSubmitting || !validateForm(data)) return;

    try {
      setIsSubmitting(true);
      const updateData = {
        ...data,
        userId: user.uid,
      };
      // Pasamos el estado de conexión al servicio
      await updateService(user.uid, id, updateData, isOnline);
      setEditingId(null);
      loadData();
    } catch (error) {
      handleError("actualizar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar (ahora maneja online/offline)
  const handleDelete = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      // Pasamos el estado de conexión al servicio
      await deleteService(user.uid, entityToDelete, isOnline);
      setDeleteConfirmVisible(false);
      setEntityToDelete(null);
      loadData();
    } catch (error) {
      handleError("eliminar", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Sincronización mejorada
  const handleSync = async () => {
    if (isSubmitting) {
      Alert.alert("Información", "Ya hay una sincronización en progreso");
      return;
    }

    if (!isOnline) {
      Alert.alert("Información", "No hay conexión a internet para sincronizar");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Sincronizar todos los datos locales con Firestore
      await syncService(user.uid);

      // 2. Recargar datos actualizados desde todas las fuentes
      await loadData();

      console.log("Éxito", "Datos sincronizados correctamente");
    } catch (error) {
      Alert.alert("Error", `Error durante la sincronización: ${error.message}`);
      console.error("Sync error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Helpers (sin cambios)
  const validateForm = (data) => {
    if (entityName === "gasto") {
      if (!data?.description?.trim()) {
        Alert.alert("Error", "La descripción es requerida");
        return false;
      }
      if (!data?.amount || isNaN(data.amount)) {
        Alert.alert("Error", "Monto inválido");
        return false;
      }
      return true;
    }
    if (!data?.name?.trim()) {
      Alert.alert("Error", `El nombre de la ${entityName} es requerido`);
      return false;
    }
    return true;
  };

  const handleError = (action, error) => {
    Alert.alert("Error", `No se pudo ${action} la ${entityName}`);
    console.error(error);
  };

  return {
    states: {
      items,
      editingId,
      isModalVisible,
      isRefreshing,
      deleteConfirmVisible,
      entityToDelete,
      isSubmitting,
      user,
      currencyModalVisible,
      formData,
      isOnline, // Ahora exponemos el estado de conexión
    },
    actions: {
      loadData,
      handleAdd,
      handleUpdate,
      handleDelete,
      handleSync,
      setEditingId,
      setIsModalVisible,
      setDeleteConfirmVisible,
      setEntityToDelete,
      setCurrencyModalVisible,
      setFormData,
    },
  };
};
