const { resolve } = require("path")
const { readdirSync, statSync } = require("fs")

function find_tests(dir) {
	let files = []
	for (const file of readdirSync(dir)) {
		const full_path = resolve(dir, file)
		if (statSync(full_path).isDirectory()) {
			files = files.concat(find_tests(full_path))
		} else if (file.endsWith(".test.js")) {
			files.push(full_path)
		}
	}
	return files
}

function load_tests() {
	const src_tests = find_tests(resolve(__dirname, "../src"))
	src_tests.forEach(file => {
		require(file)
	})
	return src_tests.length
}

async function run_all() {
	const { run_tests } = require("./test_framework.js")

	const total_tests = load_tests()
	console.log(`Found test files: ${total_tests}`)
	await run_tests()
}

run_all()
