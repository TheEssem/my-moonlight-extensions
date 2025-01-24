import type { ExtensionWebExports } from "@moonlight-mod/types";

// https://moonlight-mod.github.io/ext-dev/webpack/#patching
export const patches: ExtensionWebExports["patches"] = [
  // Render audio component
  {
    find: '"MosaicItemHoverButtons"',
    replace: {
      match: /switch\(\i\){case"IMAGE":return\(0,(\i)\.jsx\)/,
      replacement: (orig, ReactJSX) => `
      if (require("modPlayer_misc").formats.includes(arguments[0].item.originalItem.filename.split(".").at(-1))) return ${ReactJSX}.jsx(require("modPlayer_player").default, arguments[0]);
      ${orig}`
    }
  },
  // Pass pause handler and player context to component
  {
    find: /onPlay:\i\}=this\.props/,
    replace: {
      match: /(let{.*?)(}=this\.props.*?onPlay:\i)/,
      replacement: (_, start, mid) =>
        `${start},onPause,modPlayer,audioRegistered${mid},onPause,modPlayer,audioRegistered,`
    }
  },
  // Replace audio element with fake version
  {
    find: "renderMetadata()",
    replace: [
      {
        match: /(\i===\i\.AUDIO)\?(this\.renderAudio\(\)):/,
        replacement: (_orig, audioCheck, render) =>
          `${audioCheck}?(require("modPlayer_misc").formats.includes(this.props.fileName.split(".").at(-1))?null:${render}):`
      },
      {
        match: /return\(0,\i\.jsxs\)\("div",{className:\i\(\)\(\i,\i\.newMosaicStyle/,
        replacement: (orig) =>
          `if(this.props.modPlayer)this.mediaRef.current=new (require("modPlayer_fakeAudio").default)(this);${orig}`
      }
    ]
  }
];

// https://moonlight-mod.github.io/ext-dev/webpack/#webpack-module-insertion
export const webpackModules: ExtensionWebExports["webpackModules"] = {
  player: {
    dependencies: [
      {
        ext: "modPlayer",
        id: "chiptune3"
      },
      {
        id: "react"
      }
    ]
  },
  fakeAudio: {},
  chiptune3: {},
  misc: {}
};
