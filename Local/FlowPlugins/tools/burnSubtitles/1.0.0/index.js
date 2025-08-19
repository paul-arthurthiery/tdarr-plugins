"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var details = function () { return ({
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
}); };
exports.details = details;
var plugin = function (args) {
    // Load default values manually to avoid external lib dependency
    var pluginDetails = details();
    var inputs = {};
    // Set default values from plugin details
    pluginDetails.inputs.forEach(function (input) {
        inputs[input.name] = args.inputs[input.name] !== undefined
            ? args.inputs[input.name]
            : input.defaultValue;
    });
    var videoCodec = inputs.videoCodec, audioCodec = inputs.audioCodec, ffmpegPath = inputs.ffmpegPath;
    // Check if subtitle index is available from previous plugin
    if (!args.variables.user.subtitleIndex) {
        args.jobLog('No subtitle index found in variables. Make sure to use Find Subtitle Index plugin first.\n');
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 2,
            variables: args.variables,
        };
    }
    var _a = args.variables.user, subtitleIndex = _a.subtitleIndex, subtitleRelativeIndex = _a.subtitleRelativeIndex;
    var inputPath = args.inputFileObj._id;
    // Get normalized filename from variables (set by Normalize Filename plugin)
    var fileName = args.variables.user.normalizedFileName || args.inputFileObj.fileNameWithoutExtension;
    try {
        // Create output file path
        var outputFilePath = "".concat(args.workDir, "/").concat(fileName, ".").concat(args.inputFileObj.container);
        args.jobLog("Burning ".concat(args.variables.user.subtitleCodec, " ").concat(args.variables.user.subtitleLanguage, " subtitles (index ").concat(subtitleIndex, ") with keyword \"").concat(args.variables.user.subtitleKeyword, "\"\n"));
        args.jobLog("Using video codec: ".concat(videoCodec, ", audio codec: ").concat(audioCodec, "\n"));
        args.jobLog("Output file: ".concat(outputFilePath, "\n"));
        // Burn ONLY the specific subtitle stream index
        // FFmpeg subtitle filter syntax: subtitles=filename:si=stream_index
        // where stream_index is the subtitle stream index (not the absolute stream index)
        // The issue might be that we need the subtitle stream index, not the absolute stream index
        // Let's try both approaches and add debugging
        args.jobLog("Burning subtitle: absolute index ".concat(subtitleIndex, ", relative index ").concat(subtitleRelativeIndex, "\n"));
        // Use subtitle-relative index for FFmpeg's si parameter
        // FFmpeg's si expects 0-based index among subtitle streams only
        var vfArg = "subtitles='".concat(inputPath, "':si=").concat(subtitleRelativeIndex);
        var ffmpegArgs = "-i \"".concat(inputPath, "\" -vf \"").concat(vfArg, "\" -c:v ").concat(videoCodec, " -c:a ").concat(audioCodec, " \"").concat(outputFilePath, "\"");
        args.jobLog("FFmpeg command: ".concat(ffmpegPath, " ").concat(ffmpegArgs, "\n"));
        args.jobLog("Subtitle filter: ".concat(vfArg, " (using relative index)\n"));
        // Set up the CLI arguments for the runCli plugin
        var updatedVariables = __assign(__assign({}, args.variables), { user: __assign(__assign({}, args.variables.user), { ffmpegPath: ffmpegPath, ffmpegArgs: ffmpegArgs, outputFilePath: outputFilePath }) });
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 1,
            variables: updatedVariables,
        };
    }
    catch (error) {
        args.jobLog("Error setting up subtitle burning: ".concat(error.message, "\n"));
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 2,
            variables: args.variables,
        };
    }
};
exports.plugin = plugin;
