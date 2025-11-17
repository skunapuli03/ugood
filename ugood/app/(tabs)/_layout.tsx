import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, borderRadius, shadows } from '../../utils/theme';

function FloatingAddButton() {
  const router = useRouter();
  
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/journal/new')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.light.primary,
          tabBarInactiveTintColor: colors.light.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.light.card,
            borderTopWidth: 1,
            borderTopColor: colors.light.border,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
        }}
      >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="journals"
            options={{
              title: 'Journals',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="journal" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }}
          />
      </Tabs>
      <FloatingAddButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90, // Position above tab bar (60px height + 30px padding)
    width: 64,
    height: 64,
    borderRadius: 32,
    ...shadows.lg,
    zIndex: 1000,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
