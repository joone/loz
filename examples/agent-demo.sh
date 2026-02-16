#!/bin/bash
# Loz Agent Mode Demonstration
# This script demonstrates the autonomous agent capabilities

echo "=================================================="
echo "Loz Agent Mode - Demonstration Examples"
echo "=================================================="
echo ""

# Check if loz is installed
if ! command -v loz &> /dev/null; then
    echo "Error: loz is not installed or not in PATH"
    echo "Please build and install loz first:"
    echo "  npm run build"
    echo "  npm link"
    exit 1
fi

echo "Note: These examples require a configured LLM (OpenAI, Ollama, or GitHub Copilot)"
echo ""
read -p "Press Enter to continue..."
echo ""

# Example 1: Simple repository inspection
echo "Example 1: Inspect Repository Structure"
echo "----------------------------------------"
echo "Command: loz agent 'List all TypeScript files in src/ directory and count them'"
echo ""
read -p "Run this example? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    loz agent "List all TypeScript files in src/ directory and count them" --max-steps 5
fi
echo ""

# Example 2: Run tests
echo "Example 2: Run Test Suite"
echo "-------------------------"
echo "Command: loz agent 'Run the test suite and report if tests pass or fail'"
echo ""
read -p "Run this example? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    loz agent "Run the test suite using npm test and report the results" --max-steps 3
fi
echo ""

# Example 3: Create a simple file
echo "Example 3: Create Documentation"
echo "-------------------------------"
echo "Command: loz agent 'Create a simple CONTRIBUTING.md file with basic guidelines'"
echo ""
read -p "Run this example? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    loz agent "Create a CONTRIBUTING.md file with sections for: How to Contribute, Code Style, Testing, and Pull Request Process" --max-steps 5 --verbose
fi
echo ""

# Example 4: Verbose mode demonstration
echo "Example 4: Verbose Mode"
echo "----------------------"
echo "Command: loz agent -v 'Check Node.js and npm versions'"
echo ""
read -p "Run this example? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    loz agent -v "Check the installed Node.js and npm versions" --max-steps 3
fi
echo ""

echo "=================================================="
echo "Demonstration Complete!"
echo "=================================================="
echo ""
echo "Try your own tasks with:"
echo "  loz agent 'Your task description here'"
echo ""
echo "For more options:"
echo "  loz agent --help"
echo ""
