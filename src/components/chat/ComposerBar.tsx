'use client';

import { useState, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useSessionStore } from '@/stores/sessionStore';
import { browserSTT } from '@/lib/providers/stt/browserSTT';

export function ComposerBar() {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const sessionId = useSessionStore((state) => state.sessionId);
  const currentState = useSessionStore((state) => state.currentState);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const isRecording = useChatStore((state) => state.isVoiceRecording);
  const setVoiceRecording = useChatStore((state) => state.setVoiceRecording);
  const isAgentTyping = useChatStore((state) => state.isAgentTyping);
  const isSendingMessage = useChatStore((state) => state.isSendingMessage);
  const isSessionClosed = currentState === 'COMPLETED' || currentState === 'ERROR';

  const handleSendText = useCallback(async () => {
    if (!textInput.trim() || !sessionId || isAgentTyping || isSendingMessage || isSessionClosed)
      return;
    await sendMessage(sessionId, textInput.trim(), 'text');
    setTextInput('');
  }, [textInput, sessionId, sendMessage, isAgentTyping, isSendingMessage, isSessionClosed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendText();
    }
  };

  const handleMicToggle = useCallback(() => {
    if (!browserSTT.isSupported()) return;

    if (isRecording) {
      browserSTT.stopListening();
      setVoiceRecording(false);
      setIsProcessing(true);
      setTimeout(() => setIsProcessing(false), 800);
    } else {
      setVoiceRecording(true);
      browserSTT.startListening(
        (result) => {
          if (
            result.isFinal &&
            sessionId &&
            !isAgentTyping &&
            !isSendingMessage &&
            !isSessionClosed
          ) {
            void sendMessage(sessionId, result.transcript, 'voice');
            setVoiceRecording(false);
            setIsProcessing(false);
          }
        },
        (error) => {
          console.error('STT Error:', error);
          setVoiceRecording(false);
          setIsProcessing(false);
        },
      );
    }
  }, [
    isRecording,
    sessionId,
    sendMessage,
    setVoiceRecording,
    isAgentTyping,
    isSendingMessage,
    isSessionClosed,
  ]);

  const isDisabled = !sessionId;
  const isComposerBusy = isAgentTyping || isSendingMessage || isSessionClosed;

  return (
    <div className="flex w-full items-center gap-2">
      {/* Mic Button */}
      <button
        type="button"
        onClick={handleMicToggle}
        disabled={isDisabled || isProcessing || isComposerBusy || !browserSTT.isSupported()}
        aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        aria-pressed={isRecording}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
          isRecording
            ? 'border-red-400/60 bg-red-500/25 text-red-300 shadow-lg shadow-red-500/10'
            : 'border-slate-700/70 bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {/* Text Input */}
      <div className="relative flex flex-1 items-center rounded-full border border-slate-700/70 bg-slate-900/70 transition-all focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/40">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? 'Listening...'
              : isSessionClosed
                ? 'Session completed. Start a new session to continue.'
                : isComposerBusy
                  ? 'AI is responding...'
                  : 'Type your response...'
          }
          disabled={isDisabled || isRecording || isComposerBusy}
          className="w-full bg-transparent py-2.5 pl-4 pr-12 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
          autoFocus
        />

        <button
          type="button"
          onClick={() => void handleSendText()}
          disabled={!textInput.trim() || isDisabled || isComposerBusy}
          className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
