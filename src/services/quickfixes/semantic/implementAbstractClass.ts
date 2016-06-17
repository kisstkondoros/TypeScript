// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='./messageAndCodeBasedQuickFixBase.ts' />
namespace ts.quickFix.semantic {
    export class ImplementAbstractClass extends MessageAndCodeBasedQuickFixBase {
        protected getPattern(): RegExp {
            return /Non-abstract class \'(\w+)\' does not implement inherited abstract member \'(\w+)\' from class \'(\w+)\'./;
        }
        protected getSupportedErrorCode(): number {
            return Diagnostics.Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2.code;
        }
        protected getIdentifierAndClassNameFromMatch(info: QuickFixQueryInformation, error: Diagnostic, match: RegExpMatchArray): IdentifierAndClassName[] {
            var [, className, identifierName, abstractClassName] = match;
            return [{ className, abstractClassName, identifierName }];
        }
        protected getDisplay(context: QuickFixContext): string {
            var {abstractClassName, className, identifierName} = context.identifierAndClassName;
            return `Implement ${identifierName} from ${abstractClassName} in ${className}`;
        }

        protected getRefactorings(context: QuickFixContext) {
            var {className, abstractClassName, identifierName} = context.identifierAndClassName;
            var {info} = context;

            let abstractClassTarget = <ts.InterfaceDeclaration>ts.quickFix.getNodeByKindAndName(info.program.getSourceFiles(), ts.SyntaxKind.ClassDeclaration, abstractClassName);

            let classTarget = <ts.ClassDeclaration>ts.quickFix.getNodeByKindAndName([info.sourceFile], ts.SyntaxKind.ClassDeclaration, className);

            let firstBrace = classTarget.getChildren().filter(x => x.kind === ts.SyntaxKind.OpenBraceToken)[0];

            let formatCodeOptions = info.project.projectService.getFormatCodeOptions();
            var newLine = formatCodeOptions.NewLineCharacter;

            var indentLength = info.service.getIndentationAtPosition(
                classTarget.getSourceFile().fileName, firstBrace.end, formatCodeOptions);
            var indent = formatting.getIndentationString(indentLength + formatCodeOptions.IndentSize, formatCodeOptions);
            var indentForContent = formatting.getIndentationString(indentLength + 2 * formatCodeOptions.IndentSize, formatCodeOptions);

            let refactorings: ts.server.protocol.Refactoring[] = [];

            abstractClassTarget.members.forEach(function (member) {
                let name = member.name && (<any>member.name).text;
                if (name && identifierName === name) {
                    var memberAsText = member.getFullText();
                    if (memberAsText.indexOf('abstract') > -1) {
                        var content = memberAsText.replace('abstract', '');
                        if (content.lastIndexOf(';') === content.length - 1) {
                            content = content.substring(0, content.length - 1);
                        }

                        content += ' {' + newLine + indentForContent + 'return null;' + newLine + indent + '}';
                        var refactoring = {
                            span: {
                                start: firstBrace.end,
                                length: 0
                            },
                            newText: (newLine + indent) + content,
                            filePath: classTarget.getSourceFile().fileName
                        };
                        refactorings.push(refactoring);
                    }
                }
            });

            return refactorings;
        }
    }
}