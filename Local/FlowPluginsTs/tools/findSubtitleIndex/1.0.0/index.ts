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
  description: 'Finds subtitle stream index based on codec, language, and keyword criteria. Accepts multiple keywords with priority order - tries first keyword first, then second keyword, etc. Sets the index in variables for use by other plugins.',
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
      label: 'Title Keywords',
      name: 'keywords',
      type: 'string',
      defaultValue: 'dialogue,full,complete',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Comma-separated list of keywords to look for in subtitle title metadata (case-insensitive). Will prioritize keywords in order - first try to find streams matching the first keyword, then second keyword, etc.',
    },
    {
      label: 'Fallback Subtitle Index',
      name: 'fallbackIndex',
      type: 'number',
      defaultValue: '-1',
      inputUI: {
        type: 'text',
      },
      tooltip: 'If no keywords match, use this 0-based index among streams that match codec/language. The stream at this index must have no/empty title. Use -1 to disable fallback.',
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

  const {
    codec, language, keywords, fallbackIndex,
  } = inputs;

  // Parse keywords from comma-separated string
  const keywordList = (keywords as string).split(',').map((k) => k.trim()).filter((k) => k.length > 0);

  try {
    args.jobLog(`Analyzing subtitle streams for: ${args.inputFileObj._id}\n`);
    args.jobLog(`Looking for: codec=${codec}, language=${language}, keywords="${keywordList.join(', ')}", fallbackIndex=${fallbackIndex}\n`);

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
    const allSubtitleStreams = args.inputFileObj.ffProbeData.streams.filter(
      (stream) => stream.codec_type === 'subtitle',
    );

    args.jobLog(`Found ${allSubtitleStreams.length} subtitle streams in file\n`);

    // Filter streams by codec and language first (reused throughout)
    const matchingStreams = allSubtitleStreams.filter((stream) => {
      const codecMatch = stream.codec_name === codec;
      const langMatch = stream.tags?.language === language;
      return codecMatch && langMatch;
    });

    args.jobLog(`Found ${matchingStreams.length} streams matching codec=${codec} and language=${language}\n`);

    // If there's only one matching stream, use it regardless of other parameters
    if (matchingStreams.length === 1) {
      const singleStream = matchingStreams[0];
      args.jobLog(`Only one stream matches codec and language - auto-selecting stream at index ${singleStream.index}\n`);

      const finalMatchResult = { stream: singleStream, keyword: 'auto-selected-single-match' };
      const matchedKeyword = finalMatchResult.keyword;
      const subtitleIndex = finalMatchResult.stream.index;

      // Calculate subtitle-relative index for FFmpeg's si parameter
      const subtitleRelativeIndex = allSubtitleStreams.findIndex(
        (stream) => stream.index === subtitleIndex,
      );

      args.jobLog(`Found subtitle at absolute index ${subtitleIndex}, subtitle-relative index ${subtitleRelativeIndex}\n`);

      // Store subtitle indices in variables for use by other plugins
      const updatedVariables = {
        ...args.variables,
        user: {
          ...args.variables.user,
          subtitleIndex: (subtitleIndex ?? -1).toString(),
          subtitleRelativeIndex: (subtitleRelativeIndex ?? -1).toString(),
          subtitleCodec: codec as string,
          subtitleLanguage: language as string,
          subtitleKeyword: matchedKeyword,
        },
      };

      args.jobLog(`Found ${codec} ${language} subtitles at index ${subtitleIndex} with keyword "${matchedKeyword}"\n`);

      return {
        outputFileObj: args.inputFileObj,
        outputNumber: 1,
        variables: updatedVariables,
      };
    }

    // Try each keyword in priority order and get the first match
    const matchResult = keywordList.reduce((acc, keyword) => {
      if (acc) {
        return acc;
      }
      const foundStream = matchingStreams.find((stream) => {
        const titleMatch = stream.tags?.title?.toLowerCase().includes(keyword.toLowerCase());
        return titleMatch;
      });
      return foundStream ? { stream: foundStream, keyword } : undefined;
    },
      undefined as { stream: typeof matchingStreams[0]; keyword: string } | undefined);

    let finalMatchResult = matchResult;

    if (!matchResult?.stream?.index) {
      if (!fallbackIndex) {
        args.jobLog(`No matching subtitles found (codec=${codec}, lang=${language}, keywords="${keywordList.join(', ')}", and fallback index not specified)\n`);
        return {
          outputFileObj: args.inputFileObj,
          outputNumber: 2,
          variables: args.variables,
        };
      }
      const fallbackIdx = Number(fallbackIndex);
      if (fallbackIdx < 0) {
        args.jobLog(`No matching subtitles found (codec=${codec}, lang=${language}, keywords="${keywordList.join(', ')}", fallback index disabled)\n`);
        return {
          outputFileObj: args.inputFileObj,
          outputNumber: 2,
          variables: args.variables,
        };
      }
      if (fallbackIdx >= matchingStreams.length) {
        args.jobLog(`No matching subtitles found (codec=${codec}, lang=${language}, keywords="${keywordList.join(', ')}", fallback index ${fallbackIdx} out of bounds ${matchingStreams.length})\n`);
        return {
          outputFileObj: args.inputFileObj,
          outputNumber: 2,
          variables: args.variables,
        };
      }
      args.jobLog(`No keyword matches found, trying fallback index ${fallbackIdx} among ${matchingStreams.length} codec/language matching streams\n`);

      const fallbackStream = matchingStreams[fallbackIdx];

      // Validate that the fallback stream has no title (codec and language already match)
      const hasNoTitle = !fallbackStream.tags?.title || fallbackStream.tags.title.trim() === '';

      if (hasNoTitle) {
        finalMatchResult = { stream: fallbackStream, keyword: `fallback-index-${fallbackIdx}` };
        args.jobLog(`Using fallback subtitle at absolute index ${fallbackStream.index} (fallback index ${fallbackIdx} among codec/language matching streams)\n`);
      } else {
        args.jobLog(`Fallback index ${fallbackIdx} has title "${fallbackStream.tags?.title}" - only streams with no title allowed for fallback\n`);
        return {
          outputFileObj: args.inputFileObj,
          outputNumber: 2,
          variables: args.variables,
        };
      }
    }

    if (!finalMatchResult?.stream?.index) {
      args.jobLog(`No matching subtitles found (codec=${codec}, lang=${language}, keywords="${keywordList.join(', ')}", fallback=${fallbackIndex})\n`);

      // Log all available subtitles for debugging
      if (allSubtitleStreams.length > 0) {
        args.jobLog('Available subtitle streams:\n');
        allSubtitleStreams.forEach((stream) => {
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

    const matchedKeyword = finalMatchResult?.keyword || '';

    const subtitleIndex = finalMatchResult?.stream.index;

    // Calculate subtitle-relative index for FFmpeg's si parameter
    // FFmpeg's si expects 0-based index among subtitle streams only
    const subtitleRelativeIndex = allSubtitleStreams.findIndex(
      (stream) => stream.index === subtitleIndex,
    );

    args.jobLog(`Found subtitle at absolute index ${subtitleIndex}, subtitle-relative index ${subtitleRelativeIndex}\n`);

    // Store subtitle indices in variables for use by other plugins
    const updatedVariables = {
      ...args.variables,
      user: {
        ...args.variables.user,
        subtitleIndex: (subtitleIndex ?? -1).toString(),
        subtitleRelativeIndex: (subtitleRelativeIndex ?? -1).toString(),
        subtitleCodec: codec as string,
        subtitleLanguage: language as string,
        subtitleKeyword: matchedKeyword,
      },
    };

    args.jobLog(`Found ${codec} ${language} subtitles at index ${subtitleIndex} with keyword "${matchedKeyword}"\n`);

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
