#!/usr/bin/env node
import http from 'node:http';
import dns from 'node:dns';
import { GoogleGenAI } from '@google/genai';

dns.setDefaultResultOrder('ipv4first');

const PORT = Number(process.env.STORYBOOK_PORT || (process.env.PORT && process.env.PORT !== '8791' ? process.env.PORT : 8794));
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('[Storybook Server] WARNING: GEMINI_API_KEY is not set in environment.');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const TEXT_MODEL = process.env.TEXT_MODEL || 'gemini-3.8-flash';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gemini-nano-banana-2.1';
const TTS_MODEL = process.env.TTS_MODEL || 'gemini-3.8-flash-tts';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // 15MB safe limit for single audio chunks
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Age Group calibration prompt instructions
function getAgeInstructions(ageGroup) {
  switch (ageGroup) {
    case 'toddler':
      return `Target Audience: Toddlers & Preschoolers (Ages 2-4).
Style: Exactly 1 to 2 short, joyful, lyrical sentences per page with strong rhythmic cadence and natural pauses for reading aloud.
Vocabulary: Ultra-simple words, playful repetition, onomatopoeia and sound words (e.g. 'swish', 'hop-hop', 'beep-beep'), warm and reassuring tone.
Emotional Safety: Ensure emotional safety: themes must emphasize warmth, reassurance, and joyful security. Avoid dark antagonists, physical threats, or separation anxiety.
Length: 15 to 25 words total.`;
    case 'middle-grade':
      return `Target Audience: Middle Grade Readers (Ages 8-12).
Style: 1 to 2 rich descriptive paragraphs with witty dialogue, atmospheric world details, character agency, and a compelling page-turn hook.
Vocabulary: Expressive, varied, imaginative, and immersive.
Length: 60 to 100 words.`;
    case 'ya-adult':
      return `Target Audience: Young Adults & Family (Ages 13+).
Style: 2 evocative literary paragraphs with poetic imagery, emotional resonance, and deeper world texture, scaled to fit a storybook layout.
Vocabulary: Sophisticated, literary, and evocative.
Length: 80 to 120 words.`;
    case 'early-reader':
    default:
      return `Target Audience: Early Readers (Ages 5-7).
Style: 2 to 4 lively, rhythmic sentences per page with clear dialogue, decodable vocabulary, and energetic action beats.
Vocabulary: Accessible yet vivid vocabulary, clear subject-verb structure, fun verbs, and engaging direct action.
Length: 30 to 50 words.`;
  }
}

// Audio transcription helper
async function transcribeAudio(audioBase64, mimeType = 'audio/webm') {
  console.log('[Storybook Server] Transcribing audio with Gemini...');
  const cleanMime = mimeType.split(';')[0].trim();
  const interaction = await ai.interactions.create({
    model: TEXT_MODEL,
    generation_config: {
      temperature: 0.0,
      thinking_level: 'low',
      max_output_tokens: 2048,
    },
    input: [
      {
        type: 'text',
        text: 'Transcribe this spoken narration from a child word-for-word. Return ONLY the spoken words as plain text. If there is background noise, focus strictly on the voice.',
      },
      {
        type: 'audio',
        data: audioBase64,
        mime_type: cleanMime,
      },
    ],
  });
  return interaction.output_text?.trim() || '';
}

function sanitizePageResult(obj, childNarration, pageNumber) {
  const storyText = String(obj.storyText || '').trim() || childNarration.trim() || 'A new chapter begins.';
  return {
    bookTitle: String(obj.bookTitle || 'My Storybook').trim(),
    pageTitle: String(obj.pageTitle || `Page ${pageNumber}`).trim(),
    storyText,
    illustrationPrompt: String(obj.illustrationPrompt || `${storyText}. Storybook illustration, pure visual art.`).trim(),
    characterBible: String(obj.characterBible || '').trim(),
  };
}

