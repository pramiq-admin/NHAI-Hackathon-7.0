import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import EnrollmentScreen from '../screens/EnrollmentScreen';
import VerificationScreen from '../screens/VerificationScreen';
import AdminScreen from '../screens/AdminScreen';
import {useThemeContext} from '../theme/ThemeContext';

export type RootStackParamList = {
  Home: undefined;
  Enroll: undefined;
  Verify: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const {isAAA} = useThemeContext();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {backgroundColor: isAAA ? '#000' : '#0f0f23'},
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Enroll" component={EnrollmentScreen} />
      <Stack.Screen name="Verify" component={VerificationScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
    </Stack.Navigator>
  );
}
