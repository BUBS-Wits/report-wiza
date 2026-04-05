import process from 'node:process'
import { resolve } from 'path'
import { readdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { run_tests } from './test_framework.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function find_tests(dir) {
	let files = []
	for (const file of readdirSync(dir)) {
		const full_path = resolve(dir, file)
		if (statSync(full_path).isDirectory()) {
			files = files.concat(find_tests(full_path))
		} else if (file.endsWith('.test.js')) {
			files.push(full_path)
		}
	}
	return files
}

async function load_tests() {
	const app_tests = find_tests(resolve(__dirname, '../app'))
	const packages_tests = find_tests(resolve(__dirname, '../packages'))

	const all_tests = app_tests.concat(packages_tests)

	for (const file of all_tests) {
		await import(file)
	}
	return all_tests.length
}

async function run_all() {
	const total_tests = await load_tests()
	console.log(`Found test files: ${total_tests}`)
	const ret = await run_tests()
	process.exit(ret)
}

run_all()
