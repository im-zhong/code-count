import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

import { isSpace, isAlpha } from "../utils/string-utils";
import { RustAnalyzer } from "../analyzer/rust-analyzer";


suite("Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");

    // test("Sample test", () => {
    //   assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    //   assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    // });

    test("try workspace", () => {
        vscode.workspace.workspaceFolders?.forEach((workspaceFolder) => {
            const workspacePath = workspaceFolder.uri.fsPath;
            // const gitIgnorePath = `${workspacePath}/.gitignore`;
            // const gitIgnoreContent = vscode.workspace.fs.readFile(
            //   vscode.Uri.file(gitIgnorePath)
            // );
            // test("Test Git Ignore Filter", () => {
            //   assert.strictEqual(gitIgnoreContent, "node_modules\n");
            // });
            console.log(workspacePath);
        });
    });
});

suite("String Utils Test Suite", () => {
    test("isSpace", () => {
        assert.strictEqual(true, isSpace(" "));
        assert.strictEqual(true, isSpace("\t"));
        assert.strictEqual(true, isSpace("\n"));
        assert.strictEqual(true, isSpace("\r"));
        assert.strictEqual(true, isSpace("\f"));
        assert.strictEqual(true, isSpace("\v"));

        assert.strictEqual(false, isSpace("a"));
        assert.strictEqual(false, isSpace("1"));
        assert.strictEqual(false, isSpace("_"));
    });

    test("isAlpha", () => {
        assert.strictEqual(true, isAlpha("a"));
        assert.strictEqual(true, isAlpha("z"));
        assert.strictEqual(true, isAlpha("A"));
        assert.strictEqual(true, isAlpha("Z"));

        assert.strictEqual(false, isAlpha("1"));
        assert.strictEqual(false, isAlpha("_"));
        assert.strictEqual(false, isAlpha(" "));
        assert.strictEqual(false, isAlpha("\n"));
    });
});

// test rust analyzer
suite("Rust Analyzer Test Suite", () => {

    // case 1:
    test("case 1", () => {

        const code = `
        fn main() {

let a = [1, 2, 3, 4, 5];

  

// 然后让用户输入一个数字

let mut buf = String::new();

std::io::stdin()

.read_line(&mut buf)

.expect("read from stdin error");

  

// 然后进行要给解析

// 解析成index

let index: usize = buf.trim().parse().expect("please input a number");

  

println!("number is {}", a[index]);

}
        
        `;


        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 9);
        assert.strictEqual(result.comments, 3);
    });



});