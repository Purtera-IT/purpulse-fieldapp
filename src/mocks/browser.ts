import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW Worker for browser environments (dev, Storybook, etc.)
 */
export const worker = setupWorker(...handlers);