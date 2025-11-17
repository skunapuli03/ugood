import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

export default function Index() {
  const { session, loading } = useUserStore();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
});
