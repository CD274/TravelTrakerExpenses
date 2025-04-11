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
  saveTravel,
  getTravel,
  syncLocalTravel,
  updateTravel,
  deleteTravel,
} from "../services/travels";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function TravelsScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [travels, setTravels] = useState([]);
  const [newTravel, setNewTravel] = useState({
    name: "",
    color: "#70b2b2",
  });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [travelToDelete, setTravelToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTravels();
  }, [user]);

  const loadTravels = async () => {
    if (!user) return;

    try {
      setIsRefreshing(true);
      const fetchedTravels = await getTravel(user.uid);
      setTravels(fetchedTravels);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los viajes");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddTravel = async () => {
    if (isSubmitting) return;

    if (!newTravel.name?.trim()) {
      Alert.alert("Error", "El nombre del viaje es requerido");
      return;
    }

    try {
      setIsSubmitting(true);
      await saveTravel(user.uid, newTravel, true);
      setNewTravel({ name: "", color: "#70b2b2" });
      setIsModalVisible(false);
      loadTravels();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el viaje");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (id, currentName) => {
    setEditingId(id);
    setEditText(currentName);
  };

  const handleUpdateTravel = async (id) => {
    if (isSubmitting) return;

    if (!editText.trim()) {
      Alert.alert("Error", "El nombre del viaje es requerido");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateTravel(user.uid, id, { name: editText }, true);
      setEditingId(null);
      setEditText("");
      loadTravels();
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el viaje");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (travelId) => {
    setTravelToDelete(travelId);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteTravel = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteTravel(user.uid, travelToDelete, true);
      setDeleteConfirmVisible(false);
      setTravelToDelete(null);
      loadTravels();
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar el viaje");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (isSubmitting) return;
    if (!navigator.onLine) {
      Alert.alert("Error", "No hay conexión a internet");
      return;
    }

    try {
      setIsSubmitting(true);
      await syncLocalTravel(user.uid);
      loadTravels();
      Alert.alert("Éxito", "Viajes sincronizados correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudieron sincronizar los viajes. Verifica tu conexión a internet.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanupModal = () => {
    setNewTravel({ name: "", color: "#70b2b2" });
    setIsModalVisible(false);
  };

  const renderTravel = ({ item }) => (
    <View
      style={[styles.travelItem, { backgroundColor: item.color || "#70b2b2" }]}
    >
      {editingId === item.id ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={() => handleUpdateTravel(item.id)}
            onBlur={() => {
              if (editText.trim()) {
                handleUpdateTravel(item.id);
              } else {
                setEditingId(null);
                setEditText("");
              }
            }}
            selectTextOnFocus
          />
        </View>
      ) : (
        <View style={styles.travelContentContainer}>
          <TouchableOpacity
            style={styles.travelContent}
            onPress={() => {
              navigation.navigate("TravelCategories", {
                travelId: item.id,
                travelName: item.name,
              });
            }}
            onLongPress={() => startEditing(item.id, item.name)}
            delayLongPress={1000}
          >
            <View style={styles.travelTextContainer}>
              <Text style={styles.travelName}>{item.name}</Text>
              <Text style={styles.travelDate}>
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
                Alert.alert("Error", "Este viaje no tiene un ID válido");
              }
            }}
          >
            <MaterialIcons name="delete" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Viajes</Text>
        <Button title="Sincronizar" onPress={handleSync} color="#146748" />
      </View>

      <FlatList
        data={travels}
        renderItem={renderTravel}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefreshing}
        onRefresh={loadTravels}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay viajes creados</Text>
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
        onRequestClose={cleanupModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Viaje</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del viaje"
              placeholderTextColor="#999"
              value={newTravel.name || ""}
              onChangeText={(text) =>
                setNewTravel({ ...newTravel, name: text })
              }
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                onPress={cleanupModal}
                color="#e74c3c"
              />
              <Button
                title={isSubmitting ? "Guardando..." : "Guardar"}
                onPress={handleAddTravel}
                disabled={isSubmitting}
                color="#2ecc71"
              />
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
            <Text style={styles.confirmTitle}>¿Eliminar viaje?</Text>
            <Text style={styles.confirmText}>
              Esta acción no se puede deshacer
            </Text>

            <View style={styles.confirmButtons}>
              <Button
                title="Cancelar"
                onPress={() => setDeleteConfirmVisible(false)}
                color="#cccccc"
              />
              <Button
                title="Eliminar"
                onPress={handleDeleteTravel}
                color="#e74c3c"
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
    color: "#333",
  },
  listContainer: {
    flexGrow: 1,
  },
  travelItem: {
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  travelContent: {
    padding: 16,
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
    backgroundColor: "#5ca3a3",
  },
  deleteButton: {
    padding: 16,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  travelName: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
  travelDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
    color: "#999",
  },
  addButton: {
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
    color: "#333",
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  confirmModal: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#666",
    textAlign: "center",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  travelItem: {
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  travelContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  travelContent: {
    flex: 1,
  },
  travelTextContainer: {
    flex: 1,
  },
  deleteButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});
