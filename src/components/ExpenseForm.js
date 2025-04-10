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
import {
  saveCategory,
  getCategories,
  syncLocalCategories,
} from "../services/categories";
import { useNavigation } from "@react-navigation/native";

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "#3498db",
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar categorías al iniciar
  useEffect(() => {
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      setIsRefreshing(true);
      const fetchedCategories = await getCategories(user.uid);
      setCategories(fetchedCategories);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las categorías");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      Alert.alert("Error", "El nombre de la categoría es requerido");
      return;
    }

    try {
      await saveCategory(user.uid, newCategory, true); // true para online
      setNewCategory({ name: "", color: "#3498db" });
      setIsModalVisible(false);
      loadCategories(); // Recargar la lista
      Alert.alert("Éxito", "Categoría agregada correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la categoría");
      console.error(error);
    }
  };

  const handleSync = async () => {
    try {
      await syncLocalCategories(user.uid);
      loadCategories();
      Alert.alert("Éxito", "Categorías sincronizadas correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudieron sincronizar las categorías");
      console.error(error);
    }
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryItem, { backgroundColor: item.color }]}
      onPress={() => {
        navigation.navigate("CategoryExpenses", {
          categoryId: item.id,
          categoryName: item.name,
          categoryColor: item.color,
        });
      }}
    >
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryDate}>
        {new Date(
          item.createdAt?.seconds * 1000 || item.createdAt
        ).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Categorías</Text>
        <Button title="Sincronizar" onPress={handleSync} color="#4CAF50" />
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefreshing}
        onRefresh={loadCategories}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay categorías creadas</Text>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
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
            <Text style={styles.modalTitle}>Nueva Categoría</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre de la categoría"
              value={newCategory.name}
              onChangeText={(text) =>
                setNewCategory({ ...newCategory, name: text })
              }
            />

            <View style={styles.colorOptions}>
              {["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"].map(
                (color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newCategory.color === color && styles.selectedColor,
                    ]}
                    onPress={() => setNewCategory({ ...newCategory, color })}
                  />
                )
              )}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                onPress={() => setIsModalVisible(false)}
                color="#e74c3c"
              />
              <Button
                title="Guardar"
                onPress={handleAddCategory}
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  listContainer: {
    flexGrow: 1,
  },
  categoryItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  categoryName: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
  categoryDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
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
    backgroundColor: "#3498db",
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
  colorOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
