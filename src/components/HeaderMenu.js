
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Menu, IconButton, Divider } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const HeaderMenu = ({ navigation }) => {
  const [visible, setVisible] = useState(false);
  // We add a key that we can change to force React to re-render the component from scratch.
  const [menuKey, setMenuKey] = useState(0);

  const openMenu = () => {
    // Every time we open the menu, we change its key.
    // This forces React to destroy the old instance and create a new one,
    // bypassing the internal state bug of the Menu component on iOS.
    setMenuKey(prevKey => prevKey + 1);
    setVisible(true);
  };

  const closeMenu = () => {
    setVisible(false);
  };

  const handleAction = (action) => {
    closeMenu();
    navigation.navigate('Start', { action: action, timestamp: Date.now() });
  };
  
  const handleLogout = () => {
    closeMenu();
    setTimeout(async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Error signing out: ", error);
        }
    }, 50);
  };

  return (
    <View style={{ flexDirection: 'row' }}>
      <Menu
        key={menuKey} // Der key sorgt dafür, dass die Komponente bei jedem Öffnen neu erstellt wird.
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
