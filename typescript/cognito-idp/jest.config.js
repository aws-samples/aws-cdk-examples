module.exports = {
    "roots": [
      "<rootDir>/test"
    ],
    testMatch: [ '**/*.test.ts'],
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
    runner: "groups", 
    extraGlobals: [],
    testEnvironment: "node", 
    testTimeout: 20000
  }