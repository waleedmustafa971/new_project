// videoFilters.ts

/* 
{
  id: "dramatic",
  skia: [...20 values...],
  ffmpeg: "colorchannelmixer=1.2:0:0:0:1.2:0:0:0:1.2:1"
}

 */
export const VIDEO_FILTERS = [
  {
    id: "normal",
    name: "Normal",
    matrix: [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
    ],
    ffmpeg: "colorchannelmixer=1:0:0:0:1:0:0:0:1:1"
  },
  {
    id: "warm",
    name: "Warm",
    matrix: [
      1.1, 0,   0,   0, 0.05,
      0,   1.0, 0,   0, 0.02,
      0,   0,   0.9, 0, 0,
      0,   0,   0,   1, 0,
    ],
     ffmpeg: "colorchannelmixer=0.9:0:0:0:1:0:0:0:0.9:1",
  },
  {
    id: "cool",
    name: "Cool",
    matrix: [
      0.9, 0,   0,   0, 0,
      0,   1.0, 0,   0, 0,
      0,   0,   1.1, 0, 0.05,
      0,   0,   0,   1, 0,
    ],
     ffmpeg: "colorchannelmixer=0.7:0:0:0:1.3:0:0:0:0.7:1",
  },
  {
    id: "vintage",
    name: "Vintage",
    matrix: [
      0.95, 0.05, 0,    0, 0.03,
      0.35, 0.65, 0,    0, 0.15,
      0.15, 0.25, 0.6,  0, 0.05,
      0,    0,    0,    1, 0,
    ],
     ffmpeg: "colorchannelmixer=1.1:0:0:0:1:0:0:0:0.9:1",
  },
  {
    id: "dramatic",
    name: "Dramatic",
    matrix: [
      1.3, -0.1, 0,    0, 0,
      -0.1, 1.3, 0,    0, 0,
      0,    0,    1.3,  0, 0,
      0,    0,    0,    1, 0,
    ],
    ffmpeg: "colorchannelmixer=0.9:0:0:0:1:0:0:0:1.1:1",
  },
  {
    id: "fade",
    name: "Fade",
    matrix: [
      0.85, 0,    0,    0, 0.1,
      0,    0.85, 0,    0, 0.1,
      0,    0,    0.85, 0, 0.1,
      0,    0,    0,    1, 0,
    ],
    ffmpeg: "colorchannelmixer=0.95:0.05:0:0:0.35:0.65:0:0:0.15:0.25:0.6:1",
  },
];
