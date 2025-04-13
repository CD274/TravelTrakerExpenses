import React, { useEffect, useContext, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { styles } from "../styles/CatList.styles";
import { AuthContext } from "../contexts/AuthContext";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  saveCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  syncLocalCategories,
} from "../services/categories";
import { useEntityManager } from "../hooks/useEntityManager";
import DeletModal from "../components/DeletModal";
import FAB from "../components/FAB";
import FormModal from "../components/FormModal";

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);

  const { states, actions } = useEntityManager({
    entityName: "categoría",
    loadService: getCategories,
    saveService: saveCategory,
    updateService: updateCategory,
    deleteService: deleteCategory,
    syncService: syncLocalCategories,
    additionalParams: { travelId: route.params?.travelId },
    navigation,
    route,
  });

  useEffect(() => {
    actions.loadData();
  }, []);

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

  const renderCategory = ({ item }) => (
    <View style={[styles.categoryItem, { backgroundColor: item.color }]}>
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

        <View style={styles.categoryActions}>
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
        renderItem={renderCategory}
        keyExtractor={(item) => item.id || Math.random().toString()}
        refreshing={states.isRefreshing}
        onRefresh={actions.loadData}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay categorías creadas</Text>
        }
      />

      <FAB onPress={() => actions.setIsModalVisible(true)} />

      <FormModal
        visible={states.isModalVisible}
        title="Nueva Categoría"
        initialData={{ name: "", color: "#3498db" }}
        colorOptions={["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"]}
        onCancel={() => actions.setIsModalVisible(false)}
        onSubmit={actions.handleAdd}
        isSubmitting={states.isSubmitting}
        validationMessage="El nombre de la categoría es requerido"
      />

      <FormModal
        visible={!!states.editingId}
        title="Editar Categoría"
        initialData={
          states.items.find((category) => category.id === states.editingId) || {
            name: "",
            color: "#3498db",
          }
        }
        colorOptions={["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"]}
        onCancel={() => actions.setEditingId(null)}
        onSubmit={(data) => actions.handleUpdate(states.editingId, data)}
        isSubmitting={states.isSubmitting}
        validationMessage="El nombre de la categoría es requerido"
      />

      <DeletModal
        visible={states.deleteConfirmVisible}
        title="¿Eliminar categoría?"
        message="Esta acción no se puede deshacer"
        onCancel={() => actions.setDeleteConfirmVisible(false)}
        onConfirm={actions.handleDelete}
        isSubmitting={states.isSubmitting}
      />
    </View>
  );
}
