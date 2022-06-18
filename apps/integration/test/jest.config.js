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
    '^@sdk/assets$': ['<rootDir>../../../libs/assets/src'],
    '^@sdk/assets/(.*)$': ['<rootDir>../../../libs/assets/src/$1'],
    '^@app/common$': ['<rootDir>../../../libs/common/src'],
    '^@app/common/(.*)$': ['<rootDir>../../../libs/common/src/$1'],
  },
};
