import * as ts from 'typescript';
import * as fs from 'fs';
import { Project } from "@ts-morph/bootstrap";

type MakeTransformerFactory = (program: ts.Program) => ts.TransformerFactory<ts.SourceFile>;

export function transformAndPrettyPrint(
    tsxContent: string,
    makeTransformerFactories: MakeTransformerFactory[]
) {
    const compilerOptions = getCompilerOptions();
    const project = makeProject(compilerOptions, tsxContent);

    const program = project.createProgram();
    const transformationResult = ts.transform(
        program.getSourceFile('/index.tsx')!,
        makeTransformerFactories.map(make => make(program)),
        compilerOptions);

    return ts.createPrinter()
        .printFile(transformationResult.transformed[0]);
}

let cachedProject: Project | null = null;
function makeProject(compilerOptions: ts.CompilerOptions, tsxContent: string) {
    const project = cachedProject ?? new Project({
        useInMemoryFileSystem: true,
        compilerOptions: compilerOptions as any,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true
    });

    if (cachedProject == null) {
        project.createSourceFile('/index.tsx', tsxContent);

        project.createSourceFile('/node_modules/react/index.ts', getReactTypes());
        project.fileSystem.writeFileSync(
            '/node_modules/react/package.json',
            JSON.stringify({ name: 'react', main: "./src/index.ts" })
        );
    } else {
        project.updateSourceFile('/index.tsx', tsxContent);
    }

    cachedProject = project;
    return project;
}

function getCompilerOptions(): ts.CompilerOptions {
    return {
        outDir: "/dist",
        lib: ["/node_modules/typescript/lib/lib.esnext.full.d.ts"],
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        suppressImplicitAnyIndexErrors: true,
        resolveJsonModule: false,
        skipLibCheck: true,
        target: ts.ScriptTarget.ESNext,
        types: [],
        noEmitOnError: true,
        jsx: ts.JsxEmit.React
    };
}

function getReactTypes(): string {
    return fs.readFileSync('node_modules/@types/react/index.d.ts').toString();
}
