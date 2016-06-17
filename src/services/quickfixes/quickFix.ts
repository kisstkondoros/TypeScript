// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path='../services.ts' />
/// <reference path='../../server/session.ts' />

namespace ts.quickFix {

    export interface QuickFixQueryInformation {
        project: server.Project;
        service: LanguageService;
        program: Program;
        typeChecker: TypeChecker;
        sourceFile: SourceFile;
        positionErrors: Diagnostic[];
    }

    export interface QuickFix {
        provideFix(info: QuickFixQueryInformation): ts.server.protocol.QuickFix[];
    }

}