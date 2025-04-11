import React, { useContext, useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { styles } from "../styles/ExpenseList.styles";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  getExpensesByCategory,
  convertAndSaveExpense,
  syncLocalExpenses,
  updateExpense,
  deleteExpense,
} from "../services/expenses";

const ExpenseList = () => {
  const { user, userCurrency, updateUserCurrency } = useContext(AuthContext);
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryId, categoryName, categoryColor } = route.params;

  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    categoryId: categoryId,
    currency: null,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !userCurrency) {
      Alert.alert(
        "Configuración requerida",
        "Para comenzar a usar la aplicación, por favor configura tu moneda base en Ajustes",
        [
          {
            text: "Configurar ahora",
            onPress: () => navigation.navigate("Settings"),
          },
          {
            text: "Más tarde",
            onPress: () => navigation.goBack(),
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (userCurrency) {
      setNewExpense((prev) => ({ ...prev, currency: userCurrency }));
      loadExpenses();
    }
  }, [user, userCurrency, categoryId]);

  const loadExpenses = async () => {
    if (!user) return;

    try {
      setIsRefreshing(true);
      const fetchedExpenses = await getExpensesByCategory(user.uid, categoryId);
      setExpenses(fetchedExpenses);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los gastos");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddExpense = async () => {
    if (isSubmitting) return;
    if (!userCurrency) {
      Alert.alert(
        "Moneda no configurada",
        "Debes configurar tu moneda base en Ajustes antes de agregar gastos",
        [
          {
            text: "Ir a Ajustes",
            onPress: () => {
              setIsModalVisible(false);
              navigation.navigate("Settings");
            },
          },
          {
            text: "Cancelar",
            onPress: () => setIsModalVisible(false),
            style: "cancel",
          },
        ]
      );
      return;
    }

    if (!newExpense.description.trim()) {
      Alert.alert("Error", "La descripción es requerida");
      return;
    }

    if (!newExpense.amount || isNaN(newExpense.amount)) {
      Alert.alert("Error", "El monto debe ser un número válido");
      return;
    }

    try {
      setIsSubmitting(true);
      await convertAndSaveExpense(
        {
          ...newExpense,
          userId: user.uid,
          amount: parseFloat(newExpense.amount),
          createdAt: new Date().toISOString(),
        },
        userCurrency
      );

      setNewExpense({
        description: "",
        amount: "",
        categoryId,
        currency: userCurrency,
      });
      setIsModalVisible(false);
      loadExpenses();
      Alert.alert("Éxito", "Gasto agregado correctamente");
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo guardar el gasto");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateExpense = async () => {
    if (isSubmitting) return;

    if (!editDescription.trim()) {
      Alert.alert("Error", "La descripción es requerida");
      return;
    }

    if (!editAmount || isNaN(parseFloat(editAmount))) {
      Alert.alert("Error", "El monto debe ser un número válido");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateExpense(
        user.uid,
        editingId,
        {
          description: editDescription,
          amount: parseFloat(editAmount),
          updatedAt: new Date().toISOString(),
        },
        true
      );

      setEditingId(null);
      setEditDescription("");
      setEditAmount("");
      loadExpenses();
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el gasto");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (expenseId) => {
    setExpenseToDelete(expenseId);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteExpense = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteExpense(user.uid, expenseToDelete, true);
      setDeleteConfirmVisible(false);
      setExpenseToDelete(null);
      loadExpenses();
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar el gasto");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncLocalExpenses(user.uid);
      loadExpenses();
      Alert.alert("Éxito", "Gastos sincronizados correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudieron sincronizar los gastos");
      console.error(error);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSync}
          style={{ marginRight: 15 }}
          disabled={isSubmitting}
        >
          <Icon name="sync" size={24} color={isSubmitting ? "#ccc" : "#007bff"} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSubmitting]);

  const renderExpense = ({ item }) => (
    <TouchableOpacity
      style={[styles.expenseItem, { borderLeftColor: categoryColor }]}
      onPress={() => setEditingId(item.id)}
      onLongPress={() => confirmDelete(item.id)}
      delayLongPress={1000}
    >
      {editingId === item.id ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            placeholder="Descripción"
            value={editDescription}
            onChangeText={setEditDescription}
            autoFocus
          />
          <TextInput
            style={styles.editAmountInput}
            placeholder="Monto"
            keyboardType="numeric"
            value={editAmount}
            onChangeText={setEditAmount}
          />
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={styles.editSaveButton}
              onPress={() => handleUpdateExpense()}
            >
              <Icon name="check" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editCancelButton}
              onPress={() => setEditingId(null)}
            >
              <Icon name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.expenseContent}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDescription}>{item.description}</Text>
            <Text style={styles.expenseDate}>
              {new Date(
                item.createdAt?.seconds * 1000 || item.createdAt
              ).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.expenseAmount}>{item.amount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={(item) => item.id}
        refreshing={isRefreshing}
        onRefresh={loadExpenses}
        style={styles.list}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      >
        <Icon name="add" style={styles.fabIcon} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Descripción"
              value={newExpense.description}
              onChangeText={(text) =>
                setNewExpense({ ...newExpense, description: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Monto"
              value={newExpense.amount}
              onChangeText={(text) =>
                setNewExpense({ ...newExpense, amount: text })
              }
              keyboardType="numeric"
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAddExpense}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editingId}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingId(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Descripción"
              value={editDescription}
              onChangeText={setEditDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="Monto"
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditingId(null)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={() => handleUpdateExpense()}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Guardando..." : "Actualizar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>¿Eliminar gasto?</Text>
            <Text style={styles.confirmText}>
              Esta acción no se puede deshacer
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleDeleteExpense}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpenseList;
