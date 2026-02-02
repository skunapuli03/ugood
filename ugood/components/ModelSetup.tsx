import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from
    'react-native';
import { downloadModel, isModelDownloaded } from '../services/localLLM';

interface Props {
    onComplete: () => void;
}

export const ModelSetup: React.FC<Props> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startDownload = async () => {
        setDownloading(true);
        setError(null);

        try {
            await downloadModel(setProgress);
            onComplete();
        } catch (e: any) {
            setError(e.message);
            setDownloading(false);
        }
    };

    React.useEffect(() => {
        const checkModel = async () => {
            if (await isModelDownloaded()) {
                onComplete();
            } else {
                startDownload();
            }
        };
        checkModel();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Setting up your AI companion</Text>
            <Text style={styles.subtitle}>
                Downloading the AI model for offline use (~800MB)
            </Text>

            {downloading && (
                <>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.progress}>{Math.round(progress *
                        100)}%</Text>
                </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        padding: 20
    },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: {
        fontSize: 16, color: '#666', textAlign: 'center',
        marginBottom: 30
    },
    progress: { fontSize: 18, marginTop: 20 },
    error: { color: 'red', marginTop: 20 },
});                                                                     
