// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SUPPORT_LANGUAGE } from './constant';
import { get } from 'superagent';
import { ModelProvider } from './definitionProvider';
import {RouteProvider, DvaModelProvider, RouteComponentCompletionItemProvider, DvaCompletionItemProvider} from './Provider'
import Container from 'typedi';
import FileSystem from './util/FilesSystem';
import { file } from '@babel/types';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const defJumper = vscode.languages.registerDefinitionProvider(SUPPORT_LANGUAGE, new ModelProvider());
  context.subscriptions.push(defJumper);  
  const compJumper = vscode.languages.registerDefinitionProvider(SUPPORT_LANGUAGE, new RouteProvider());
  context.subscriptions.push(compJumper);
  const dvaJumper = vscode.languages.registerDefinitionProvider(SUPPORT_LANGUAGE, new DvaModelProvider());
  context.subscriptions.push(dvaJumper);
  let fileSystem = Container.get(FileSystem);
  fileSystem.loadModels();
  fileSystem.loadPages();

  vscode.workspace.onDidCreateFiles( (e) => {
    console.log(" ===onDidCreateFiles ",e);
    e.files.forEach(uri=>{
      
    });
  } )
  vscode.workspace.onDidDeleteFiles( (e) => {
    console.log(" ===onDidDeleteFiles ",e);
    e.files.forEach(uri => {

    })
  } )
  vscode.workspace.onDidSaveTextDocument( (doc) => {
    console.log(" ===onDidSaveTextDocument ",doc);
    let uri = doc.uri;

    
  })
  vscode.workspace.onDidRenameFiles( (e) => {
    console.log(" ===onDidRenameFiles ",e);
e.files.forEach(uri => {

});

  } )
  vscode.workspace.onDidChangeWorkspaceFolders( (e)=>{
    console.log(" ===onDidChangeWorkspaceFolders ",e);
    
  } )

  vscode.languages.registerCompletionItemProvider(SUPPORT_LANGUAGE,new RouteComponentCompletionItemProvider() ,':', ' ', '/');
  vscode.languages.registerCompletionItemProvider(SUPPORT_LANGUAGE,new DvaCompletionItemProvider() ,':', ' ', '/');

}

// this method is called when your extension is deactivated
export function deactivate() {}
