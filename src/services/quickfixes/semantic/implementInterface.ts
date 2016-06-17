// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='./messageAndCodeBasedQuickFixBase.ts' />
namespace ts.quickFix.semantic {
    export class ImplementInterface extends MessageAndCodeBasedQuickFixBase {
        protected getPattern(): RegExp {
            return /Class \'(\w+)\' incorrectly implements interface \'(\w+)\'.*Property \'(\w+)\' is missing in type \'(\w+)\'./;
        }
        protected getSupportedErrorCode(): number {
            return Diagnostics.Class_0_incorrectly_implements_interface_1.code;
        }
        protected getIdentifierAndClassNameFromMatch(info: QuickFixQueryInformation, error: Diagnostic, match: RegExpMatchArray): IdentifierAndClassName[] {
            var [, className, interfaceName, identifierName] = match;
            return [{ className, interfaceName, identifierName }];
        }
        protected getDisplay(context: QuickFixContext): string {
            var {interfaceName, className, identifierName} = context.identifierAndClassName;
            return `Implement ${identifierName} from ${interfaceName} in ${className}`;
        }

        protected getRefactorings(context: QuickFixContext) {
            let info = context.info;
            var {className, interfaceName, identifierName} = context.identifierAndClassName;

            let interfaceTarget = <ts.InterfaceDeclaration>getNodeByKindAndName(info.program.getSourceFiles(), ts.SyntaxKind.InterfaceDeclaration, interfaceName);
            let classTarget = <ts.ClassDeclaration>getNodeByKindAndName([info.sourceFile], ts.SyntaxKind.ClassDeclaration, className);
            let firstBrace = classTarget.getChildren().filter(x => x.kind === ts.SyntaxKind.OpenBraceToken)[0];

            let formatCodeOptions = info.project.projectService.getFormatCodeOptions();

            var newLine = formatCodeOptions.NewLineCharacter;
            var indentLength = info.service.getIndentationAtPosition(classTarget.getSourceFile().fileName, firstBrace.end, formatCodeOptions);

            var indent = formatting.getIndentationString(indentLength + formatCodeOptions.IndentSize, formatCodeOptions);
            var indentForContent = formatting.getIndentationString(indentLength + 2 * formatCodeOptions.IndentSize, formatCodeOptions);

            let refactorings: ts.server.protocol.Refactoring[] = [];
            interfaceTarget.members.forEach(function (member) {
                let name = member.name && (<any>member.name).text;
                if (name && identifierName === name) {
                    let content = "";
                    if (member.kind === ts.SyntaxKind.MethodSignature) {
                        var memberAsText = member.getFullText();
                        content = (newLine + indent) + memberAsText.replace('abstract', '');
                        if (content.lastIndexOf(';') === content.length - 1) {
                            content = content.substring(0, content.length - 1);
                        }
                        content += ' {' + newLine + indentForContent + 'return null;' + newLine + indent + '}';
                    } else {
                        content = (newLine + indent) + member.getFullText();
                    }
                    var refactoring = {
                        span: {
                            start: firstBrace.end,
                            length: 0
                        },
                        newText: content,
                        filePath: classTarget.getSourceFile().fileName
                    };
                    refactorings.push(refactoring);
                }
            });

            return refactorings;
        }
    }
}