// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0.
// See LICENSE.txt in the project root for complete license information.

/// <reference path=".\quickFix.ts" />
/// <reference path=".\semantic\addClassMember.ts" />
/// <reference path=".\semantic\addClassMethod.ts" />
/// <reference path=".\semantic\addImportFromStatement.ts" />
/// <reference path=".\semantic\addImportStatement.ts" />
/// <reference path=".\semantic\typeAssertPropertyAccessToAny.ts" />
/// <reference path=".\semantic\implementInterface.ts" />
/// <reference path=".\semantic\implementAbstractClass.ts" />

namespace ts.quickFixRegistry {
    export class QuickFixes{
        public static allQuickFixes: quickFix.QuickFix[] = [
            new quickFix.semantic.AddClassMethod(),
            new quickFix.semantic.AddClassMember(),
            new quickFix.semantic.AddImportFromStatement(),
            new quickFix.semantic.AddImportStatement(),
            new quickFix.semantic.TypeAssertPropertyAccessToAny(),
            new quickFix.semantic.ImplementInterface(),
            new quickFix.semantic.ImplementAbstractClass()
        ];
    }
}