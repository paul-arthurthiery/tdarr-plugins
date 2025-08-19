// Tdarr plugin: Select specific subtitles by codec/lang/title
// Author: PT’s custom
const { spawnSync } = require('child_process');

module.exports.details = () => ({
  id: 'Tdarr_Plugin_EngAssDialogue',
  Stage: 'Pre-processing',
  Name: 'Burn in specific subtitles (by codec/lang/title)',
  Type: 'Video',
  Operation: 'Transcode',
  Description: 'Selects subtitles by codec (default: ass), language (default: eng), and keyword in title (default: dialogue). Burns them in with libx265 encode. Skips file if no match is found.',
  Version: '1.1',
  Inputs: [
    {
      name: 'codec',
      type: 'string',
      defaultValue: 'ass',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Preferred subtitle codec (e.g., ass, subrip).',
    },
    {
      name: 'language',
      type: 'string',
      defaultValue: 'eng',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Preferred subtitle language (e.g., eng, fre, jpn).',
    },
    {
      name: 'keyword',
      type: 'string',
      defaultValue: 'dialogue',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Keyword to look for in subtitle title metadata (case-insensitive).',
    },
  ],
});

module.exports.plugin = (file, librarySettings, inputs) => {
  const response = {
    processFile: false,
    preset: '',
    container: '',
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false, // don’t retry if skipped
    infoLog: '',
    errorLog: '',
    FFmpegArgs: [],
  };

  const inputPath = file.file;

  // Run ffprobe to get subtitle streams
  const ffprobe = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 's',
    '-show_entries', 'stream=index,codec_name:stream_tags=language,title',
    '-of', 'json',
    inputPath,
  ]);

  if (ffprobe.status !== 0) {
    response.errorLog = 'ffprobe failed';
    return response;
  }

  let index = null;
  try {
    const data = JSON.parse(ffprobe.stdout.toString());
    const matchingStream = data.streams.find((s) => {
      const codecMatch = s.codec_name === inputs.codec;
      const langMatch = s.tags && s.tags.language === inputs.language;
      const keywordMatch = s.tags && s.tags.title
        && s.tags.title.toLowerCase().includes(inputs.keyword.toLowerCase());

      return codecMatch && langMatch && keywordMatch;
    });

    if (matchingStream) {
      index = matchingStream.index;
    }
  } catch (err) {
    response.errorLog = 'Failed parsing ffprobe output';
    return response;
  }

  if (index === null) {
    response.infoLog = `No matching subtitles found (codec=${inputs.codec}, lang=${inputs.language}, keyword="${inputs.keyword}") → skipping file.`;
    return response; // Skip processing
  }

  // Construct FFmpeg command
  const vfArg = `subtitles='${inputPath}:si=${index}'`;
  response.infoLog = `Using ${inputs.codec} ${inputs.language} subtitles at index ${index} with keyword "${inputs.keyword}"`;

  response.processFile = true;
  response.FFmpegArgs = [
    '-i', inputPath,
    '-vf', vfArg,
    '-c:v', 'libx265',
    '-c:a', 'copy',
    file.outputFile,
  ];

  return response;
};
