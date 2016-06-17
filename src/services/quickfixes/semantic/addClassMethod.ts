// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='./messageAndCodeBasedQuickFixBase.ts' />
namespace ts.quickFix.semantic {
    export class AddClassMethod extends MessageAndCodeBasedQuickFixBase {
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
            return `Add method '${identifierName}' to current class ${className}`
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

                let nativeTypes = ['string', 'number', 'boolean', 'object', 'null', 'undefined', 'RegExp'];
                let abc = 'abcdefghijklmnopqrstuvwxyz';
                let argsAlphabet = abc.split('');
                let argsAlphabetPosition = 0;
                let argName = '';
                let argCount = 0;

                let callExp = <CallExpression>parentOfParent;
                let typeStringParts = ['('];

                // Find the number of arguments
                let args: string[] = [];
                callExp.arguments.forEach(arg => {
                    var argType = this.getTypeStringForNode(arg, info.typeChecker);

                    // determine argument output type
                    // use consecutive letters for native types
                    // or use decapitalized Class name + counter as argument name
                    if (nativeTypes.indexOf(argType) !== -1 //native types
                        || argType.indexOf('{') !== -1 //Casted inline argument declarations
                        || argType.indexOf('=>') !== -1 //Method references
                        || argType.indexOf('[]') !== -1 //Array references
                    ) {

                        var type: Type = info.typeChecker.getTypeAtLocation(arg);
                        var typeName: string = 'type';
                        if (type &&
                            type.symbol &&
                            type.symbol.name) {
                            typeName = type.symbol.name.replace(/[\[\]]/g, '');
                        };
                        var hasAnonymous = typeName.indexOf('__') === 0;
                        var isAnonymousTypedArgument = hasAnonymous && typeName.substring(2) === 'type';
                        var isAnonymousMethod = hasAnonymous && typeName.substring(2) === 'function';
                        var isAnonymousObject = hasAnonymous && typeName.substring(2) === 'object';

                        if (argType.indexOf('=>') !== -1 &&
                            !isAnonymousTypedArgument &&
                            !isAnonymousMethod &&
                            !isAnonymousObject) {
                            if (typeName === 'Array') { typeName = 'array'; };
                            argName = `${typeName}${argCount++}`;
                        }
                        else if (argType.indexOf('[]') !== -1) {
                            argName = `array${argCount++}`;
                        }
                        else {
                            if (isAnonymousMethod) {
                                typeName = 'function';
                                argName = `${typeName}${argCount++}`;
                            }
                            else if (isAnonymousObject) {
                                typeName = 'object';
                                argName = `${typeName}${argCount++}`;
                            }
                            else {
                                argName = argsAlphabet[argsAlphabetPosition];
                                argsAlphabet[argsAlphabetPosition] += argsAlphabet[argsAlphabetPosition].substring(1);
                                argsAlphabetPosition++;
                                argsAlphabetPosition %= abc.length;
                            }
                        }
                    }
                    else {
                        // replace 'typeof ' from name
                        argName = argType.replace('typeof ', '');
                        // decapitalize and concat
                        if (argType.indexOf('typeof ') === -1) {
                            var firstLower = argName[0].toLowerCase();

                            if (argName.length === 1) {
                                argName = firstLower;
                            }
                            else {
                                argName = firstLower + argName.substring(1);
                            }
                        }
                        // add counter value and increment it
                        argName += argCount.toString();
                        argCount++;
                    }

                    // cast null and undefined to any type
                    if (argType.indexOf('null') !== -1 || argType.indexOf('undefined') !== -1) {
                        argType = argType.replace(/null|undefined/g, 'any');
                    }
                    args.push(`${argName}: ${argType}`);

                });
                typeStringParts.push(args.join(', '));

                // TODO: infer the return type as well if the next parent is an assignment
                // Currently its `any`
                typeStringParts.push(`): any { }`);
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
            var indentLength = info.service.getIndentationAtPosition(
                memberTarget.getSourceFile().fileName, firstBrace.end, formatCodeOptions);
            var indent = formatting.getIndentationString(indentLength + formatCodeOptions.IndentSize, formatCodeOptions);

            // And add stuff after the first brace
            let refactoring: server.protocol.Refactoring = {
                span: {
                    start: firstBrace.end,
                    length: 0
                },
                newText: `${newLine}${indent}public ${identifierName}${typeString}`,
                filePath: targetDeclaration.getSourceFile().fileName
            };

            return [refactoring];
        }
    }
}