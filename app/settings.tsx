import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useJournalStore } from '../store/journalStore';
import { signOut } from '../services/auth';
import { colors, borderRadius, shadows } from '../utils/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, clear } = useUserStore();
  const { clearEntries } = useJournalStore();

  const handleSignOut = async () => {
    await signOut();
    clear();
    clearEntries();
    router.replace('/sign-in');
  };

  const menuItems = [
    { id: '1', title: 'Account Settings', icon: 'person-outline', hasToggle: false },
    { id: '2', title: 'Notifications', icon: 'notifications-outline', hasToggle: false },
    { id: '3', title: 'Face ID / Touch ID', icon: 'lock-closed-outline', hasToggle: true, toggleState: true },
    { id: '4', title: 'Data & Privacy', icon: 'shield-checkmark-outline', hasToggle: false },
    { id: '5', title: 'Theme Appearance', icon: 'color-palette-outline', hasToggle: false, rightText: 'Light' },
    { id: '6', title: 'Help & Support', icon: 'help-circle-outline', hasToggle: false },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, right: 20, left: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: user?.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/png?seed=Yu' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.user_metadata?.full_name || 'My Journal'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Settings List */}
        <View style={styles.listContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.listItem,
                index === menuItems.length - 1 && { borderBottomWidth: 0 }
              ]}
              activeOpacity={0.7}
              disabled={item.hasToggle}
            >
              <View style={styles.listLeft}>
                <Ionicons name={item.icon as any} size={20} color="rgba(61,61,61,0.6)" />
                <Text style={styles.listTitle}>{item.title}</Text>
              </View>
              
              <View style={styles.listRight}>
                {item.rightText && <Text style={styles.rightText}>{item.rightText}</Text>}
                {item.hasToggle ? (
                  <Switch 
                    value={item.toggleState} 
                    onValueChange={() => {}} 
                    trackColor={{ false: 'rgba(61,61,61,0.1)', true: colors.light.accent }}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="rgba(61,61,61,0.3)" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>VERSION 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background, // #F5F2EA
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,61,61,0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: 'Playfair Display', // Serif header
  },
  scrollContent: {
    padding: 24,
  },
  
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 16,
    borderRadius: borderRadius.xxl,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(184,161,209,0.3)', // wellness-accent with opacity
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text,
    fontFamily: 'Playfair Display',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.6)',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: 'rgba(61,61,61,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.text,
  },

  // List Container
  listContainer: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: borderRadius.xxl,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61,61,61,0.05)',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.light.text,
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightText: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.5)',
  },

  // CTA & Footer
  signOutButton: {
    backgroundColor: colors.light.text, // wellness-dark
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: 24,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
