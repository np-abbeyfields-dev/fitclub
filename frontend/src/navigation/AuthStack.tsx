import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthStackProps = {
  onLoginSuccess: () => void;
};

export function AuthStack({ onLoginSuccess }: AuthStackProps) {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Landing">
        {(props) => (
          <LandingScreen
            {...props}
            onSignIn={() => props.navigation.navigate('Login')}
            onGetStarted={() => props.navigation.navigate('Register')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onRegister={() => props.navigation.navigate('Register')}
            onSuccess={onLoginSuccess}
            onBack={() => props.navigation.navigate('Landing')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            {...props}
            onLogin={() => props.navigation.navigate('Login')}
            onSuccess={onLoginSuccess}
            onBack={() => props.navigation.navigate('Landing')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
