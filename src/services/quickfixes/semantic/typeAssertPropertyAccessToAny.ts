// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='./messageAndCodeBasedQuickFixBase.ts' />
namespace ts.quickFix.semantic {
    export class TypeAssertPropertyAccessToAny extends MessageAndCodeBasedQuickFixBase {
        protected getPattern(): RegExp {
            return /Property \'(\w+)\' does not exist on type \.*/;
        }
        protected getSupportedErrorCode(): number {
            return Diagnostics.Property_0_does_not_exist_on_type_1.code;
        }
        protected getIdentifierAndClassNameFromMatch(info: QuickFixQueryInformation, error: Diagnostic, match: RegExpMatchArray): IdentifierAndClassName[] {
            var [, identifierName] = match;
            return [{ identifierName }];
        }
        protected getDisplay(context: QuickFixContext): string {
            var {identifierName} = context.identifierAndClassName;
            return `Assert "any" for property access "${identifierName}"`;
        }

        protected getRefactorings(context: QuickFixContext) {
            var {identifierName} = context.identifierAndClassName;
            let {info, error} = context;
            let positionNode = getTokenAtPosition(error.file, error.start);
            let parent = positionNode.parent;
            if (parent.kind === ts.SyntaxKind.PropertyAccessExpression) {
                let propertyAccess = <ts.PropertyAccessExpression>parent;
                let start = propertyAccess.getStart();
                let end = propertyAccess.dotToken.getStart();

                let oldText = propertyAccess.getText().substr(0, end - start);

                let FileSpan: ts.server.protocol.Refactoring = {
                    filePath: parent.getSourceFile().fileName,
                    span: {
                        start: start,
                        length: end - start,
                    },
                    newText: `(${oldText} as any)`
                };

                return [FileSpan];
            }
            return [];
        }
    }
}