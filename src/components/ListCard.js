import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, IconButton } from 'react-native-paper';

// The component now also accepts onRename
export default function ListCard({ list, onPress, onDelete, onRename, isEditMode }) {

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Kein Datum';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    // When in edit mode, the main card press is disabled to prevent navigation
    <Card style={styles.card} onPress={isEditMode ? undefined : onPress}>
      <Card.Content style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Title style={styles.title}>{list.name}</Title>
          <Paragraph style={styles.paragraph}>Erstellt am: {formatDate(list.createdAt)}</Paragraph>
        </View>
        
        {/* Edit and Delete buttons are shown in a row when in edit mode */}
        {isEditMode && (
          <View style={styles.actionsContainer}>
            <IconButton
              icon="pencil"
              size={24}
              onPress={(e) => {
                e.stopPropagation();
                onRename(); // Trigger the rename handler passed from StartScreen
              }}
            />
            <IconButton
              icon="delete"
              color="red"
              size={24}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1, 
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 18,
  },
  paragraph: {
    fontSize: 12,
    color: 'grey',
  },
});
