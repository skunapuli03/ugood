/**
 * ModelSelector - Component for switching between AI models
 *
 * This component displays available models and allows the user
 * to select which model to use for journal analysis.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  AVAILABLE_MODELS,
  getCurrentModel,
  setCurrentModel,
  isModelDownloaded,
  downloadModel,
  ModelType,
  ModelConfig,
} from '../services/modelProvider';
import { colors } from '../utils/theme';

interface ModelSelectorProps {
  visible: boolean;
  onClose: () => void;
  onModelChange?: (model: ModelType) => void;
}

interface ModelItemProps {
  config: ModelConfig;
  isSelected: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  onSelect: () => void;
  onDownload: () => void;
}

const ModelItem: React.FC<ModelItemProps> = ({
  config,
  isSelected,
  isDownloaded,
  isDownloading,
  downloadProgress,
  onSelect,
  onDownload,
}) => {
  const canSelect = config.type === 'api' || config.type === 'mock' || isDownloaded;

  return (
    <View style={[styles.modelItem, isSelected && styles.modelItemSelected]}>
      <TouchableOpacity
        style={styles.modelInfo}
        onPress={canSelect ? onSelect : undefined}
        disabled={!canSelect}
      >
        <View style={styles.modelHeader}>
          <Text style={[styles.modelName, !canSelect && styles.modelNameDisabled]}>
            {config.name}
          </Text>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedText}>Active</Text>
            </View>
          )}
          {config.type === 'api' && (
            <View style={styles.apiBadge}>
              <Text style={styles.apiText}>API</Text>
            </View>
          )}
          {config.type === 'local' && (
            <View style={styles.localBadge}>
              <Text style={styles.localText}>Local</Text>
            </View>
          )}
        </View>
        <Text style={styles.modelDescription}>{config.description}</Text>
      </TouchableOpacity>

      {config.type === 'local' && !isDownloaded && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <View style={styles.downloadProgress}>
              <ActivityIndicator size="small" color={colors.light.primary} />
              <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
            </View>
          ) : (
            <Text style={styles.downloadText}>Download</Text>
          )}
        </TouchableOpacity>
      )}

      {config.type === 'local' && isDownloaded && !isSelected && (
        <View style={styles.downloadedBadge}>
          <Text style={styles.downloadedText}>✓</Text>
        </View>
      )}
    </View>
  );
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  visible,
  onClose,
  onModelChange,
}) => {
  const [selectedModel, setSelectedModel] = useState<ModelType>(getCurrentModel());
  const [downloadStatus, setDownloadStatus] = useState<Record<string, boolean>>({});
  const [downloadingModel, setDownloadingModel] = useState<ModelType | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    checkDownloadStatus();
  }, [visible]);

  const checkDownloadStatus = async () => {
    const status: Record<string, boolean> = {};
    for (const model of AVAILABLE_MODELS) {
      status[model.id] = await isModelDownloaded(model.id);
    }
    setDownloadStatus(status);
  };

  const handleSelectModel = (model: ModelType) => {
    setSelectedModel(model);
    setCurrentModel(model);
    onModelChange?.(model);
  };

  const handleDownloadModel = async (model: ModelType) => {
    setDownloadingModel(model);
    setDownloadProgress(0);

    try {
      await downloadModel(model, (progress) => {
        setDownloadProgress(progress);
      });
      setDownloadStatus((prev) => ({ ...prev, [model]: true }));
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingModel(null);
      setDownloadProgress(0);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select AI Model</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose which AI model analyzes your journal entries
          </Text>

          <ScrollView style={styles.modelList}>
            {AVAILABLE_MODELS.filter((m) => m.isAvailable).map((config) => (
              <ModelItem
                key={config.id}
                config={config}
                isSelected={selectedModel === config.id}
                isDownloaded={downloadStatus[config.id] ?? false}
                isDownloading={downloadingModel === config.id}
                downloadProgress={downloadProgress}
                onSelect={() => handleSelectModel(config.id)}
                onDownload={() => handleDownloadModel(config.id)}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Local models run on your device for privacy.{'\n'}
              API models require internet connection.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#666',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modelList: {
    paddingHorizontal: 20,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginVertical: 6,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelItemSelected: {
    borderColor: colors.light.primary,
    backgroundColor: '#f0f7ff',
  },
  modelInfo: {
    flex: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modelNameDisabled: {
    color: '#999',
  },
  modelDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  selectedBadge: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  apiBadge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  apiText: {
    color: '#0066cc',
    fontSize: 11,
    fontWeight: '500',
  },
  localBadge: {
    backgroundColor: '#e8fde8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  localText: {
    color: '#006600',
    fontSize: 11,
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  downloadText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  downloadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    color: '#333',
    fontSize: 12,
  },
  downloadedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  downloadedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ModelSelector;
