/// <reference types="svelte" />

import * as _vscode from "vscode";

declare global {
  const tsvscode: {
    postMessage: ({ type, value }: { type: string, value: any }) => void;
    getState: () => any;
    setState: (state: any) => void;
  };
  const apiBaseUrl: string;
  const environment: string;
}