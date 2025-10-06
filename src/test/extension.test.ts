import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
// import * as myExtension from '../../extension';

import { isSpace, isAlpha } from "../utils/string-utils";
import { RustAnalyzer } from "../analyzer/rust-analyzer";
import { SQLAnalyzer } from "../analyzer/sql-analyzer";
import { ShellAnalyzer } from "../analyzer/shell-analyzer";

// import * as fs from "fs/promises";

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


    // case 7: char literal
    // BUG: now in our implementation, we assume that the char literal may span multiple lines
    // which is not correct for many languages.
    // the lifetime must be on the same line!

    // 'hello\0', 这个语法本来就是错误的
    // 程序判断 'hello 是lifetime annotation
    // 然后又认为 '' char literal可以换行
    // 这个corner case就不处理了，就认为是错误吧，而且本来就是错误
    //     test("case 7", () => {

    //         const code = `

    //         #![allow(unused)]
    // fn main() {
    //     let _foo = b'hello\0';
    //     //~^ ERROR character literal may only contain one codepoint
    //     //~| HELP if you meant to write a byte string literal, use double quotes
    //     let _bar = 'hello';
    //     //~^ ERROR character literal may only contain one codepoint
    //     //~| HELP if you meant to write a string literal, use double quotes
    // }

    //         `;

    //         const analyzer = new RustAnalyzer({ text: code });
    //         // Add your test logic here
    //         const result = analyzer.analyze();
    //         if (result === undefined) {
    //             assert.fail("Analyzer returned undefined");
    //         }

    //         assert.strictEqual(result.codes, 5);
    //         assert.strictEqual(result.comments, 4);
    //     });

    // TODO: fix raw string with multiple # like r##"..."##
    test("case 8", () => {

        const code = `
#![allow(clippy::no_effect, unused)]
#![warn(clippy::needless_raw_string_hashes)]

fn main() {
    r#"\aaa"#;
    //~^ needless_raw_string_hashes
    r##"Hello "world"!"##;
    //~^ needless_raw_string_hashes
    r######" "### "## "# "######;
    //~^ needless_raw_string_hashes
    r######" "aa" "# "## "######;
    //~^ needless_raw_string_hashes
    br#"\aaa"#;
    //~^ needless_raw_string_hashes
    br##"Hello "world"!"##;
    //~^ needless_raw_string_hashes
    br######" "### "## "# "######;
    //~^ needless_raw_string_hashes
    br######" "aa" "# "## "######;
    //~^ needless_raw_string_hashes
    cr#"\aaa"#;
    //~^ needless_raw_string_hashes
    cr##"Hello "world"!"##;
    //~^ needless_raw_string_hashes
    cr######" "### "## "# "######;
    //~^ needless_raw_string_hashes
    cr######" "aa" "# "## "######;
    //~^ needless_raw_string_hashes

    r#"
    //~^ needless_raw_string_hashes
        \a
        multiline
        string
    "#;

    r###"rust"###;
    //~^ needless_raw_string_hashes
    r#"hello world"#;
    //~^ needless_raw_string_hashes
}

fn issue_13503() {
    println!(r"SELECT * FROM posts");
    println!(r#"SELECT * FROM posts"#);
    //~^ needless_raw_string_hashes
    println!(r##"SELECT * FROM "posts""##);
    //~^ needless_raw_string_hashes
    println!(r##"SELECT * FROM "posts""##);
    //~^ needless_raw_string_hashes

    // Test arguments as well
    println!("{}", r"foobar".len());
}

        `;
        const analyzer = new RustAnalyzer({ text: code });
        // Add your test logic here
        const result = analyzer.analyze();
        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 31);
        assert.strictEqual(result.comments, 18);
    });
});

