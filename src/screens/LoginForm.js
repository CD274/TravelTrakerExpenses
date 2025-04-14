import React, { useContext, useState, useEffect } from "react";
import { TouchableOpacity, TextInput, Text, View, Alert } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../styles/AuthForm.styles";

const LoginForm = ({ onSwitch }) => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error, user } = useContext(AuthContext);

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Please sign in to continue.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            placeholder="Enter your username"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={[
            styles.button,
            styles.primaryButton,
            loading && styles.disabledButton,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Cambiar a Register */}
        <Text style={styles.switchText}>
          Don't have an account?{" "}
          <Text style={styles.switchLink} onPress={onSwitch}>
            Sign Up
          </Text>
        </Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default LoginForm;
