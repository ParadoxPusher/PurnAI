'use client';

import React from 'react';
import { Plus, MessageSquare, Trash2, Sparkles } from 'lucide-react';
import { ChatSession } from './ChatInterface';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onClose,
}: SidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-20 lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed lg:relative z-30 w-[260px] h-full bg-[#171717] flex flex-col border-r border-gray-800/50">
        {/* Logo & New Chat */}
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <img src="/logo.png" alt="Purn AI Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-semibold text-base">Purn AI</span>
          </div>

          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-gray-700/50 hover:bg-gray-800/60 transition-colors text-sm text-gray-300"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-8 px-4">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            <div className="space-y-0.5">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    activeSessionId === session.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'
                  }`}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                >
                  <MessageSquare size={16} className="flex-shrink-0 opacity-60" />
                  <span className="truncate flex-1">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-700 transition-all"
                  >
                    <Trash2 size={14} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>


      </aside>
    </>
  );
}
