import React, { useContext, useState, useEffect } from "react";
import { TouchableOpacity, TextInput, Text, View, Alert } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { styles } from "../styles/AuthForm.styles";

const RegisterForm = ({ onSwitch }) => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, loading, error, user } = useContext(AuthContext);

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

  const handleRegister = async () => {
    try {
      await register(email, password);
      Alert.alert("Éxito", "Registro completado");
    } catch (error) {}
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Register</Text>
        <Text style={styles.subtitle}>
          Please register to create an account.
        </Text>

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
          onPress={handleRegister}
          disabled={loading}
          style={[
            styles.button,
            styles.primaryButton,
            loading && styles.disabledButton,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Cambiar a Login */}
        <Text style={styles.switchText}>
          Already have an account?{" "}
          <Text style={styles.switchLink} onPress={onSwitch}>
            Sign In
          </Text>
        </Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default RegisterForm;
