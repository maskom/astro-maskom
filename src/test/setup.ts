import '@testing-library/jest-dom';

// Mock Astro globals
global.Astro = {
  props: {},
  params: {},
  url: new URL('http://localhost:4321'),
  request: new Request('http://localhost:4321'),
  client: {},
  redirect: () => {},
  cookies: {
    get: () => null,
    set: () => {},
    has: () => false,
    delete: () => {},
  },
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
