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
    var removeSpecialChars = inputs.removeSpecialChars, replaceSpaces = inputs.replaceSpaces, replacementChar = inputs.replacementChar;
    var fileName = args.inputFileObj.fileNameWithoutExtension;
    try {
        args.jobLog("Original filename: ".concat(fileName, "\n"));
        // Remove or replace special characters that can cause issues with ffmpeg
        if (removeSpecialChars) {
            // Remove characters that commonly cause issues: quotes, brackets, parentheses, etc.
            fileName = fileName.replace(/['"\\`[\]{}()&|;$<>*?~]/g, replacementChar);
        }
        // Replace spaces if requested
        if (replaceSpaces) {
            fileName = fileName.replace(/\s+/g, replacementChar);
        }
        // Remove multiple consecutive replacement characters
        var replacementRegex = new RegExp("\\".concat(replacementChar, "{2,}"), 'g');
        fileName = fileName.replace(replacementRegex, replacementChar);
        // Remove leading/trailing replacement characters
        var trimRegex = new RegExp("^\\".concat(replacementChar, "+|\\").concat(replacementChar, "+$"), 'g');
        fileName = fileName.replace(trimRegex, '');
        // Ensure we have a valid filename
        if (!fileName || fileName.trim() === '') {
            fileName = 'normalized_file';
            args.jobLog('Warning: Filename became empty after normalization, using default name\n');
        }
        // Store normalized filename in variables for use by other plugins
        var updatedVariables = __assign(__assign({}, args.variables), { user: __assign(__assign({}, args.variables.user), { normalizedFileName: fileName, originalFileName: args.inputFileObj.fileNameWithoutExtension }) });
        args.jobLog("Normalized filename: ".concat(fileName, "\n"));
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 1,
            variables: updatedVariables,
        };
    }
    catch (error) {
        args.jobLog("Error normalizing filename: ".concat(error.message, "\n"));
        // Fallback to original filename
        var fallbackVariables = __assign(__assign({}, args.variables), { user: __assign(__assign({}, args.variables.user), { normalizedFileName: args.inputFileObj.fileNameWithoutExtension, originalFileName: args.inputFileObj.fileNameWithoutExtension }) });
        return {
            outputFileObj: args.inputFileObj,
            outputNumber: 1,
            variables: fallbackVariables,
        };
    }
};
exports.plugin = plugin;
