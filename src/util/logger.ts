import * as vscode from "vscode";


export class Logger {

    private output: vscode.OutputChannel;

    constructor(){
        this.output = vscode.window.createOutputChannel("TestExtendsion");
    }


    log(msg: string){
        console.log(msg);
        this.output.appendLine(msg) ;
    }

    info(msg: string) {
        console.info(msg);
        this.output.appendLine(msg) ;
    }
}