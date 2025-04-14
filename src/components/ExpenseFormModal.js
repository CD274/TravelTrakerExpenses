// ExpenseFormModal.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { styles } from "../styles/ExpenseList.styles";
import CurrencyPickerModal from "./CurrencyPickerModal";

const ExpenseFormModal = ({
  visible,
  initialData = {},
  onCancel,
  onSubmit,
  isSubmitting,
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "USD",
    ...initialData,
  });
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  useEffect(() => {
    // Resetear el formulario solo cuando se abre el modal
    if (visible) {
      setFormData({
        description: "",
        amount: "",
        currency: "USD",
        ...initialData,
      });
    }
  }, [visible, initialData]); // Solo dependencias relevantes

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
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={styles.currencySelector}
            onPress={() => setCurrencyModalVisible(true)}
          >
            <Text style={styles.currencyText}>Moneda: {formData.currency}</Text>
            <Icon name="arrow-drop-down" size={24} color="#555" />
          </TouchableOpacity>

          <CurrencyPickerModal
            visible={currencyModalVisible}
            onClose={() => setCurrencyModalVisible(false)}
            onSelect={(currency) => {
              setFormData((prev) => ({
                ...prev,
                currency: currency || prev.currency,
              }));
              setCurrencyModalVisible(false);
            }}
            selectedCurrency={formData.currency}
          />

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
