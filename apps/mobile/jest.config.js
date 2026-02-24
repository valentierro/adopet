module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: 'src',
  testRegex: '\\.spec\\.(ts|tsx)$',
  transform: { '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }] },
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/../app/'],
};
