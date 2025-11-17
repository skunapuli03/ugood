import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../utils/theme';

interface ThreeDotMenuProps {
  onEdit: () => void;
  onViewLesson: () => void;
  onDelete: () => void;
}

export default function ThreeDotMenu({
  onEdit,
  onViewLesson,
  onDelete,
}: ThreeDotMenuProps) {
  const [visible, setVisible] = useState(false);

  const handleAction = (action: () => void) => {
    setVisible(false);
    action();
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.menuButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-horizontal" size={24} color={colors.light.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAction(onViewLesson)}
            >
              <Ionicons name="bulb-outline" size={20} color={colors.light.text} />
              <Text style={styles.menuItemText}>View Lesson</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAction(onEdit)}
            >
              <Ionicons name="create-outline" size={20} color={colors.light.text} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.deleteItem]}
              onPress={() => handleAction(onDelete)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg,
    padding: 8,
    minWidth: 200,
    ...shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: borderRadius.md,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.light.text,
    fontWeight: '500',
  },
  deleteItem: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  deleteText: {
    color: '#EF4444',
  },
});


