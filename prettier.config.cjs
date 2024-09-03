module.exports = {
  useTabs: false,
  tabWidth: 2,
  semi: true,
  printWidth: 80,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  endOfLine: 'lf',
  plugins: [require.resolve('prettier-plugin-organize-imports')],
};
