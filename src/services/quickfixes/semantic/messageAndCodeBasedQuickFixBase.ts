// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='../../services.ts' />
/// <reference path='../../formatting/formatting.ts' />
/// <reference path="../quickFix.ts" />
/// <reference path="../utils.ts" />

namespace ts.quickFix.semantic {
    export interface QuickFixContext {
        identifierAndClassName: IdentifierAndClassName;
        error: Diagnostic;
        positionNode: Node;
        identifier: Identifier;
        info: QuickFixQueryInformation;
    }

    export interface IdentifierAndClassName {
        identifierName?: string,
        className?: string,
        file?: string,
        abstractClassName?: string,
        interfaceName?: string
    }

    export abstract class MessageAndCodeBasedQuickFixBase implements QuickFix {
        getIdentifierAndClassNames(info: QuickFixQueryInformation, errorText: string, error: Diagnostic): IdentifierAndClassName[] {

            var match = errorText.match(this.getPattern());
            if (!match) {
                return undefined;
            }
            return this.getIdentifierAndClassNameFromMatch(info, error, match);
        }

        private getRelevantIdentifierAndClassName(info: QuickFixQueryInformation): QuickFixContext[] {
            var errors = info.positionErrors.filter(x => x.code === this.getSupportedErrorCode());
            let quickFixContents: QuickFixContext[] = [];
            let errorToErrorText = errors.forEach(error => {
                if (error) {
                    let positionNode = getTokenAtPosition(info.sourceFile, error.start);
                    if (positionNode.kind === SyntaxKind.Identifier) {
                        const flattenedErrors = this.flatten(error.messageText);
                        flattenedErrors.map(errorText => {
                            let mainError = flattenedErrors[0];

                            errorText = mainError + errorText;

                            var identifierAndClassNames = this.getIdentifierAndClassNames(info, errorText, error);

                            if (identifierAndClassNames && identifierAndClassNames.length) {
                                let identifier: Identifier = <Identifier>positionNode;
                                identifierAndClassNames.forEach(identifierAndClassName => {
                                    quickFixContents.push({ identifierAndClassName, error, positionNode, identifier, info });
                                });
                            }
                        });
                    }
                }
            })

            return quickFixContents;
        }

        public provideFix(info: QuickFixQueryInformation): ts.server.protocol.QuickFix[] {
            let quickFixContexts = this.getRelevantIdentifierAndClassName(info)
            if (quickFixContexts.length === 0) return [];
            return quickFixContexts.map(context => {
                return { display: this.getDisplay(context), refactorings: this.getRefactorings(context) }
            });
        }

        private flatten(messageText: string | DiagnosticMessageChain): string[] {
            if (typeof messageText === "string") {
                return [messageText];
            }
            else {
                let diagnosticChain = messageText;
                let result: string[] = [];

                let indent = 0;
                while (diagnosticChain) {
                    result.push(diagnosticChain.messageText);
                    diagnosticChain = diagnosticChain.next;
                }

                return result;
            }
        }

        protected abstract getPattern(): RegExp;
        protected abstract getSupportedErrorCode(): number;
        protected abstract getDisplay(context: QuickFixContext): string;
        protected abstract getRefactorings(context: QuickFixContext): server.protocol.Refactoring[];
        protected abstract getIdentifierAndClassNameFromMatch(info: QuickFixQueryInformation, error: Diagnostic, match: RegExpMatchArray): IdentifierAndClassName[];


    }
}