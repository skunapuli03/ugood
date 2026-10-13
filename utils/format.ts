import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export const formatDate = (dateString: string): string => {
  const date = parseISO(dateString);
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMM d, yyyy');
};

export const formatTime = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'h:mm a');
};

export const formatDateTime = (dateString: string): string => {
  const date = parseISO(dateString);
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy h:mm a');
};

export const formatRelativeTime = (dateString: string): string => {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatCalendarDate = (dateString: string): string => {
  return format(parseISO(dateString), 'yyyy-MM-dd');
};

export const getMoodEmoji = (mood: string): string => {
  const moodMap: Record<string, string> = {
    '😊': '😊',
    '😢': '😢',
    '😡': '😡',
    '😴': '😴',
    '😎': '😎',
    '🤔': '🤔',
    '😌': '😌',
  };
  return moodMap[mood] || '😊';
};


