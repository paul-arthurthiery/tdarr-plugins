// Define interfaces locally to avoid complex import paths
interface IpluginInputUi {
  type: 'dropdown' | 'text' | 'textarea' | 'directory' | 'slider' | 'switch';
  options?: string[];
  sliderOptions?: { max: number; min: number };
  style?: Record<string, unknown>;
}

interface IpluginInputs {
  label: string;
  name: string;
  type: 'string' | 'boolean' | 'number';
  defaultValue: string;
  inputUI: IpluginInputUi;
  tooltip: string;
}

interface IpluginDetails {
  name: string;
  description: string;
  style: {
    borderColor: string;
    opacity?: number;
    borderRadius?: number | string;
    width?: number | string;
    height?: number | string;
    backgroundColor?: string;
  };
  tags: string;
  isStartPlugin: boolean;
  pType: 'start' | 'onFlowError' | '';
  sidebarPosition: number;
  icon: string;
  inputs: IpluginInputs[];
  outputs: {
    number: number;
    tooltip: string;
  }[];
  requiresVersion: string;
}

interface IpluginOutputArgs {
  outputNumber: number;
  outputFileObj: {
    _id: string;
  };
  variables: {
    user: Record<string, string>;
  };
}

interface IpluginInputArgs {
  inputFileObj: {
    _id: string;
    fileNameWithoutExtension: string;
    container: string;
  };
  inputs: Record<string, unknown>;
  jobLog: (text: string) => void;
  workDir: string;
  variables: {
    user: Record<string, string>;
  };
}

const details = (): IpluginDetails => ({
  name: 'Burn Subtitles',
  description: 'Burns subtitles into video using ffmpeg with the subtitle index from variables. Requires subtitle index to be set by Find Subtitle Index plugin.',
  style: {
    borderColor: '#ff6900',
  },
  tags: 'video,subtitle,ffmpeg',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faFire',
  inputs: [
    {
      label: 'Video Codec',
      name: 'videoCodec',
      type: 'string',
      defaultValue: 'libx265',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Video codec to use for encoding (e.g., libx265, libx264)',
    },
    {
      label: 'Audio Codec',
      name: 'audioCodec',
      type: 'string',
      defaultValue: 'copy',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Audio codec to use (copy to keep original, or specify codec like aac)',
    },
    {
      label: 'FFmpeg Path',
      name: 'ffmpegPath',
      type: 'string',
      defaultValue: '/usr/local/bin/ffmpeg',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Path to ffmpeg binary',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin if subtitle burning successful',
    },
    {
      number: 2,
      tooltip: 'Skip processing if no subtitle index found or error occurred',
    },
  ],
});

const plugin = (args: IpluginInputArgs): IpluginOutputArgs => {
  // Load default values manually to avoid external lib dependency
  const pluginDetails = details();
  const inputs: Record<string, unknown> = {};

  // Set default values from plugin details
  pluginDetails.inputs.forEach((input) => {
    inputs[input.name] = args.inputs[input.name] !== undefined
      ? args.inputs[input.name]
      : input.defaultValue;
  });

  const { videoCodec, audioCodec, ffmpegPath } = inputs;

  // Check if subtitle index is available from previous plugin
  if (!args.variables.user.subtitleIndex) {
    args.jobLog('No subtitle index found in variables. Make sure to use Find Subtitle Index plugin first.\n');
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }

  const { subtitleIndex, subtitleRelativeIndex } = args.variables.user;
  const inputPath = args.inputFileObj._id;

  // Get normalized filename from variables (set by Normalize Filename plugin)
  const fileName = args.variables.user.normalizedFileName || args.inputFileObj.fileNameWithoutExtension;

  try {
    // Create output file path
    const outputFilePath = `${args.workDir}/${fileName}.${args.inputFileObj.container}`;

    args.jobLog(`Burning ${args.variables.user.subtitleCodec} ${args.variables.user.subtitleLanguage} subtitles (index ${subtitleIndex}) with keyword "${args.variables.user.subtitleKeyword}"\n`);
    args.jobLog(`Using video codec: ${videoCodec}, audio codec: ${audioCodec}\n`);
    args.jobLog(`Output file: ${outputFilePath}\n`);

    // Burn ONLY the specific subtitle stream index
    // FFmpeg subtitle filter syntax: subtitles=filename:si=stream_index
    // where stream_index is the subtitle stream index (not the absolute stream index)

    // The issue might be that we need the subtitle stream index, not the absolute stream index
    // Let's try both approaches and add debugging

    args.jobLog(`Burning subtitle: absolute index ${subtitleIndex}, relative index ${subtitleRelativeIndex}\n`);

    // Use subtitle-relative index for FFmpeg's si parameter
    // FFmpeg's si expects 0-based index among subtitle streams only
    const vfArg = `subtitles='${inputPath}':si=${subtitleRelativeIndex}`;
    const ffmpegArgs = `-i "${inputPath}" -vf "${vfArg}" -c:v ${videoCodec} -c:a ${audioCodec} "${outputFilePath}"`;

    args.jobLog(`FFmpeg command: ${ffmpegPath} ${ffmpegArgs}\n`);
    args.jobLog(`Subtitle filter: ${vfArg} (using relative index)\n`);

    // Set up the CLI arguments for the runCli plugin
    const updatedVariables = {
      ...args.variables,
      user: {
        ...args.variables.user,
        ffmpegPath: ffmpegPath as string,
        ffmpegArgs,
        outputFilePath,
      },
    };

    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: updatedVariables,
    };
  } catch (error) {
    args.jobLog(`Error setting up subtitle burning: ${(error as Error).message}\n`);
    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 2,
      variables: args.variables,
    };
  }
};

export {
  details,
  plugin,
};
