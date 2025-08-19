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
    ffProbeData: {
      streams: Array<{
        index: number;
        codec_type: string;
        codec_name: string;
        tags?: {
          language?: string;
          title?: string;
        };
      }>;
    };
  };
  inputs: Record<string, unknown>;
  jobLog: (text: string) => void;
  variables: {
    user: Record<string, string>;
  };
}

const details = (): IpluginDetails => ({
  name: 'Find Subtitle Index',
  description: 'Finds subtitle stream index based on codec, language, and keyword criteria. Sets the index in variables for use by other plugins.',
  style: {
    borderColor: '#6efefc',
  },
  tags: 'video,subtitle,ffprobe',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faSearch',
  inputs: [
    {
      label: 'Subtitle Codec',
      name: 'codec',
      type: 'string',
      defaultValue: 'ass',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Preferred subtitle codec (e.g., ass, subrip, srt)',
    },
    {
      label: 'Subtitle Language',
      name: 'language',
      type: 'string',
      defaultValue: 'eng',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Preferred subtitle language (e.g., eng, fre, jpn)',
    },
    {
      label: 'Title Keyword',
      name: 'keyword',
      type: 'string',
      defaultValue: 'dialogue',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Keyword to look for in subtitle title metadata (case-insensitive)',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin if subtitle found',
    },
    {
      number: 2,
      tooltip: 'Skip processing if no matching subtitle found',
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

  const { codec, language, keyword } = inputs;

  try {
    args.jobLog(`Analyzing subtitle streams for: ${args.inputFileObj._id}\n`);
    args.jobLog(`Looking for: codec=${codec}, language=${language}, keyword="${keyword}"\n`);

    // Check if ffProbeData exists
    if (!args.inputFileObj.ffProbeData || !args.inputFileObj.ffProbeData.streams) {
      args.jobLog('No ffProbeData available for file\n');
      return {
        outputFileObj: args.inputFileObj,
        outputNumber: 2,
        variables: args.variables,
      };
    }

    // Get subtitle streams from existing ffProbeData
    const subtitleStreams = args.inputFileObj.ffProbeData.streams.filter(
      (stream) => stream.codec_type === 'subtitle',
    );

    args.jobLog(`Found ${subtitleStreams.length} subtitle streams in file\n`);

    // Find matching stream
    const matchingStream = subtitleStreams.find((stream) => {
      const codecMatch = stream.codec_name === codec;
      const langMatch = stream.tags && stream.tags.language === language;
      const keywordMatch = stream.tags && stream.tags.title
        && stream.tags.title.toLowerCase().includes((keyword as string).toLowerCase());

      return codecMatch && langMatch && keywordMatch;
    });

    let subtitleIndex: number | null = null;
    let subtitleRelativeIndex: number | null = null;

    if (matchingStream) {
      subtitleIndex = matchingStream.index;

      // Calculate subtitle-relative index for FFmpeg's si parameter
      // FFmpeg's si expects 0-based index among subtitle streams only
      subtitleRelativeIndex = subtitleStreams.findIndex(
        (stream) => stream.index === subtitleIndex,
      );

      args.jobLog(`Found subtitle at absolute index ${subtitleIndex}, subtitle-relative index ${subtitleRelativeIndex}\n`);
    }

    if (subtitleIndex === null) {
      args.jobLog(`No matching subtitles found (codec=${codec}, lang=${language}, keyword="${keyword}")\n`);

      // Log all available subtitles for debugging
      if (subtitleStreams.length > 0) {
        args.jobLog('Available subtitle streams:\n');
        subtitleStreams.forEach((stream) => {
          const streamCodec = stream.codec_name || 'unknown';
          const streamLang = stream.tags?.language || 'unknown';
          const streamTitle = stream.tags?.title || 'no title';
          args.jobLog(`  Index ${stream.index}: codec=${streamCodec}, language=${streamLang}, title="${streamTitle}"\n`);
        });
      } else {
        args.jobLog('No subtitle streams found in file\n');
      }

      args.jobLog('Skipping file due to no matching subtitles\n');
      return {
        outputFileObj: args.inputFileObj,
        outputNumber: 2,
        variables: args.variables,
      };
    }

    // Store subtitle indices in variables for use by other plugins
    const updatedVariables = {
      ...args.variables,
      user: {
        ...args.variables.user,
        subtitleIndex: subtitleIndex.toString(),
        subtitleRelativeIndex: (subtitleRelativeIndex ?? -1).toString(),
        subtitleCodec: codec as string,
        subtitleLanguage: language as string,
        subtitleKeyword: keyword as string,
      },
    };

    args.jobLog(`Found ${codec} ${language} subtitles at index ${subtitleIndex} with keyword "${keyword}"\n`);

    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: updatedVariables,
    };
  } catch (error) {
    args.jobLog(`Error finding subtitle index: ${(error as Error).message}\n`);
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
