#!/bin/bash
cd "$(dirname "$0")/mobile"
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.96 npx expo start --lan
