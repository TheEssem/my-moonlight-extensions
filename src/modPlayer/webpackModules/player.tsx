import React from "@moonlight-mod/wp/react";
import { ChiptuneJsPlayer } from "@moonlight-mod/wp/modPlayer_chiptune3";

function createPlayer() {
  return new ChiptuneJsPlayer({
    interpolationFilter: moonlight.getConfigOption<number>("modPlayer", "interpolation"),
    stereoSeparation: moonlight.getConfigOption<number>("modPlayer", "stereo")
  });
}

export default function ModPlayer(props) {
  const player = React.useMemo(createPlayer, []);
  const [ended, setEnded] = React.useState(true);
  const [registered, setRegistered] = React.useState(false);
  const audioRegistered = React.useState(false);
  React.useEffect(() => {
    if (!registered) {
      player.onEnded(() => {
        player.stop();
        setEnded(true);
      });
      setRegistered(true);
    }
    return () => player.stop();
  }, []);

  function onPlay() {
    if (ended) {
      player.load(props.item.downloadUrl);
      setEnded(false);
    } else {
      player.unpause();
    }
  }

  function onPause() {
    player.pause();
  }

  function onVolumeChange(vol: number) {
    player.setVol(vol);
  }

  function onMute(mute: boolean) {
    player.setVol(mute ? 0 : 1);
  }

  return props.renderAudioComponent({
    item: props.item,
    message: props.message,
    audioRegistered,
    onPlay,
    onPause,
    onVolumeChange,
    onMute,
    modPlayer: player
  });
}
