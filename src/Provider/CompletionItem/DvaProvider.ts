import { join } from "path";
import { config } from "process";
import Container from "typedi";
import * as vscode from "vscode";
import { logger } from "../../constant";
import FileSystem from "../../util/FilesSystem";

export default class DvaProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        
        const filePath = document.uri.fsPath ;
        console.log(filePath , position, token, context);
        const lineText = document.getText(
          new vscode.Range(position.with(position.line, 0), position)
        );
        logger.info(`current line ${lineText}`);
        console.log("context",context);
        //todo 更智能的判断
        if (!lineText.includes("type")) {
          return [];
        }
        const completionItems: vscode.CompletionItem[] = [];
        // list pages
        const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
        
        logger.info(`cwd: ${cwd}`);
        let fileSystem = Container.get(FileSystem);
        fileSystem.models.forEach(p => {

            p.effects.forEach(e => {

                const item = new vscode.CompletionItem(` '${p.namespace}/${e}'`)
                item.documentation = new vscode.MarkdownString( `\`\`\`typescript\n${p.namespace}\`\`\``)
                completionItems.push(item)
            })

        })

        return completionItems;
    }
    
}