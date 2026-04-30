import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import LoginScreen from './src/screens/LoginScreen';
import ChatScreen from './src/screens/ChatScreen';
import ReadingScreen from './src/screens/ReadingScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0a0a0a',
    card: '#121218',
    primary: '#c9a227',
    text: '#f5e6c8',
    border: '#2a2a32',
  },
};

function MainTabs() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Chetya</Text>
        <TouchableOpacity onPress={logout} hitSlop={12}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#121218', borderTopColor: '#2a2a32' },
          tabBarActiveTintColor: '#c9a227',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tab.Screen
          name="Guru"
          component={ChatScreen}
          options={{ tabBarLabel: 'Talk to Guru' }}
        />
        <Tab.Screen name="Reading" component={ReadingScreen} options={{ tabBarLabel: 'Reading' }} />
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <MainTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
    backgroundColor: '#0a0a0a',
  },
  topTitle: { color: '#f5e6c8', fontSize: 18, fontWeight: '700' },
  logout: { color: '#888', fontSize: 14 },
});
