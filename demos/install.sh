#!/bin/bash

# Development mode setup script ::::::::::::::::::::::::::::::::::::::::::::::
#
#                            CodeProject.AI Demos
#
# This script is called from the Demos directory using: 
#
#    bash ../src/setup.sh
#
# The setup.sh script will find this install.sh file and execute it.
#
# For help with install scripts, notes on variables and methods available, tips,
# and explanations, see /src/modules/install_script_help.md

if [ "$1" != "install" ]; then
    read -t 3 -p "This script is only called from: bash ../src/setup.sh"
    echo
    exit 1 
fi

runtimeLocation="Shared"
pythonVersion=3.9
if [ "${systemName}" == "Jetson" ]; then pythonVersion=3.8; fi

setupPythonPaths "$runtimeLocation" "$pythonVersion"

# Install python and the required dependencies.
setupPython 
installRequiredPythonPackages "${moduleDirPath}/Python" 