export function robustParseStoryResponse(rawText, childNarration = '', pageNumber = 1) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      bookTitle: 'My Storybook',
      pageTitle: `Page ${pageNumber}`,
      storyText: childNarration.trim() || 'A new chapter begins in our magical journey.',
      illustrationPrompt: `A beautiful storybook illustration depicting: ${childNarration.trim() || 'A magical adventure'}. Gentle watercolor and ink style, pure visual art.`,
      characterBible: '',
    };
  }

  // 1. Strip markdown fences anywhere in the string
  let clean = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 2. Direct JSON parse
  try {
    const direct = JSON.parse(clean);
    if (direct && typeof direct === 'object') return sanitizePageResult(direct, childNarration, pageNumber);
  } catch (_) {}

  // 3. Extract outermost { ... }
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === 'object') return sanitizePageResult(parsed, childNarration, pageNumber);
    } catch (_) {
      // 4. Sanitize unescaped newlines/tabs inside quotes and trailing commas
      try {
        const sanitized = match[0]
          .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, content) => `"${content.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t')}"`)
          .replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(sanitized);
        if (parsed && typeof parsed === 'object') return sanitizePageResult(parsed, childNarration, pageNumber);
      } catch (_) {}
    }
  }

  // 5. Robust regex field extraction fallback
  const extractField = (key) => {
    const reg = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i');
    const m = clean.match(reg);
    if (m && m[1]) {
      return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    }
    return '';
  };

  const bookTitle = extractField('bookTitle');
  const pageTitle = extractField('pageTitle') || `Page ${pageNumber}`;
  const storyText = extractField('storyText');
  const illustrationPrompt = extractField('illustrationPrompt');
  const characterBible = extractField('characterBible');

  if (storyText) {
    return {
      bookTitle: bookTitle || 'My Storybook',
      pageTitle,
      storyText,
      illustrationPrompt: illustrationPrompt || `${storyText}. Storybook illustration, pure visual art.`,
      characterBible: characterBible || '',
    };
  }

  // 6. Graceful fallback: Never crash the child's story creation experience
  console.warn('[Storybook Server] Fallback parser used for raw response:', clean.slice(0, 150));
  const fallbackText = childNarration.trim() || 'A new chapter begins in our magical journey.';
  return {
    bookTitle: 'My Storybook',
    pageTitle: `Page ${pageNumber}`,
    storyText: fallbackText,
    illustrationPrompt: `A whimsical storybook illustration depicting: ${fallbackText.slice(0, 200)}. Pure visual art, wordless picture book art.`,
    characterBible: '',
  };
}

