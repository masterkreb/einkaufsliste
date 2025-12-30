import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Menu, IconButton, Divider } from 'react-native-paper';

import StartScreen from '../screens/StartScreen';
import ListEditScreen from '../screens/ListEditScreen';
import ArticleDetailsScreen from '../screens/ArticleDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

// This component renders the menu in the header
const HeaderMenu = ({ navigation }) => {
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const handleAction = (action) => {
    closeMenu();
    // We pass an action to the StartScreen via route params
    navigation.navigate('Start', { action: action, timestamp: Date.now() });
  };
  
  const handleLogout = async () => {
    closeMenu();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <View style={{ flexDirection: 'row' }}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={<IconButton icon="dots-vertical" onPress={openMenu} color="#000" />}
      >
        <Menu.Item onPress={() => handleAction('edit')} title="Bearbeiten" />
        <Menu.Item onPress={() => handleAction('search')} title="Suche" />
        <Menu.Item onPress={() => handleAction('join')} title="Beitreten" />
        <Divider />
        <Menu.Item onPress={handleLogout} title="Logout" />
      </Menu>
    </View>
  );
};


export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
              options={({ navigation }) => ({
                title: 'Einkaufslisten',
                headerRight: () => <HeaderMenu navigation={navigation} />,
              })}
              initialParams={{ action: 'none' }}
            />
            <Stack.Screen name="ListEdit" component={ListEditScreen} options={{ title: 'Liste bearbeiten' }} />
            <Stack.Screen name="ArticleDetails" component={ArticleDetailsScreen} options={{ title: 'Artikeldetails' }} />
          </>
        ) : (
          // No user is signed in, show the login screen
          <Stack.Screen 
            name="Login"
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
