import type { Metadata } from 'next';
import PurnCopClient from './PurnCopClient';

export const metadata: Metadata = {
  title: 'Purn Cop - Cybersecurity Assistant',
  description: 'Purn Cop - Your expert cybersecurity AI assistant for security analysis, threat intelligence, and incident response.',
};

export default function PurnCopPage() {
  return <PurnCopClient />;
}
