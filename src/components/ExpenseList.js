import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  Button,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { getExpensesByCategory, saveExpense } from "../services/expenses";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function CategoryExpensesScreen() {
  const { user } = useContext(AuthContext);
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryId, categoryName, categoryColor } = route.params;

  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    categoryId: categoryId,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar gastos al iniciar
  useEffect(() => {
    loadExpenses();
  }, [user, categoryId]);

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
    if (!newExpense.description.trim()) {
      Alert.alert("Error", "La descripción es requerida");
      return;
    }

    if (!newExpense.amount || isNaN(newExpense.amount)) {
      Alert.alert("Error", "El monto debe ser un número válido");
      return;
    }

    try {
      await saveExpense(
        {
          ...newExpense,
          userId: user.uid,
          amount: parseFloat(newExpense.amount),
          currency: "USD", // Puedes hacerlo configurable
          createdAt: new Date().toISOString(),
        },
        true // online
      );

      setNewExpense({ description: "", amount: "", categoryId });
      setIsModalVisible(false);
      loadExpenses(); // Recargar la lista
      Alert.alert("Éxito", "Gasto agregado correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el gasto");
      console.error(error);
    }
  };

  const renderExpense = ({ item }) => (
    <TouchableOpacity
      style={[styles.expenseItem, { borderLeftColor: categoryColor }]}
      onPress={() => {
        // Aquí podrías implementar la edición
      }}
    >
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseDate}>
          {new Date(
            item.createdAt?.seconds * 1000 || item.createdAt
          ).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>
        ${parseFloat(item.amount).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName}</Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefreshing}
        onRefresh={loadExpenses}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay gastos en esta categoría</Text>
        }
      />

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: categoryColor }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Gasto</Text>

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
              keyboardType="numeric"
              value={newExpense.amount}
              onChangeText={(text) =>
                setNewExpense({ ...newExpense, amount: text })
              }
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                onPress={() => setIsModalVisible(false)}
                color="#e74c3c"
              />
              <Button
                title="Guardar"
                onPress={handleAddExpense}
                color="#2ecc71"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3498db",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
  expenseItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    elevation: 2,
    borderLeftWidth: 5,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "500",
  },
  expenseDate: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e74c3c",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
    color: "#777",
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  addButtonText: {
    fontSize: 30,
    color: "white",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
