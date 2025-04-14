import React, { useState, useEffect, useContext, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { styles } from "../styles/TravelsList.styles";
import {
  saveTravel,
  getTravel,
  syncLocalTravel,
  updateTravel,
  deleteTravelLocal,
} from "../services/travels";

import { useEntityManager } from "../hooks/useEntityManager";
import { MaterialIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import DeletModal from "../components/DeletModal";
import FAB from "../components/FAB";
import FormModal from "../components/FormModal";
export default function TravelsScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { states, actions } = useEntityManager({
    entityName: "viaje",
    loadService: getTravel,
    saveService: saveTravel,
    updateService: updateTravel,
    deleteService: deleteTravelLocal,
    syncService: syncLocalTravel,
    navigation,
  });
  useEffect(() => {
    const refreshOnFocus = navigation.addListener("focus", () => {
      actions.loadData();
    });

    return refreshOnFocus;
  }, [navigation]);
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
            size={30}
            color={states.isSubmitting ? "#ccc" : "#007bff"}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, states.isSubmitting]);

  const renderTravel = ({ item }) => (
    <View
      style={[styles.travelItem, { backgroundColor: item.color || "#70b2b2" }]}
    >
      <View style={styles.travelContentContainer}>
        <TouchableOpacity
          style={styles.travelContent}
          onPress={() => {
            navigation.navigate("TravelCategories", {
              travelId: item.id,
              travelName: item.name,
            });
          }}
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

        <View style={styles.travelActions}>
          <TouchableOpacity
            onPress={() => actions.setEditingId(item.id)}
            style={styles.actionButton}
          >
            <Icon name="edit" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              actions.setEntityToDelete(item.id);
              actions.setDeleteConfirmVisible(true);
            }}
            style={styles.actionButton}
          >
            <Icon name="delete" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={states.items}
        renderItem={renderTravel}
        keyExtractor={(item) => item.id || item.localId}
        contentContainerStyle={styles.listContainer}
        refreshing={states.isRefreshing}
        onRefresh={actions.loadData}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay viajes creados</Text>
        }
      />
      {/* Boton de agregar viaje */}
      <FAB onPress={() => actions.setIsModalVisible(true)} />

      {/* Modal para agregar nuevo viaje */}
      <FormModal
        visible={states.isModalVisible}
        title="Nuevo Viaje"
        initialData={{ name: "", color: "#70b2b2" }}
        colorOptions={["#70b2b2", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"]}
        onCancel={() => actions.setIsModalVisible(false)} // Corregido
        onSubmit={actions.handleAdd} // Usar la función del hook
        isSubmitting={states.isSubmitting}
        validationMessage="El nombre del viaje es requerido"
      />

      {/* Modal para editar viaje */}
      <FormModal
        visible={!!states.editingId}
        title="Editar Viaje" // Añadir título
        initialData={
          states.items.find((travel) => travel.id === states.editingId) || {
            name: "",
            color: "#70b2b2",
          }
        }
        colorOptions={["#70b2b2", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"]} // Añadir opciones de color
        onCancel={() => actions.setEditingId(null)}
        onSubmit={(data) => actions.handleUpdate(states.editingId, data)}
        isSubmitting={states.isSubmitting} // Añadir estado de submitting
        validationMessage="El nombre del viaje es requerido" // Añadir mensaje de validación
      />
      {/* Modal de confirmación para eliminar */}
      <DeletModal
        visible={states.deleteConfirmVisible}
        title="¿Eliminar viaje?"
        message="Esta acción no se puede deshacer"
        onCancel={() => actions.setDeleteConfirmVisible(false)}
        onConfirm={actions.handleDelete}
        isSubmitting={states.isSubmitting}
      />
    </View>
  );
}
