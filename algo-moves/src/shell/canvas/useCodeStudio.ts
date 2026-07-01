import { useContext } from 'react';
import { CodeStudioContext } from './codeStudioContextStore';

export function useCodeStudio() {
  const ctx = useContext(CodeStudioContext);
  if (!ctx) throw new Error('CodeStudio components must be used within CodeStudioProvider');
  return ctx;
}
