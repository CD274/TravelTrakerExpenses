import React, { useState, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = () => {
    // Fundido a negro rápido
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Cambiar el contenido cuando la pantalla ya está cubierta
      setIsLogin(!isLogin);

      // Fundido desde negro rápido
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ flex: 1 }}>
        {isLogin ? (
          <LoginForm onSwitch={animateTransition} />
        ) : (
          <RegisterForm onSwitch={animateTransition} />
        )}
      </View>

      {/* Overlay negro animado */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "#011C40",
            opacity: overlayAnim,
          },
        ]}
      />
    </View>
  );
};

export default AuthScreen;
