module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testMatch: ['**/tests/**/*.test.ts'],
  passWithNoTests: true,
};
