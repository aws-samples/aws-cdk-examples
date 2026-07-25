#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const cdk_appsync_demo_stack_1 = require("../lib/cdk-appsync-demo-stack");
const env = { region: 'eu-central-1' };
const app = new cdk.App();
new cdk_appsync_demo_stack_1.CdkAppsyncDemoStack(app, 'CdkAppsyncDemoStack', { env });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWFwcHN5bmMtZGVtby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay1hcHBzeW5jLWRlbW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsTUFBWSxHQUFHLHdDQUFvQjtBQUNuQywwRUFBb0U7QUFFcEUsTUFBTSxHQUFHLEdBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUIsSUFBSSw0Q0FBbUIsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENka0FwcHN5bmNEZW1vU3RhY2sgfSBmcm9tICcuLi9saWIvY2RrLWFwcHN5bmMtZGVtby1zdGFjayc7XG5cbmNvbnN0IGVudiAgPSB7IHJlZ2lvbjogJ2V1LWNlbnRyYWwtMScgfTtcbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5uZXcgQ2RrQXBwc3luY0RlbW9TdGFjayhhcHAsICdDZGtBcHBzeW5jRGVtb1N0YWNrJywgeyBlbnYgfSApOyJdfQ==