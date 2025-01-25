import type { ChiptuneJsPlayer } from "@moonlight-mod/wp/modPlayer_chiptune3";

export default class FakeAudio {
  player: ChiptuneJsPlayer | null;
  volumeLevel: number;
  url: string;
  isMuted: boolean;
  ended: boolean;
  endHandler: ((e: Event) => void) | null;
  constructor(element: any) {
    this.player = null;
    this.volumeLevel = 1;
    this.url = element.props.src;
    this.isMuted = false;
    this.ended = true;
    this.endHandler = element.handleEnded;
  }

  get currentTime() {
    return this.player?.getCurrentTime() ?? 0;
  }

  set currentTime(val: number | undefined) {
    if (val == null) return;
    this.player?.setPos(val);
  }

  destroy() {
    this.player?.cleanup();
    this.endHandler = null;
    this.player = null;
  }

  get duration() {
    return this.player?.duration ?? NaN;
  }

  get muted() {
    return this.isMuted;
  }

  set muted(val: boolean) {
    this.player?.setVol(val ? 0 : this.volumeLevel);
    this.isMuted = val;
  }

  pause() {
    this.player?.pause();
  }

  play() {
    if (!this.player) {
      this.player = new (require("@moonlight-mod/wp/modPlayer_chiptune3").ChiptuneJsPlayer)({
        interpolationFilter: moonlight.getConfigOption<number>("modPlayer", "interpolation"),
        stereoSeparation: moonlight.getConfigOption<number>("modPlayer", "stereo")
      });
      this.player?.onInitialized(() => {
        this.player?.setVol(this.isMuted ? 0 : this.volumeLevel);
        this.player?.onEnded(() => {
          this.player?.pause();
          this.ended = true;
          this.endHandler?.(new Event("ended"));
        });
        this.play();
      });
      return;
    }
    if (this.ended) {
      if (!this.player.loaded) {
        this.player.load(this.url);
      } else {
        this.player.setPos(0);
      }
      this.ended = false;
    }
    this.player.unpause();
  }

  get volume() {
    return this.volumeLevel;
  }

  set volume(level: number) {
    if (level != null) this.player?.setVol(level);
    this.volumeLevel = level;
  }
}