suite("SQL Analyzer Test Suite", () => {

    // Test basic SQL queries
    test("basic SELECT query", () => {
        const code = `
-- This is a simple SELECT query
SELECT id, name, email
FROM users
WHERE active = 1
ORDER BY name;
        `;

        const analyzer = new SQLAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 4);
        assert.strictEqual(result.comments, 1);
    });

    // Test SQL with block comments
    test("SQL with block comments", () => {
        const code = `
/* This is a block comment */
SELECT * FROM users;

/*
 * Multi-line block comment
 * about the table structure
 */
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);
        `;

        const analyzer = new SQLAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 5);
        assert.strictEqual(result.comments, 5);
    });

    // Test SQL with strings and mixed content
    test("SQL with strings and mixed content", () => {
        const code = `
-- Insert statement with string values
INSERT INTO users (name, email)
VALUES ('John Doe', 'john@example.com');

-- Update with string condition
UPDATE users
SET email = 'john.doe@example.com'
WHERE name = 'John';
        `;

        const analyzer = new SQLAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 5);
        assert.strictEqual(result.comments, 2);
    });

    // Test SQL with empty lines and mixed comments
    test("SQL with empty lines and mixed comments", () => {
        const code = `
-- Database setup script

/* Create users table */
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255)
);

-- Add some sample data
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'alice@example.com');

/* End of script */
        `;

        const analyzer = new SQLAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 7);
        assert.strictEqual(result.comments, 4);
    });

    // Test SQL with quoted identifiers
    test("SQL with quoted identifiers", () => {
        const code = `
-- Using quoted identifiers for reserved words
SELECT "order", "limit" FROM orders;

UPDATE orders
SET "order" = 'completed'
WHERE "limit" > 100;
        `;

        const analyzer = new SQLAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 4);
        assert.strictEqual(result.comments, 1);
    });
});

suite("Shell Analyzer Test Suite", () => {

    // Test basic shell script
    test("basic shell script", () => {
        const code = `
#!/bin/bash

# This is a simple shell script
echo "Hello, World!"

# Define a variable
name="John"
echo "Hello, $name!"
        `;

        const analyzer = new ShellAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 3);
        assert.strictEqual(result.comments, 3);
    });

    // Test shell script with variables and commands
    test("shell script with variables and commands", () => {
        const code = `
#!/bin/bash

# Initialize variables
count=10
message="Processing files"

# Loop through files
for file in *.txt; do
    echo "Processing: $file"
    count=$((count + 1))
done

echo "Total processed: $count"
        `;

        const analyzer = new ShellAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 7);
        assert.strictEqual(result.comments, 3);
    });

    // Test shell script with functions
    test("shell script with functions", () => {
        const code = `
#!/bin/bash

# Function to greet user
greet() {
    echo "Hello, $1!"
}

# Function to calculate sum
add_numbers() {
    local a=$1
    local b=$2
    echo $((a + b))
}

# Main script
greet "Alice"
result=$(add_numbers 5 3)
echo "Result: $result"
        `;

        const analyzer = new ShellAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 11);
        assert.strictEqual(result.comments, 4);
    });

    // Test shell script with conditionals
    test("shell script with conditionals", () => {
        const code = `
#!/bin/bash

# Check if file exists
filename="test.txt"

if [ -f "$filename" ]; then
    echo "File exists: $filename"
elif [ -e "$filename" ]; then
    echo "File is a different type"
else
    echo "File does not exist"
fi

# Test numeric comparison
number=42
if [ $number -gt 0 ]; then
    echo "Number is positive"
fi
        `;

        const analyzer = new ShellAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 12);
        assert.strictEqual(result.comments, 3);
    });

    // Test shell script with strings and escaped quotes
    test("shell script with strings and escaped quotes", () => {
        const code = `
#!/bin/bash

# String with escaped quotes
message='He said: "Hello world"'
echo $message

# Double quoted string with variables
name="Alice"
greeting="Hello, $name!"
echo $greeting

# Complex escaping
echo "This contains \\"double quotes\\" and \\$variables"
        `;

        const analyzer = new ShellAnalyzer({ text: code });
        const result = analyzer.analyze();

        if (result === undefined) {
            assert.fail("Analyzer returned undefined");
        }

        assert.strictEqual(result.codes, 6);
        assert.strictEqual(result.comments, 4);
    });
});

suite("Golang Analyzer Test Suite", () => {
});
