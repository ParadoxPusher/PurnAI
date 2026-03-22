'use client';

import React, { useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Presentation,
  Code2,
  ScanSearch,
  FlaskConical,
  Globe,
} from 'lucide-react';
import { UploadedFile, ActiveModes } from './ChatInterface';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  attachments: UploadedFile[];
  setAttachments: (files: UploadedFile[]) => void;
  onFeatureClick: (feature: string) => void;
  activeModes: ActiveModes;
  setActiveModes: (modes: ActiveModes | ((prev: ActiveModes) => ActiveModes)) => void;
}

const featureButtons = [
  { id: 'image', icon: ImageIcon, label: 'Create Image', color: 'text-purple-400' },
  { id: 'document', icon: FileText, label: 'Document', color: 'text-blue-400' },
  { id: 'ppt', icon: Presentation, label: 'PPT', color: 'text-orange-400' },
  { id: 'code', icon: Code2, label: 'Code', color: 'text-green-400' },
  { id: 'analyze', icon: ScanSearch, label: 'Analyze', color: 'text-rose-400' },
];

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  attachments,
  setAttachments,
  onFeatureClick,
  activeModes,
  setActiveModes,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          const uploadedFile: UploadedFile = {
            name: data.fileName,
            type: data.type,
            base64: data.base64 || '',
            isImage: data.isImage,
            size: data.size,
          };
          setAttachments([...attachments, uploadedFile]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Determine border color based on active modes
  const getBorderClass = () => {
    if (activeModes.deepResearch && activeModes.webSearch) {
      return 'border-purple-500/40 shadow-purple-500/5';
    }
    if (activeModes.deepResearch) {
      return 'border-amber-500/40 shadow-amber-500/5';
    }
    if (activeModes.webSearch) {
      return 'border-cyan-500/40 shadow-cyan-500/5';
    }
    return 'border-gray-700/50';
  };

  const getPlaceholder = () => {
    if (activeModes.deepResearch && activeModes.webSearch) {
      return 'Deep research with web search enabled...';
    }
    if (activeModes.deepResearch) {
      return 'Ask a question for deep research...';
    }
    if (activeModes.webSearch) {
      return 'Search the web and get AI-powered answers...';
    }
    return 'Message Purn AI...';
  };

  return (
    <div className="space-y-2">
      {/* Feature action buttons row */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 px-1">
        {featureButtons.map(btn => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.id}
              onClick={() => onFeatureClick(btn.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-colors text-xs whitespace-nowrap ${btn.color}`}
            >
              <Icon size={14} />
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Input container */}
      <div className={`relative w-full bg-[#1E1E1E] border rounded-2xl shadow-lg focus-within:border-gray-600 transition-all ${getBorderClass()}`}>
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 rounded-xl overflow-hidden border border-gray-700 bg-gray-800"
              >
                {file.isImage && file.base64 ? (
                  <div className="relative w-20 h-20">
                    <img
                      src={file.base64}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <FileText size={16} className="text-gray-400" />
                    <div className="text-xs">
                      <p className="text-gray-200 truncate max-w-[120px]">{file.name}</p>
                      <p className="text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-gray-900/80 hover:bg-gray-900 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea and buttons */}
        <div className="flex items-end gap-2 p-2">
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200 flex-shrink-0"
            title="Upload file"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt,.py,.js,.ts,.jsx,.tsx,.css,.html,.json,.csv,.md"
            multiple
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="flex-1 max-h-[200px] min-h-[44px] w-full bg-transparent resize-none outline-none py-2.5 px-1 text-[15px] leading-relaxed text-gray-100 placeholder-gray-500"
            rows={1}
          />

          {/* Send button */}
          <button
            onClick={() => onSend(input)}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className="p-2.5 rounded-xl bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white transition-colors flex items-center justify-center flex-shrink-0"
            aria-label="Send message"
          >
            {isLoading ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Bottom bar: Mode toggles */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0.5">
          {/* Deep Research toggle */}
          <button
            onClick={() => setActiveModes((prev: ActiveModes) => ({ ...prev, deepResearch: !prev.deepResearch }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeModes.deepResearch
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
            }`}
            title="Deep Research: AI performs extended reasoning and thorough analysis"
          >
            <FlaskConical size={14} />
            Deep Research
            {activeModes.deepResearch && (
              <X size={12} className="ml-0.5 opacity-60" />
            )}
          </button>

          {/* Web Search toggle */}
          <button
            onClick={() => setActiveModes((prev: ActiveModes) => ({ ...prev, webSearch: !prev.webSearch }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeModes.webSearch
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
            }`}
            title="Web Search: AI searches the web for up-to-date information"
          >
            <Globe size={14} />
            Web Search
            {activeModes.webSearch && (
              <X size={12} className="ml-0.5 opacity-60" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
