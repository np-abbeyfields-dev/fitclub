/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/app.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
