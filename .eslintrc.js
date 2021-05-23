module.exports = {
  extends: [
    'airbnb-base',
    'airbnb/rules/react',
  ],
  parser: '@babel/eslint-parser',
  env: {
    browser: true,
    jest: true,
  },
  globals: {
    document: true,
    window: true,
  },
  rules: {
    'linebreak-style': 0,
    'react/prop-types': 0,
    'no-confusing-arrow': 0,
    'no-restricting-syntax': 0,
    semi: 0,
    allowForLoopAfterthoughts: 0,
    radix: 0,
    eqeqeq: 0,
    'consistent-return': 0,
    'no-use-before-define': 0,
    'no-param-reassign': 0,
    'arrow-parens': 0,
    'react/jsx-one-expression-per-line': 0,
    'no-underscore-dangle': 0,
    'no-return-assign': 0,
    'max-len': [
      'error',
      120,
      2,
      {
        ignoreUrls: true,
        ignoreComments: true,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignorePattern: '^(.*)@typedef(.*)',
      },
    ],
    'no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^TypesDefs(.*)',
      },
    ],
  },
  settings: {
    node: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    'import/resolver': {
      alias: {
        map: [
          ['@components', './src/components/'],
          ['@services', './src/services/'],
          ['@hooks', './src/hooks/'],
          ['@assets', './src/assets/'],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
}
