import extend from 'extend' 
import fs from 'fs'

const uConfig = JSON.parse(fs.readFileSync('src/configs/config.json'))
const eConfig = JSON.parse(fs.readFileSync('src/configs/default.json'))

const target = {}

extend(true, target, eConfig, uConfig)

export default target
