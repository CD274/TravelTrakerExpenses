import React, { useContext, useEffect, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { styles } from "../styles/ExpenseList.styles";
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
import { useEntityManager } from "../hooks/useEntityManager";
import DeletModal from "../components/DeletModal";
import FAB from "../components/FAB";
import ExpenseFormModal from "../components/ExpenseFormModal"; // Nuevo componente
import CurrencyPickerModal from "../components/CurrencyPickerModal"; // Nuevo componente

export default function ExpenseList() {
  const { user, userCurrency } = useContext(AuthContext);
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryId, categoryName, categoryColor } = route.params;

  const { states, actions } = useEntityManager({
    entityName: "gasto",
    loadService: getExpensesByCategory,
    saveService: convertAndSaveExpense,
    updateService: updateExpense,
    deleteService: deleteExpense,
    syncService: syncLocalExpenses,
    additionalParams: {
      categoryId,
      userCurrency,
      defaultCurrency: userCurrency,
    },
    navigation,
    route,
    customValidation: (data) => {
      // Validación personalizada
      if (!data?.description?.trim()) {
        Alert.alert("Error", "La descripción es requerida");
        return false;
      }
      if (!data?.amount || isNaN(data.amount)) {
        Alert.alert("Error", "Monto inválido");
        return false;
      }
      return true;
    },
  });

  useEffect(() => {
    if (userCurrency) actions.loadData();
  }, [userCurrency]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={actions.handleSync}
          style={{ marginRight: 15 }}
          disabled={states.isSubmitting}
        >
          <MaterialIcons
            name="sync"
            size={24}
            color={states.isSubmitting ? "#ccc" : "#007bff"}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, states.isSubmitting]);

  const renderExpense = ({ item }) => (
    <View style={[styles.expenseItem, { borderLeftColor: categoryColor }]}>
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
            onPress={() => actions.setEditingId(item.id)}
            style={styles.actionButton}
          >
            <Icon name="edit" size={20} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              actions.setEntityToDelete(item.id);
              actions.setDeleteConfirmVisible(true);
            }}
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
        data={states.items}
        renderItem={renderExpense}
        keyExtractor={(item) => item.id}
        refreshing={states.isRefreshing}
        onRefresh={actions.loadData}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay gastos registrados</Text>
        }
      />

      <FAB onPress={() => actions.setIsModalVisible(true)} />

      <ExpenseFormModal
        visible={states.isModalVisible}
        onCurrencyPress={() => actions.setCurrencyModalVisible(true)}
        initialData={{
          description: "",
          amount: "",
          currency: userCurrency,
          categoryId,
          userId: user?.uid,
        }}
        onCancel={() => actions.setIsModalVisible(false)}
        onSubmit={actions.handleAdd}
        isSubmitting={states.isSubmitting}
      />

      <ExpenseFormModal
        visible={!!states.editingId}
        onCurrencyPress={() => actions.setCurrencyModalVisible(true)}
        initialData={
          states.items.find((e) => e.id === states.editingId) || {
            // Fallback
            description: "",
            amount: 0,
            currency: userCurrency,
            categoryId,
            userId: user?.uid,
          }
        }
        onCancel={() => actions.setEditingId(null)}
        onSubmit={(data) => actions.handleUpdate(states.editingId, data)}
        isSubmitting={states.isSubmitting}
        isEditMode
      />

      <CurrencyPickerModal
        visible={states.currencyModalVisible}
        onClose={() => actions.setCurrencyModalVisible(false)}
        onSelect={(currency) => {
          // Aquí aplicamos el fallback con la moneda del usuario
          const selected = currency || userCurrency;
          actions.setFormData((prev) => ({
            ...prev,
            currency: selected,
          }));
          actions.setCurrencyModalVisible(false);
        }}
        selectedCurrency={states.formData?.currency}
      />

      <DeletModal
        visible={states.deleteConfirmVisible}
        title="¿Eliminar gasto?"
        message="Esta acción no se puede deshacer"
        onCancel={() => actions.setDeleteConfirmVisible(false)}
        onConfirm={actions.handleDelete}
        isSubmitting={states.isSubmitting}
      />
    </View>
  );
}
