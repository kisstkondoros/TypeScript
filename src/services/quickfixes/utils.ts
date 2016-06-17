// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='../services.ts' />
/// <reference path="../../server/node.d.ts" />

namespace ts.quickFix {
    let path = require('path');

    export interface GetPathCompletions {
        prefix: string;
        allFiles: string[];
        program: ts.Program;
        filePath: string;
        sourceFile: ts.SourceFile;
    }
    export interface PathCompletion {
        fileName: string;
        relativePath: string;
        fullPath: string;
    }
    function getFileName(fullFilePath: string) {
        let parts = fullFilePath.split('/');
        return parts[parts.length - 1];
    }

    export function removeExt(filePath: string) {
        return filePath.substr(0, filePath.lastIndexOf('.'));
    }

    export function makeRelativePath(relativeFolder: string, filePath: string) {
        var relativePath = path.relative(relativeFolder, filePath).split('\\').join('/');
        if (relativePath[0] !== '.') {
            relativePath = './' + relativePath;
        }
        return relativePath;
    }

    var forEachChild = ts.forEachChild;

    export function getClassesOrInterfacesBasedOnName(sourcefiles: SourceFile[], name: string): Array<ts.InterfaceDeclaration | ts.ClassDeclaration> {
        let results: Array<ts.InterfaceDeclaration | ts.ClassDeclaration> = [];
        function findNode(node: Node) {
            if (node.kind === SyntaxKind.ClassDeclaration || node.kind === SyntaxKind.InterfaceDeclaration) {
                let typedNode = <ts.InterfaceDeclaration | ts.ClassDeclaration>node;
                let nodeName = typedNode.name && typedNode.name.text;
                if (nodeName === name) {
                    results.push(typedNode);
                }
            }
            forEachChild(node, findNode);
        }

        for (let file of sourcefiles) {
            forEachChild(file, findNode);
        }

        return results;
    }

    export function getNodeByKindAndName(sourcefiles: SourceFile[], kind: SyntaxKind, name: string): Node {
        let found: Node = undefined;

        function findNode(node: Node) {
            if (node.kind === kind) {
                // Now lookup name:
                if (node.kind === SyntaxKind.ClassDeclaration || node.kind === SyntaxKind.InterfaceDeclaration) {
                    let nodeName = (<any>node).name && ((<any>node).name).text;
                    if (nodeName === name) {
                        found = node;
                    }
                }
            }

            if (!found) { forEachChild(node, findNode); }
        }

        for (let file of sourcefiles) {
            forEachChild(file, findNode);
        }

        return found;
    }
}