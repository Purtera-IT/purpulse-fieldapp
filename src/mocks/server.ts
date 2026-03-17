import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server for Node environments (Vitest, Storybook SSG, etc.)
 */
export const server = setupServer(...handlers);