/**
 * Phi-2 Prompt Generator
 *
 * Generates prompts formatted for Microsoft Phi-2 model using the test cases.
 * Phi-2 uses a simple "Instruct: / Output:" format.
 *
 * Usage:
 *   npx tsx phi2-prompts.ts              # Print all prompts
 *   npx tsx phi2-prompts.ts --case TC001 # Print specific case
 *   npx tsx phi2-prompts.ts --save       # Save prompts to file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface TestInput {
  content: string;
  mood: string;
  context: Array<{
    id: string;
    content: string;
    mood: string;
    created_at: string;
  }>;
}

interface TestCase {
  id: string;
  name: string;
  category: string;
  input: TestInput;
}

// ============================================================================
// Phi-2 Prompt Templates
// ============================================================================

/**
 * Phi-2 Standard Format (Instruct/Output)
 * This is the primary format that Phi-2 was trained on.
 */
function buildPhi2Instruct(input: TestInput): string {
  const contextStr = input.context.length > 0
    ? `\n\nPrevious journal entries for context:\n${input.context.map(c =>
        `[${c.created_at}] Mood: ${c.mood}\n${c.content}`
      ).join('\n\n')}`
    : '';

  return `Instruct: You are a compassionate journal companion. Analyze the following journal entry and provide supportive insights. Respond with a valid JSON object containing these fields:
- "summary": A brief 2-3 sentence summary of the entry
- "lesson": A key insight or lesson from this entry
- "moodAnalysis": Analysis of the emotional state expressed
- "reflectionPrompt": A thoughtful question ending with ? to encourage reflection

Journal Entry: "${input.content}"
Current Mood: ${input.mood}${contextStr}

Respond with only the JSON object, no other text.
Output: {`;
}

/**
 * Phi-2 QA Format
 * Alternative format using question/answer style
 */
function buildPhi2QA(input: TestInput): string {
  const contextStr = input.context.length > 0
    ? ` Context from previous entries: ${input.context.map(c => c.content.substring(0, 100)).join(' | ')}`
    : '';

  return `Question: Analyze this journal entry and return JSON with summary, lesson, moodAnalysis, and reflectionPrompt fields. Entry: "${input.content}" Mood: ${input.mood}${contextStr}
Answer: {`;
}

/**
 * Phi-2 Chat Format
 * Uses a conversational approach
 */
function buildPhi2Chat(input: TestInput): string {
  const contextStr = input.context.length > 0
    ? `\n\nFor context, here are recent entries:\n${input.context.map(c =>
        `- ${c.mood} ${c.content.substring(0, 100)}...`
      ).join('\n')}`
    : '';

  return `Alice: Can you analyze my journal entry and give me insights?

Bob: Of course! Please share your entry.

Alice: Here it is: "${input.content}"
My mood is ${input.mood}.${contextStr}

I need the response as JSON with: summary, lesson, moodAnalysis, reflectionPrompt

Bob: Here's my analysis:
{`;
}

/**
 * Phi-2 Code-style Format
 * Structured like code documentation, which Phi-2 handles well
 */
function buildPhi2Code(input: TestInput): string {
  const contextEntries = input.context.length > 0
    ? input.context.map(c => `  { mood: "${c.mood}", content: "${c.content.substring(0, 80)}..." }`).join(',\n')
    : '  // No previous context';

  return `"""
Journal Entry Analysis Task

Input:
  entry: "${input.content}"
  mood: "${input.mood}"
  context: [
${contextEntries}
  ]

Output Format:
  {
    "summary": "2-3 sentence summary",
    "lesson": "key insight",
    "moodAnalysis": "emotional analysis",
    "reflectionPrompt": "question ending with ?"
  }

Generate the JSON output:
"""
{`;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  let specificCase: string | null = null;
  let saveToFile = false;
  let format: 'instruct' | 'qa' | 'chat' | 'code' | 'all' = 'instruct';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--case':
        specificCase = args[++i];
        break;
      case '--save':
        saveToFile = true;
        break;
      case '--format':
        format = args[++i] as any;
        break;
      case '--help':
        console.log(`
Phi-2 Prompt Generator

Usage:
  npx tsx phi2-prompts.ts [options]

Options:
  --case <id>      Generate prompt for specific test case (e.g., TC001)
  --format <type>  Prompt format: instruct (default), qa, chat, code, all
  --save           Save prompts to phi2-prompts-output.json
  --help           Show this help

Examples:
  npx tsx phi2-prompts.ts                      # All prompts, instruct format
  npx tsx phi2-prompts.ts --case TC001         # Single case
  npx tsx phi2-prompts.ts --format all --save  # All formats, save to file
        `);
        process.exit(0);
    }
  }

  // Load test cases
  const testCasesPath = path.join(__dirname, 'testCases.json');
  const testData = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
  let testCases: TestCase[] = testData.testCases;

  // Filter if specific case requested
  if (specificCase) {
    testCases = testCases.filter(tc => tc.id === specificCase);
    if (testCases.length === 0) {
      console.error(`Test case not found: ${specificCase}`);
      process.exit(1);
    }
  }

  // Generate prompts
  const output: Array<{
    id: string;
    name: string;
    category: string;
    input: TestInput;
    prompts: {
      instruct?: string;
      qa?: string;
      chat?: string;
      code?: string;
    };
  }> = [];

  for (const testCase of testCases) {
    const prompts: any = {};

    if (format === 'all' || format === 'instruct') {
      prompts.instruct = buildPhi2Instruct(testCase.input);
    }
    if (format === 'all' || format === 'qa') {
      prompts.qa = buildPhi2QA(testCase.input);
    }
    if (format === 'all' || format === 'chat') {
      prompts.chat = buildPhi2Chat(testCase.input);
    }
    if (format === 'all' || format === 'code') {
      prompts.code = buildPhi2Code(testCase.input);
    }

    output.push({
      id: testCase.id,
      name: testCase.name,
      category: testCase.category,
      input: testCase.input,
      prompts,
    });
  }

  // Output results
  if (saveToFile) {
    const outputPath = path.join(__dirname, 'phi2-prompts-output.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Saved ${output.length} prompts to: ${outputPath}`);
  } else {
    // Print to console
    for (const item of output) {
      console.log('\n' + '='.repeat(80));
      console.log(`${item.id}: ${item.name} (${item.category})`);
      console.log('='.repeat(80));
      console.log(`\nOriginal Entry: "${item.input.content}"`);
      console.log(`Mood: ${item.input.mood}`);
      if (item.input.context.length > 0) {
        console.log(`Context: ${item.input.context.length} previous entries`);
      }

      for (const [formatName, prompt] of Object.entries(item.prompts)) {
        console.log(`\n--- ${formatName.toUpperCase()} FORMAT ---`);
        console.log(prompt);
      }
    }
  }

  // Print summary
  console.log('\n' + '-'.repeat(80));
  console.log(`Generated ${output.length} prompts in ${format === 'all' ? '4 formats' : format + ' format'}`);
  console.log('-'.repeat(80));

  // Print Phi-2 model info
  console.log(`
PHI-2 MODEL INFO:
  HuggingFace: microsoft/phi-2
  GGUF: https://huggingface.co/TheBloke/phi-2-GGUF
  Recommended: phi-2.Q4_K_M.gguf (~1.6GB)

To test with the benchmark:
  npx tsx benchmark.ts --url "https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf" --name "Phi-2"
`);
}

main();
