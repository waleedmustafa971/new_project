import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

/*
  fluent-ffmpeg shells out to ffmpeg and ffprobe, and finds them only on PATH.
  Neither was installed here, so every call rejected with "Cannot find ffmpeg"
  — which took down the whole reel pipeline: export-music-video returned an
  error, the app read data.videoUrl as undefined, fell into its else branch and
  showed "Image Updated" while staying on the same screen. Nothing was ever
  posted and nothing said why.

  The binaries now ship with the project rather than depending on what happens
  to be installed on the host, so a fresh checkout works without a system
  install. setFfmpegPath is global to the fluent-ffmpeg module, but every
  caller imports ffmpeg from here so the configuration cannot be skipped by
  import order.
*/

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

export default ffmpeg;
