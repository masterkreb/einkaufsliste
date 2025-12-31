import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { FAB, Searchbar, Portal, Dialog, TextInput, Button } from 'react-native-paper';
import ListCard from '../components/ListCard';
import { useIsFocused } from '@react-navigation/native';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs, collectionGroup, arrayUnion, getDoc, setDoc } from 'firebase/firestore';

export default function StartScreen({ route, navigation }) {
  const [lists, setLists] = useState([]);
  const [filteredLists, setFilteredLists] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isJoinDialogVisible, setIsJoinDialogVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const [isRenameDialogVisible, setIsRenameDialogVisible] = useState(false);
  const [listToRename, setListToRename] = useState(null);
  const [newListName, setNewListName] = useState('');

  const isFocused = useIsFocused();
  const user = auth.currentUser;
  const { action, timestamp } = route.params || {};

  useEffect(() => {
    if (timestamp && action) {
      switch (action) {
        case 'edit': setIsEditMode(prev => !prev); setIsSearchVisible(false); break;
        case 'search': setIsSearchVisible(prev => !prev); setIsEditMode(false); break;
        case 'join': setIsJoinDialogVisible(true); break;
      }
    }
  }, [action, timestamp]);

  useEffect(() => {
    if (isFocused && user) {
      const userListsRef = collection(db, `users/${user.uid}/lists`);
      const unsubscribeUserLists = onSnapshot(userListsRef, (snapshot) => {
        const userLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLists(prevLists => [...userLists.filter(ul => !prevLists.some(pl => pl.id === ul.id)), ...prevLists.filter(pl => userLists.some(ul => ul.id === pl.id))]);
        setFilteredLists(prevLists => [...userLists.filter(ul => !prevLists.some(pl => pl.id === ul.id)), ...prevLists.filter(pl => userLists.some(ul => ul.id === pl.id))]);
      });

      return () => unsubscribeUserLists();
    }
  }, [isFocused, user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = lists.filter(list => list.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredLists(filtered);
    } else {
      setFilteredLists(lists);
    }
  }, [searchQuery, lists]);

  const handleAddList = async () => {
    await addDoc(collection(db, `users/${user.uid}/lists`), { 
      name: 'Neue Liste', 
      articles: [], 
      createdAt: Date.now(), 
      updatedAt: Date.now(),
      isShared: false, // Explicitly set isShared to false
    });
  };

  const handleDeleteList = async (listId) => {
    await deleteDoc(doc(db, `users/${user.uid}/lists`, listId));
  };

  const handleJoinList = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    const sharedListRef = doc(db, 'sharedLists', code);

    try {
      // Attempt to update the members list.
      // This will succeed only if the security rules allow it.
      await updateDoc(sharedListRef, {
        members: arrayUnion(user.uid)
      });

      // If the update was successful, create a local reference for the user.
      const sharedListSnap = await getDoc(sharedListRef);
      if (sharedListSnap.exists()) {
        const sharedList = sharedListSnap.data();
        await setDoc(doc(db, `users/${user.uid}/lists`, code), {
          name: sharedList.name,
          isShared: true,
          sharedListId: code, // The ID of the shared list is the code
          joinedAt: Date.now()
        });
        alert('Liste erfolgreich beigetreten!');
      } else {
          // This case should not happen if the updateDoc succeeds
          throw new Error("List does not exist.");
      }
    } catch (error) {
      console.error('Error joining list:', error);
      alert('Fehler beim Beitreten. Prüfe den Code oder deine Berechtigungen.');
    }
    setIsJoinDialogVisible(false);
    setJoinCode('');
  };

  const openRenameDialog = (list) => {
    setListToRename(list);
    setNewListName(list.name);
    setIsRenameDialogVisible(true);
  };

  const handleRenameList = async () => {
    if (listToRename && newListName.trim() !== '' && newListName !== listToRename.name) {
      const listRef = doc(db, `users/${user.uid}/lists`, listToRename.id);
      await updateDoc(listRef, { name: newListName, updatedAt: Date.now() });
    }
    setIsRenameDialogVisible(false);
    setListToRename(null);
    setNewListName('');
  };

  const navigateToList = (list) => {
    navigation.navigate('ListEdit', { listId: list.id, listName: list.name });
  };

  return (
    <View style={styles.container}>
      {isSearchVisible && (
        <Searchbar
          placeholder="Listen durchsuchen..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          onIconPress={() => setIsSearchVisible(false)}
        />
      )}
      <FlatList
        data={filteredLists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListCard
            list={item}
            onPress={() => navigateToList(item)}
            onDelete={() => handleDeleteList(item.id)}
            onRename={() => openRenameDialog(item)}
            isEditMode={isEditMode}
          />
        )}
        ListEmptyComponent={<View><Text style={{textAlign: 'center', marginTop: 20}}>Keine Listen vorhanden. Erstelle eine neue mit dem "+" Button!</Text></View>}
      />
      <FAB style={styles.fab} icon="plus" onPress={handleAddList} />

      <Portal>
        <Dialog visible={isJoinDialogVisible} onDismiss={() => setIsJoinDialogVisible(false)}>
          <Dialog.Title>Liste beitreten</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Freigabecode eingeben"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              autoFocus
              placeholder="z.B. ABC123"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsJoinDialogVisible(false)}>Abbrechen</Button>
            <Button onPress={handleJoinList}>Beitreten</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isRenameDialogVisible} onDismiss={() => setIsRenameDialogVisible(false)}>
          <Dialog.Title>Liste umbenennen</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Neuer Name"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsRenameDialogVisible(false)}>Abbrechen</Button>
            <Button onPress={handleRenameList}>Speichern</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  searchbar: { margin: 8 }
});
