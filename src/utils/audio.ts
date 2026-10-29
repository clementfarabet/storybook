// Browser speech recognition and MediaRecorder helpers

// Type definition for Web Speech API
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export class LiveAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recognition: SpeechRecognitionInstance | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private accumulatedText = '';
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

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
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.accumulatedText = (initialText || '').trim();

      // 1. Audio Level Visualizer
      if (onAudioLevel) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.audioContext = new AudioContextClass();
            if (this.audioContext.state === 'suspended') {
              await this.audioContext.resume();
            }
            const source = this.audioContext.createMediaStreamSource(this.stream);
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
        } catch (e) {
          console.warn('AudioContext level meter not available:', e);
        }
      }

      // 2. MediaRecorder for high quality audio payload
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

      this.mediaRecorder.start(250); // Slice chunks every 250ms

      // 3. Web Speech Recognition for instant live streaming feedback
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          this.recognition = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let sessionFinal = '';
            let sessionInterim = '';

            // Accumulate across all results in this session (not just resultIndex)
            for (let i = 0; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                sessionFinal += res[0].transcript + ' ';
              } else {
                sessionInterim += res[0].transcript;
              }
            }

            const combined = [this.accumulatedText, sessionFinal, sessionInterim]
              .filter(Boolean)
              .join(' ')
              .trim()
              .replace(/\s+/g, ' ');

            if (combined) {
              onTranscript(combined, false);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition notice:', event.error);
            if (event.error === 'no-speech') return; // Silence is normal
            if (['audio-capture', 'not-allowed', 'service-not-allowed', 'network'].includes(event.error)) {
              // Gracefully stop recognition so MediaRecorder + server transcription takes over
              try {
                this.recognition?.stop();
              } catch (_) {}
              this.recognition = null;
            }
          };

          recognition.onend = () => {
            // Commit any recognized text before restarting
            if (this.isRecording && this.recognition) {
              if (this.restartTimeout) clearTimeout(this.restartTimeout);
              this.restartTimeout = setTimeout(() => {
                if (this.isRecording && this.recognition) {
                  try {
                    this.recognition.start();
                  } catch (_) {}
                }
              }, 150);
            } else if (onEnd) {
              onEnd();
            }
          };

          recognition.start();
        } catch (recErr) {
          console.warn('SpeechRecognition failed to start (will rely on server transcription):', recErr);
        }
      }

      this.isRecording = true;
      return true;
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      if (onError) onError(err);
      return false;
    }
  }

  async stop(): Promise<{ audioBlob: Blob | null; base64Audio: string | null; mimeType: string }> {
    this.isRecording = false;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (_) {}
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
      this.recognition = null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanStream();
        resolve({ audioBlob: null, base64Audio: null, mimeType: '' });
        return;
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanStream();

        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            // extract base64 data after comma
            const base64Audio = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
            resolve({ audioBlob, base64Audio, mimeType });
          };
          reader.readAsDataURL(audioBlob);
        } catch (e) {
          resolve({ audioBlob, base64Audio: null, mimeType });
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

// Server-side audio transcription helper via Gemini 3.8 Flash
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
