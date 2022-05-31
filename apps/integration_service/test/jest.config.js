module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  modulePaths: ['<rootDir>../../../node_modules', '<rootDir>../../../'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',

  moduleNameMapper: {
    '^@app/common$': ['<rootDir>../../../libraries/common/src'],
    '^@app/common/(.*)$': ['<rootDir>../../../libraries/common/src/$1'],
  },
};
