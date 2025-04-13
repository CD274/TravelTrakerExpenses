import React, { useContext, useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { styles } from "../styles/ExpenseList.styles";
import { Picker } from "@react-native-picker/picker";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  getExpensesByCategory,
  convertAndSaveExpense,
  syncLocalExpenses,
  updateExpense,
  deleteExpense,
} from "../services/expenses";
import { currencies } from "../constants/currencies";

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
    currency: userCurrency || "USD",
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
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
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSync}
          style={{ marginRight: 15 }}
          disabled={isSubmitting}
        >
          <MaterialIcons
            name="sync"
            size={24}
            color={isSubmitting ? "#ccc" : "#007bff"}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSubmitting]);
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

  const renderExpense = ({ item }) => (
    <View
      style={[
        styles.expenseItem,
        { borderLeftWidth: 5, borderLeftColor: categoryColor },
      ]}
    >
      <View style={styles.expenseContent}>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{item.description}</Text>
          <Text style={styles.expenseDate}>
            {new Date(
              item.createdAt?.seconds * 1000 || item.createdAt
            ).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.expenseAmountContainer}>
          <Text style={styles.expenseAmount}>{item.amount.toFixed(2)}</Text>
          <Text style={styles.expenseCurrency}>{item.currency}</Text>
        </View>
        <View style={styles.expenseActions}>
          <TouchableOpacity
            onPress={() => {
              setEditingId(item.id);
              setEditDescription(item.description);
              setEditAmount(item.amount.toString());
            }}
            style={styles.actionButton}
          >
            <Icon name="edit" size={20} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDelete(item.id)}
            style={styles.actionButton}
          >
            <Icon name="delete" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay gastos registrados</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      >
        <Icon name="add" style={styles.fabIcon} />
      </TouchableOpacity>

      {/* Modal para agregar nuevo gasto */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Gasto</Text>

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

            <TouchableOpacity
              style={styles.currencySelector}
              onPress={() => setCurrencyModalVisible(true)}
            >
              <Text style={styles.currencyText}>
                Moneda: {newExpense.currency}
              </Text>
              <Icon name="arrow-drop-down" size={24} color="#555" />
            </TouchableOpacity>

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

      {/* Modal para seleccionar moneda */}
      <Modal
        visible={currencyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.currencyModalContainer}>
          <View style={styles.currencyModalContent}>
            <Text style={styles.currencyModalTitle}>Seleccionar Moneda</Text>
            <Picker
              selectedValue={newExpense.currency}
              onValueChange={(itemValue) => {
                setNewExpense({ ...newExpense, currency: itemValue });
                setCurrencyModalVisible(false);
              }}
              style={styles.picker}
            >
              {Object.entries(currencies).map(([code, name]) => (
                <Picker.Item
                  key={code}
                  label={`${code} - ${name}`}
                  value={code}
                />
              ))}
            </Picker>
            <TouchableOpacity
              style={styles.currencyCloseButton}
              onPress={() => setCurrencyModalVisible(false)}
            >
              <Text style={styles.currencyCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para editar gasto */}
      {editingId && (
        <Modal
          visible={!!editingId}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingId(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Gasto</Text>

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
                  onPress={handleUpdateExpense}
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
      )}

      {/* Modal de confirmación para eliminar */}
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
