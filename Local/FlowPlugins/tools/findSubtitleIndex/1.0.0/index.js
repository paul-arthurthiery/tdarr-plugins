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
    var codec = inputs.codec, language = inputs.language, keyword = inputs.keyword;
    try {
        args.jobLog("Analyzing subtitle streams for: ".concat(args.inputFileObj._id, "\n"));
        args.jobLog("Looking for: codec=".concat(codec, ", language=").concat(language, ", keyword=\"").concat(keyword, "\"\n"));
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
        var subtitleStreams = args.inputFileObj.ffProbeData.streams.filter(function (stream) { return stream.codec_type === 'subtitle'; });
        args.jobLog("Found ".concat(subtitleStreams.length, " subtitle streams in file\n"));
        // Find matching stream
        var matchingStream = subtitleStreams.find(function (stream) {
            var codecMatch = stream.codec_name === codec;
            var langMatch = stream.tags && stream.tags.language === language;
            var keywordMatch = stream.tags && stream.tags.title
                && stream.tags.title.toLowerCase().includes(keyword.toLowerCase());
            return codecMatch && langMatch && keywordMatch;
        });
        var subtitleIndex_1 = null;
        var subtitleRelativeIndex = null;
        if (matchingStream) {
            subtitleIndex_1 = matchingStream.index;
            // Calculate subtitle-relative index for FFmpeg's si parameter
            // FFmpeg's si expects 0-based index among subtitle streams only
            subtitleRelativeIndex = subtitleStreams.findIndex(function (stream) { return stream.index === subtitleIndex_1; });
            args.jobLog("Found subtitle at absolute index ".concat(subtitleIndex_1, ", subtitle-relative index ").concat(subtitleRelativeIndex, "\n"));
        }
        if (subtitleIndex_1 === null) {
            args.jobLog("No matching subtitles found (codec=".concat(codec, ", lang=").concat(language, ", keyword=\"").concat(keyword, "\")\n"));
            // Log all available subtitles for debugging
            if (subtitleStreams.length > 0) {
                args.jobLog('Available subtitle streams:\n');
                subtitleStreams.forEach(function (stream) {
                    var _a, _b;
                    var streamCodec = stream.codec_name || 'unknown';
                    var streamLang = ((_a = stream.tags) === null || _a === void 0 ? void 0 : _a.language) || 'unknown';
                    var streamTitle = ((_b = stream.tags) === null || _b === void 0 ? void 0 : _b.title) || 'no title';
                    args.jobLog("  Index ".concat(stream.index, ": codec=").concat(streamCodec, ", language=").concat(streamLang, ", title=\"").concat(streamTitle, "\"\n"));
                });
            }
            else {
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
        var updatedVariables = __assign(__assign({}, args.variables), { user: __assign(__assign({}, args.variables.user), { subtitleIndex: subtitleIndex_1.toString(), subtitleRelativeIndex: (subtitleRelativeIndex !== null && subtitleRelativeIndex !== void 0 ? subtitleRelativeIndex : -1).toString(), subtitleCodec: codec, subtitleLanguage: language, subtitleKeyword: keyword }) });
        args.jobLog("Found ".concat(codec, " ").concat(language, " subtitles at index ").concat(subtitleIndex_1, " with keyword \"").concat(keyword, "\"\n"));
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 1,
            variables: updatedVariables,
        };
    }
    catch (error) {
        args.jobLog("Error finding subtitle index: ".concat(error.message, "\n"));
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 2,
            variables: args.variables,
        };
    }
};
exports.plugin = plugin;
