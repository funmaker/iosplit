import EventEmitter from "events";
import readline, { ReadLine } from "readline";
import util from "util";
import fs from "fs";
import blessed from "blessed";
import chalk from "chalk";

interface IOSplitConfig {
  noConsole?: boolean,
  force?: boolean,
  history?: boolean | string,
  ignoreUncaughtException?: boolean,
  ignoreCtrlC?: boolean,
  style?: {
    log?: blessed.Widgets.Types.TStyle
    line?: blessed.Widgets.Types.TStyle
    input?: blessed.Widgets.Types.TStyle
  }
}

export = class IOSplit extends EventEmitter {
  enabled: boolean = false;
  gui?: boolean;
  
  private rl?: ReadLine;
  private historyFile?: fs.promises.FileHandle;
  private screen?: blessed.Widgets.Screen;
  private body?: blessed.Widgets.Log;
  private originalConsole?: Pick<Console, "log" | "warn" | "error">;
  private history: string[] = [];
  private historyPos: number = 0;
  
  constructor(private readonly config: IOSplitConfig = {}) {
    super();
  }
  
  start() {
    if(this.enabled) return;
    this.enabled = true;
    
    // Handle console
    if(!this.config.noConsole) {
      this.originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
      };
    
      console.log = this.log;
      console.warn = this.warn;
      console.error = this.error;
    }
    
    // Readline fallback
    if(!process.stdout.isTTY && !this.config.force) {
      this.gui = false;
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      this.rl.on("line", line => this.emit("line", line));
      this.rl.on("close", () => this.emit("end"));
      return;
    }
    
    this.gui = true;
    this.history = [];
    this.loadHistory().catch(this.error);
  
    const screen = this.screen = blessed.screen();
    const body = this.body = blessed.log({
      parent: screen,
      top: 0,
      left: 0,
      height: '100%-2',
      width: '100%',
      mouse: true,
      scrollbar: {
        style: {
          ch: ' ',
          bg: 'lightcyan',
        }
      },
      scrollable: true,
      scrollOnInput: false,
      alwaysScroll: false,
      style: this.config.style ? this.config.style.log : undefined,
    });
    const line = blessed.line({
      parent: screen,
      bottom: 1,
      left: 0,
      height: 1,
      width: '100%',
      orientation: "horizontal",
      style: this.config.style ? this.config.style.line : undefined,
    });
    const inputBar = blessed.textbox({
      parent: screen,
      bottom: 0,
      left: 0,
      height: 1,
      width: '100%',
      inputOnFocus: true,
      style: this.config.style ? this.config.style.input : undefined,
    });
    
    inputBar.on("detach", () => this.emit("end"));
  
    // Key inputs
    if(!this.config.ignoreCtrlC) {
      screen.key('C-c', () => process.kill(process.pid, "SIGINT"));
      inputBar.key('C-c', () => process.kill(process.pid, "SIGINT"));
    }
    inputBar.key('C-u', () => {
      inputBar.clearValue();
      screen.render();
    });
    inputBar.key('C-d', () => {
      inputBar.destroy();
      line.destroy();
      body.height = "100%";
      screen.render();
    });
    inputBar.key('up', () => {
      if(this.historyPos <= 0) return;
      this.historyPos--;
      inputBar.setValue(this.history[this.historyPos]);
      screen.render();
    });
    inputBar.key('down', () => {
      if(this.historyPos >= this.history.length - 1) return;
      this.historyPos++;
      inputBar.setValue(this.history[this.historyPos]);
      screen.render();
    });
  
    // Handle submitting data
    inputBar.on('submit', (text) => {
      this.emit("line", text);
      inputBar.clearValue();
      inputBar.focus();
      screen.render();
      
      this.history.push(text);
      this.historyPos = this.history.length;
      if(this.historyFile) this.historyFile.appendFile(text + "\n").catch(this.error);
    });
    
    // Handle errors
    if(!this.config.ignoreUncaughtException) {
      process.on('uncaughtException', function (err) {
        screen.destroy();
        throw err;
      });
    }
  
    inputBar.focus();
    screen.render();
    this.emit("start");
  }
  
  stop() {
    if(!this.enabled) return;
    this.enabled = false;
    
    // Cleanup
    if(this.historyFile) {
      this.historyFile.close().catch(console.error);
      delete this.historyFile;
    }
    if(this.rl) {
      this.rl.close();
      delete this.rl;
    }
    if(this.screen) {
      this.screen.children.forEach(child => child.destroy());
      this.screen.destroy();
      delete this.body;
      delete this.screen;
    }
    if(this.originalConsole) {
      console.log = this.originalConsole.log;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      delete this.originalConsole;
    }
    this.emit("stop");
  }
  
  refresh = () => {
    if(this.screen) this.screen.render();
  };
  
  log = (message: any = "", ...rest: any[]) => {
    if(!this.enabled) return;
    
    const data = util.format(message, ...rest);
    
    if(this.gui) this.body!.add(data);
    else process.stdout.write(data + "\n");
    
    this.emit("log", data);
  };
  
  warn = (message: any = "", ...rest: any[]) => {
    if(!this.enabled) return;
  
    const data = util.format(message, ...rest);
  
    if(this.gui) this.body!.add(chalk.yellow(data));
    else process.stderr.write(data + "\n");
  
    this.emit("log", data);
  };
  
  error = (message: any = "", ...rest: any[]) => {
    if(!this.enabled) return;
  
    const data = util.format(message, ...rest);
  
    if(this.gui) this.body!.add(chalk.red(data));
    else process.stderr.write(data + "\n");
  
    this.emit("log", data);
  };
  
  private async loadHistory() {
    if(!this.config.history) return;
    const fileName = this.config.history === true ? ".history" : this.config.history;
    
    this.historyFile = await fs.promises.open(fileName, "a+");
    const content = await this.historyFile.readFile("utf8");
    const lines = content.split("\n").filter(line => line !== "");
    this.history.unshift(...lines);
    this.historyPos += lines.length;
  }
}
