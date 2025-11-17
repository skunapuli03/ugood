import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { signOut } from '../services/auth';
import GradientHeader from '../components/GradientHeader';
import { colors, gradients, borderRadius, shadows } from '../utils/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, session, clear } = useUserStore();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
              clear();
              router.replace('/sign-in');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || 'No email';

  return (
    <ScrollView style={styles.container}>
      <GradientHeader
        title="Profile"
        subtitle="Manage your account"
        gradient={gradients.secondary}
      />

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.light.primary} />
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color={colors.light.text} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.light.border, true: colors.light.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color={colors.light.text} />
            <Text style={styles.menuItemText}>App Version</Text>
            <Text style={styles.menuItemValue}>1.0.0</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={colors.light.text} />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={24} color={colors.light.text} />
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.md,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: colors.light.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.light.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: 16,
    borderRadius: borderRadius.md,
    marginBottom: 12,
    ...shadows.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.light.text,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: 16,
    borderRadius: borderRadius.md,
    marginBottom: 12,
    gap: 12,
    ...shadows.sm,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.light.text,
    fontWeight: '500',
  },
  menuItemValue: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: borderRadius.md,
    gap: 8,
    marginTop: 20,
    marginBottom: 40,
    ...shadows.md,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


