# Loz Agent Mode Examples

This document provides detailed examples of using Loz in autonomous agent mode.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Examples](#basic-examples)
- [Development Workflow](#development-workflow)
- [Testing and Debugging](#testing-and-debugging)
- [Code Refactoring](#code-refactoring)
- [Advanced Usage](#advanced-usage)

## Getting Started

### Prerequisites

1. Loz installed and configured with an LLM provider
2. A working directory with a codebase to work on

### Basic Syntax

```bash
loz agent "<task description>"
```

## Basic Examples

### Example 1: Repository Inspection

**Task**: Understand the structure of a new codebase

```bash
loz agent "List all source files and provide a summary of the project structure"
```

**What the agent does**:
1. Runs `find` or `ls` commands to explore directories
2. Examines key files like package.json, README
3. Provides a structured summary

### Example 2: Check Project Status

**Task**: Get an overview of project health

```bash
loz agent "Check if the project builds successfully and all tests pass"
```

**What the agent does**:
1. Runs build command (e.g., `npm run build`)
2. Runs test command (e.g., `npm test`)
3. Reports any failures or issues

### Example 3: Count Lines of Code

**Task**: Get code statistics

```bash
loz agent "Count total lines of TypeScript code in src/ directory"
```

## Development Workflow

### Example 4: Add Input Validation

**Task**: Enhance code with validation

```bash
loz agent --max-steps 25 "Add input validation to all functions in src/utils/validation.ts that accept user input"
```

**What the agent does**:
1. Examines the file
2. Identifies functions with user input
3. Adds validation logic
4. Runs tests to verify changes

### Example 5: Fix Type Errors

**Task**: Resolve TypeScript compilation errors

```bash
loz agent -v "Fix all TypeScript compilation errors in the project"
```

**What the agent does**:
1. Runs `tsc` to see errors
2. Fixes type issues one by one
3. Re-runs compiler to verify
4. Continues until all errors resolved

### Example 6: Update Dependencies

**Task**: Safely update packages

```bash
loz agent --enable-network --max-steps 30 "Update outdated npm packages and fix any breaking changes"
```

**What the agent does**:
1. Checks for outdated packages
2. Updates packages incrementally
3. Runs tests after each update
4. Fixes breaking changes as needed

## Testing and Debugging

### Example 7: Fix Failing Test

**Task**: Debug and fix a specific test

```bash
loz agent "Fix the failing test in test/api.test.ts - the 'should handle errors' test case"
```

**What the agent does**:
1. Runs the test to see failure
2. Examines test code and source
3. Identifies the issue
4. Fixes the code
5. Re-runs test to verify

### Example 8: Add Test Coverage

**Task**: Improve test coverage

```bash
loz agent "Add unit tests for all public functions in src/calculator.ts"
```

**What the agent does**:
1. Examines the source file
2. Identifies untested functions
3. Writes comprehensive tests
4. Runs tests to ensure they pass

### Example 9: Debug Performance Issue

**Task**: Investigate and fix slow code

```bash
loz agent --max-steps 20 "Profile and optimize the slow database query in src/queries.ts"
```

## Code Refactoring

### Example 10: Extract Function

**Task**: Improve code organization

```bash
loz agent "Extract the user validation logic in src/auth.ts into a separate function"
```

### Example 11: Add Documentation

**Task**: Improve code documentation

```bash
loz agent "Add JSDoc comments to all exported functions in src/api/"
```

### Example 12: Apply Code Style

**Task**: Enforce consistent style

```bash
loz agent "Fix all ESLint warnings in src/ directory"
```

**What the agent does**:
1. Runs ESLint to see warnings
2. Fixes issues automatically where possible
3. Makes manual fixes for complex cases
4. Re-runs linter to verify

## Advanced Usage

### Example 13: Multi-File Refactoring

**Task**: Complex refactoring across multiple files

```bash
loz agent --max-steps 40 --verbose "Rename the 'User' class to 'Account' throughout the entire codebase"
```

### Example 14: Security Audit

**Task**: Find and fix security issues

```bash
loz agent --max-steps 30 "Check for common security vulnerabilities like SQL injection and XSS, and fix any found"
```

### Example 15: Migration Task

**Task**: Migrate from old API to new API

```bash
loz agent --max-steps 50 "Migrate all uses of deprecated 'request' library to use 'axios' instead"
```

## Tips for Success

### 1. Be Specific

❌ Bad: "Fix the bug"
✅ Good: "Fix the TypeError in the validateEmail function when input is null"

### 2. Break Down Complex Tasks

For very complex tasks, consider running multiple agent sessions:

```bash
# Step 1: Analyze
loz agent "Analyze the authentication system and list all files involved"

# Step 2: Refactor
loz agent --max-steps 30 "Refactor authentication to use JWT tokens"

# Step 3: Test
loz agent "Add comprehensive tests for the new JWT authentication"
```

### 3. Use Appropriate Limits

- Simple tasks: `--max-steps 5-10`
- Medium tasks: `--max-steps 15-25`
- Complex tasks: `--max-steps 30-50`

### 4. Enable Verbose Mode for Debugging

When the agent isn't doing what you expect:

```bash
loz agent -v "your task" --max-steps 10
```

This shows you each step, the LLM's reasoning, and results.

### 5. Leverage Safety Features

The agent respects `.gitignore` and won't modify:
- Dependencies (node_modules)
- Build outputs (dist/)
- Sensitive files (.env, .ssh/)

### 6. Sandbox Mode

Keep sandbox mode enabled (default) to restrict operations to your working directory:

```bash
loz agent --sandbox "your task"  # default
```

## Troubleshooting

### Agent Stops After Few Steps

**Issue**: Agent completes before finishing task

**Solution**: Increase max steps:
```bash
loz agent --max-steps 30 "your task"
```

### Agent Repeats Same Action

**Issue**: Agent gets stuck in a loop

**Solution**: 
- The agent will auto-detect this and stop
- Try rephrasing your task more specifically
- Use verbose mode to understand what's happening

### LLM Returns Invalid Responses

**Issue**: Agent fails with "Invalid JSON" errors

**Solution**:
- Ensure your LLM is properly configured
- Some models work better than others (GPT-4 recommended)
- Try reducing complexity of the task

## Safety Considerations

### What the Agent Can Do

✅ Read files in working directory
✅ Edit files in working directory
✅ Run safe commands (ls, cat, grep, git, npm, etc.)
✅ Install packages (with appropriate permissions)
✅ Run tests and builds

### What the Agent Cannot Do

❌ Execute dangerous commands (rm -rf /, shutdown, etc.)
❌ Modify files outside working directory (in sandbox mode)
❌ Access network without --enable-network flag
❌ Modify sensitive files (.ssh/, .env, etc.)
❌ Run commands requiring sudo (security risk)

## Contributing Examples

Have a great use case? Contribute examples by:
1. Testing your example thoroughly
2. Documenting expected behavior
3. Submitting a pull request

---

For more information, see the [main README](README.md).
