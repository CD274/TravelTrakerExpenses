import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { styles } from "../styles/ExpenseList.styles";
const ExpenseFormModal = ({
  visible,
  initialData = {},
  onCancel,
  onSubmit,
  isSubmitting,
  isEditMode = false,
  onCurrencyPress, // Nueva prop
}) => {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "USD",
    ...initialData, // Spread después de los valores por defecto
  });

  useEffect(() => {
    setFormData({
      description: "",
      amount: "",
      currency: "USD",
      ...initialData,
    });
  }, [initialData]);
  const handleSubmit = () => {
    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount)) {
      Alert.alert("Error", "Monto inválido");
      return;
    }
    onSubmit({ ...formData, amount: numericAmount });
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {isEditMode ? "Editar Gasto" : "Nuevo Gasto"}
          </Text>

          <TextInput
            placeholder="Descripción"
            value={formData.description || ""}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, description: text }))
            }
          />

          <TextInput
            placeholder="Monto"
            value={formData.amount?.toString() || ""}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, amount: text }))
            }
          />

          <TouchableOpacity
            style={styles.currencySelector}
            onPress={onCurrencyPress}
          >
            <Text style={styles.currencyText}>Moneda: {formData.currency}</Text>
            <Icon name="arrow-drop-down" size={24} color="#555" />
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
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
  );
};

export default ExpenseFormModal;
