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
echo -e "\e[0;32mReturn Code\e[0m: ${ret}"

exit ${ret}
