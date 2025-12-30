import React from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

export default function ShareDialog({ visible, onDismiss, shareCode, onShare }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Liste freigeben</Dialog.Title>
        <Dialog.Content>
          <Text>Generierter Code: {shareCode}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onShare}>Teilen</Button>
          <Button onPress={onDismiss}>Schliessen</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}