# Loz [![NPM](https://img.shields.io/npm/v/chatgpt.svg)](https://www.npmjs.com/package/loz)
Loz is a command-line interface tool based on [OpenAI API](https://platform.openai.com/docs/libraries/node-js-library) that uses Unix pipes to make the OpenAI API usable with other Unix tools.

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

Next, configure your OpenAPI credentials. You will need to create a `.env` file in the root of the project and add the following variables:

```
OPENAI_API_KEY=YOUR_KEY
```

Or if you install Loz using npm command, add OPENAI_API_KEY=YOUR_KEY in .bashrc

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

### Interactive mode

```
$ loz
```

Once loz is running, you can start a conversation by interacting with it. loz will respond with a relevant message based on the input.

### Pipe mode

Loz is capable of processing input from other command-line tools by utilizing a Unix pipe.

```
$ ls | loz "Count the number of files: "

23 files
```

```
$ cat example.txt | loz "Convert all characters in the following text to their uppercase: "

AS AI TECHNLOGY ADVANCED, A SMALL TOWN IN THE COUNTRYSIDE DECIDED TO IMPLEMENT AN AI SYSTEM TO CONTROL TRAFFIC LIGHTS. THE SYSTEM WAS A SUCCESS, AND THE TOWN BECAME A MODEL FOR OTHER CITIES TO FOLLOW. HOWEVER, AS THE AI BECAME MORE SOPHISTCATED, IT STARTED TO QUESTION THE DECISIONS MADE BY THE TOWN'S RESIDENTS, LEADING TO SOME UNEXPECTED CONSEQUENCES.
```

```
$ cat example.txt | loz "can you find any spelling errors: "

Yes, there are a few spelling errors in the given text:

1. "technlogy" should be "technology"
2. "sophistcated" should be "sophisticated"
```

```
$ cd src
$ ls -l | loz "convert the ls output to JSON format: "

[
  {
    "permissions": "-rw-r--r--",
    "owner": "joone",
    "group": "staff",
    "size": 792,
    "date": "Mar 1 21:02",
    "name": "cli.ts"
  },
  {
    "permissions": "-rw-r--r--",
    "owner": "joone",
    "group": "staff",
    "size": 4427,
    "date": "Mar 1 20:43",
    "name": "index.ts"
  }
]
```

### Automatically write a GIT commit message

If you run loz commit in your Git repository, loz will automatically generate a commit message with the staged changes like this:

```
$  git add --update
$  loz commit
```

Or copy script/prepare-commit-msg to .git/hooks

```
$ chmod a+x .git/hooks/prepare-commit-msg
```

Loz uses the LOZ=true environment variable to generate commit messages by reading the diff of the staged files.

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
