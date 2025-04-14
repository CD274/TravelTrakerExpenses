import { useState, useEffect, useContext } from "react";
import { Alert } from "react-native";
import { AuthContext } from "../contexts/AuthContext";

export const useEntityManager = (entityConfig) => {
  const { user } = useContext(AuthContext);
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

  // Cargar datos
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

  // Función base para guardar
  const baseHandleAdd = async (data) => {
    if (isSubmitting || (customValidation && !customValidation(data))) return;

    try {
      setIsSubmitting(true);
      const completeData = {
        ...data,
        userId: user.uid,
        ...additionalParams,
      };
      await saveService(user.uid, completeData, true);
      setIsModalVisible(false);
      loadData();
    } catch (error) {
      handleError("guardar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función especializada para gastos
  const expenseHandleAdd = async (data) => {
    if (isSubmitting || (customValidation && !customValidation(data))) return;

    try {
      setIsSubmitting(true);
      const completeData = {
        ...data,
        userId: user.uid,
        ...additionalParams,
        createdAt: new Date().toISOString(),
        currency: data.currency || additionalParams.userCurrency, // <-- Añade esto
      };

      // Asegúrate que defaultCurrency tiene valor
      const defaultCurrency =
        additionalParams.defaultCurrency || additionalParams.userCurrency;
      console.log("DEFAULT CURRENCY:" + defaultCurrency);
      await saveService(completeData, defaultCurrency); // <-- Pasa la moneda correcta
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

  const handleUpdate = async (id, data) => {
    if (isSubmitting || !validateForm(data)) return;

    try {
      setIsSubmitting(true);
      const updateData = {
        ...data,
        userId: user.uid,
      };
      await updateService(user.uid, id, updateData, true);
      setEditingId(null);
      loadData();
    } catch (error) {
      handleError("actualizar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteService(user.uid, entityToDelete, true);
      setDeleteConfirmVisible(false);
      setEntityToDelete(null);
      loadData();
    } catch (error) {
      handleError("eliminar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sincronización
  const handleSync = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await syncService(user.uid);
      loadData();
      Alert.alert("Éxito", `${entityName} sincronizados correctamente`);
    } catch (error) {
      Alert.alert("Error", `No se pudieron sincronizar los ${entityName}`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpers
  const validateForm = (data) => {
    // Validación específica para gastos
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
    },
    actions: {
      loadData,
      handleAdd, // Usamos la función determinada
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
