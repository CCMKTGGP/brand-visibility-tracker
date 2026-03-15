/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          jsx: "react",
          strict: false,
        },
      },
    ],
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  transformIgnorePatterns: ["node_modules/(?!(@upstash)/)"],
  collectCoverageFrom: [
    "lib/services/analysisRunnerService.ts",
    "app/api/**/resume-analysis/route.ts",
  ],
};

module.exports = config;
