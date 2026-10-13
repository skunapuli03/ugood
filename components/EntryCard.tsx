import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/format';
import { colors, borderRadius } from '../utils/theme';
import ThreeDotMenu from './ThreeDotMenu';
import { getEntryInsights, processEntryWithAI } from '../services/aiProcessor';
import { useJournalStore } from '../store/journalStore';

// Enable layout animation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Map some common moods to dot colors (fallback to accent)
const getMoodColor = (mood: string) => {
  const m = mood.toLowerCase();
  if (m.includes('anxious') || m.includes('fearful') || m.includes('sad')) return '#D1E8CF'; // green-ish
  if (m.includes('happy') || m.includes('content') || m.includes('proud')) return '#FDF1B8'; // yellow
  if (m.includes('angry') || m.includes('annoyed')) return '#FAD7BD'; // orange
  if (m.includes('calm') || m.includes('relaxed')) return '#D6E4F0'; // blue
  return colors.light.accent; // lavender fallback
};

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  title?: string;
  mood: string;
  created_at: string;
  updated_at?: string;
}

interface EntryCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onEdit: () => void;
  onViewLesson: () => void;
  onDelete: () => void;
}

export default function EntryCard({
  entry,
  onPress,
  onEdit,
  onViewLesson,
  onDelete,
}: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [reflection, setReflection] = useState<string | null>(null);

  // Map legacy emojis to words
  const emojiToWord: Record<string, string> = {
    '😊': 'Happy',
    '😔': 'Sad',
    '😠': 'Angry',
    '😨': 'Anxious',
    '😐': 'Calm',
    '😴': 'Tired',
    '😭': 'Depressed',
    '🤔': 'Reflective',
    '🥰': 'Love',
    '😌': 'Content',
    '🚀': 'Productive',
  };

  const emotionsArray = entry.mood ? entry.mood.split(',').map(m => m.trim()) : [];
  let rawEmotion = emotionsArray.length > 0 && emotionsArray[0] ? emotionsArray[0] : 'Reflective';
  
  // Translate if it's a known emoji, otherwise capitalize the word
  if (emojiToWord[rawEmotion]) {
    rawEmotion = emojiToWord[rawEmotion];
  } else {
    rawEmotion = rawEmotion.charAt(0).toUpperCase() + rawEmotion.slice(1);
    // Strip any random remaining emojis that weren't caught
    rawEmotion = rawEmotion.replace(/[\u1000-\uFFFF]+/g, '').trim() || 'Reflective';
  }

  const primaryEmotion = rawEmotion;
  const dotColor = getMoodColor(primaryEmotion);

  const toggleExpand = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsExpanded(true);
    
    // Fetch reflection if we haven't already
    if (!reflection) {
      setIsLoadingInsight(true);
      try {
        let insights = await getEntryInsights(entry.id);
        
        // If no insights exist yet, trigger the AI process on-demand
        if (!insights) {
          const pastEntries = useJournalStore.getState().entries;
          const content = `${entry.title || 'Untitled'}\n\n${entry.content}`;
          insights = await processEntryWithAI(entry.id, content, entry.mood, entry.user_id, pastEntries);
        }

        if (insights && insights.lessons && insights.lessons.length > 0) {
          setReflection(insights.lessons[0]);
        } else if (insights && insights.summary) {
          setReflection(insights.summary);
        } else {
          setReflection("I am still processing my thoughts. Please check back in a moment.");
        }
      } catch (error: any) {
        if (error.message === 'LLM_BUSY') {
          setReflection("I'm currently reflecting on another part of your journey. I'll have this ready for you in a moment.");
        } else {
          setReflection("Failed to load reflection.");
        }
      } finally {
        setIsLoadingInsight(false);
      }
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
          
          <View style={styles.headerRight}>
            <View style={styles.moodBadge}>
              <Text style={styles.moodText}>
                {primaryEmotion}
              </Text>
              <View style={[styles.moodDot, { backgroundColor: dotColor }]} />
            </View>
            <ThreeDotMenu
              onEdit={onEdit}
              onViewLesson={onViewLesson}
              onDelete={onDelete}
            />
          </View>
        </View>

        <Text style={styles.title} numberOfLines={isExpanded ? 0 : 1}>
          {entry.title || 'Untitled Entry'}
        </Text>
        
        <Text style={styles.preview} numberOfLines={isExpanded ? 0 : 2}>
          {entry.content}
        </Text>
      </TouchableOpacity>

      {/* Expanded Reflection Section */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />
          <Text style={styles.reflectionLabel}>AI REFLECTION</Text>
          
          {isLoadingInsight ? (
            <ActivityIndicator size="small" color={colors.light.accent} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.reflectionText}>
              {reflection}
            </Text>
          )}

          <TouchableOpacity 
            style={styles.fullLessonBtn}
            onPress={onViewLesson}
          >
            <Text style={styles.fullLessonText}>Read Full AI Lesson</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.light.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Expand/Collapse Toggle Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={toggleExpand}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="rgba(61,61,61,0.2)" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: borderRadius.xxl, // 32
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(61,61,61,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodText: {
    fontSize: 12,
    color: 'rgba(61,61,61,0.5)',
    fontStyle: 'italic',
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.light.text,
    marginBottom: 6,
    // Playfair Display style
  },
  preview: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.7)',
    lineHeight: 22,
  },
  
  // Expanded Section
  expandedSection: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(61,61,61,0.05)',
    marginBottom: 16,
  },
  reflectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.light.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  reflectionText: {
    fontSize: 14,
    color: 'rgba(61,61,61,0.8)',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  fullLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(184,161,209,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullLessonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.accent,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  expandButton: {
    padding: 4,
  },
});
