/**
 * ModelTester - In-app component for testing AI models
 *
 * This component allows running test cases against different models
 * and viewing the results directly in the app.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  AVAILABLE_MODELS,
  getCurrentModel,
  setCurrentModel,
  generateInsights,
  ModelType,
  EntryInsights,
} from '../services/modelProvider';
import { colors } from '../utils/theme';
import testCases from '../tests/fixtures/testCases.json';

interface TestResult {
  testCaseId: string;
  testCaseName: string;
  passed: boolean;
  score: number;
  maxScore: number;
  output: EntryInsights | null;
  error?: string;
  executionTimeMs: number;
}

interface ModelResults {
  modelId: ModelType;
  modelName: string;
  results: TestResult[];
  avgScore: number;
  passRate: number;
  totalTime: number;
}

interface ModelTesterProps {
  visible: boolean;
  onClose: () => void;
}

const scoreOutput = (
  output: EntryInsights,
  groundTruth: any
): { score: number; maxScore: number; passed: boolean } => {
  let score = 0;
  const maxScore = 28; // 7 points per field x 4 fields

  // Score summary
  if (output.summary && output.summary.length > 0) {
    score += 2; // Has content
    if (groundTruth.summary.mustContain) {
      const matches = groundTruth.summary.mustContain.filter((kw: string) =>
        output.summary.toLowerCase().includes(kw.toLowerCase())
      );
      score += (matches.length / groundTruth.summary.mustContain.length) * 3;
    } else {
      score += 2;
    }
    score += 2; // Format
  }

  // Score lesson
  if (output.lesson && output.lesson.length > 0) {
    score += 2;
    if (groundTruth.lesson.themes) {
      const found = groundTruth.lesson.themes.some((theme: string) =>
        output.lesson.toLowerCase().includes(theme.toLowerCase().split(' ')[0])
      );
      score += found ? 3 : 1;
    } else {
      score += 2;
    }
    score += 2;
  }

  // Score moodAnalysis
  if (output.moodAnalysis && output.moodAnalysis.length > 0) {
    score += 2;
    if (groundTruth.moodAnalysis.emotions) {
      const found = groundTruth.moodAnalysis.emotions.some((emotion: string) =>
        output.moodAnalysis.toLowerCase().includes(emotion.toLowerCase())
      );
      score += found ? 3 : 1;
    } else {
      score += 2;
    }
    score += 2;
  }

  // Score reflectionPrompt
  if (output.reflectionPrompt && output.reflectionPrompt.length > 0) {
    score += 2;
    const hasQuestion = output.reflectionPrompt.includes('?');
    score += hasQuestion ? 3 : 1;
    score += 2;
  }

  const passed = score >= maxScore * 0.6;
  return { score: Math.round(score * 10) / 10, maxScore, passed };
};

export const ModelTester: React.FC<ModelTesterProps> = ({ visible, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [results, setResults] = useState<ModelResults[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelType[]>(['qwen', 'mock']);
  const [expandedModel, setExpandedModel] = useState<ModelType | null>(null);

  const toggleModel = (model: ModelType) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const originalModel = getCurrentModel();
    const allResults: ModelResults[] = [];

    for (const modelId of selectedModels) {
      setCurrentModel(modelId);
      const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
      const modelResults: TestResult[] = [];
      let totalTime = 0;

      for (const testCase of (testCases as any).testCases) {
        setCurrentTest(`${modelId}: ${testCase.id}`);

        const startTime = Date.now();
        try {
          const output = await generateInsights(
            testCase.input.content,
            testCase.input.mood,
            testCase.input.context || []
          );

          const { score, maxScore, passed } = scoreOutput(output, testCase.groundTruth);
          const executionTime = Date.now() - startTime;
          totalTime += executionTime;

          modelResults.push({
            testCaseId: testCase.id,
            testCaseName: testCase.name,
            passed,
            score,
            maxScore,
            output,
            executionTimeMs: executionTime,
          });
        } catch (error: any) {
          modelResults.push({
            testCaseId: testCase.id,
            testCaseName: testCase.name,
            passed: false,
            score: 0,
            maxScore: 28,
            output: null,
            error: error.message,
            executionTimeMs: Date.now() - startTime,
          });
        }
      }

      const avgScore =
        modelResults.reduce((sum, r) => sum + r.score, 0) / modelResults.length;
      const passRate =
        modelResults.filter((r) => r.passed).length / modelResults.length;

      allResults.push({
        modelId: modelId as ModelType,
        modelName: modelConfig?.name || modelId,
        results: modelResults,
        avgScore: Math.round(avgScore * 10) / 10,
        passRate: Math.round(passRate * 100),
        totalTime,
      });
    }

    setCurrentModel(originalModel);
    setResults(allResults);
    setCurrentTest(null);
    setIsRunning(false);
  };

  const getBestModel = (): ModelResults | null => {
    if (results.length === 0) return null;
    return results.reduce((best, current) =>
      current.avgScore > best.avgScore ? current : best
    );
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
            <Text style={styles.title}>Model Tester</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Model Selection */}
            <Text style={styles.sectionTitle}>Select Models to Test</Text>
            <View style={styles.modelSelection}>
              {AVAILABLE_MODELS.filter((m) => m.isAvailable).map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelChip,
                    selectedModels.includes(model.id) && styles.modelChipSelected,
                  ]}
                  onPress={() => toggleModel(model.id)}
                  disabled={isRunning}
                >
                  <Text
                    style={[
                      styles.modelChipText,
                      selectedModels.includes(model.id) && styles.modelChipTextSelected,
                    ]}
                  >
                    {model.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Run Button */}
            <TouchableOpacity
              style={[styles.runButton, isRunning && styles.runButtonDisabled]}
              onPress={runTests}
              disabled={isRunning || selectedModels.length === 0}
            >
              {isRunning ? (
                <View style={styles.runningContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.runButtonText}>
                    {currentTest ? `Testing: ${currentTest}` : 'Initializing...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.runButtonText}>
                  Run Tests ({(testCases as any).testCases.length} cases)
                </Text>
              )}
            </TouchableOpacity>

            {/* Results */}
            {results.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Results</Text>

                {/* Best Model Banner */}
                {results.length > 1 && getBestModel() && (
                  <View style={styles.bestModelBanner}>
                    <Text style={styles.bestModelText}>
                      🏆 Best Model: {getBestModel()?.modelName}
                    </Text>
                    <Text style={styles.bestModelScore}>
                      {getBestModel()?.avgScore}/28 avg ({getBestModel()?.passRate}% pass)
                    </Text>
                  </View>
                )}

                {/* Model Results */}
                {results.map((modelResult) => (
                  <View key={modelResult.modelId} style={styles.modelResult}>
                    <TouchableOpacity
                      style={styles.modelResultHeader}
                      onPress={() =>
                        setExpandedModel(
                          expandedModel === modelResult.modelId ? null : modelResult.modelId
                        )
                      }
                    >
                      <View>
                        <Text style={styles.modelResultName}>{modelResult.modelName}</Text>
                        <Text style={styles.modelResultStats}>
                          Avg: {modelResult.avgScore}/28 | Pass: {modelResult.passRate}% |
                          Time: {modelResult.totalTime}ms
                        </Text>
                      </View>
                      <Text style={styles.expandIcon}>
                        {expandedModel === modelResult.modelId ? '▼' : '▶'}
                      </Text>
                    </TouchableOpacity>

                    {expandedModel === modelResult.modelId && (
                      <View style={styles.testResults}>
                        {modelResult.results.map((test) => (
                          <View key={test.testCaseId} style={styles.testResult}>
                            <View style={styles.testHeader}>
                              <Text style={styles.testIcon}>
                                {test.passed ? '✅' : test.error ? '❌' : '⚠️'}
                              </Text>
                              <Text style={styles.testName}>{test.testCaseName}</Text>
                            </View>
                            <Text style={styles.testScore}>
                              {test.score}/{test.maxScore} ({test.executionTimeMs}ms)
                            </Text>
                            {test.error && (
                              <Text style={styles.testError}>Error: {test.error}</Text>
                            )}
                            {test.output && (
                              <View style={styles.testOutput}>
                                <Text style={styles.outputLabel}>Summary:</Text>
                                <Text style={styles.outputText} numberOfLines={2}>
                                  {test.output.summary}
                                </Text>
                                <Text style={styles.outputLabel}>Lesson:</Text>
                                <Text style={styles.outputText} numberOfLines={2}>
                                  {test.output.lesson}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  modelSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelChipSelected: {
    backgroundColor: '#e8f4fd',
    borderColor: colors.light.primary,
  },
  modelChipText: {
    fontSize: 14,
    color: '#666',
  },
  modelChipTextSelected: {
    color: colors.light.primary,
    fontWeight: '600',
  },
  runButton: {
    backgroundColor: colors.light.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  runButtonDisabled: {
    backgroundColor: '#ccc',
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  runningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bestModelBanner: {
    backgroundColor: '#fff8e1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffd54f',
  },
  bestModelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f57c00',
  },
  bestModelScore: {
    fontSize: 14,
    color: '#ff8f00',
    marginTop: 4,
  },
  modelResult: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modelResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modelResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modelResultStats: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: '#666',
  },
  testResults: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  testResult: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testIcon: {
    fontSize: 14,
  },
  testName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  testScore: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 22,
  },
  testError: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
    marginLeft: 22,
  },
  testOutput: {
    marginTop: 8,
    marginLeft: 22,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  outputLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 4,
  },
  outputText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
});

export default ModelTester;
