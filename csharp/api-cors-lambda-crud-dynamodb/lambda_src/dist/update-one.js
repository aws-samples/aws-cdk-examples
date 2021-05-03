"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var AWS = require('aws-sdk');
var db = new AWS.DynamoDB.DocumentClient();
var TABLE_NAME = process.env.TABLE_NAME || '';
var PRIMARY_KEY = process.env.PRIMARY_KEY || '';
var RESERVED_RESPONSE = "Error: You're using AWS reserved keywords as attributes", DYNAMODB_EXECUTION_ERROR = "Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.";
exports.handler = function (event) {
    if (event === void 0) { event = {}; }
    return __awaiter(void 0, void 0, void 0, function () {
        var editedItemId, editedItem, editedItemProperties, firstProperty, params, dbError_1, errorResponse;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!event.body) {
                        return [2 /*return*/, { statusCode: 400, body: 'invalid request, you are missing the parameter body' }];
                    }
                    editedItemId = event.pathParameters.id;
                    if (!editedItemId) {
                        return [2 /*return*/, { statusCode: 400, body: 'invalid request, you are missing the path parameter id' }];
                    }
                    editedItem = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
                    editedItemProperties = Object.keys(editedItem);
                    if (!editedItem || editedItemProperties.length < 1) {
                        return [2 /*return*/, { statusCode: 400, body: 'invalid request, no arguments provided' }];
                    }
                    firstProperty = editedItemProperties.splice(0, 1);
                    params = {
                        TableName: TABLE_NAME,
                        Key: (_a = {},
                            _a[PRIMARY_KEY] = editedItemId,
                            _a),
                        UpdateExpression: "set " + firstProperty + " = :" + firstProperty,
                        ExpressionAttributeValues: {},
                        ReturnValues: 'UPDATED_NEW'
                    };
                    params.ExpressionAttributeValues[":" + firstProperty] = editedItem["" + firstProperty];
                    editedItemProperties.forEach(function (property) {
                        params.UpdateExpression += ", " + property + " = :" + property;
                        params.ExpressionAttributeValues[":" + property] = editedItem[property];
                    });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db.update(params).promise()];
                case 2:
                    _b.sent();
                    return [2 /*return*/, { statusCode: 204, body: '' }];
                case 3:
                    dbError_1 = _b.sent();
                    errorResponse = dbError_1.code === 'ValidationException' && dbError_1.message.includes('reserved keyword') ?
                        DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
                    return [2 /*return*/, { statusCode: 500, body: errorResponse }];
                case 4: return [2 /*return*/];
            }
        });
    });
};
