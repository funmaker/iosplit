# IOSplit

Library to separate input and output in cli applications. IOSplit allows you to
print text to your terminal without any interference with user input. It uses
[blessed](https://www.npmjs.com/package/blessed) under the hood.

![iosplit](https://raw.githubusercontent.com/funmaker/iosplit/master/preview.gif)

## Features

- Creates scrollable output log and input field.
- Fallbacks to Node's Readline in case stdout is not a terminal.
- Overrides builtin console methods to act as drop-in replacement.
- Keeps track of input history. Access it using arrow keys.
- Saves and loads history from a file.

## Example

``` js
const IOSplit = require("iosplit");

// Create an IOSplit instance
const iosplit = new IOSplit({
  history: true,
});

// Capture user input and evaluate it
iosplit.on("line", line => {
  console.log("»", line);
  try {
    const result = eval(line);
    console.log("←", result);
  } catch(err) {
    console.error(err);
  }
});

// Close program on stdin end(Ctrl-D)
iosplit.on("end", () => process.exit());

// Display example logs on fixed intervals
setInterval(() => console.warn("Random async warning!"), 3000);
setInterval(() => console.error("Random async error!"), 5000);

// Start IOSplit
iosplit.start();
console.log("Enter any js expression in the box below.");
```

The example is included in the repository. Clone it and use the following
commands to run it:

``` bash
npm run build
npm run example
```

## API

### new IOSplit([config])

Creates new `IOSplit` instance with specified config. `config` argument is an
object of containing any of the following options:

| Property                  | type                 | default     | description                                                             |
|:--------------------------|:---------------------|:------------|:------------------------------------------------------------------------|
| `noConsole`               | boolean              | `false`     | Do not override console methods.                                        |
| `force`                   | boolean or undefined | `undefined` | Forcefully disables or enables screen splitting(blessed). Use `undefined` to automatically determine based on whenever stdout is a terminal. |
| `history`                 | boolean or string    | `false`     | Specify the name of history file. Use `.history` if `true` is provided. |
| `ignoreUncaughtException` | boolean              | `false`     | Do not destroy blessed screen on uncaught exception.                    |
| `ignoreCtrlC`             | boolean              | `false`     | Do not send SIGINT on Ctrl-C.                                           |
| `style.log`               | blessed style        | `false`     | Style for log Element.                                                  |
| `style.line`              | blessed style        | `false`     | Style for line Element.                                                 |
| `style.input`             | blessed style        | `false`     | Style for input Element.                                                |

Check out Blessed [documentation](https://github.com/chjj/blessed/blob/master/README.md#options-2)
to find more information regarding styling.

### iosplit.enabled

Indicates whenever IOSplit instance is currently started.

### iosplit.gui

Indicates whenever IOSplit uses Blessed Screen to control terminal.

### iosplit.start()

Starts IOSplit instance and takes control over terminal. Additionally loads 
history file and overrides console methods if applicable. If the stdout is not
connected to terminal, initializes Readline instead.

### iosplit.stop()

Stops IOSplit instance and releases control over terminal. Also restores
console methods to their original state.

### iosplit.log(...args)
### iosplit.warn(...args)
### iosplit.error(...args)

Analogous to console counterparts. Use them if `config.noConsole` is `true`.

### iosplit.refresh()

Re-renders interface.

### event 'line'

Fires on new user input. Provided string contains entered line.

### event 'end'

Fires when one of the following occur:
- Received Ctrl-D to signal end-of-transmission(EOT).
- Readline fires 'close' event if using fallback.
- iosplit.stop() is called

This event indicates that no more 'line' events will fire, until IOSplit
instance is restarted.

***Note**: If IOSplit instance is using fallback, it will not be able to
receive any more input once received EOT. Even after restart.*

### event 'log'

Fires when adding a new log. Provided string contains formatted log entry.

### event 'start'

Fires at the end of iosplit.start();

### event 'stop'

Fires at the end of iosplit.stop();
