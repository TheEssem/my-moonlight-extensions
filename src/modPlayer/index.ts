import type { ExtensionWebExports } from "@moonlight-mod/types";

// https://moonlight-mod.github.io/ext-dev/webpack/#patching
export const patches: ExtensionWebExports["patches"] = [
  // Render file as audio
  {
    find: '"MosaicItemHoverButtons"',
    replace: {
      match: /switch\((\i)\){case"IMAGE":return\(0,\i\.jsx\)/,
      replacement: (orig, type) => `
      if (require("modPlayer_misc").formats.includes(arguments[0].item.originalItem.filename?.toLowerCase().split(".").at(-1))) ${type} = "AUDIO";
      ${orig}`
    }
  },
  // Replace audio element with fake version
  {
    find: "renderMetadata()",
    replace: [
      {
        match: /(\i===\i\.AUDIO)\?(this\.renderAudio\(\)):/,
        replacement: (_, audioCheck, render) =>
          `${audioCheck}?(this.props.fileName && require("modPlayer_misc").formats.includes(this.props.fileName.toLowerCase().split(".").at(-1))?null:${render}):`
      },
      {
        match: /(?<=constructor\(\i\){var.+?)(?<!{)error:null}/,
        replacement: (orig) =>
          `${orig};if(this.props.fileName && require("modPlayer_misc").formats.includes(this.props.fileName.toLowerCase().split(".").at(-1)))this.mediaRef.current=new (require("modPlayer_fakeAudio").default)(this);`
      },
      {
        match: /componentWillUnmount\(\){.+?if\(null==(\i)\)return;/,
        replacement: (orig, audioElement) => `${orig}if(${audioElement}.destroy)${audioElement}.destroy();`
      }
    ]
  }
];

// https://moonlight-mod.github.io/ext-dev/webpack/#webpack-module-insertion
export const webpackModules: ExtensionWebExports["webpackModules"] = {
  fakeAudio: {
    dependencies: [
      {
        ext: "modPlayer",
        id: "chiptune3"
      }
    ]
  },
  chiptune3: {},
  misc: {}
};
