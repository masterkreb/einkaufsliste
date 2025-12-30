import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { FAB, Searchbar, Portal, Dialog, TextInput, Button } from 'react-native-paper';
import ListCard from '../components/ListCard';
import { useIsFocused } from '@react-navigation/native';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs, collectionGroup, arrayUnion } from 'firebase/firestore';

export default function StartScreen({ route, navigation }) {
  const [lists, setLists] = useState([]);
  const [filteredLists, setFilteredLists] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Join Dialog
  const [isJoinDialogVisible, setIsJoinDialogVisible] = useState(false);
  const [joinListId, setJoinListId] = useState('');

  // State for Rename Dialog
  const [isRenameDialogVisible, setIsRenameDialogVisible] = useState(false);
  const [listToRename, setListToRename] = useState(null);
  const [newListName, setNewListName] = useState('');

  const isFocused = useIsFocused();
  const user = auth.currentUser;
  const { action, timestamp } = route.params || {};

  useEffect(() => {
    console.log('StartScreen useEffect action:', action, timestamp);
    if (timestamp) {
      switch (action) {
        case 'edit': setIsEditMode(prev => !prev); setIsSearchVisible(false); break;
        case 'search': setIsSearchVisible(prev => !prev); setIsEditMode(false); break;
        case 'join': console.log('Setting join dialog visible'); setIsJoinDialogVisible(true); break;
      }
    }
  }, [action, timestamp]);

  useEffect(() => {
    if (isFocused && user) {
      const userListsUnsubscribe = onSnapshot(collection(db, `users/${user.uid}/lists`), (snapshot) => {
        const userLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isUserList: true }));
        setLists(userLists);
        setFilteredLists(userLists);
      });

      const sharedListsUnsubscribe = onSnapshot(collection(db, 'sharedLists'), (snapshot) => {
        const sharedLists = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data(), isShared: true }))
          .filter(list => list.members && list.members.includes(user.uid));
        setLists(prev => [...prev.filter(l => !l.isShared), ...sharedLists]);
        setFilteredLists(prev => [...prev.filter(l => !l.isShared), ...sharedLists]);
      });

      return () => {
        userListsUnsubscribe();
        sharedListsUnsubscribe();
      };
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
    console.log('handleAddList called, user:', user, 'user.uid:', user?.uid);
    const newList = { name: 'Neue Liste', articles: [], createdAt: Date.now(), updatedAt: Date.now() };
    await addDoc(collection(db, `users/${user.uid}/lists`), newList);
  };

  const handleDeleteList = async (listId) => {
    await deleteDoc(doc(db, `users/${user.uid}/lists`, listId));
  };

  const handleJoinList = async () => {
    console.log('handleJoinList called with code:', joinListId);
    if (!joinListId.trim()) return;
    try {
      const q = query(collection(db, 'sharedLists'), where('shareCode', '==', joinListId.trim()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const sharedListDoc = querySnapshot.docs[0];
        const sharedList = sharedListDoc.data();
        const sharedListId = sharedListDoc.id;
        // Füge User zu members hinzu
        await updateDoc(doc(db, 'sharedLists', sharedListId), {
          members: arrayUnion(user.uid)
        });
        // Füge zu userLists hinzu
        await addDoc(collection(db, `users/${user.uid}/lists`), {
          name: sharedList.name,
          isShared: true,
          sharedListId: sharedListId,
          joinedAt: Date.now()
        });
        alert('Liste erfolgreich beigetreten!');
      } else {
        alert('Code nicht gefunden. Überprüfe den Code.');
      }
    } catch (error) {
      console.error('Error joining list:', error);
      alert('Fehler beim Beitreten.');
    }
    setIsJoinDialogVisible(false);
    setJoinListId('');
  };

  // Opens the rename dialog
  const openRenameDialog = (list) => {
    setListToRename(list);
    setNewListName(list.name);
    setIsRenameDialogVisible(true);
  };

  // Saves the new list name to Firebase
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
            onRename={() => openRenameDialog(item)} // Pass the rename handler
            isEditMode={isEditMode}
          />
        )}
        ListEmptyComponent={<View><Text style={{textAlign: 'center', marginTop: 20}}>Keine Listen vorhanden. Erstelle eine neue mit dem "+" Button!</Text></View>}
      />
      <FAB style={styles.fab} icon="plus" onPress={handleAddList} />

      <Portal>
        {/* Join List Dialog */}
        <Dialog visible={isJoinDialogVisible} onDismiss={() => setIsJoinDialogVisible(false)}>
          <Dialog.Title>Liste beitreten</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Freigabecode eingeben"
              value={joinListId}
              onChangeText={setJoinListId}
              autoFocus
              placeholder="z.B. ABC123"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsJoinDialogVisible(false)}>Abbrechen</Button>
            <Button onPress={() => { console.log('Join dialog button pressed'); handleJoinList(); }}>Beitreten</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Rename List Dialog */}
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