// Generate Page Content (prose + illustration prompt)
async function craftPageProseAndPrompt({
  narration,
  ageGroup,
  theme,
  pageNumber,
  storyTitle,
  previousPages = [],
  characterBible = '',
}) {
  const ageInstructions = getAgeInstructions(ageGroup);

  // Sanitize custom theme input (SC5, WH10)
  const prohibitedKeywords = /\b(horror|gore|blood|weapon|gun|knife|kill|murder|death|dead|zombie|demon|scary|terrifying|violent|nudity|erotic|drug)\b/gi;
  let rawThemeStyle = String(theme?.visualStylePrompt || 'Children watercolor storybook illustration').slice(0, 500);
  let themeStyle = rawThemeStyle.replace(prohibitedKeywords, 'whimsical storybook').replace(/["\n\r]/g, ' ').trim();
  let rawThemeTone = String(theme?.tonePrompt || 'Warm, magical, and friendly').slice(0, 300);
  const themeTone = rawThemeTone.replace(prohibitedKeywords, 'whimsical and friendly').replace(/["\n\r]/g, ' ').trim();

  const safeTitle = String(storyTitle || '').slice(0, 150).replace(/["\n\r]/g, ' ').trim();
  const safeBible = String(characterBible || '').slice(0, 1000).replace(/["\n\r]/g, ' ').trim();
  const safeNarration = String(narration || '').slice(0, 4000).replace(/<\/?[^>]+(>|$)/g, '').trim();

  // Include previous visual prompt context to prevent character visual drift (PE5)
  const prevSummary = previousPages.length > 0
    ? previousPages.map(p => `Page ${p.pageNumber} (${p.pageTitle || 'Untitled'}):\nProse: "${p.storyText}"\nVisual Scene: "${p.illustrationPrompt || 'N/A'}"`).join('\n\n')
    : 'This is the very first page of the book.';

  const systemInstruction = `You are a master children's author and visual art director.
A child has narrated a part of their story. Your job is to transform their narration into a published-quality book page and craft the perfect illustration prompt for the page.

IMPORTANT RULES:
1. Preserve the child's imaginative core, plot points, and character names.
2. ${ageInstructions}
3. The visual style of this entire book is: "${themeStyle}".
4. The tone of the book is: "${themeTone}".
5. Ensure visual and narrative consistency with previous pages and the character bible.
6. The illustration prompt must describe the scene vividly (action, character appearance, lighting, colors, background) and explicitly command: "Style: ${themeStyle}. Pure visual storytelling, wordless picture spread."
7. If this is Page 1 and no storyTitle was provided, create a whimsical, memorable title for the whole book.
8. CHILD SAFETY & WHOLESOME TONE (PARAMOUNT): All content must be strictly gentle, positive, and safe for young children. If the child's narration contains scary, violent, or distressing themes, gently transform them into whimsical, non-threatening metaphors and imaginative problem-solving beats suitable for bedtime reading. Never include weapons, gore, death, horror, or distress. Never include private personal information (such as real full names, home addresses, phone numbers, or schools).

Return ONLY a JSON object with this exact shape:
{
  "storyTitle": "Overall title for the book (if page 1 or updating title)",
  "pageTitle": "Short subtitle or chapter header for this page, e.g. 'The Secret Whispering Tree'",
  "storyText": "The polished page prose for the book",
  "illustrationPrompt": "Detailed visual scene prompt following the theme style",
  "characterBible": "Updated concise description of key characters (appearance, clothing, colors) for future pages"
}`;

  const userPrompt = `Page Number: ${pageNumber}
Current Story Title: ${safeTitle || '(None yet, create one)'}
Previous Pages:
${prevSummary}

Existing Character Notes:
${safeBible || '(None yet)'}

Child's Spoken Narration:
<child_narration>
${safeNarration}
</child_narration>

Generate the JSON story page:`;

  const interaction = await ai.interactions.create({
    model: TEXT_MODEL,
    system_instruction: systemInstruction,
    input: userPrompt,
    response_format: { type: 'text', mime_type: 'application/json' },
    generation_config: {
      temperature: 0.7,
      thinking_level: 'low',
      max_output_tokens: 4096,
    },
  });

  const rawJson = interaction.output_text?.trim() || '';
  return robustParseStoryResponse(rawJson, safeNarration, pageNumber);
}

// Generate Image with Nano Banana 2.1 (PE2: pure visual storytelling, no negative buzzwords)
async function generateIllustration(illustrationPrompt) {
  console.log('[Storybook Server] Generating illustration with', IMAGE_MODEL, 'prompt:', illustrationPrompt.slice(0, 100) + '...');
  try {
    const interaction = await ai.interactions.create({
      model: IMAGE_MODEL,
      input: `${illustrationPrompt}. Pure visual art, clear scene composition, wordless picture book art.`,
    });
    const imageObj = interaction.output_image;
    if (imageObj && imageObj.data) {
      return {
        imageData: `data:${imageObj.mime_type || 'image/png'};base64,${imageObj.data}`,
        mimeType: imageObj.mime_type || 'image/png',
      };
    }
  } catch (err) {
    console.error('[Storybook Server] Image generation failed with', IMAGE_MODEL, ':', err.message);
  }

  // Fallback to pro image model if banana has an issue
  try {
    console.log('[Storybook Server] Retrying with gemini-3-pro-image...');
    const retryInteraction = await ai.interactions.create({
      model: 'gemini-3-pro-image',
      input: `${illustrationPrompt}. Pure visual art, wordless picture book art.`,
    });
    const retryImage = retryInteraction.output_image;
    if (retryImage && retryImage.data) {
      return {
        imageData: `data:${retryImage.mime_type || 'image/png'};base64,${retryImage.data}`,
        mimeType: retryImage.mime_type || 'image/png',
      };
    }
  } catch (retryErr) {
    console.error('[Storybook Server] Fallback image generation failed:', retryErr.message);
  }

  // Graceful fallback SVG pattern if both models fail/quota reached
  return {
    imageData: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%23f2f0ea"/><circle cx="300" cy="260" r="90" fill="%23ede9fe"/><path d="M220 380 Q300 320 380 380" stroke="%236d28d9" stroke-width="6" fill="none" stroke-linecap="round"/><text x="300" y="440" font-family="serif" font-size="22" fill="%234f4d48" text-anchor="middle">A Magical Scene Awaits</text></svg>`,
    mimeType: 'image/svg+xml',
    fallback: true,
  };
}

// Generate Speech Audio (TTS)
async function generateSpeechAudio(text, ageGroup = 'early-reader') {
  console.log('[Storybook Server] Generating TTS audio for text length:', text.length);
  try {
    const voice = ageGroup === 'toddler' ? 'achernar' : 'fenrir';
    const interaction = await ai.interactions.create({
      model: TTS_MODEL,
      input: text,
      response_modalities: ['audio'],
      generation_config: {
        speech_config: [{ voice, language: 'en-us' }],
      },
    });

    const audioObj = interaction.output_audio;
    if (audioObj && audioObj.data) {
      return {
        audioData: `data:${audioObj.mime_type || 'audio/wav'};base64,${audioObj.data}`,
        mimeType: audioObj.mime_type || 'audio/wav',
      };
    }
  } catch (err) {
    console.warn('[Storybook Server] Gemini TTS error:', err.message);
  }
  return { audioData: null, fallback: true };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Healthcheck
  if (pathname === '/storybook/api/health' || pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'storybook',
      textModel: TEXT_MODEL,
      imageModel: IMAGE_MODEL,
      ttsModel: TTS_MODEL,
      hasApiKey: !!GEMINI_API_KEY,
    });
    return;
  }

  // 1. Generate Page
  if (pathname === '/storybook/api/generate-page' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      let narration = (body.narration || '').trim();

      // If audio base64 provided and narration is empty, transcribe it first (SC4)
      if (!narration && body.audioBase64) {
        narration = await transcribeAudio(body.audioBase64, body.audioMimeType);
      }

      if (!narration) {
        sendJson(res, 400, { error: 'No narration or audio provided' });
        return;
      }

      if (narration.length > 5000) {
        narration = narration.slice(0, 5000);
      }

      const proseResult = await craftPageProseAndPrompt({
        narration,
        ageGroup: body.ageGroup || 'early-reader',
        theme: body.theme,
        pageNumber: body.pageNumber || 1,
        storyTitle: body.storyTitle || '',
        previousPages: body.previousPages || [],
        characterBible: body.characterBible || '',
      });

      const illustration = await generateIllustration(proseResult.illustrationPrompt);

      sendJson(res, 200, {
        success: true,
        storyTitle: proseResult.storyTitle || body.storyTitle || 'My Magical Story',
        page: {
          pageNumber: body.pageNumber || 1,
          pageTitle: proseResult.pageTitle || `Page ${body.pageNumber || 1}`,
          storyText: proseResult.storyText || narration,
          illustrationPrompt: proseResult.illustrationPrompt,
          imageData: illustration.imageData,
          imageMimeType: illustration.mimeType,
          originalNarration: narration,
          characterBible: proseResult.characterBible || body.characterBible || '',
        },
      });
    } catch (err) {
      console.error('[Storybook Server] generate-page error:', err);
      sendJson(res, 500, { error: err.message || 'Page generation failed' });
    }
    return;
  }

  // 2. Retheme Book (SC3: cap to 10 pages; PE4: strip old medium keywords)
  if (pathname === '/storybook/api/retheme-book' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const rawPages = body.pages || [];
      const newTheme = body.newTheme;
      const ageGroup = body.ageGroup || 'early-reader';

      if (!rawPages.length || !newTheme) {
        sendJson(res, 400, { error: 'Pages array and newTheme required' });
        return;
      }

      // Cap at 10 pages per batch request to prevent timeout and quota drainage
      const pages = rawPages.slice(0, 10);
      console.log(`[Storybook Server] Retheming ${pages.length} pages to theme: "${newTheme.name}"`);

      let rawThemeStyle = newTheme.visualStylePrompt || 'Children watercolor storybook illustration';
      const prohibitedKeywords = /\b(horror|gore|blood|weapon|gun|knife|kill|murder|death|dead|zombie|demon|scary|terrifying|violent|nudity|erotic|drug)\b/gi;
      const themeStyle = rawThemeStyle.replace(prohibitedKeywords, 'whimsical storybook').trim();

      const updatedPages = [];

      for (const p of pages) {
        // Rewrite illustration prompt for new theme style stripping old medium keywords
        const updatePromptRes = await ai.interactions.create({
          model: TEXT_MODEL,
          generation_config: {
            temperature: 0.5,
            thinking_level: 'low',
            max_output_tokens: 2048,
          },
          system_instruction: `You are an art director restyling an illustrated children's book.
Transform the existing scene description into the new visual theme: "${themeStyle}".
1. Extract only the narrative elements: character actions, expressions, objects, and setting layout.
2. Completely strip away all previous art style, medium, and rendering keywords (such as watercolor, ink, gouache, claymation, pixel art, paper texture).
3. Re-describe the entire scene using exclusively the new visual theme: "${themeStyle}".
4. Conclude with: "Pure visual storytelling, wordless picture spread."
Return ONLY the updated illustration prompt as plain text. No quotes, no markdown fences, no conversational preamble.`,
          input: `Existing scene prompt: "${p.illustrationPrompt || p.storyText}"`,
        });

        const newPrompt = updatePromptRes.output_text?.trim() || `${p.storyText}. Style: ${themeStyle}. Pure visual storytelling, wordless picture spread.`;
        const newImg = await generateIllustration(newPrompt);

        updatedPages.push({
          ...p,
          illustrationPrompt: newPrompt,
          imageData: newImg.imageData,
          imageMimeType: newImg.mimeType,
        });
      }

      sendJson(res, 200, {
        success: true,
        pages: updatedPages,
      });
    } catch (err) {
      console.error('[Storybook Server] retheme-book error:', err);
      sendJson(res, 500, { error: err.message || 'Retheming failed' });
    }
    return;
  }

  // 3. Read Aloud (TTS)
  if (pathname === '/storybook/api/read-aloud' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const text = (body.text || '').trim();
      const ageGroup = body.ageGroup || 'early-reader';

      if (!text) {
        sendJson(res, 400, { error: 'No text provided for speech' });
        return;
      }

      const speech = await generateSpeechAudio(text, ageGroup);
      sendJson(res, 200, speech);
    } catch (err) {
      console.error('[Storybook Server] read-aloud error:', err);
      sendJson(res, 500, { error: err.message || 'TTS generation failed' });
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not found' });
});

const isMain = process.argv[1] && (process.argv[1].endsWith('storybookServer.mjs') || process.argv[1].endsWith('storybookServer'));
if (isMain) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Storybook Server] Running on http://127.0.0.1:${PORT}`);
    console.log(`[Storybook Server] Text model: ${TEXT_MODEL}, Image model: ${IMAGE_MODEL}`);
  });
}
