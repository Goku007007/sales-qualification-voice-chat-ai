import type { STTProvider, STTResult } from './types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export class BrowserSTT implements STTProvider {
  private recognition: SpeechRecognitionLike | null = null;
  private onResultCallback?: (result: STTResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (this.onResultCallback) {
            const transcript = finalTranscript || interimTranscript;

            if (transcript.trim()) {
              this.onResultCallback({
                transcript: transcript.trim(),
                confidence: event.results[event.results.length - 1][0]?.confidence ?? 1,
                isFinal: !!finalTranscript,
              });
            }
          }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          console.error('Speech recognition error', event.error);
          if (this.onErrorCallback) {
            this.onErrorCallback(event.error);
          }
        };
      }
    }
  }

  startListening(onResult: (result: STTResult) => void, onError: (error: string) => void) {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser.');
      return;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Recognition start error', e);
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  isSupported() {
    return !!this.recognition;
  }
}

// Global instance
export const browserSTT = new BrowserSTT();
