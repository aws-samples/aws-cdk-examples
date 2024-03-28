module.exports = {
    "root": true,
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "project": "./tsconfig.json"
    },
    "extends": ["plugin:@aws-appsync/base","plugin:@aws-appsync/recommended"],
    "ignorePatterns": ["src/**/*.test.ts", "src/**/*.d.ts"],

}
