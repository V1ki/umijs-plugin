import { join } from "path";
import { config } from "process";
import * as vscode from "vscode";
import { logger } from "../constant";
import FileSystem from "../util/FilesSystem";

export default class RouteComponentCompletionItemProvider
  implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    const filePath = document.uri.fsPath;
    console.log(filePath , position, token, context);
    const lineText = document.getText(
      new vscode.Range(position.with(position.line, 0), position)
    );
    logger.info(`current line ${lineText}`);
    //todo 更智能的判断
    if (!lineText.includes("component")) {
      return [];
    }
    const completionItems: vscode.CompletionItem[] = [];
    // list pages
    const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
    
    logger.info(`cwd: ${cwd}`);
    const fileSystem=  new FileSystem()
    const pages = fileSystem.loadPages();


    pages.forEach(p => {
      const item = new vscode.CompletionItem(` '${p}'`)
      item.documentation = new vscode.MarkdownString( `\`\`\`typescript\n${p}\`\`\``)
      completionItems.push(item)
    })

    return completionItems;
  }
}
