export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface STTProvider {
  startListening(onResult: (result: STTResult) => void, onError: (error: string) => void): void;
  stopListening(): void;
  isSupported(): boolean;
}
