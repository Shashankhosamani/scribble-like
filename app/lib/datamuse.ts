import { WORDS } from './constants';

export async function fetchWordPool(topic: string): Promise<string[]> {
  if (topic === 'vanilla') {
    const all = Object.values(WORDS).flat();
    return all.sort(() => Math.random() - 0.5);
  }
  return WORDS[topic] ?? Object.values(WORDS).flat();
}
