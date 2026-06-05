import * as SecureStore from 'expo-secure-store';
import { Detection } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';

async function getApiKey(): Promise<string> {
  return (await SecureStore.getItemAsync('anthropic_key')) ?? '';
}

async function callClaude(
  model: string,
  maxTokens: number,
  base64Image: string,
  text: string,
): Promise<string> {
  const apiKey = await getApiKey();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '') as string;
}

export async function identifyObject(base64Image: string): Promise<string> {
  const reply = await callClaude(
    'claude-sonnet-4-6',
    64,
    base64Image,
    'What is the main object in this photo? Reply with 1-3 words only, be specific (e.g. "red apple", "coffee mug", "tabby cat"). Just the object name, nothing else.',
  );
  return reply.trim().toLowerCase();
}

export async function detectObjects(
  base64Image: string,
  targetClass: string,
): Promise<Detection[]> {
  let reply: string;
  try {
    reply = await callClaude(
      'claude-haiku-4-5-20251001',
      256,
      base64Image,
      `Find every visible instance of "${targetClass}" in this image. For each one provide the bounding box as normalized coordinates (0=left/top, 1=right/bottom). Reply with ONLY a JSON array: [{"x":0.5,"y":0.5,"w":0.2,"h":0.3}] where x,y is center and w,h are dimensions. If none found reply with: []`,
    );
  } catch {
    return [];
  }

  try {
    const match = reply.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]) as Detection[];
  } catch {
    // fall through
  }
  return [];
}
