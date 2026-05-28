import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppModeProvider } from './src/context/AppModeContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import DetailScreen from './src/screens/DetailScreen';
import DeclareScreen from './src/screens/DeclareScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Accueil:   focused ? 'home'          : 'home-outline',
            Recherche: focused ? 'search'        : 'search-outline',
            'Déclarer':  focused ? 'add-circle'    : 'add-circle-outline',
            Messages:  focused ? 'chatbubbles'   : 'chatbubbles-outline',
            Profil:    focused ? 'person'        : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Accueil"   component={HomeScreen} />
      <Tab.Screen name="Recherche" component={SearchScreen} />
      <Tab.Screen name="Déclarer"  component={DeclareScreen} />
      <Tab.Screen name="Messages"  component={MessagesScreen} />
      <Tab.Screen name="Profil"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { token } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="Main"   component={HomeTabs} />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{ headerShown: true, title: 'Détail', headerBackTitle: 'Retour',
              headerStyle: { backgroundColor: COLORS.surface },
              headerTintColor: COLORS.primary,
              headerTitleStyle: { color: COLORS.text },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppModeProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </AppModeProvider>
    </SafeAreaProvider>
  );
}
