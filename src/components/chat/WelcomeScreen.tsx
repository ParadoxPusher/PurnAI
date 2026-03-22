'use client';

import React from 'react';
import {
  Sparkles,
  FileText,
  Presentation,
  Code2,
  Image,
  ScanSearch,
  FlaskConical,
  Globe,
} from 'lucide-react';

interface WelcomeScreenProps {
  onFeatureClick: (feature: string) => void;
  onSend: (text: string) => void;
}

const features = [
  {
    id: 'deep-research',
    label: 'Deep Research',
    icon: FlaskConical,
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400',
    description: 'Extended reasoning & analysis',
  },
  {
    id: 'web-search',
    label: 'Web Search',
    icon: Globe,
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-400',
    description: 'Search the web for answers',
  },
  {
    id: 'ppt',
    label: 'Make PPT',
    icon: Presentation,
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 text-orange-400',
    description: 'Create presentations',
  },
  {
    id: 'document',
    label: 'Make Document',
    icon: FileText,
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400',
    description: 'Generate PDF documents',
  },
  {
    id: 'code',
    label: 'Write Code',
    icon: Code2,
    bgColor: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400',
    description: 'Generate code files',
  },
  {
    id: 'image',
    label: 'Create Image',
    icon: Image,
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-400',
    description: 'Generate AI images',
  },
  {
    id: 'analyze',
    label: 'Analyze Image',
    icon: ScanSearch,
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400',
    description: 'Analyze uploaded images',
  },
];

const quickPrompts = [
  'Explain quantum computing in simple terms',
  'Create a business plan presentation',
  'Write a Python web scraper',
  'What are the latest trends in AI?',
];

export default function WelcomeScreen({ onFeatureClick, onSend }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-8 animate-in fade-in duration-500">
      {/* Logo */}
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles size={32} className="text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">What can I help with?</h1>
        <p className="text-gray-400 text-sm max-w-md">
          Chat, research deeply, search the web, create documents, generate code, and more.
        </p>
      </div>

      {/* Feature chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-xl">
        {features.map(feature => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              onClick={() => onFeatureClick(feature.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all text-sm font-medium ${feature.bgColor}`}
            >
              <Icon size={16} />
              {feature.label}
            </button>
          );
        })}
      </div>

      {/* Quick prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSend(prompt)}
            className="text-left px-4 py-3 rounded-xl border border-gray-800 bg-gray-800/30 hover:bg-gray-800/60 transition-colors text-sm text-gray-300 hover:text-gray-100"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
