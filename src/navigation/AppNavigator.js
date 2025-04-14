import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AuthForm from "../screens/AuthForm";
import TravelsScreen from "../screens/TravelsList";
import CategoriesScreen from "../screens/CatList";
import CategoryExpensesScreen from "../screens/ExpenseList";
import SettingsScreen from "../screens/SettingsScreen";
import { AuthContext } from "../contexts/AuthContext";
import React, { useContext } from "react";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainStack() {
  const { logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const handleLogout = () => {
    logout(); // Ejecuta la función de logout del contexto
    navigation.navigate("Auth"); // Redirige a la pantalla de login
  };

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Travels"
        component={TravelsScreen}
        options={{
          title: "Mis Viajes",
          headerLeft: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginLeft: 15 }}>
              <Ionicons name="log-out-outline" size={30} color="#2e86de" />
            </TouchableOpacity>
          ),
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="TravelCategories"
        component={CategoriesScreen}
        options={({ route }) => ({
          title: route.params.travelName || "Categorías",
          headerBackTitle: "Atrás",
          headerTitleAlign: "center",
        })}
      />
      <Stack.Screen
        name="CategoryExpenses"
        component={CategoryExpensesScreen}
        options={({ route }) => ({
          title: route.params.categoryName || "Gastos",
          headerBackTitle: "Atrás",
          headerTitleAlign: "center",
        })}
      />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Main") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2e86de",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Main"
        component={MainStack}
        options={{ title: "Inicio" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Ajustes" }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Auth"
          component={AuthForm}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="App"
          component={AppTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
