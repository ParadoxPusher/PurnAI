'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ActiveModes } from './ChatInterface';
import {
  Sparkles, ChevronDown, ChevronUp, Loader2, User,
  Image as ImageIcon, FlaskConical, Globe, ExternalLink, Search,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DocumentCard, { DocGenData } from './DocumentCard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ThinkingBlock({ thinking, isStreaming, modes }: { thinking: string; isStreaming?: boolean; modes?: ActiveModes }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!thinking) return null;

  const isDeep = modes?.deepResearch;

  return (
    <div className={`mb-3 border rounded-xl overflow-hidden text-sm ${
      isDeep
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-gray-800/30 border-gray-700/30'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${
          isDeep ? 'hover:bg-amber-500/10' : 'hover:bg-gray-800/40'
        }`}
      >
        <div className={`flex items-center gap-2 font-medium text-xs ${
          isDeep ? 'text-amber-400' : 'text-gray-400'
        }`}>
          {isStreaming ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isDeep ? 'bg-amber-400' : 'bg-blue-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isDeep ? 'bg-amber-500' : 'bg-blue-500'
                }`}></span>
              </span>
              {isDeep ? 'Researching deeply...' : 'Thinking...'}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isDeep ? (
                <FlaskConical size={14} className="text-amber-500" />
              ) : (
                <Sparkles size={14} className="text-gray-500" />
              )}
              {isDeep ? 'Deep research analysis' : 'Thought for a moment'}
            </div>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-gray-500" />
        ) : (
          <ChevronDown size={14} className="text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className={`px-4 py-3 text-xs whitespace-pre-wrap leading-relaxed border-t italic max-h-[400px] overflow-y-auto ${
          isDeep
            ? 'text-amber-300/60 border-amber-500/20'
            : 'text-gray-500 border-gray-700/30'
        }`}>
          {thinking}
        </div>
      )}
    </div>
  );
}

function SearchResultsBlock({ searchResults, searchStatus }: { searchResults?: any; searchStatus?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (searchStatus === 'searching') {
    return (
      <div className="mb-3 flex items-center gap-3 text-cyan-400 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
        <Search className="animate-pulse" size={16} />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">Searching the web...</span>
          <span className="text-xs text-cyan-400/60">Finding relevant sources for your query</span>
        </div>
      </div>
    );
  }

  if (searchStatus === 'error') {
    return (
      <div className="mb-3 flex items-center gap-3 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-sm">
        <Globe size={16} />
        <span>Web search encountered an error. Answering from knowledge base instead.</span>
      </div>
    );
  }

  if (!searchResults || !searchResults.results || searchResults.results.length === 0) return null;

  return (
    <div className="mb-3 border border-cyan-500/20 rounded-xl overflow-hidden bg-cyan-500/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-cyan-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 text-cyan-400 font-medium text-xs">
          <Globe size={14} />
          Found {searchResults.results.length} web sources
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-gray-500" />
        ) : (
          <ChevronDown size={14} className="text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 py-2 border-t border-cyan-500/20 space-y-2 max-h-[250px] overflow-y-auto">
          {searchResults.results.map((result: any, i: number) => (
            <a
              key={i}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-cyan-500/10 transition-colors group"
            >
              <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-cyan-300 group-hover:text-cyan-200 truncate">
                  {result.title}
                </p>
                {result.snippet && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                    {result.snippet}
                  </p>
                )}
                <p className="text-[10px] text-gray-600 mt-0.5 truncate flex items-center gap-1">
                  <ExternalLink size={9} />
                  {result.url}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function extractDocGen(content: string): {
  cleanContent: string;
  docData: DocGenData | null;
  isGenerating: boolean;
} {
  if (!content) return { cleanContent: '', docData: null, isGenerating: false };

  const matchStart = content.indexOf('```json doc-gen');
  if (matchStart === -1) return { cleanContent: content, docData: null, isGenerating: false };

  const matchEnd = content.indexOf('```', matchStart + 15);

  if (matchEnd === -1) {
    const cleanContent = content.substring(0, matchStart).trim();
    return { cleanContent, docData: null, isGenerating: true };
  }

  const jsonStr = content.substring(matchStart + 15, matchEnd).trim();
  let parsed = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse doc-gen block');
  }

  const cleanContent = (content.substring(0, matchStart) + content.substring(matchEnd + 3)).trim();
  return { cleanContent, docData: parsed, isGenerating: false };
}

