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


    // case 2: test lifetime annotation
    test("case 2", () => {

        const code = `
        fn print_refs<'a, 'b>(x: &'a i32, y: &'b i32) {
            println!("x is {}, y is {}", x, y);
        }
        
        struct Ref<'a, T: 'a>(&'a T);
        
        fn choose_first<'a: 'b, 'b>(first: &'a i32, _: &'b i32) -> &'b i32 {
            first
        }
        
        fn main() {
            let s: &'static str = "hello world";
            let s1 = String::from("hello");
            let s2 = String::from("world");
            let r = Ref(&s);
            println!("r is {:?}", r);
            print_refs(&s1.len() as &i32, &s2.len() as &i32);
            let f = choose_first(&s1.len() as &i32, &s2.len() as &i32);
            println!("f is {}", f);
            let c = 'c';
            println!("c is {}", c);
        }
        `;
        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 19);
        assert.strictEqual(result.comments, 0);
    });

    // case 3: raw string
    test("case 3", () => {

        const code = `
                let contents = r#"
Rust:
safe, fast, productive.
Pick three."#;`;

        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 4);
        assert.strictEqual(result.comments, 0);
    });

    // case 4: back slash in string
    test("case 4", () => {

        const code = `
                    let contents = "\
    Rust:
    safe, fast, productive.
    Pick three.";`;

        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        // TODO: now the result is 1. which should be fix
        // 这个是代码预处理的时候就会做的事情，我们的程序读进来就只有三行了
        assert.strictEqual(result.codes, 3);
        assert.strictEqual(result.comments, 0);
    });

    // case 5:
    test("case 5", () => {

        // TODO: 支持跨行字符串，顺便把上面的问题也给修复了
        const code = `
        #[doc(alias = "
")] //~^ ERROR`;

        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 2);
        assert.strictEqual(result.comments, 1);
    });

    // case 6: macro rules
    test("case 6", () => {

        const code = `

// #2770
macro_rules! save_regs {
    () => {
        asm!("push rax
              push rcx
              push rdx
              push rsi
              push rdi
              push r8
              push r9
              push r10
              push r11"
             :::: "intel", "volatile");
    };
}

// #2642
macro_rules! template {
    ($name:expr) => {
        format_args!(
            r##"
"http://example.com"

# test
"##,
            $name
        )
    };
}

// 
macro_rules! template {
    () => {
        format_args!(
            r"
//

"
        )
    };
}
        `;
        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 36);
        assert.strictEqual(result.comments, 3);
    });
});