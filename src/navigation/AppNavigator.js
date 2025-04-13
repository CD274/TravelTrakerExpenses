import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // Asegúrate de instalar @expo/vector-icons
import AuthForm from "../screens/AuthForm";
import TravelsScreen from "../screens/TravelsList";
import CategoriesScreen from "../screens/CatList";
import CategoryExpensesScreen from "../screens/ExpenseList";
import SettingsScreen from "../screens/SettingsScreen"; // Crea este componente

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Creamos un Stack Navigator para las pantallas principales
function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Travels"
        component={TravelsScreen}
        options={{ title: "Mis Viajes" }}
      />
      <Stack.Screen
        name="TravelCategories"
        component={CategoriesScreen}
        options={({ route }) => ({
          title: route.params.travelName || "Categorías",
          headerBackTitle: "Atrás",
        })}
      />
      <Stack.Screen
        name="CategoryExpenses"
        component={CategoryExpensesScreen}
        options={({ route }) => ({
          title: route.params.categoryName || "Gastos",
          headerBackTitle: "Atrás",
        })}
      />
    </Stack.Navigator>
  );
}

// Creamos el Tab Navigator que contendrá nuestras pestañas
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
