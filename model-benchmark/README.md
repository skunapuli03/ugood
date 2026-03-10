# Journal AI Model Benchmark

Test and compare local AI models for journal entry analysis. No API keys required - runs entirely on your machine using the same models available in the ugood app.

## Quick Start

```bash
cd model-benchmark
npm install

# Test with default model (Qwen 2.5 1.5B)
npm run test

# Compare all built-in models
npm run test:all
```

## Built-in Models

| Model | Size | Description |
|-------|------|-------------|
| **qwen** | ~1GB | Qwen 2.5 1.5B - Good balance of speed and quality (app default) |
| **deepseek** | ~1GB | DeepSeek R1 1.5B - Reasoning-focused, good for deep analysis |
| **tinyllama** | ~670MB | TinyLlama 1.1B - Fastest, smallest, lower quality |

Models are automatically downloaded on first use.

## Commands

```bash
# Test specific models
npm run test:qwen
npm run test:deepseek
npm run test:tinyllama

# Compare all models with detailed output
npm run compare

# See all available models
npm run list-models
```

## Custom Models

Test any GGUF model from HuggingFace or other sources:

```bash
npx tsx benchmark.ts --url "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf" --name "Mistral 7B"
```

Popular models to try:
- Phi-3 Mini: Good quality, small size
- Mistral 7B: High quality, needs more RAM
- Llama 3 8B: Excellent quality, needs ~8GB RAM

## Test Cases

16 test cases covering various scenarios:

| Category | Tests | Description |
|----------|-------|-------------|
| positive | 3 | Happy, grateful, creative entries |
| negative | 3 | Stress, grief, anxiety entries |
| mixed | 2 | Bittersweet, complex emotions |
| short | 2 | Minimal input handling |
| long | 1 | Detailed reflections |
| context | 2 | Entries with past context |
| edge | 3 | Neutral, self-improvement |

## Scoring System

Each model output is scored on 4 fields (10 points each, 40 total):

- **Summary** - Accuracy of entry summary
- **Lesson** - Quality of insight/lesson
- **Mood Analysis** - Emotional understanding
- **Reflection Prompt** - Thoughtfulness of question

Scoring criteria:
- Must contain expected keywords
- Match expected sentiment (positive/negative/mixed)
- Include relevant emotions/themes
- Proper format (questions end with ?)

**Pass threshold: 60%**

## Output

```
================================================================================
  JOURNAL AI MODEL BENCHMARK - LOCAL MODELS
================================================================================

MODEL PERFORMANCE SUMMARY
--------------------------------------------------------------------------------

Model                    Avg Score   Pass Rate   Avg Time    Tests   Errors
--------------------------------------------------------------------------------
Qwen 2.5 1.5B [BEST]     72.3%       81%         2.1s        16      0
DeepSeek R1 1.5B [2nd]   68.5%       75%         2.8s        16      0
TinyLlama 1.1B [3rd]     54.2%       44%         1.2s        16      0

================================================================================
RECOMMENDATION: Qwen 2.5 1.5B
  - Average Score: 72.3%
  - Pass Rate: 81%
  - Average Response Time: 2.1s
================================================================================
```

## Adding Test Cases

Edit `testCases.json` to add new test cases:

```json
{
  "id": "TC017",
  "name": "Your Test Name",
  "category": "positive",
  "difficulty": "easy",
  "input": {
    "content": "Your journal entry text...",
    "mood": "😊",
    "context": []
  },
  "groundTruth": {
    "summary": {
      "mustContain": ["keyword1", "keyword2"],
      "expectedSentiment": "positive",
      "idealResponse": "What you expect..."
    },
    "lesson": {
      "acceptableThemes": ["theme1", "theme2"],
      "expectedTone": "positive",
      "idealResponse": "Expected lesson..."
    },
    "moodAnalysis": {
      "expectedEmotions": ["happy", "grateful"],
      "expectedSentiment": "positive",
      "idealResponse": "Expected analysis..."
    },
    "reflectionPrompt": {
      "mustBeQuestion": true,
      "acceptableThemes": ["theme1", "theme2"],
      "idealResponse": "Expected question?"
    }
  }
}
```

## Requirements

- Node.js 18+
- ~2GB free disk space for model downloads
- ~4GB RAM for running models

## Troubleshooting

**Model download fails:**
- Check your internet connection
- Try manually downloading the GGUF file and placing it in `models/`

**Out of memory:**
- Try TinyLlama first (smallest)
- Close other applications
- Use a smaller quantization (Q4_K_S instead of Q4_K_M)

**Slow performance:**
- This is normal for local models
- Consider models with GPU acceleration if you have a compatible GPU