function extractImageGen(content: string): { cleanContent: string; imagePrompt: string | null } {
  if (!content) return { cleanContent: '', imagePrompt: null };

  const matchStart = content.indexOf('```json image-gen');
  if (matchStart === -1) return { cleanContent: content, imagePrompt: null };

  const matchEnd = content.indexOf('```', matchStart + 17);
  if (matchEnd === -1) return { cleanContent: content.substring(0, matchStart).trim(), imagePrompt: null };

  const jsonStr = content.substring(matchStart + 17, matchEnd).trim();
  let prompt = null;
  try {
    const parsed = JSON.parse(jsonStr);
    prompt = parsed.prompt;
  } catch {
    // ignore
  }

  const cleanContent = (content.substring(0, matchStart) + content.substring(matchEnd + 3)).trim();
  return { cleanContent, imagePrompt: prompt };
}

// Helper to get avatar styles based on modes
function getAvatarStyles(modes?: ActiveModes) {
  const hasDeep = modes?.deepResearch;
  const hasWeb = modes?.webSearch;

  if (hasDeep && hasWeb) {
    return {
      bg: 'bg-gradient-to-br from-amber-500 via-purple-500 to-cyan-500',
      icon: <FlaskConical size={13} className="text-white" />,
    };
  }
  if (hasDeep) {
    return {
      bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      icon: <FlaskConical size={13} className="text-white" />,
    };
  }
  if (hasWeb) {
    return {
      bg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      icon: <Globe size={13} className="text-white" />,
    };
  }
  return {
    bg: 'bg-gradient-to-br from-blue-500 to-violet-600',
    icon: <Sparkles size={14} className="text-white" />,
  };
}

export default function MessageList({ messages }: { messages: Message[] }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col space-y-6 w-full pb-4">
      {messages.map((message) => {
        const { cleanContent, docData, isGenerating } = extractDocGen(message.content);
        const { cleanContent: finalContent } = extractImageGen(cleanContent);
        const avatarInfo = getAvatarStyles(message.modes);

        return (
          <div
            key={message.id}
            className={cn(
              'flex w-full animate-in fade-in duration-300',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'flex gap-3 max-w-[90%] sm:max-w-[80%]',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {message.role === 'assistant' ? (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${avatarInfo.bg}`}>
                    {avatarInfo.icon}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
                    <User size={14} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col space-y-1 min-w-0 flex-1">
                {/* Role label with mode badges */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-400">
                    {message.role === 'assistant' ? 'Purn AI' : 'You'}
                  </span>
                  {message.role === 'user' && message.modes?.deepResearch && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400">
                      Deep Research
                    </span>
                  )}
                  {message.role === 'user' && message.modes?.webSearch && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400">
                      Web Search
                    </span>
                  )}
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {message.attachments.map((file, i) =>
                      file.isImage && file.base64 ? (
                        <img
                          key={i}
                          src={file.base64}
                          alt={file.name}
                          className="max-w-[200px] max-h-[200px] rounded-xl border border-gray-700 object-cover"
                        />
                      ) : (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs"
                        >
                          <span className="text-gray-300">{file.name}</span>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Web search results (shown before thinking) */}
                {message.role === 'assistant' && (message.searchStatus || message.searchResults) && (
                  <SearchResultsBlock
                    searchResults={message.searchResults}
                    searchStatus={message.searchStatus}
                  />
                )}

                {/* Thinking block */}
                {message.role === 'assistant' && message.thinking && (
                  <ThinkingBlock
                    thinking={message.thinking}
                    isStreaming={message.isStreaming && !message.content}
                    modes={message.modes}
                  />
                )}

                {/* Message content */}
                {finalContent && (
                  <div
                    className={cn(
                      'text-[15px] leading-relaxed',
                      message.role === 'user'
                        ? 'bg-[#2F2F2F] rounded-2xl rounded-tr-sm px-4 py-3 text-gray-100'
                        : 'prose prose-invert prose-sm max-w-full prose-p:leading-relaxed prose-pre:rounded-xl prose-pre:bg-[#1A1A1C] prose-pre:border prose-pre:border-gray-800 break-words overflow-x-auto'
                    )}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{finalContent}</p>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {finalContent}
                      </ReactMarkdown>
                    )}
                  </div>
                )}

                {/* Generated image */}
                {message.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={message.imageUrl}
                      alt="Generated image"
                      className="max-w-full max-h-[400px] rounded-xl border border-gray-700 shadow-lg"
                    />
                    <div className="flex gap-2 mt-2">
                      <a
                        href={message.imageUrl}
                        download="generated-image.png"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300 transition-colors"
                      >
                        <ImageIcon size={12} />
                        Download Image
                      </a>
                    </div>
                  </div>
                )}

                {/* Document generation progress */}
                {isGenerating && (
                  <div className="flex items-center gap-3 mt-2 text-blue-400 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="font-medium text-sm">Building document...</span>
                  </div>
                )}

                {/* Document card */}
                {docData && <DocumentCard data={docData} />}

                {/* Loading dots */}
                {!message.content && message.isStreaming && !message.thinking && !message.searchStatus && (
                  <div className="flex items-center h-6 space-x-1.5 opacity-60">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
