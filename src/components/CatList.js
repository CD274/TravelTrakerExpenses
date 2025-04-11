import React, { useState, useEffect, useContext, useLayoutEffect } from "react";
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
import { AuthContext } from "../contexts/AuthContext";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  saveCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  syncLocalCategories,
} from "../services/categories";

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { travelId, travelName } = route.params;
  const { user } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "#3498db",
  });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [user, travelId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSync}
          style={{ marginRight: 15 }}
          disabled={isSubmitting}
        >
          <MaterialIcons name="sync" size={24} color={isSubmitting ? "#ccc" : "#007bff"} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSubmitting]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      setIsRefreshing(true);
      const fetchedCategories = await getCategories(user.uid, travelId);
      setCategories(fetchedCategories);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las categorías");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddCategory = async () => {
    if (isSubmitting) return;
    
    if (!newCategory.name.trim()) {
      Alert.alert("Error", "El nombre de la categoría es requerido");
      return;
    }

    try {
      setIsSubmitting(true);
      const completeCategory = {
        ...newCategory,
        travelId,
        userId: user.uid,
      };
      await saveCategory(completeCategory, true);
      setNewCategory({ name: "", color: "#3498db" });
      setIsModalVisible(false);
      loadCategories();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la categoría");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (id, currentName) => {
    setEditingId(id);
    setEditText(currentName);
  };

  const handleUpdateCategory = async (id) => {
    if (isSubmitting) return;

    if (!editText.trim()) {
      Alert.alert("Error", "El nombre de la categoría es requerido");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCategory(user.uid, id, { name: editText }, true);
      setEditingId(null);
      setEditText("");
      loadCategories();
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la categoría");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (categoryId) => {
    setCategoryToDelete(categoryId);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteCategory = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteCategory(user.uid, categoryToDelete, true);
      setDeleteConfirmVisible(false);
      setCategoryToDelete(null);
      loadCategories();
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar la categoría");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await syncLocalCategories(user.uid);
      loadCategories();
      Alert.alert("Éxito", "Categorías sincronizadas correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudieron sincronizar las categorías");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCategory = ({ item }) => (
    <View style={[styles.categoryItem, { backgroundColor: item.color }]}>
      {editingId === item.id ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={() => handleUpdateCategory(item.id)}
            onBlur={() => {
              if (editText.trim()) {
                handleUpdateCategory(item.id);
              } else {
                setEditingId(null);
                setEditText("");
              }
            }}
            selectTextOnFocus
          />
        </View>
      ) : (
        <View style={styles.categoryContentContainer}>
          <TouchableOpacity
            style={styles.categoryContent}
            onPress={() => {
              navigation.navigate("CategoryExpenses", {
                categoryId: item.id,
                categoryName: item.name,
                categoryColor: item.color,
              });
            }}
            onLongPress={() => startEditing(item.id, item.name)}
            delayLongPress={1000}
          >
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.categoryDate}>
                {new Date(
                  item.createdAt?.seconds * 1000 || item.createdAt
                ).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              if (item.id) {
                confirmDelete(item.id);
              } else {
                Alert.alert("Error", "Esta categoría no tiene un ID válido");
              }
            }}
          >
            <MaterialIcons name="delete" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const cleanupModal = () => {
    setNewCategory({ name: "", color: "#3498db" });
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id || Math.random().toString()}
        refreshing={isRefreshing}
        onRefresh={loadCategories}
        style={styles.list}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialIcons name="add" style={styles.fabIcon} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cleanupModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={cleanupModal}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAddCategory}
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
              placeholder="Nombre de la categoría"
              value={editText}
              onChangeText={setEditText}
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
                onPress={() => handleUpdateCategory(editingId)}
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
        visible={deleteConfirmVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.confirmText}>
              ¿Estás seguro de que deseas eliminar esta categoría?
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleDeleteCategory}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Eliminando..." : "Eliminar"}
                </Text>
              </TouchableOpacity>
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
  list: {
    flex: 1,
  },
  categoryItem: {
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  categoryContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTextContainer: {
    flex: 1,
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
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  editInput: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  deleteButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#416464",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabIcon: {
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    color: "#333",
    backgroundColor: "white",
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    padding: 10,
    borderRadius: 5,
    width: "40%",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  addButton: {
    backgroundColor: "#2ecc71",
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#666",
    textAlign: "center",
  },
});
