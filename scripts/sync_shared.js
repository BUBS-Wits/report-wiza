import { copyFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const pairs = [
	['shared/constants.js', 'src/constants.js'],
	['shared/constants.js', 'backend/constants.js'],
	['shared/utility.js', 'src/utility.js'],
	['shared/utility.js', 'backend/utility.js'],
	['shared/request.js', 'src/pages/request/request.js'],
	['shared/utility.js', 'backend/utility.js'],
	['shared/request.js', 'backend/request.js'],
	['shared/utility.js', 'src/pages/request/utility.js'],
	['shared/constants.js', 'src/pages/request/constants.js'],
]

console.log(`=== SYNCING ===`)
for (const [src, dest] of pairs) {
	console.log(`Syncing "${dest}" to "${src}"`)
	mkdirSync(dirname(dest), { recursive: true })
	copyFileSync(src, dest)
}
console.log(`=== END ===`)
