import React from 'react';
import { View, Pressable } from 'react-native';
import { Checkbox, Text, IconButton } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

export default function ArticleItem({ article, onToggle, onDelete, onNavigate, isEditMode }) {
  const handleCheckboxPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(article.id);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'white' }}>
        {isEditMode ? (
            <IconButton icon="minus-circle-outline" onPress={() => onDelete(article.id)} />
        ) : (
            <Checkbox
                status={article.checked ? 'checked' : 'unchecked'}
                onPress={handleCheckboxPress}
            />
        )}
        <Pressable onPress={onNavigate} style={{ flex: 1 }}>
            <Text style={{ textDecorationLine: article.checked ? 'line-through' : 'none' }}>
                {article.quantity ? `${article.quantity}x ` : ''}{article.name}
            </Text>
        </Pressable>
    </View>
  );
}