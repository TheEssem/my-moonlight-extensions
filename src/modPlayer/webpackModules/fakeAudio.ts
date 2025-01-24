import type { ChiptuneJsPlayer } from "@moonlight-mod/wp/modPlayer_chiptune3";

export default class FakeAudio {
  player: ChiptuneJsPlayer;
  constructor(element: any) {
    this.player = element.props.modPlayer;
    if (!element.props.audioRegistered[0]) {
      this.player.onEnded(() => {
        element.setState({
          playing: false
        });
      });
      element.props.audioRegistered[1](true);
    }
  }

  get currentTime() {
    return this.player.getCurrentTime();
  }

  set currentTime(val: number | undefined) {
    if (val == null) return;
    this.player.seek(val);
  }

  get duration() {
    return this.player.duration;
  }

  play() {}
  pause() {}
}
