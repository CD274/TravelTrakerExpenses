import React, { useContext, useState, useEffect } from "react";
import { TouchableOpacity, TextInput, Text, Alert } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
export default AuthForm = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, loading, error } = useContext(AuthContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      navigation.navigate("Categories");
    }
  }, [user, navigation]);
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const handleLogin = async () => {
    try {
      await login(email, password);
      Alert.alert("Éxito", "Inicio de sesión exitoso");
    } catch (error) {}
  };

  const handleRegister = async () => {
    try {
      await register(email, password);
      Alert.alert("Éxito", "Registro completado");
    } catch (error) {}
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ padding: 20 }}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ marginBottom: 10, padding: 10, borderWidth: 1 }}
        />
        <TextInput
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 10, padding: 10, borderWidth: 1 }}
        />

        {/* Botón de Iniciar Sesión */}
        <TouchableOpacity
          onPress={handleLogin} // Función específica para login
          disabled={loading}
          style={{
            backgroundColor: loading ? "#cccccc" : "#007bff",
            padding: 15,
            borderRadius: 5,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "white" }}>
            {loading ? "Procesando..." : "Iniciar Sesión"}
          </Text>
        </TouchableOpacity>

        {/* Botón de Registrarse */}
        <TouchableOpacity
          onPress={handleRegister} // Función específica para registro
          disabled={loading}
          style={{
            backgroundColor: loading ? "#cccccc" : "#28a745",
            padding: 15,
            borderRadius: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white" }}>
            {loading ? "Procesando..." : "Registrarse"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
