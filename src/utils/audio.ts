// Gemini Live API Streaming Transcription and Audio Utilities
import { GoogleGenAI, Modality } from '@google/genai';

// Cache ephemeral token to eliminate handshake latency on button tap
let cachedLiveToken: string | null = null;
let tokenExpiresAt = 0;

export async function fetchLiveToken(): Promise<string> {
  const res = await fetch('/storybook/api/live-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to get live token (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!data.token) {
    throw new Error(data.error || 'Server did not return a live token');
  }
  return data.token;
}

export async function prefetchLiveToken(): Promise<void> {
  try {
    const token = await fetchLiveToken();
    cachedLiveToken = token;
    tokenExpiresAt = Date.now() + 4 * 60 * 1000;
  } catch (err) {
    console.warn('[Live Audio] Prefetch token notice:', err);
  }
}

export async function getLiveToken(): Promise<string> {
  const now = Date.now();
  if (cachedLiveToken && now < tokenExpiresAt) {
    const t = cachedLiveToken;
    cachedLiveToken = null;
    return t;
  }
  return fetchLiveToken();
}

// Downsample Float32Array PCM from browser sampleRate to 16000Hz 16-bit signed PCM (little-endian)
export function downsampleTo16kHz(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const output = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < newLength) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const sample = count > 0 ? accum / count : (input[offsetInput] || 0);
    const clamped = Math.max(-1, Math.min(1, sample));
    output[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }

  return output;
}

// Convert Int16Array to base64 string
export function int16ToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

export class LiveAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private liveSession: any = null;

  private accumulatedText = '';
  private interimText = '';
  private isLiveConnected = false;
  private pendingChunks: string[] = [];

  public isRecording = false;

  async start({
    initialText = '',
    onTranscript,
    onAudioLevel,
    onError,
    onEnd,
  }: {
    initialText?: string;
    onTranscript: (text: string, isFinal: boolean) => void;
    onAudioLevel?: (level: number) => void;
    onError?: (err: Error) => void;
    onEnd?: () => void;
  }): Promise<boolean> {
    try {
      this.accumulatedText = (initialText || '').trim();
      this.interimText = '';
      this.audioChunks = [];
      this.pendingChunks = [];
      this.isLiveConnected = false;

      // 1. Microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Web Audio setup for PCM streaming & level metering
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const inputSampleRate = this.audioContext.sampleRate;
      const source = this.audioContext.createMediaStreamSource(this.stream);

      // Level meter via Analyser
      if (onAudioLevel) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkLevel = () => {
          if (!this.isRecording || !this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const normalized = Math.min(1, average / 128);
          onAudioLevel(normalized);
          this.animFrameId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      }

      // 3. Audio processor for 16kHz PCM streaming (bufferSize 4096 gives ~85-92ms chunks)
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      this.silentGain = this.audioContext.createGain();
      this.silentGain.gain.value = 0;

      this.scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Backup volume calculation directly from audio buffer
        if (onAudioLevel && !this.analyser) {
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          onAudioLevel(Math.min(1, rms * 5));
        }

        const pcm16 = downsampleTo16kHz(inputData, inputSampleRate);
        if (pcm16.length === 0) return;
        const base64Chunk = int16ToBase64(pcm16);

        if (this.liveSession && this.isLiveConnected) {
          // Flush any startup buffered chunks
          if (this.pendingChunks.length > 0) {
            for (const pending of this.pendingChunks) {
              try {
                this.liveSession.sendRealtimeInput({
                  audio: { data: pending, mimeType: 'audio/pcm;rate=16000' },
                });
              } catch (_) {}
            }
            this.pendingChunks = [];
          }

          try {
            this.liveSession.sendRealtimeInput({
              audio: {
                data: base64Chunk,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (sendErr) {
            console.warn('[Live Audio] sendRealtimeInput error:', sendErr);
          }
        } else {
          // Buffer initial audio chunks during WebSocket handshake (up to 3 seconds)
          if (this.pendingChunks.length < 35) {
            this.pendingChunks.push(base64Chunk);
          }
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.silentGain);
      this.silentGain.connect(this.audioContext.destination);

      // 4. Parallel MediaRecorder for fallback and audio payload archiving
      try {
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg;codecs=opus',
          '',
        ];
        const supportedMime = mimeTypes.find((m) => !m || MediaRecorder.isTypeSupported(m)) || '';

        this.mediaRecorder = new MediaRecorder(
          this.stream,
          supportedMime ? { mimeType: supportedMime } : undefined
        );
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(250);
      } catch (recErr) {
        console.warn('[Live Audio] MediaRecorder init notice:', recErr);
      }

      this.isRecording = true;

      // 5. Connect to Gemini Live API with ephemeral token
      try {
        const token = await getLiveToken();
        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: 'v1alpha' },
        });

        const session = await ai.live.connect({
          model: 'gemini-3.5-transcribe-live',
          config: {
            responseModalities: [Modality.TEXT],
            inputAudioTranscription: {
              languageCodes: [],
            },
          },
          callbacks: {
            onopen: () => {
              console.log('[Live Audio] Connected to Gemini Live Transcription session');
              this.isLiveConnected = true;
            },
            onmessage: (msg: any) => {
              const content = msg?.serverContent || msg?.server_content;
              if (!content) return;

              // Interim hypothesis (streaming live updates)
              const interim = content.interimInputTranscription?.text ?? content.interim_input_transcription?.text;
              if (typeof interim === 'string') {
                this.interimText = interim.trim();
                const combined = [this.accumulatedText, this.interimText].filter(Boolean).join(' ').trim();
                if (combined) {
                  onTranscript(combined, false);
                }
              }

              // Finalized segment
              const finalSegment = content.inputTranscription?.text ?? content.input_transcription?.text;
              if (typeof finalSegment === 'string' && finalSegment.trim()) {
                this.accumulatedText = [this.accumulatedText, finalSegment.trim()].filter(Boolean).join(' ').trim();
                this.interimText = '';
                onTranscript(this.accumulatedText, true);
              }
            },
            onerror: (err: any) => {
              console.warn('[Live Audio] Gemini Live transcription error:', err);
            },
            onclose: (close: any) => {
              console.log('[Live Audio] Gemini Live session closed:', close?.code, close?.reason);
              this.isLiveConnected = false;
              if (onEnd) onEnd();
            },
          },
        });

        this.liveSession = session;
        this.isLiveConnected = true;

        // Immediately flush any startup buffered chunks
        if (this.pendingChunks.length > 0 && this.isRecording) {
          for (const pending of this.pendingChunks) {
            try {
              this.liveSession.sendRealtimeInput({
                audio: { data: pending, mimeType: 'audio/pcm;rate=16000' },
              });
            } catch (_) {}
          }
          this.pendingChunks = [];
        }
      } catch (liveErr) {
        console.warn('[Live Audio] Gemini Live connection failed, will use server transcription fallback:', liveErr);
      }

      return true;
    } catch (err: any) {
      console.error('Failed to access microphone or start live session:', err);
      if (onError) onError(err);
      return false;
    }
  }

  async stop(): Promise<{
    transcript: string;
    audioBlob: Blob | null;
    base64Audio: string | null;
    mimeType: string;
  }> {
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // 1. Signal audio stream end to Gemini Live session
    if (this.liveSession && this.isLiveConnected) {
      try {
        this.liveSession.sendRealtimeInput({ audioStreamEnd: true });
        // Allow a brief grace period (250ms) for final transcription packet
        await new Promise((r) => setTimeout(r, 250));
      } catch (endErr) {
        console.warn('[Live Audio] send audioStreamEnd error:', endErr);
      }
    }

    // 2. Disconnect and close audio processing nodes
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (_) {}
      this.scriptProcessor = null;
    }

    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch (_) {}
      this.silentGain = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }

    // 3. Close live session
    if (this.liveSession) {
      try {
        this.liveSession.close();
      } catch (_) {}
      this.liveSession = null;
    }
    this.isLiveConnected = false;
    this.pendingChunks = [];

    // 4. Resolve final transcript (merging accumulated text and any trailing interim)
    let finalTranscript = [this.accumulatedText, this.interimText].filter(Boolean).join(' ').trim();

    // 5. Finalize MediaRecorder payload
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanStream();
        resolve({
          transcript: finalTranscript,
          audioBlob: null,
          base64Audio: null,
          mimeType: '',
        });
        return;
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanStream();

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const resultStr = reader.result as string;
            const base64Audio = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;

            // If Live API produced no transcript at all, fallback to server transcription endpoint
            if (!finalTranscript && base64Audio) {
              try {
                const fallbackText = await transcribeAudioWithServer(base64Audio, mimeType);
                if (fallbackText) {
                  finalTranscript = fallbackText;
                }
              } catch (_) {}
            }

            resolve({
              transcript: finalTranscript,
              audioBlob,
              base64Audio,
              mimeType,
            });
          };
          reader.readAsDataURL(audioBlob);
        } catch (e) {
          resolve({
            transcript: finalTranscript,
            audioBlob,
            base64Audio: null,
            mimeType,
          });
        }
      };

      try {
        if (typeof this.mediaRecorder.requestData === 'function' && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.requestData();
        }
      } catch (_) {}

      this.mediaRecorder.stop();
    });
  }

  private cleanStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

