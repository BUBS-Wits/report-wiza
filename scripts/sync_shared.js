import { copyFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const pairs = [
	['shared/constants.js', 'src/constants.js'],
	['shared/constants.js', 'backend/constants.js'],
	['shared/utility.js', 'src/utility.js'],
	['shared/utility.js', 'backend/utility.js'],
	['shared/request.js', 'src/pages/request/request.js'],
	['shared/request.js', 'backend/request.js'],
]

for (const [src, dest] of pairs) {
	mkdirSync(dirname(dest), { recursive: true })
	copyFileSync(src, dest)
}
