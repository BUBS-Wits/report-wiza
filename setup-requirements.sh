#!/bin/sh

echo "Installing requirements..."

set -f
IFS=$'\n' reqs=( $(cat "requirements.txt" | sed -E "s/#.*//g") )
set +f

for req in "${reqs[@]}"; do
	echo "==="
	echo "Installing npm \"${req}\"."
	npm install "$req"
	echo "==="
done
