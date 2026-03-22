'use client';

import React, { useState, useRef, useCallback } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import Sidebar from './Sidebar';
import WelcomeScreen from './WelcomeScreen';
import { Menu, X } from 'lucide-react';

export type ActiveModes = {
  deepResearch: boolean;
  webSearch: boolean;
};

export type UploadedFile = {
  name: string;
  type: string;
  base64: string;
  isImage: boolean;
  size: number;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  isStreaming?: boolean;
  attachments?: UploadedFile[];
  imageUrl?: string;
  modes?: ActiveModes;
  searchResults?: any;
  searchStatus?: 'searching' | 'done' | 'error';
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [activeModes, setActiveModes] = useState<ActiveModes>({ deepResearch: false, webSearch: false });
  const abortControllerRef = useRef<AbortController | null>(null);

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const createNewSession = useCallback((title: string = 'New Chat'): string => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, []);

  const updateSessionMessages = useCallback((sessionId: string, updater: (msgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, messages: updater(s.messages) } : s
    ));
  }, []);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title } : s
    ));
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  const parseStreamResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    sessionId: string,
    messageId: string,
  ) => {
    const decoder = new TextDecoder();
    let done = false;
    let assistantContent = '';
    let thinkingContent = '';
    let lineBuffer = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        lineBuffer += decoder.decode(value, { stream: true });

        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta;
              if (delta) {
                let updated = false;
                const reasoning = delta.reasoning_content || delta.reasoning;
                if (reasoning) {
                  thinkingContent += reasoning;
                  updated = true;
                }
                if (delta.content) {
                  assistantContent += delta.content;
                  updated = true;
                }
                if (updated) {
                  updateSessionMessages(sessionId, msgs =>
                    msgs.map(m =>
                      m.id === messageId
                        ? { ...m, content: assistantContent, thinking: thinkingContent, isStreaming: true }
                        : m
                    )
                  );
                }
              }
            } catch {
              // partial chunk
            }
          }
        }
      }
    }

    if (lineBuffer.trim()) {
      const trimmed = lineBuffer.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data.choices?.[0]?.delta;
          if (delta) {
            const reasoning = delta.reasoning_content || delta.reasoning;
            if (reasoning) thinkingContent += reasoning;
            if (delta.content) assistantContent += delta.content;
            updateSessionMessages(sessionId, msgs =>
              msgs.map(m =>
                m.id === messageId
                  ? { ...m, content: assistantContent, thinking: thinkingContent, isStreaming: true }
                  : m
              )
            );
          }
        } catch { /* ignore */ }
      }
    }

    return { assistantContent, thinkingContent };
  };

  const handleImageGeneration = async (prompt: string, sessionId: string, messageId: string) => {
    updateSessionMessages(sessionId, msgs =>
      msgs.map(m =>
        m.id === messageId
          ? { ...m, content: 'Generating image... This may take a moment.', isStreaming: true }
          : m
      )
    );

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error(`Image generation failed: ${response.status}`);

      const data = await response.json();

      updateSessionMessages(sessionId, msgs =>
        msgs.map(m =>
          m.id === messageId
            ? { ...m, content: `Here's the generated image for: "${prompt}"`, imageUrl: data.image, isStreaming: false }
            : m
        )
      );

      return data;
    } catch (error: any) {
      updateSessionMessages(sessionId, msgs =>
        msgs.map(m =>
          m.id === messageId
            ? { ...m, content: `Failed to generate image: ${error.message}. Please try again.`, isStreaming: false }
            : m
        )
      );
      return null;
    }
  };

  const performWebSearch = async (query: string): Promise<any> => {
    try {
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Web search error:', error);
      return null;
    }
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    const currentModes = { ...activeModes };

    // Determine or create session
    let sessionId = activeSessionId;
    let existingMessages: Message[] = [];

    if (!sessionId) {
      let prefix = '';
      if (currentModes.deepResearch && currentModes.webSearch) prefix = '[Research+Web] ';
      else if (currentModes.deepResearch) prefix = '[Research] ';
      else if (currentModes.webSearch) prefix = '[Web] ';
      sessionId = createNewSession(prefix + (text.slice(0, 30) || 'New Chat'));
      existingMessages = [];
    } else {
      const currentSession = sessionsRef.current.find(s => s.id === sessionId);
      existingMessages = currentSession?.messages || [];
      if (existingMessages.length === 0) {
        let prefix = '';
        if (currentModes.deepResearch && currentModes.webSearch) prefix = '[Research+Web] ';
        else if (currentModes.deepResearch) prefix = '[Research] ';
        else if (currentModes.webSearch) prefix = '[Web] ';
        updateSessionTitle(sessionId, prefix + text.slice(0, 30));
      }
    }

    // Build user message
    const currentAttachments = [...attachments];
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      modes: currentModes,
    };

    updateSessionMessages(sessionId, msgs => [...msgs, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Add placeholder assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    updateSessionMessages(sessionId, msgs => [
      ...msgs,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        thinking: '',
        isStreaming: true,
        modes: currentModes,
        searchStatus: currentModes.webSearch ? 'searching' : undefined,
      },
    ]);

    try {
      const lowerText = text.toLowerCase();
      const isImageGen = (lowerText.includes('generate') || lowerText.includes('create') || lowerText.includes('make') || lowerText.includes('draw'))
        && (lowerText.includes('image') || lowerText.includes('picture') || lowerText.includes('photo') || lowerText.includes('illustration'));
      const imageAttachment = currentAttachments.find(a => a.isImage);

      if (isImageGen && !imageAttachment && !currentModes.deepResearch && !currentModes.webSearch) {
        await handleImageGeneration(text, sessionId, assistantMessageId);
      } else if (imageAttachment && !currentModes.deepResearch && !currentModes.webSearch) {
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageAttachment.base64,
            prompt: text || 'Analyze this image in detail.',
            messages: [],
          }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        await parseStreamResponse(reader, sessionId, assistantMessageId);

        updateSessionMessages(sessionId, msgs =>
          msgs.map(m => m.id === assistantMessageId ? { ...m, isStreaming: false } : m)
        );
      } else {
        // ── Web Search: fetch results first if enabled ──
        let searchResults: any = null;

        if (currentModes.webSearch) {
          searchResults = await performWebSearch(text);

          updateSessionMessages(sessionId, msgs =>
            msgs.map(m =>
              m.id === assistantMessageId
                ? { ...m, searchResults, searchStatus: searchResults ? 'done' : 'error' }
                : m
            )
          );
        }

        // ── Build API mode string ──
        let apiMode = 'normal';
        if (currentModes.deepResearch && currentModes.webSearch) apiMode = 'deep-research+web-search';
        else if (currentModes.deepResearch) apiMode = 'deep-research';
        else if (currentModes.webSearch) apiMode = 'web-search';

        // Build message history
        const allMessages = [...existingMessages, userMessage].map(m => ({
          role: m.role,
          content: m.content,
        }));

        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
            mode: apiMode,
            searchResults,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`API error ${response.status}: ${errBody.slice(0, 200)}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const { assistantContent } = await parseStreamResponse(reader, sessionId, assistantMessageId);

        // Check for image-gen block
        const imageGenMatch = assistantContent.match(/```json image-gen\s*([\s\S]*?)```/);
        if (imageGenMatch) {
          try {
            const imageData = JSON.parse(imageGenMatch[1].trim());
            await handleImageGeneration(imageData.prompt, sessionId, assistantMessageId);
          } catch {
            updateSessionMessages(sessionId, msgs =>
              msgs.map(m => m.id === assistantMessageId ? { ...m, isStreaming: false } : m)
            );
          }
        } else {
          updateSessionMessages(sessionId, msgs =>
            msgs.map(m => m.id === assistantMessageId ? { ...m, isStreaming: false } : m)
          );
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('handleSend error:', error);
        updateSessionMessages(sessionId, msgs =>
          msgs.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: `Error: ${error.message || 'Something went wrong.'}`, isStreaming: false, searchStatus: undefined }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setInput('');
    setAttachments([]);
    setActiveModes({ deepResearch: false, webSearch: false });
  };

  const handleFeatureClick = (feature: string) => {
    if (feature === 'deep-research') {
      setActiveModes(prev => ({ ...prev, deepResearch: !prev.deepResearch }));
      return;
    }
    if (feature === 'web-search') {
      setActiveModes(prev => ({ ...prev, webSearch: !prev.webSearch }));
      return;
    }

    const prompts: Record<string, string> = {
      'ppt': 'Create a PowerPoint presentation about ',
      'document': 'Create a detailed document about ',
      'code': 'Write code for ',
      'image': 'Generate an image of ',
      'analyze': 'Analyze the uploaded image',
    };
    setInput(prompts[feature] || '');
  };

  return (
    <div className="flex h-screen bg-[#121212] text-gray-100">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={deleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center h-12 px-4 border-b border-gray-800/50 bg-[#121212] sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors mr-3"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-sm font-medium text-gray-300 truncate">
            {activeSession?.title || 'Purn AI'}
          </span>
          {activeModes.deepResearch && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Deep Research
            </span>
          )}
          {activeModes.webSearch && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              Web Search
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <WelcomeScreen onFeatureClick={handleFeatureClick} onSend={handleSend} />
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
        </main>

        <div className="w-full bg-gradient-to-t from-[#121212] via-[#121212]/95 to-transparent pt-2 pb-4">
          <div className="max-w-3xl mx-auto px-4">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              attachments={attachments}
              setAttachments={setAttachments}
              onFeatureClick={handleFeatureClick}
              activeModes={activeModes}
              setActiveModes={setActiveModes}
            />
            <p className="text-xs text-center text-gray-500 mt-2">
              Purn AI can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
