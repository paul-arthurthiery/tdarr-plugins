"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.details = void 0;
const details = () => ({
    name: 'Burn ASS Subs',
    description: 'Burns ASS subtitles using FFmpeg with custom function',
    tags: 'subtitle,burn,ffmpeg,ass',
    flowPlugins: [
        {
            name: 'Input File',
            sourceRepo: 'Community',
            pluginName: 'inputFile',
            version: '1.0.0',
            inputsDB: {},
            id: 'jP1_a49MeO',
            position: {
                x: 368.7110788292972,
                y: -463.0838897539186,
            },
            fpEnabled: true,
        },
        {
            name: 'Check If Processed',
            sourceRepo: 'Community',
            pluginName: 'processedCheck',
            version: '1.0.0',
            id: 'UijB12H9n',
            position: {
                x: 368.896682193634,
                y: -395.3338897539186,
            },
            fpEnabled: true,
            inputsDB: {
                checkType: 'filePath',
            },
        },
        {
            name: 'Custom JS Function',
            sourceRepo: 'Community',
            pluginName: 'customFunction',
            version: '1.0.0',
            id: 'ih33ibH1d',
            position: {
                x: 393.2213524760541,
                y: -336.0110310155701,
            },
            fpEnabled: true,
            inputsDB: {
                code: `module.exports = async (args) => {
  const fileName = args.inputFileObj.fileNameWithoutExtension;
  args.variables.fileName = fileName;
  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};`,
            },
        },
        {
            name: 'Run CLI',
            sourceRepo: 'Community',
            pluginName: 'runCli',
            version: '1.0.0',
            id: '9sa7aaT9d',
            position: {
                x: 346.81909862183187,
                y: -283.83041818833067,
            },
            fpEnabled: true,
            inputsDB: {
                useCustomCliPath: 'true',
                customCliPath: '/usr/bin/ln',
                outputFileBecomesWorkingFile: 'true',
                doesCommandCreateOutputFile: 'true',
                cliArguments: '-s "{{{args.inputFileObj._id}}}" "${outputFilePath}"',
                userOutputFilePath: '${cacheDir}/{{{args.job.jobId}}}.{{{args.inputFileObj.container}}}',
            },
        },
        {
            name: 'Run CLI',
            sourceRepo: 'Community',
            pluginName: 'runCli',
            version: '1.0.0',
            id: 'g6JErwRcK',
            position: {
                x: 345.83725811005144,
                y: -214.75341585133887,
            },
            fpEnabled: true,
            inputsDB: {
                useCustomCliPath: 'true',
                customCliPath: '/usr/local/bin/ffmpeg',
                cliArguments: '-i "{{{args.inputFileObj._id}}}" -vf "subtitles=\'{{{args.inputFileObj._id}}}\'" -c:v libx265 -c:a copy "${outputFilePath}"',
                userOutputFilePath: '${cacheDir}/{{{args.variables.fileName}}}.{{{args.inputFileObj.container}}}',
            },
        },
        {
            name: 'Replace Original File',
            sourceRepo: 'Community',
            pluginName: 'replaceOriginalFile',
            version: '1.0.0',
            inputsDB: {},
            id: 'atKo37DHJ',
            position: {
                x: 336.63856489530053,
                y: -159.23905963400296,
            },
            fpEnabled: true,
        },
        {
            name: 'Add To Processed',
            sourceRepo: 'Community',
            pluginName: 'processedAdd',
            version: '1.0.0',
            id: '-jD3h5Rm9',
            position: {
                x: 333.58372631088804,
                y: -112.28716459985353,
            },
            fpEnabled: true,
            inputsDB: {
                fileToAdd: 'workingFile',
            },
        },
    ],
    flowEdges: [
        {
            source: 'jP1_a49MeO',
            sourceHandle: '1',
            target: 'UijB12H9n',
            targetHandle: null,
            id: 'wi8cnDQpW',
        },
        {
            source: 'UijB12H9n',
            sourceHandle: '1',
            target: 'ih33ibH1d',
            targetHandle: null,
            id: 'vKNEMPeLD',
        },
        {
            source: 'ih33ibH1d',
            sourceHandle: '1',
            target: '9sa7aaT9d',
            targetHandle: null,
            id: 'RiTq24_qJ',
        },
        {
            source: '9sa7aaT9d',
            sourceHandle: '1',
            target: 'g6JErwRcK',
            targetHandle: null,
            id: 'iZyALjJD_',
        },
        {
            source: 'g6JErwRcK',
            sourceHandle: '1',
            target: 'atKo37DHJ',
            targetHandle: null,
            id: 'jzz251oUZ',
        },
        {
            source: 'atKo37DHJ',
            sourceHandle: '1',
            target: '-jD3h5Rm9',
            targetHandle: null,
            id: 'kqeDY7tK6',
        },
    ],
});
exports.details = details;
