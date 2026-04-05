#!/bin/sh

./run-tests.sh
if [[ $? -eq 0 ]]; then
	npm run build:frontend 
	npm run serve:frontend
fi
