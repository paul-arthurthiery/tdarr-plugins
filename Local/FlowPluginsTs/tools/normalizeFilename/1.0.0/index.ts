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
  variables: {
    user: Record<string, string>;
  };
}

const details = (): IpluginDetails => ({
  name: 'Normalize Filename',
  description: 'Normalizes filename to handle special characters that could cause issues with ffmpeg. Stores the normalized filename in variables for use by other plugins.',
  style: {
    borderColor: '#4CAF50',
  },
  tags: 'file,normalize,ffmpeg',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faFileSignature',
  inputs: [
    {
      label: 'Remove Special Characters',
      name: 'removeSpecialChars',
      type: 'boolean',
      defaultValue: 'true',
      inputUI: {
        type: 'switch',
      },
      tooltip: 'Remove special characters that could cause issues with ffmpeg',
    },
    {
      label: 'Replace Spaces',
      name: 'replaceSpaces',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: {
        type: 'switch',
      },
      tooltip: 'Replace spaces with underscores',
    },
    {
      label: 'Custom Replacement Character',
      name: 'replacementChar',
      type: 'string',
      defaultValue: '_',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Character to use when replacing special characters or spaces',
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin with normalized filename',
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

  const { removeSpecialChars, replaceSpaces, replacementChar } = inputs;
  let fileName = args.inputFileObj.fileNameWithoutExtension;

  try {
    args.jobLog(`Original filename: ${fileName}\n`);

    // Remove or replace special characters that can cause issues with ffmpeg
    if (removeSpecialChars) {
      // Remove characters that commonly cause issues: quotes, brackets, parentheses, etc.
      fileName = fileName.replace(/['"\\`[\]{}()&|;$<>*?~]/g, replacementChar as string);
    }

    // Replace spaces if requested
    if (replaceSpaces) {
      fileName = fileName.replace(/\s+/g, replacementChar as string);
    }

    // Remove multiple consecutive replacement characters
    const replacementRegex = new RegExp(`\\${replacementChar as string}{2,}`, 'g');
    fileName = fileName.replace(replacementRegex, replacementChar as string);

    // Remove leading/trailing replacement characters
    const trimRegex = new RegExp(`^\\${replacementChar as string}+|\\${replacementChar as string}+$`, 'g');
    fileName = fileName.replace(trimRegex, '');

    // Ensure we have a valid filename
    if (!fileName || fileName.trim() === '') {
      fileName = 'normalized_file';
      args.jobLog('Warning: Filename became empty after normalization, using default name\n');
    }

    // Store normalized filename in variables for use by other plugins
    const updatedVariables = {
      ...args.variables,
      user: {
        ...args.variables.user,
        normalizedFileName: fileName,
        originalFileName: args.inputFileObj.fileNameWithoutExtension,
      },
    };

    args.jobLog(`Normalized filename: ${fileName}\n`);

    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: updatedVariables,
    };
  } catch (error) {
    args.jobLog(`Error normalizing filename: ${(error as Error).message}\n`);
    // Fallback to original filename
    const fallbackVariables = {
      ...args.variables,
      user: {
        ...args.variables.user,
        normalizedFileName: args.inputFileObj.fileNameWithoutExtension,
        originalFileName: args.inputFileObj.fileNameWithoutExtension,
      },
    };

    return {
      outputFileObj: args.inputFileObj,
      outputNumber: 1,
      variables: fallbackVariables,
    };
  }
};

export {
  details,
  plugin,
};
