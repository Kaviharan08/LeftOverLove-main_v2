import { expect, afterEach, beforeEach, describe, it, vi } from 'vitest';

// Setup global test environment
beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
});

afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
});

// Configure test environment
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

export { expect, describe, it, beforeEach, afterEach, vi };