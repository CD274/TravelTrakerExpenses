import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  currencies,
  currencySymbols,
  currencyFlags,
  popularCurrencies,
} from "../constants/currencies";

const CurrencyPickerModal = ({
  visible,
  onClose,
  onSelect,
  selectedCurrency,
}) => {
  // Separar monedas populares y el resto
  const popular = popularCurrencies.filter((code) => currencies[code]);
  const allCurrencies = Object.keys(currencies)
    .filter((code) => !popularCurrencies.includes(code))
    .sort((a, b) => currencies[a].localeCompare(currencies[b]));

  const renderCurrencyItem = (currencyCode) => (
    <TouchableOpacity
      key={currencyCode}
      style={[
        styles.currencyItem,
        selectedCurrency === currencyCode && styles.selectedCurrency,
      ]}
      onPress={() => {
        onSelect(currencyCode);
        onClose();
      }}
    >
      <Text style={styles.flag}>{currencyFlags[currencyCode] || "🏳️"}</Text>
      <View style={styles.currencyInfo}>
        <Text style={styles.currencyCode}>{currencyCode}</Text>
        <Text style={styles.currencyName}>{currencies[currencyCode]}</Text>
      </View>
      <Text style={styles.currencySymbol}>
        {currencySymbols[currencyCode] || currencyCode}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Seleccionar Moneda</Text>

          <ScrollView>
            <Text style={styles.sectionTitle}>Populares</Text>
            {popular.map(renderCurrencyItem)}

            <Text style={styles.sectionTitle}>Todas las monedas</Text>
            {allCurrencies.map(renderCurrencyItem)}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    maxHeight: "80%",
    width: "90%",
    padding: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginVertical: 8,
    backgroundColor: "#f5f5f5",
    padding: 5,
    borderRadius: 5,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedCurrency: {
    backgroundColor: "#e3f2fd",
  },
  flag: {
    fontSize: 28,
    marginRight: 15,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "500",
  },
  currencyName: {
    fontSize: 12,
    color: "#666",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007bff",
  },
  closeButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#007bff",
    borderRadius: 5,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CurrencyPickerModal;
