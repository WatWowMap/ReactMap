const path = require('path')

module.exports = {
  extensions: ['.js', '.jsx', '.scss'],
  alias: {
    '@components': path.resolve(__dirname, './src/components'),
    '@assets': path.resolve(__dirname, './src/assets'),
    '@hooks': path.resolve(__dirname, './src/hooks'),
    '@services': path.resolve(__dirname, './src/services'),
    '@classes': path.resolve(__dirname, './src/classes'),
  },
}
