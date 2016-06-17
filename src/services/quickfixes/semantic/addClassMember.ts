// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='./messageAndCodeBasedQuickFixBase.ts' />
namespace ts.quickFix.semantic {
    export class AddClassMember extends MessageAndCodeBasedQuickFixBase {
        protected getPattern(): RegExp {
            return /Property \'(\w+)\' does not exist on type \'(\w+)\'./;
        }
        protected getSupportedErrorCode(): number {
            return Diagnostics.Property_0_does_not_exist_on_type_1.code;
        }
        protected getIdentifierAndClassNameFromMatch(info: QuickFixQueryInformation, error: Diagnostic, match: RegExpMatchArray): IdentifierAndClassName[] {
            return [{ identifierName: match[1], className: match[2] }];
        }
        protected getDisplay(context: QuickFixContext): string {
            var {identifierName, className} = context.identifierAndClassName;
            return `Add ${identifierName} to ${className}`
        }

        private getLastNameAfterDot(text: string) {
            return text.substr(text.lastIndexOf('.') + 1);
        }

        private getTypeStringForNode(node: Node, typeChecker: TypeChecker) {
            var type = typeChecker.getTypeAtLocation(node);
            return displayPartsToString(ts.typeToDisplayParts(typeChecker, type)).replace(/\s+/g, ' ');
        }
        protected getRefactorings(context: QuickFixContext) {
            var {identifierName, className} = context.identifierAndClassName;
            var {info} = context;

            // Get the type of the stuff on the right if its an assignment
            var typeString = 'any';
            var parentOfParent = context.identifier.parent.parent;
            if (parentOfParent.kind === SyntaxKind.BinaryExpression
                && (<BinaryExpression>parentOfParent).operatorToken.getText().trim() === '=') {

                let binaryExpression = <BinaryExpression>parentOfParent;
                typeString = this.getTypeStringForNode(binaryExpression.right, info.typeChecker);
            }
            else if (parentOfParent.kind === SyntaxKind.CallExpression) {
                let callExp = <CallExpression>parentOfParent;
                let typeStringParts = ['('];

                // Find the number of arguments
                let args: string[] = [];
                callExp.arguments.forEach(arg => {
                    var argName = (this.getLastNameAfterDot(arg.getText()));
                    var argType = this.getTypeStringForNode(arg, info.typeChecker);

                    args.push(`${argName}: ${argType}`);
                });
                typeStringParts.push(args.join(', '));

                // TODO: infer the return type as well if the next parent is an assignment
                // Currently its `any`
                typeStringParts.push(') => any');
                typeString = typeStringParts.join('');
            }

            // Find the containing class declaration
            var memberTarget = getNodeByKindAndName([info.sourceFile], SyntaxKind.ClassDeclaration, className) ||
                getNodeByKindAndName(info.program.getSourceFiles(), SyntaxKind.ClassDeclaration, className);
            if (!memberTarget) {
                // Find the containing interface declaration
                memberTarget = getNodeByKindAndName([info.sourceFile], SyntaxKind.InterfaceDeclaration, className) ||
                    getNodeByKindAndName(info.program.getSourceFiles(), SyntaxKind.InterfaceDeclaration, className);
            }
            if (!memberTarget) {
                return [];
            }

            // The following code will be same (and typesafe) for either class or interface
            let targetDeclaration = <ClassDeclaration | InterfaceDeclaration>memberTarget;

            // Then the first brace
            let firstBrace = targetDeclaration.getChildren().filter(x => x.kind === SyntaxKind.OpenBraceToken)[0];

            let formatCodeOptions = info.project.projectService.getFormatCodeOptions();
            var newLine = formatCodeOptions.NewLineCharacter;
            // And the correct indent
            var indentLength = info.service.getIndentationAtPosition(memberTarget.getSourceFile().fileName, firstBrace.end, formatCodeOptions);
            var indent = formatting.getIndentationString(indentLength + formatCodeOptions.IndentSize, formatCodeOptions);

            // And add stuff after the first brace
            let refactoring: server.protocol.Refactoring = {
                span: {
                    start: firstBrace.end,
                    length: 0
                },
                newText: `${newLine}${indent}${identifierName}: ${typeString};`,
                filePath: targetDeclaration.getSourceFile().fileName
            };

            return [refactoring];
        }
    }
}