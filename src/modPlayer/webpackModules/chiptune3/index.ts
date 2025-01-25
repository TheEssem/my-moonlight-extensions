/*
	chiptune3 (worklet version)
  based on: https://github.com/DrSnuggles/chiptune
	which in turn is based on: https://deskjet.github.io/chiptune2.js/
*/

import chiptuneWorklet from "./chiptune3.worklet.js";
import libopenmptWorklet from "./libopenmpt.worklet.js";

// this is a bit of a hacky workaround to address an esbuild limitation.
// we can't directly specify worklet file URLs, so we need to load the worklet as a data or blob URI;
// however, the worklet in question depends on another module, so we need to include that too.
// unfortunately, attempting to import it inside the worklet results in it not being resolved or recognized due to the same file URL problem,
// so we need to bundle the two somehow into a single worklet script - but we seemingly can't do that with esbuild and also get a data/blob URI of the worklet.
// so in this case, what we do instead is configure esbuild to treat all files with a .worklet.js extension as plain text files,
// then use its import syntax to import both files - one of them being nearly 2MB due to containing a bundled WASM module, mind you -
// and then concat the strings together into a single module.
// web development was a mistake.
// ~ esm.
const worklet = URL.createObjectURL(new Blob([libopenmptWorklet, "\n", chiptuneWorklet], { type: "text/javascript" }));

type HandlerFunction = Function;

interface Handler {
  eventName: string;
  handler: HandlerFunction;
}

interface Config {
  repeatCount?: number;
  stereoSeparation?: number;
  interpolationFilter?: number;
  context?: AudioContext;
}

const defaultCfg = {
  repeatCount: 0, // -1 = play endless, 0 = play once, do not repeat
  stereoSeparation: 100, // percents
  interpolationFilter: 0, // https://lib.openmpt.org/doc/group__openmpt__module__render__param.html
  context: undefined
};

const logger = moonlight.getLogger("modPlayer/chiptune3");

export class ChiptuneJsPlayer {
  config: Config;
  loaded: boolean;
  context: AudioContext | null;
  gain: GainNode;
  processNode: AudioWorkletNode | undefined;
  destination: AudioDestinationNode | null;
  private handlers: Handler[];

  meta: object | undefined;
  duration: number | undefined;
  order: number | undefined;
  pattern: number | undefined;
  row: number | undefined;
  private currentTime: number | undefined;

  constructor(cfg: Config) {
    this.config = { ...defaultCfg, ...cfg };
    this.loaded = false;

    if (this.config.context) {
      if (!this.config.context.destination) {
        throw "ChiptuneJsPlayer: This is not an audio context";
      }
      this.context = this.config.context;
      this.destination = null;
    } else {
      this.context = new AudioContext();
      this.destination = this.context.destination; // output to speakers
    }
    this.config.context = undefined; // remove from config, just used here and after init not changeable

    // make gainNode
    this.gain = this.context.createGain();
    this.gain.gain.value = 1;

    this.handlers = [];

    // worklet
    this.context.audioWorklet
      .addModule(worklet)
      .then(() => {
        if (!this.context) return;
        this.processNode = new AudioWorkletNode(this.context, "libopenmpt-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2]
        });
        // message port
        this.processNode.port.onmessage = this.handleMessage_.bind(this);
        this.processNode.port.postMessage({ cmd: "config", val: this.config });
        this.fireEvent("onInitialized");

        // audio routing
        this.processNode.connect(this.gain);
        if (this.destination) this.gain.connect(this.destination); // also connect to output if no gainNode was given
      })
      .catch((e) => logger.error(e));
  }

  // msg from worklet
  handleMessage_(msg: MessageEvent) {
    switch (msg.data.cmd) {
      case "meta":
        this.meta = msg.data.meta;
        this.duration = msg.data.meta.dur;
        this.fireEvent("onMetadata", this.meta);
        break;
      case "pos":
        //this.meta.pos = msg.data.pos
        this.currentTime = msg.data.pos;
        this.order = msg.data.order;
        this.pattern = msg.data.pattern;
        this.row = msg.data.row;
        this.fireEvent("onProgress", msg.data);
        break;
      case "end":
        this.fireEvent("onEnded");
        break;
      case "err":
        this.fireEvent("onError", { type: msg.data.val });
        break;
      default:
        logger.warn("Received unknown message", msg.data);
    }
  }

  // handlers
  fireEvent(eventName: string, response?: any) {
    const handlers = this.handlers;
    if (handlers.length) {
      for (const handler of handlers) {
        if (handler.eventName === eventName) {
          handler.handler(response);
        }
      }
    }
  }
  addHandler(eventName: string, handler: HandlerFunction) {
    this.handlers.push({ eventName: eventName, handler: handler });
  }
  onInitialized(handler: HandlerFunction) {
    this.addHandler("onInitialized", handler);
  }
  onEnded(handler: HandlerFunction) {
    this.addHandler("onEnded", handler);
  }
  onError(handler: HandlerFunction) {
    this.addHandler("onError", handler);
  }
  onMetadata(handler: HandlerFunction) {
    this.addHandler("onMetadata", handler);
  }
  onProgress(handler: HandlerFunction) {
    this.addHandler("onProgress", handler);
  }

  // methods
  postMsg(cmd: string, val?: any) {
    if (this.processNode) this.processNode.port.postMessage({ cmd: cmd, val: val });
  }
  load(url: string | URL) {
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => this.play(arrayBuffer))
      .catch((e) => {
        this.fireEvent("onError", { type: "Load" });
      });
  }
  play(val: ArrayBuffer) {
    this.loaded = true;
    this.postMsg("play", val);
  }
  stop() {
    this.postMsg("stop");
  }
  cleanup() {
    this.postMsg("cleanup");
    this.context?.close();
    this.context = null;
    this.gain.disconnect();
    if (this.processNode) {
      this.processNode.disconnect();
      this.processNode.port.onmessage = null;
      this.processNode.port.close();
    }
    this.handlers = [];
  }
  pause() {
    this.postMsg("pause");
  }
  unpause() {
    this.postMsg("unpause");
  }
  togglePause() {
    this.postMsg("togglePause");
  }
  setRepeatCount(val: number) {
    this.postMsg("repeatCount", val);
  }
  setPitch(val: number) {
    this.postMsg("setPitch", val);
  }
  setTempo(val: number) {
    this.postMsg("setTempo", val);
  }
  setPos(val: number) {
    this.postMsg("setPos", val);
  }
  setOrderRow(o, r) {
    this.postMsg("setOrderRow", { o: o, r: r });
  }
  setVol(val: number) {
    this.gain.gain.value = val;
  }
  selectSubsong(val: number) {
    this.postMsg("selectSubsong", val);
  }
  // compatibility
  seek(val: number) {
    this.setPos(val);
  }
  getCurrentTime() {
    return this.currentTime;
  }
}
