#!/bin/bash

if [[ -d ".git" ]]; then
	echo -e "\e[32mBranch\e[0m: $(git branch --show-current)"
fi
node --trace-warnings ./tests/run_tests.js
ret=$?
echo -e "\e[32mReturn Code\e[0m: ${ret}"

exit ${ret}
