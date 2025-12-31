
import React, { useState } from 'react';
import { View } from 'react-native';
import { Menu, IconButton, Divider } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

// This component is the 3-dot menu in the header
const HeaderMenu = ({ navigation }) => {
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  // Handles actions that navigate or change state in StartScreen
  const handleAction = (action) => {
    closeMenu();
    // We pass an action to the StartScreen via route params to trigger state changes
    navigation.navigate('Start', { action: action, timestamp: Date.now() });
  };
  
  // Handles the logout action
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
        anchor={<IconButton icon="dots-vertical" onPress={openMenu} />}
      >
        <Menu.Item onPress={() => handleAction('edit')} title="Bearbeiten" />
        <Menu.Item onPress={() => handleAction('join')} title="Liste beitreten" />
        <Divider />
        <Menu.Item onPress={handleLogout} title="Abmelden" />
      </Menu>
    </View>
  );
};

export default HeaderMenu;
