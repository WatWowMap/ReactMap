const path = require('path')

module.exports = {
  extensions: ['.js', '.jsx', '.scss'],
  alias: {
    '@components': path.resolve(__dirname, './src/components'),
    '@assets': path.resolve(__dirname, './src/assets'),
    '@data': path.resolve(__dirname, './src/data'),
    '@services': path.resolve(__dirname, './src/services'),
  },
}
