# Changelog
### [v0.3.0]((https://github.com/joone/loz/compare/v0.2.13...v0.3.0)) - 2024-02-24
- **Added**
  - Run Linux commands based on user prompts. Users can now execute Linux commands using natural language. For example, by running `loz "find the largest file in the current directory"`,
  `Loz` will interpret the instruction and execute the corresponding Linux commands like `find . -type f -exec ls -l {} + | sort -k 5 -nr | head -n 1` to find the largest file.
### [v0.2.13](https://github.com/joone/loz/compare/v0.2.12...v0.2.13) - 2024-02-22
- **Added**
  - Enhanced Git Commit Formatting: Commit messages are now structured with a clear separation between the title and body, improving readability and adherence to Git best practices.

## [v0.2.12](https://github.com/joone/loz/compare/v0.2.11...v0.2.12) - 2024-02-15
- **Added**
  - Add support for all models compatible with Ollama
## [v0.2.11](https://github.com/joone/loz/compare/v0.2.10...v0.2.11) - 2024-02-13
- **Added**
  - Store OpenAI API Key in `config.json` ([#17](https://github.com/joone/loz/pull/17), contributed by @honeymaro)

## v0.2.0 - 2024-02-01
- **Added**
  - Add support for llama2 and codellama models via ollama integration.