// Server-side audio transcription helper via Gemini 3.8 Flash (fallback)
export async function transcribeAudioWithServer(
  audioBase64: string,
  mimeType: string = 'audio/webm'
): Promise<string> {
  if (!audioBase64) return '';
  try {
    const res = await fetch('/storybook/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        audioMimeType: mimeType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return (data.text || '').trim();
    }
  } catch (err) {
    console.warn('[Audio] Server audio transcription failed:', err);
  }
  return '';
}

// Text-to-Speech playback helper (Gemini TTS with Web Speech fallback)
export async function speakText(
  text: string,
  ageGroup: string = 'early-reader',
  onEnd?: () => void
): Promise<() => void> {
  let isCancelled = false;
  let activeAudio: HTMLAudioElement | null = null;

  // Try server-side Gemini 3.8 Flash TTS first
  try {
    const res = await fetch('/storybook/api/read-aloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ageGroup }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioData && !isCancelled) {
        const audio = new Audio(data.audioData);
        activeAudio = audio;
        audio.onended = () => {
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          fallbackSpeechSynthesis();
        };
        await audio.play().catch(() => fallbackSpeechSynthesis());
        return () => {
          isCancelled = true;
          if (activeAudio) {
            activeAudio.pause();
            activeAudio.src = '';
          }
        };
      }
    }
  } catch (err) {
    console.warn('[Audio] Server TTS failed, falling back to Web Speech:', err);
  }

  // Fallback to browser SpeechSynthesis
  return fallbackSpeechSynthesis();

  function fallbackSpeechSynthesis(): () => void {
    if (isCancelled || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return () => {};
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Google US English'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
    return () => {
      window.speechSynthesis.cancel();
    };
  }
}
