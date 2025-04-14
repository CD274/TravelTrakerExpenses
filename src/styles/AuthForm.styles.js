import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#011C40", // color más oscuro para el fondo
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#A7EBF2", // color claro para el título
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#54ACBF", // tono intermedio
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: "#A7EBF2", // mismo que título
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#023859",
    color: "#A7EBF2",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  divider: {
    height: 20,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#26658C", // azul medio para botón
  },
  disabledButton: {
    backgroundColor: "#023859",
    opacity: 0.6,
  },
  buttonText: {
    color: "#A7EBF2",
    fontSize: 16,
    fontWeight: "600",
  },
  switchText: {
    color: "#A7EBF2",
    textAlign: "center",
    marginTop: 10,
  },
  switchLink: {
    color: "#54ACBF",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 22,
    color: "#A7EBF2",
    fontWeight: "bold",
    marginBottom: 10,
  },
  switchButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#023859",
    alignItems: "center",
  },
  switchButtonText: {
    color: "#A7EBF2",
    fontSize: 16,
    fontWeight: "600",
  },
});
