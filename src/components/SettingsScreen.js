import React, { useState, useContext, useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { AuthContext } from "../contexts/AuthContext";

const currencies = [
  { code: "USD ", name: "Dólar Estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra Esterlina" },
  { code: "JPY", name: "Yen Japonés" },
  { code: "MXN", name: "Peso Mexicano" },
  { code: "COP", name: "Peso Colombiano" },
  { code: "BRL", name: "Real Brasileño" },
];

const SettingsScreen = () => {
  const { user, userCurrency, updateUserCurrency } = useContext(AuthContext);
  const [selectedCurrency, setSelectedCurrency] = useState(
    userCurrency || "USD"
  );
  const [hasSelectedCurrency, setHasSelectedCurrency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCurrencySetting = async () => {
      try {
        // Verificar si ya tiene moneda configurada
        if (userCurrency && userCurrency !== "USD") {
          setHasSelectedCurrency(true);
        }
      } catch (error) {
        console.error("Error checking currency:", error);
      } finally {
        setLoading(false);
      }
    };

    checkCurrencySetting();
  }, [userCurrency]);

  const handleCurrencyChange = async (currency) => {
    if (!user?.uid || hasSelectedCurrency) return;

    try {
      setSelectedCurrency(currency);
      await updateUserCurrency(user.uid, currency);
      setHasSelectedCurrency(true);
      Alert.alert(
        "Configuración guardada",
        "Tu moneda base ha sido establecida y no podrá ser modificada"
      );
    } catch (error) {
      console.error("Error updating currency:", error);
      Alert.alert("Error", "No se pudo guardar la configuración");
      setSelectedCurrency(userCurrency); // Revertir el cambio
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración de Moneda</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Moneda Base:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCurrency}
            onValueChange={handleCurrencyChange}
            style={styles.picker}
            mode="dropdown"
            enabled={!hasSelectedCurrency}
          >
            {currencies.map((currency) => (
              <Picker.Item
                key={currency.code}
                label={`${currency.code} - ${currency.name}`}
                value={currency.code}
              />
            ))}
          </Picker>
        </View>
        {hasSelectedCurrency && (
          <Text style={styles.warningText}>
            La moneda base ya fue configurada y no puede ser modificada
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  picker: {
    width: "100%",
    backgroundColor: "#f8f8f8",
  },
  warningText: {
    color: "#e74c3c",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default SettingsScreen;
