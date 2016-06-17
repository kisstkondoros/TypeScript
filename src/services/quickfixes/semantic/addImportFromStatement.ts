// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='./messageAndCodeBasedQuickFixBase.ts' />
namespace ts.quickFix.semantic {
    let path = require('path');
    export class AddImportFromStatement extends MessageAndCodeBasedQuickFixBase {
        protected getPattern(): RegExp {
            return /Cannot find name \'(\w+)\'./;
        }
        protected getSupportedErrorCode(): number {
            return Diagnostics.Cannot_find_name_0.code;
        }
        protected getIdentifierAndClassNameFromMatch(info: QuickFixQueryInformation, error: Diagnostic, match: RegExpMatchArray): IdentifierAndClassName[] {
            var [, identifierName] = match;
            let importCandidates = getClassesOrInterfacesBasedOnName(info.program.getSourceFiles(), identifierName);
            return importCandidates.map(importCandidate => {
                if (importCandidate) {
                    let file = removeExt(makeRelativePath(path.dirname(error.file.path), importCandidate.getSourceFile().path));
                    return { identifierName, file };
                }
            });
        }
        protected getDisplay(context: QuickFixContext): string {
            var {identifierName, file} = context.identifierAndClassName;
            return file ? `import {${identifierName}} from \"${file}\"` : undefined;
        }

        protected getRefactorings(context: QuickFixContext) {
            var {identifierName, file} = context.identifierAndClassName;
            let formatCodeOptions = context.info.project.projectService.getFormatCodeOptions();
            var newLine = formatCodeOptions.NewLineCharacter;
            let refactorings: ts.server.protocol.Refactoring[] = [{
                span: {
                    start: 0,
                    length: 0
                },
                newText: `import {${identifierName}} from \"${file}\";${newLine}`,
                filePath: context.info.sourceFile.fileName
            }];

            return refactorings;
        }
    }
}