import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Test script to check Gemini API access
 * Run with: node dist/test-gemini.js
 */

async function testGeminiAPI() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ ERROR: No API key found!');
        console.error('Set GOOGLE_AI_API_KEY or GEMINI_API_KEY in your .env file');
        process.exit(1);
    }

    console.log('🔑 API Key found (length:', apiKey.length, ')');
    console.log('🔍 Testing Gemini API with new SDK (@google/generative-ai)...\n');

    const ai = new GoogleGenerativeAI(apiKey);

    // Test models
    console.log('📋 Testing models...\n');
    const models = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ];

    for (const modelName of models) {
        try {
            console.log(`🧪 Testing ${modelName}...`);
            const model = ai.getGenerativeModel({ model: modelName });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'Say hello in Portuguese' }] }]
            });

            const response = result.response.text();
            console.log(`✅ ${modelName}: ${response}\n`);
        } catch (error: any) {
            if (error.message?.includes('not found')) {
                console.log(`⚠️  ${modelName}: Model not available\n`);
            } else {
                console.error(`❌ ${modelName}: Error -`, error.message, '\n');
            }
        }
    }

    console.log('✅ Tests completed!');
}

// Run tests
testGeminiAPI()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
