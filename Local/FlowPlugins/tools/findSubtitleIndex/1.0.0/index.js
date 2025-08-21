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
            tooltip: 'If no keywords match, use this 0-based index among ALL subtitle streams. The stream at this index must match codec/language and have no/empty title. Use -1 to disable fallback.',
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
    var _a, _b, _c, _d;
    // Load default values manually to avoid external lib dependency
    var pluginDetails = details();
    var inputs = {};
    // Set default values from plugin details
    pluginDetails.inputs.forEach(function (input) {
        inputs[input.name] = args.inputs[input.name] !== undefined
            ? args.inputs[input.name]
            : input.defaultValue;
    });
    var codec = inputs.codec, language = inputs.language, keywords = inputs.keywords, fallbackIndex = inputs.fallbackIndex;
    // Parse keywords from comma-separated string
    var keywordList = keywords.split(',').map(function (k) { return k.trim(); }).filter(function (k) { return k.length > 0; });
    try {
        args.jobLog("Analyzing subtitle streams for: ".concat(args.inputFileObj._id, "\n"));
        args.jobLog("Looking for: codec=".concat(codec, ", language=").concat(language, ", keywords=\"").concat(keywordList.join(', '), "\", fallbackIndex=").concat(fallbackIndex, "\n"));
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
        var allSubtitleStreams = args.inputFileObj.ffProbeData.streams.filter(function (stream) { return stream.codec_type === 'subtitle'; });
        args.jobLog("Found ".concat(allSubtitleStreams.length, " subtitle streams in file\n"));
        // Filter streams by codec and language first (reused throughout)
        var matchingStreams_1 = allSubtitleStreams.filter(function (stream) {
            var _a;
            var codecMatch = stream.codec_name === codec;
            var langMatch = ((_a = stream.tags) === null || _a === void 0 ? void 0 : _a.language) === language;
            return codecMatch && langMatch;
        });
        args.jobLog("Found ".concat(matchingStreams_1.length, " streams matching codec=").concat(codec, " and language=").concat(language, "\n"));
        // If there's only one matching stream, use it regardless of other parameters
        if (matchingStreams_1.length === 1) {
            var singleStream = matchingStreams_1[0];
            args.jobLog("Only one stream matches codec and language - auto-selecting stream at index ".concat(singleStream.index, "\n"));
            var finalMatchResult_1 = { stream: singleStream, keyword: 'auto-selected-single-match' };
            var matchedKeyword_1 = finalMatchResult_1.keyword;
            var subtitleIndex_1 = finalMatchResult_1.stream.index;
            // Calculate subtitle-relative index for FFmpeg's si parameter
            var subtitleRelativeIndex_1 = allSubtitleStreams.findIndex(function (stream) { return stream.index === subtitleIndex_1; });
            args.jobLog("Found subtitle at absolute index ".concat(subtitleIndex_1, ", subtitle-relative index ").concat(subtitleRelativeIndex_1, "\n"));
            // Store subtitle indices in variables for use by other plugins
            var updatedVariables_1 = __assign(__assign({}, args.variables), { user: __assign(__assign({}, args.variables.user), { subtitleIndex: (subtitleIndex_1 !== null && subtitleIndex_1 !== void 0 ? subtitleIndex_1 : -1).toString(), subtitleRelativeIndex: (subtitleRelativeIndex_1 !== null && subtitleRelativeIndex_1 !== void 0 ? subtitleRelativeIndex_1 : -1).toString(), subtitleCodec: codec, subtitleLanguage: language, subtitleKeyword: matchedKeyword_1 }) });
            args.jobLog("Found ".concat(codec, " ").concat(language, " subtitles at index ").concat(subtitleIndex_1, " with keyword \"").concat(matchedKeyword_1, "\"\n"));
            return {
                outputFileObj: args.inputFileObj,
                outputNumber: 1,
                variables: updatedVariables_1,
            };
        }
        // Try each keyword in priority order and get the first match
        var matchResult = keywordList.reduce(function (acc, keyword) {
            if (acc) {
                return acc;
            }
            var foundStream = matchingStreams_1.find(function (stream) {
                var _a, _b;
                var titleMatch = (_b = (_a = stream.tags) === null || _a === void 0 ? void 0 : _a.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(keyword.toLowerCase());
                return titleMatch;
            });
            return foundStream ? { stream: foundStream, keyword: keyword } : undefined;
        }, undefined);
        var finalMatchResult = matchResult;
        if (!((_a = matchResult === null || matchResult === void 0 ? void 0 : matchResult.stream) === null || _a === void 0 ? void 0 : _a.index)) {
            if (!fallbackIndex) {
                args.jobLog("No matching subtitles found (codec=".concat(codec, ", lang=").concat(language, ", keywords=\"").concat(keywordList.join(', '), "\", and fallback index not specified)\n"));
                return {
                    outputFileObj: args.inputFileObj,
                    outputNumber: 2,
                    variables: args.variables,
                };
            }
            var fallbackIdx = Number(fallbackIndex);
            if (fallbackIdx < 0) {
                args.jobLog("No matching subtitles found (codec=".concat(codec, ", lang=").concat(language, ", keywords=\"").concat(keywordList.join(', '), "\", fallback index disabled)\n"));
                return {
                    outputFileObj: args.inputFileObj,
                    outputNumber: 2,
                    variables: args.variables,
                };
            }
            if (fallbackIdx >= matchingStreams_1.length) {
                args.jobLog("No matching subtitles found (codec=".concat(codec, ", lang=").concat(language, ", keywords=\"").concat(keywordList.join(', '), "\", fallback index ").concat(fallbackIdx, " out of bounds ").concat(matchingStreams_1.length, ")\n"));
                return {
                    outputFileObj: args.inputFileObj,
                    outputNumber: 2,
                    variables: args.variables,
                };
            }
            args.jobLog("No keyword matches found, trying fallback index ".concat(fallbackIdx, "\n"));
            var fallbackStream = allSubtitleStreams[fallbackIdx];
            // Validate that the fallback stream matches our criteria
            var codecMatch = fallbackStream.codec_name === codec;
            var langMatch = ((_b = fallbackStream.tags) === null || _b === void 0 ? void 0 : _b.language) === language;
            var hasNoTitle = !((_c = fallbackStream.tags) === null || _c === void 0 ? void 0 : _c.title) || fallbackStream.tags.title.trim() === '';
            if (codecMatch && langMatch && hasNoTitle) {
                finalMatchResult = { stream: fallbackStream, keyword: "fallback-index-".concat(fallbackIdx) };
                args.jobLog("Using fallback subtitle at absolute index ".concat(fallbackStream.index, " (fallback index ").concat(fallbackIdx, " among all subtitle streams)\n"));
            }
            else {
                args.jobLog("Fallback index ".concat(fallbackIdx, " does not match criteria (codec=").concat(codecMatch, ", lang=").concat(langMatch, ", noTitle=").concat(hasNoTitle, ")\n"));
                return {
                    outputFileObj: args.inputFileObj,
                    outputNumber: 2,
                    variables: args.variables,
                };
            }
        }
        if (!((_d = finalMatchResult === null || finalMatchResult === void 0 ? void 0 : finalMatchResult.stream) === null || _d === void 0 ? void 0 : _d.index)) {
            args.jobLog("No matching subtitles found (codec=".concat(codec, ", lang=").concat(language, ", keywords=\"").concat(keywordList.join(', '), "\", fallback=").concat(fallbackIndex, ")\n"));
            // Log all available subtitles for debugging
            if (allSubtitleStreams.length > 0) {
                args.jobLog('Available subtitle streams:\n');
                allSubtitleStreams.forEach(function (stream) {
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
        var matchedKeyword = (finalMatchResult === null || finalMatchResult === void 0 ? void 0 : finalMatchResult.keyword) || '';
        var subtitleIndex_2 = finalMatchResult === null || finalMatchResult === void 0 ? void 0 : finalMatchResult.stream.index;
        // Calculate subtitle-relative index for FFmpeg's si parameter
        // FFmpeg's si expects 0-based index among subtitle streams only
        var subtitleRelativeIndex = allSubtitleStreams.findIndex(function (stream) { return stream.index === subtitleIndex_2; });
        args.jobLog("Found subtitle at absolute index ".concat(subtitleIndex_2, ", subtitle-relative index ").concat(subtitleRelativeIndex, "\n"));
        // Store subtitle indices in variables for use by other plugins
        var updatedVariables = __assign(__assign({}, args.variables), { user: __assign(__assign({}, args.variables.user), { subtitleIndex: (subtitleIndex_2 !== null && subtitleIndex_2 !== void 0 ? subtitleIndex_2 : -1).toString(), subtitleRelativeIndex: (subtitleRelativeIndex !== null && subtitleRelativeIndex !== void 0 ? subtitleRelativeIndex : -1).toString(), subtitleCodec: codec, subtitleLanguage: language, subtitleKeyword: matchedKeyword }) });
        args.jobLog("Found ".concat(codec, " ").concat(language, " subtitles at index ").concat(subtitleIndex_2, " with keyword \"").concat(matchedKeyword, "\"\n"));
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
