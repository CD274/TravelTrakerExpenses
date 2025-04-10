import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import AuthForm from "../components/AuthForm";
import CategoriesScreen from "../components/ExpenseForm";
import CategoryExpensesScreen from "../components/ExpenseList";

const Stack = createStackNavigator();

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
          name="Categories"
          component={CategoriesScreen}
          options={{ title: "Mis Categorías" }}
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
    </NavigationContainer>
  );
}
