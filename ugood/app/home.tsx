import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Constants for Carousel Dimensions
const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.8;
const SPACING = 15;

// Mock data for the new sections
const entries = [
  { id: "1", title: "A Peaceful Morning", excerpt: "Woke up feeling refreshed and watched the sunrise..." },
  { id: "2", title: "Productive Day", excerpt: "Managed to finish the big project at work today..." },
  { id: "3", title: "Evening Walk", excerpt: "Took a long walk in the park to clear my head..." },
  { id: "4", title: "New Recipe", excerpt: "Tried a new pasta recipe and it was delicious..." },
];
const insight = "Remember that progress, not perfection, is the goal. Each small step you take is a victory.";


export default function HomeScreen() {
  const { userName } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const flatRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const moods = [
    { emoji: "😊", label: "Happy", color: "#e0f2e9" },
    { emoji: "😐", label: "Neutral", color: "#f4f4f5" },
    { emoji: "😔", label: "Sad", color: "#ddebf8" },
  ];
  
  interface ScrollEvent {
    nativeEvent: {
      contentOffset: {
        x: number;
      };
    };
  }

  const handleScroll = (event: ScrollEvent): void => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (CARD_WIDTH + SPACING));
    setActiveIndex(index);
  };

  return (
    <LinearGradient
      colors={["#4c669f", "#8a2be2"]}
      start={{ x: 1, y: 0.5 }}
      end={{ x: 0, y: 0.5 }}
      style={styles.gradientContainer}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello, {userName || "Guest"}!</Text>
          <Text style={styles.message}>
            Take a moment to reflect and capture your thoughts
          </Text>
        </View>

        {/* --- CORRECTION --- We use a View here again to be the parent of the overlapping card */}
        <View style={[styles.mainContent, { paddingBottom: insets.bottom }]}>
          {/* Today's Mood Card (This will now overlap correctly) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Mood</Text>
            <View style={styles.moodsContainer}>
              {moods.map((mood) => (
                <TouchableOpacity
                  key={mood.label}
                  style={styles.moodButton}
                  onPress={() => setSelectedMood(mood.label)}
                >
                  <View
                    style={[
                      styles.moodCircle,
                      { backgroundColor: mood.color },
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* --- CORRECTION --- The ScrollView now contains only the content *below* the mood card */}
          <ScrollView 
            style={styles.scrollableContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Recent entries carousel */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recent entries</Text>
              <FlatList
                ref={flatRef}
                data={entries}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + SPACING}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 - SPACING/2 }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                  <View style={styles.carouselCard}>
                    <Text style={styles.carouselCardTitle}>{item.title}</Text>
                    <Text style={styles.carouselCardExcerpt}>{item.excerpt}</Text>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
              />
              {/* Pagination Dots */}
              <View style={styles.paginationContainer}>
                {entries.map((_, index) => (
                  <View
                    key={index}
                    style={[ styles.dot, activeIndex === index ? styles.activeDot : null ]}
                  />
                ))}
              </View>
            </View>

            {/* Today's insight */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Today's insight</Text>
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            </View>
          </ScrollView>

        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContent: {
    flex: 0.3, 
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mainContent: {
    flex: 0.7, 
    backgroundColor: "#f7f7f7",
    alignItems: "center", // This centers the mood card
  },
  // --- CORRECTION --- Added a style for the ScrollView
  scrollableContent: {
    width: '100%',
    marginTop: 20, // Space between mood card and the content below it
  },
  card: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginTop: -60, // This is the key to the overlap
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10, // Ensure card is on top
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  moodsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  moodButton: {},
  moodCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  message: {
    fontSize: 18,
    color: "#e0e0e0",
    textAlign: "center",
  },
  moodEmoji: {
    fontSize: 30,
  },
  sectionContainer: {
    marginBottom: 20, // Replaced marginTop with marginBottom for better spacing
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: '5%',
    marginBottom: 15,
    color: '#333',
  },
  carouselCard: {
    width: CARD_WIDTH,
    height: 150,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  carouselCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  carouselCardExcerpt: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D3D3D3',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#4c669f',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  insightCard: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#E0F7FA',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  insightText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#006064',
    textAlign: 'center',
    lineHeight: 24,
  },
});