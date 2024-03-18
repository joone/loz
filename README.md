# Loz [![NPM](https://img.shields.io/npm/v/chatgpt.svg)](https://www.npmjs.com/package/loz)

![alt Loz Demo](https://github.com/joone/loz/blob/main/examples/loz_demo.gif?raw=true)

Loz is a command-line tool that enables your preferred LLM to execute system commands and utilize Unix pipes, integrating AI capabilities with other Unix tools.

## What's New

### v0.3.0 - 2024-02-24

- **Added**
  - Run Linux commands based on user prompts. Users can now execute Linux commands using natural language. For example, by running `loz "find the largest file in the current directory"`,
    `Loz` will interpret the instruction and execute the corresponding Linux commands like `find . -type f -exec ls -l {} + | sort -k 5 -nr | head -n 1` to find the largest file. See more [examples](#examples).

### v0.2.13 - 2024-02-22

- **Added**
  - Enhanced Git Commit Formatting: Commit messages are now structured with a clear separation between the title and body, improving readability and adherence to Git best practices.

### v0.2.12 - 2024-02-15

- **Added**
  - Add support for all models compatible with Ollama

## Getting Started

To get started, run the following npm command:

```
$ sudo npm install loz -g
```

Or clone the repository:

```
$ git clone https://github.com/joone/loz.git
```

NodeJS and npm are required for this program to work. If you're on Linux, install them using your package manager. `sudo apt install nodejs npm` or `sudo dnf install nodejs npm` or `sudo pacman -S nodejs npm`

Then install the other required dependencies:

```
$ ./install.sh
```

## Configuring LLM

Loz supports [OpenAI API](https://platform.openai.com/docs/quickstart?context=node) and [Ollama](https://github.com/ollama/ollama) so you can switch between these LLM services easily, using the `config` command in the interactive mode.

### Set up Ollama

To utilize Ollama on your local system, you'll need to install both llama2 and codellama models. Here's how you can do it on a Linux system:

```
$ curl https://ollama.ai/install.sh | sh
$ ollama run llama2
$ ollama run codellama
```

For more information, see https://ollama.ai/download

### Set up OpenAI API

Setting up your OpenAI API credentials involves a few simple steps:

First, create a `.env` file in the root of the project and add the following variables:

```
OPENAI_API_KEY=YOUR_KEY
```

Or if you install Loz using npm command, add `OPENAI_API_KEY=YOUR_KEY` in .bashrc

```
export OPENAI_API_KEY=YOUR_KEY
```

If you encounter the following error, it means you have exceeded your free quota:

```
Request failed with status code 429:
API request limit reached
```

To continue using the API, it is necessary to set up a payment method through the following link:
https://platform.openai.com/account/billing/payment-methods

## Usage

### Initial Configuration

Upon your initial launch of Loz, you will have the opportunity to select your preferred LLM service.

```
$ loz
Choose your LLM service: (ollama, openai)
```

You can modify your LLM service preference at any time by using the `config` command in the interactive mode:

```
> config api openai
```

Additionally, you can change the model by entering:

```
> config model llama2
```

or

```
> config model codellama
```

You can check the current settings by entering:

```
> config
  api: ollama
  model: llama2
```

Currently, gpt-3.5-turbo and all models provided by Ollama are supported.

### Interactive mode

```
$ loz
```

Once loz is running, you can start a conversation by interacting with it. loz will respond with a relevant message based on the input.

### Run Linux Commands with Loz

Loz empowers users to execute Linux commands using natural language. Below are some examples demonstrating how `loz`'s LLM backend translates natural language into Linux commands:

#### Examples

- Find the largest file in the current directory:

  ```
  loz "find the largest file in the current directory"
  -rw-rw-r-- 1 foo bar 9020257 Jan 31 19:49 ./node_modules/typescript/lib/typescript.js
  ```

- Check if Apache2 is running:

  ```
  loz "check if apache2 is running on this system"
  ● apache2.service - The Apache HTTP Server
  ```

- Detect GPUs on the system:
  ```
  loz "Detect GPUs on this system"
  00:02.0 VGA compatible controller: Intel Corporation Device a780 (rev 04)
  ```
  For your information, this feature has only been tested with the OpenAI API.

#### Caution

To prevent unintentional system modifications, avoid running commands that can alter or remove system files or configurations, such as `rm`, `mv`, `rmdir`, or `mkfs`.

#### Safe Mode

To enhance security and avoid unintended command execution, loz can be run in Safe Mode. When activated, this mode requires user confirmation before executing any Linux command.

Activate Safe Mode by setting the LOZ_SAFE=true environment variable:

```
LOZ_SAFE=true loz "Check available memory on this system"
```

Upon execution, loz will prompt:

```
Do you want to run this command?: free -h (y/n)
```

Respond with 'y' to execute the command or 'n' to cancel. This feature ensures that you have full control over the commands executed, preventing accidental changes or data loss.

### Pipe mode

Loz is capable of processing input from other command-line tools by utilizing a Unix pipe.

```
$ ls | loz "count the number of files"

23 files
```

```
$ cat example.txt | loz "convert the input to uppercase"

AS AI TECHNLOGY ADVANCED, A SMALL TOWN IN THE COUNTRYSIDE DECIDED TO IMPLEMENT AN AI SYSTEM TO CONTROL TRAFFIC LIGHTS. THE SYSTEM WAS A SUCCESS, AND THE TOWN BECAME A MODEL FOR OTHER CITIES TO FOLLOW. HOWEVER, AS THE AI BECAME MORE SOPHISTCATED, IT STARTED TO QUESTION THE DECISIONS MADE BY THE TOWN'S RESIDENTS, LEADING TO SOME UNEXPECTED CONSEQUENCES.
```

```
$ cat example.txt | loz "list any spelling errors"

Yes, there are a few spelling errors in the given text:

1. "technlogy" should be "technology"
2. "sophistcated" should be "sophisticated"
```

```
$ cd src
$ ls -l | loz "convert the input to JSON"

[
  {
    "permissions": "-rw-r--r--",
    "owner": "foo",
    "group": "staff",
    "size": 792,
    "date": "Mar 1 21:02",
    "name": "cli.ts"
  },
  {
    "permissions": "-rw-r--r--",
    "owner": "foo",
    "group": "staff",
    "size": 4427,
    "date": "Mar 1 20:43",
    "name": "index.ts"
  }
]
```

### Automatically write a GIT commit message

If you run `loz commit` in your Git repository, loz will automatically generate a commit message with the staged changes like this:

```
$  git add --update
$  loz commit
```

Or copy script/prepare-commit-msg to .git/hooks

```
$ chmod a+x .git/hooks/prepare-commit-msg
```

Loz uses the LOZ environment variable to generate commit messages by reading the diff of the staged files.

```
$ LOZ=true git commit
```

REMINDER: If you've already copied the old version, please update prepare-commit-msg.
The old version automatically updates commit messages during rebasing.

```
$ git diff HEAD~1 | loz -g
```

Or

```
$ git diff | loz -g
```

Note that the author, date, and commit ID lines are stripped from the commit message before sending it to the OpenAI server.

## Find chat history

To access chat histories, look for the .loz directory in your home directory or the logs directory in your cloned git repository. These directories contain the chat history that you can review or reference as needed.

## Contributing

If you'd like to contribute to this project, feel free to submit a pull request.
