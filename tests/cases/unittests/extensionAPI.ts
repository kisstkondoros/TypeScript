/// <reference path="..\..\..\src\harness\harness.ts" />

namespace ts {
    describe("Extension API", () => {

        function checkDiagnostics(diagnostics: Diagnostic[], expectedDiagnosticCodes?: number[]) {
            if (!expectedDiagnosticCodes) {
                return;
            }

            for (let i = 0; i < expectedDiagnosticCodes.length; i++) {
                assert.equal(expectedDiagnosticCodes[i], diagnostics[i] && diagnostics[i].code, `Could not find expeced diagnostic.`);
            }
            assert.equal(diagnostics.length, expectedDiagnosticCodes.length, "Resuting diagnostics count does not match expected");
        }

        interface ExtensionTestOptions {
            compilerOptions: CompilerOptions;
            availableExtensions: string[];
            expectedDiagnostics: number[]; // Extensions all use one diagnostic code right now - this needs to be mroe robust
        }

        const {content: libContent} = Harness.getDefaultLibraryFile(Harness.IO);
        const virtualLib: Map<string> = {
            "+lib/lib.d.ts": libContent
        };

        let virtualFs: Map<string> = {};

        const getCanonicalFileName = createGetCanonicalFileName(true);

        function loadSetIntoFsAt(set: Map<string>, prefix: string) {
            forEachKey(set, key => void (virtualFs[getCanonicalFileName(combinePaths(prefix, key))] = set[key]));
        }

        function loadSetIntoFs(set: Map<string>) {
            forEachKey(set, key => void (virtualFs[getCanonicalFileName(key)] = set[key]));
        }

        const mockHost: CompilerHost = {
            useCaseSensitiveFileNames() { return true },
            getNewLine() { return "\n"; },
            readFile(path) { return virtualFs[this.getCanonicalFileName(path)]; },
            writeFile(path, content, foo, bar, baz) {
                virtualFs[this.getCanonicalFileName(path)] = content; 
            },
            fileExists(path) {
                return !!virtualFs[this.getCanonicalFileName(path)];
            },
            directoryExists(path) {
                const fullPath = this.getCanonicalFileName(path);
                return forEach(getKeys(virtualFs), key => startsWith(key, fullPath));
            },
            getCurrentDirectory(): string { return "/"; },
            getSourceFile(path, languageVersion, onError): SourceFile {
                const fullPath = this.getCanonicalFileName(path);
                return createSourceFile(fullPath, virtualFs[fullPath], languageVersion);
            },
            getDefaultLibLocation() {
                return "+lib/";
            },
            getDefaultLibFileName(options) {
                return combinePaths(this.getDefaultLibLocation(), getDefaultLibFileName(options))
            },
            getCanonicalFileName,
        };

        let extensionAPI: Map<string> = {
            "package.json": ``,
            "index.ts": ``,
        }
        // Compile extension API once (generating .d.ts and .js)

        function compile(fileset: Map<string>, options: ts.CompilerOptions): Diagnostic[] {
            loadSetIntoFs(virtualLib);
            loadSetIntoFs(fileset);

            var program = createProgram(getKeys(fileset), options, mockHost);
            var emitResult = program.emit();

             return ts.getPreEmitDiagnostics(program);
        }

        function buildMap(map: Map<string>, out: Map<string>, shouldError?: boolean): Diagnostic[] {
            const diagnostics = compile(map, {module: ModuleKind.CommonJS, declaration: true});
            if (shouldError && diagnostics && diagnostics.length) {
                for (let i = 0; i< diagnostics.length; i++) {
                    console.log(flattenDiagnosticMessageText(diagnostics[i].messageText, '\n'));
                }
                throw new Error("Compiling test harness extension API code resulted in errors.");
            }
            copyMap(virtualFs, out);
            virtualFs = {};
            return diagnostics;
        }
        buildMap(extensionAPI, extensionAPI, /*shouldError*/true);

        const extensions: Map<Map<string>> = {
            "test-syntactic-lint": {
                "package.json": ``,
                "index.ts": ``,
            },
            "test-semantic-lint": {
                "package.json": ``,
                "index.ts": ``,
            }
        };
        loadSetIntoFsAt(extensionAPI, "node_modules/typescript-plugin-api");
        buildMap(extensions["test-syntactic-lint"], extensions["test-syntactic-lint"], /*shouldError*/true);
        loadSetIntoFsAt(extensionAPI, "node_modules/typescript-plugin-api");
        buildMap(extensions["test-semantic-lint"], extensions["test-semantic-lint"], /*shouldError*/true);

        // Compile each extension once with the extension API in its node_modules folder (also generating .d.ts and .js)

        /**
         * Setup a new test, where all extensions specified in the options hash are available in a node_modules folder, alongside the extension API
         */
        function test(sources: Map<string>, options: ExtensionTestOptions) {
            forEach(options.availableExtensions, ext => loadSetIntoFsAt(extensions[ext], `node_modules/${ext}`));
            const diagnostics = buildMap(sources, sources);
            checkDiagnostics(diagnostics, options.expectedDiagnostics);
        }
    });
}
