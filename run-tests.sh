#!/bin/sh

if [[ ! -f "requirements.txt" ]]; then
	exit
fi

set -f
IFS=$'\n' reqs=( $(cat "requirements.txt" | sed -E "s/#.*//g") )
set +f

for req in "${reqs[@]}"; do
	if [[ "$(npm list "$req" | grep -o "${req}")" != "${req}" ]]; then
		./setup-requirements.sh
	fi
done

node --trace-warnings ./tests/run_tests.js
ret=$?
if [[ -d ".git" ]]; then
	echo -e "\e[32mBranch\e[0m: $(git branch --show-current)"
fi
echo -e "\e[32mReturn Code\e[0m: ${ret}"

exit ${ret}
