import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoansScreen from './src/screens/LoansScreen';
import AddLoanScreen from './src/screens/AddLoanScreen';
import { Colors } from './src/theme';
import { AppStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.primary }}>
    <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Home', tabBarLabel: 'Dashboard' }} />
    <Tabs.Screen name="Loans" component={LoansScreen} options={{ title: 'Loans' }} />
  </Tabs.Navigator>;
}

function RootNavigator() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  return <NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false }}>
    {!token ? <Stack.Screen name="Login" component={LoginScreen} /> : <>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="AddLoan" component={AddLoanScreen} options={{ headerShown: true, title: 'Add a loan', headerTintColor: Colors.primary }} />
    </>}
  </Stack.Navigator></NavigationContainer>;
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><RootNavigator /><StatusBar style="dark" /></AuthProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});
