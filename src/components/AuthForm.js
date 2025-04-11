import React, { useContext, useState, useEffect } from "react";
import { TouchableOpacity, TextInput, Text, View } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../styles/AuthForm.styles";

export default AuthForm = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, loading, error } = useContext(AuthContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      navigation.navigate("App", {
        screen: "Main",
        params: { screen: "Travels" },
      });
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Bienvenido</Text>
        
        <Text style={styles.inputLabel}>Correo electrónico</Text>
        <TextInput
          placeholder="ejemplo@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.inputLabel}>Contraseña</Text>
        <TextInput
          placeholder="Ingresa tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[
            styles.button,
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Procesando..." : "Iniciar Sesión"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={[
            styles.button,
            styles.registerButton,
            loading && styles.disabledButton,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Procesando..." : "Registrarse"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};
