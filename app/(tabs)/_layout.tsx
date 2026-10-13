import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, shadows } from '../../utils/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.light.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.light.primary,
          tabBarInactiveTintColor: 'rgba(30,58,138,0.3)', // muted blue-ish
          tabBarStyle: {
            backgroundColor: 'rgba(245,242,234,0.95)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(61,61,61,0.05)',
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 16,
            paddingHorizontal: 40,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
        }}
      >
        {/* Left Position: Home (dynamic icon) */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => {
              if (focused) {
                // When on Home: show the dark + circle (purely visual — tap handled by listeners)
                return (
                  <View style={styles.fabInNav}>
                    <Ionicons name="add" size={24} color={colors.light.text} />
                  </View>
                );
              }
              // When NOT on Home: show a home icon
              return (
                <Ionicons name="home-outline" size={28} color="rgba(61,61,61,0.3)" />
              );
            },
          }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => {
              // If Home tab is already focused, open journal modal
              const isFocused = navigation.isFocused();
              if (isFocused) {
                e.preventDefault();
                router.push('/journal/new');
              }
              // Otherwise, default behavior: navigate to Home
            },
          })}
        />

        {/* Center: Journals */}
        <Tabs.Screen
          name="journals"
          options={{
            title: 'Journals',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="book-outline"
                size={28}
                color={focused ? colors.light.text : 'rgba(61,61,61,0.3)'}
              />
            ),
          }}
        />

        {/* Right: Insights */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Insights',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="trending-up-outline"
                size={28}
                color={focused ? colors.light.text : 'rgba(61,61,61,0.3)'}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  fabInNav: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});
