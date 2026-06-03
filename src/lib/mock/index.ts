/**
 * Mock mode check — single source of truth.
 * All mock guards in the app import from here.
 */
export const IS_MOCK = process.env.MOCK_MODE === 'true'
