
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Import screen components
import StartScreen from '../screens/StartScreen';
import ListEditScreen from '../screens/ListEditScreen';
import ArticleDetailsScreen from '../screens/ArticleDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Import custom components
import HeaderMenu from '../components/HeaderMenu';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Observer for user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  // Display a loading screen while checking auth state
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // User is signed in, show the main app screens
          <>
            <Stack.Screen
              name="Start"
              component={StartScreen}
              // The header is now dynamically controlled within StartScreen itself
              // to allow for context-aware buttons (e.g., "Done" in edit mode).
              options={({ navigation }) => ({
                title: 'Einkaufslisten',
                // The default headerRight is set here, but can be overridden by StartScreen
                headerRight: () => <HeaderMenu navigation={navigation} />,
              })}
            />
            <Stack.Screen 
              name="ListEdit" 
              component={ListEditScreen} 
              options={{ title: 'Liste bearbeiten' }}
            />
            <Stack.Screen 
              name="ArticleDetails" 
              component={ArticleDetailsScreen} 
              options={{ title: 'Artikeldetails' }}
            />
          </>
        ) : (
          // No user is signed in, show the login screen
          <Stack.Screen 
            name="Login"
            component={LoginScreen} 
            options={{ headerShown: false }} // Hide header for the login screen
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
