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
  } = entityConfig;

  // Estados comunes
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Operaciones CRUD
  const handleAdd = async (formData) => {
    if (isSubmitting || !validateForm(formData)) return;

    try {
      setIsSubmitting(true);
      const completeData = {
        ...formData,
        userId: user.uid, // Asegurar que userId está incluido
        ...additionalParams,
      };
      await saveService(user.uid, completeData, true); // Pasar user.uid como primer parámetro
      setIsModalVisible(false);
      loadData();
    } catch (error) {
      handleError("guardar", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    },
  };
};
