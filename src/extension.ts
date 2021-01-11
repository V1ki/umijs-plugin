// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SUPPORT_LANGUAGE } from './constant';
import { get } from 'superagent';
import { ModelProvider } from './definitionProvider';
import {RouteProvider, DvaModelProvider, RouteComponentCompletionItemProvider} from './Provider'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const defJumper = vscode.languages.registerDefinitionProvider(SUPPORT_LANGUAGE, new ModelProvider());
  context.subscriptions.push(defJumper);  
  const compJumper = vscode.languages.registerDefinitionProvider(SUPPORT_LANGUAGE, new RouteProvider());
  context.subscriptions.push(compJumper);
  const dvaJumper = vscode.languages.registerDefinitionProvider(SUPPORT_LANGUAGE, new DvaModelProvider());
  context.subscriptions.push(dvaJumper);

  vscode.languages.registerCompletionItemProvider(SUPPORT_LANGUAGE,new RouteComponentCompletionItemProvider() ,':');

}

// this method is called when your extension is deactivated
export function deactivate() {}
