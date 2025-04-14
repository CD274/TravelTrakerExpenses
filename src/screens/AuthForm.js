import React, { useState } from "react";
import { View } from "react-native";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      {isLogin ? (
        <LoginForm onSwitch={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onSwitch={() => setIsLogin(true)} />
      )}
    </View>
  );
};

export default AuthScreen;
