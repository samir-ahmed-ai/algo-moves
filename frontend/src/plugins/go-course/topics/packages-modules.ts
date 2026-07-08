import type { GoTopic } from '../types';

export const packagesModules: GoTopic = {
  id: 'packages-modules',
  title: 'Packages, Modules & Tooling',
  icon: 'Network',
  concepts: [
    {
      id: 'go-pkg-visibility',
      title: 'Exported vs unexported identifiers and package encapsulation',
      difficulty: 'Easy',
      tags: ['packages', 'visibility', 'encapsulation', 'exports'],
      summary:
        'A leading uppercase letter exports an identifier across package boundaries; lowercase keeps it package-private.',
      pattern: 'Capitalize to export',
      visual:
        'The compiler reads the first rune of each name: uppercase = exported, lowercase = package-local.',
      memorize:
        'Capital = public, lowercase = private. Visibility is per PACKAGE, not per file or per struct.',
      scene:
        'Every identifier wears a name tag: START it with a capital and it may leave the package; start it lowercase and it is locked inside.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\ntype account struct {\n\tOwner   string\n\tbalance int\n}\n\nfunc (a *account) Deposit(n int) {\n\ta.balance += n\n}\n\nfunc (a *account) Balance() int {\n\treturn a.balance\n}\n\nfunc main() {\n\ta := &account{Owner: "Ada"}\n\ta.Deposit(100)\n\tfmt.Println(a.Owner, a.Balance())\n}\n',
      keyPoints: [
        'Visibility keys off the first Unicode letter of the identifier: uppercase exports it, lowercase makes it package-private.',
        'Encapsulation is at the PACKAGE level — every file in the same package sees all lowercase names, so unexported does not mean per-file.',
        'A struct can export the type while keeping fields like balance unexported, forcing callers through methods like Deposit/Balance.',
        'Gotcha: an exported struct with an unexported field cannot be fully built with a composite literal from outside the package.',
      ],
      walkthrough: [
        {
          title: 'Mixed field visibility',
          caption:
            'account is lowercase so the type is package-private; Owner is exported but balance stays hidden.',
          focus: ['type account struct {', '\tbalance int'],
          state: [{ k: 'balance', v: 'unexported' }],
        },
        {
          title: 'Exported method as gateway',
          caption:
            'Deposit is capitalized, so it is the sanctioned way to mutate the hidden balance field.',
          focus: ['func (a *account) Deposit(n int) {'],
          state: [{ k: 'balance', v: '100' }],
        },
        {
          title: 'Read through the API',
          caption:
            'Balance() exposes a controlled view of the private field without letting callers write it directly.',
          focus: ['func (a *account) Balance() int {'],
          state: [{ k: 'Balance()', v: '100' }],
        },
        {
          title: 'Observable output',
          caption: 'main prints the exported Owner and the value returned by Balance().',
          focus: ['fmt.Println(a.Owner, a.Balance())'],
          state: [{ k: 'output', v: 'Ada 100' }],
        },
      ],
    },
    {
      id: 'go-pkg-imports',
      title: 'Import paths, aliases, and blank imports',
      difficulty: 'Easy',
      tags: ['imports', 'aliases', 'blank-import', 'packages'],
      summary:
        'Import a package by path; alias it to rename, or use _ to run its init side effects without a usable name.',
      pattern: 'import forms',
      visual:
        'The import path selects the package; the optional identifier before it renames the binding or blanks it out.',
      memorize:
        'path = who, alias = new local name, _ = side effects only, . = dump into namespace (avoid).',
      scene:
        'An import is a doorway: normally you walk through under the package name, an alias repaints the sign, and _ props the door open just to trip its init wiring.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n\tstr "strings"\n)\n\nfunc main() {\n\ts := "go,is,fun"\n\tparts := str.Split(s, ",")\n\tfmt.Println(len(parts))\n\tfmt.Println(str.ToUpper(parts[0]))\n}\n',
      keyPoints: [
        'The import path is the package location, not its name; the package name (last path element by convention) is what you call.',
        'An alias like str "strings" renames the local binding, useful to dodge collisions between two packages with the same name.',
        'A blank import _ "pkg" imports solely for its init side effects (e.g. registering a database/sql driver) and binds no usable name.',
        'Gotcha: an unused non-blank import is a COMPILE error, and the dot-import form . "pkg" dumps names into your namespace and is discouraged.',
      ],
      walkthrough: [
        {
          title: 'Alias the package',
          caption: 'str "strings" binds the strings package to the shorter local name str.',
          focus: ['str "strings"'],
          state: [{ k: 'binding', v: 'str -> strings' }],
        },
        {
          title: 'Call via the alias',
          caption:
            'Split is reached through str, not strings, because the alias replaced the local name.',
          focus: ['parts := str.Split(s, ",")'],
          state: [{ k: 'parts', v: '[go is fun]' }],
        },
        {
          title: 'Length of the result',
          caption: 'The comma-split slice has three elements.',
          focus: ['fmt.Println(len(parts))'],
          state: [{ k: 'output', v: '3' }],
        },
        {
          title: 'Second call through alias',
          caption: 'ToUpper is likewise reached via str, uppercasing the first part.',
          focus: ['str.ToUpper(parts[0])'],
          state: [{ k: 'output', v: 'GO' }],
        },
      ],
    },
    {
      id: 'go-pkg-init',
      title: 'init functions and package initialization order',
      difficulty: 'Medium',
      tags: ['init', 'initialization', 'packages', 'order'],
      summary:
        'Package-level vars initialize by dependency, then every init() runs, all before main() begins.',
      pattern: 'init order',
      visual:
        'Imports first, then package vars in dependency order, then each init() top-to-bottom, then main().',
      memorize:
        'imported packages -> package vars (by dependency) -> init() funcs -> main(). init takes no args, returns nothing.',
      scene:
        'Before the show, the stage crew (package vars) sets props in dependency order, then each init() checks the wiring — only then does main() step onstage.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\nvar a = compute()\n\nfunc compute() int {\n\tfmt.Println("var")\n\treturn 1\n}\n\nfunc init() {\n\tfmt.Println("init", a)\n}\n\nfunc main() {\n\tfmt.Println("main")\n}\n',
      keyPoints: [
        'Order per package: imported packages initialize first, then package-level vars in dependency order, then init() functions, then main().',
        'A file may declare multiple init() functions and a package many across files; they run in the order the compiler presents the files.',
        'init takes no arguments and returns no values — you cannot call it yourself, and it cannot be referenced.',
        'Package-level var initializers run before any init(), so a here is already 1 when init observes it.',
      ],
      walkthrough: [
        {
          title: 'Var initializer fires first',
          caption:
            'a = compute() runs during package variable initialization, before any init or main.',
          focus: ['var a = compute()'],
          state: [{ k: 'output', v: 'var' }],
        },
        {
          title: 'a is set',
          caption: 'compute returns 1, so the package var a holds 1 before init runs.',
          focus: ['return 1'],
          state: [{ k: 'a', v: '1' }],
        },
        {
          title: 'init runs next',
          caption:
            'init executes after all package vars are initialized and sees a already equal to 1.',
          focus: ['func init() {'],
          state: [{ k: 'output', v: 'init 1' }],
        },
        {
          title: 'main last',
          caption: 'Only after every init has finished does main begin.',
          focus: ['fmt.Println("main")'],
          state: [{ k: 'output', v: 'main' }],
        },
      ],
    },
    {
      id: 'go-pkg-modules',
      title: 'Modules: go.mod, module path, semantic import versioning',
      difficulty: 'Medium',
      tags: ['modules', 'go.mod', 'versioning', 'imports'],
      summary:
        'A module is a versioned tree rooted at go.mod; its module path prefixes every import, and v2+ appends the major version.',
      pattern: 'module path',
      visual:
        'go.mod names the module path + Go version; import paths = module path + subdir; v2+ adds /vN to the path.',
      memorize:
        'go.mod = module root. import path = modulePath + package dir. Major v2+ => path ends in /vN (SIV).',
      scene:
        'go.mod is the deed to a plot of code: the module path is the street address every import must prefix, and moving to v2 literally renames the street to end in /v2.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"runtime"\n)\n\nfunc main() {\n\tmodulePath := "example.com/tools"\n\tpkg := modulePath + "/text"\n\tfmt.Println("import:", pkg)\n\tfmt.Println("go:", runtime.Version()[:4])\n}\n',
      keyPoints: [
        'A module is a collection of packages versioned as a unit, defined by a go.mod file that declares the module path and go directive.',
        'Every import path starts with the module path; a subpackage in dir text is imported as modulePath + "/text".',
        'Semantic Import Versioning: major versions v2 and above put /vN at the END of the module path, so v1 and v2 can coexist as distinct paths.',
        'Gotcha: go.mod also carries require/replace directives, and the go directive gates which language features the toolchain permits.',
      ],
      walkthrough: [
        {
          title: 'The module path',
          caption: 'The module path declared in go.mod is the root prefix for all imports.',
          focus: ['modulePath := "example.com/tools"'],
          state: [{ k: 'module', v: 'example.com/tools' }],
        },
        {
          title: 'Build a subpackage path',
          caption: 'Appending the package directory yields the full import path for a subpackage.',
          focus: ['pkg := modulePath + "/text"'],
          state: [{ k: 'pkg', v: 'example.com/tools/text' }],
        },
        {
          title: 'The import line',
          caption: 'This is exactly the string another file would place in its import block.',
          focus: ['fmt.Println("import:", pkg)'],
          state: [{ k: 'output', v: 'import: example.com/tools/text' }],
        },
        {
          title: 'Toolchain version',
          caption:
            'runtime.Version reports the Go toolchain, echoing the go directive that go.mod pins.',
          focus: ['runtime.Version()[:4]'],
          state: [{ k: 'output', v: 'go: go1.' }],
        },
      ],
    },
    {
      id: 'go-pkg-layout',
      title: 'internal/ packages and standard project layout',
      difficulty: 'Medium',
      tags: ['internal', 'layout', 'packages', 'encapsulation'],
      summary:
        'An internal/ directory limits imports to code rooted at its parent, enforcing module-private packages beyond capitalization.',
      pattern: 'internal/ rule',
      visual:
        'Code under .../x/internal/... is importable only by code rooted at .../x, checked by the compiler at import time.',
      memorize:
        'internal/ = importable only under its parent dir. cmd/ = binaries, pkg/ = shareable libs (convention, not enforced).',
      scene:
        'internal/ is a staff-only corridor: anyone rooted under the same parent can walk it, but the moment an import comes from outside that subtree the compiler slams the door.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport (\n\t"fmt"\n\t"path"\n)\n\nfunc main() {\n\timp := "example.com/app/internal/db"\n\tparent := path.Dir(path.Dir(imp))\n\tfmt.Println("parent:", parent)\n\tfmt.Println("allowed:", parent == "example.com/app")\n}\n',
      keyPoints: [
        'A package under an internal/ directory can only be imported by code whose path is rooted at the parent of that internal/ directory.',
        'The internal rule is enforced by the compiler at import time — it is stronger than lowercase visibility, which is only per-package.',
        'Common layout: cmd/ holds main packages (one per binary), internal/ holds private code, and pkg/ optionally holds shareable libraries.',
        'Gotcha: that project layout (cmd/pkg/internal) is community convention, but internal/ is a real, compiler-enforced boundary.',
      ],
      walkthrough: [
        {
          title: 'An internal import path',
          caption:
            'This package sits under an internal/ directory, so its visibility is directory-scoped.',
          focus: ['imp := "example.com/app/internal/db"'],
          state: [{ k: 'imp', v: '.../internal/db' }],
        },
        {
          title: 'Find the internal parent',
          caption:
            'Stripping internal/db leaves the parent directory that gates who may import it.',
          focus: ['parent := path.Dir(path.Dir(imp))'],
          state: [{ k: 'parent', v: 'example.com/app' }],
        },
        {
          title: 'The allowed root',
          caption: 'Only code rooted at example.com/app may import the internal package.',
          focus: ['fmt.Println("parent:", parent)'],
          state: [{ k: 'output', v: 'parent: example.com/app' }],
        },
        {
          title: 'Enforcement check',
          caption:
            'An importer whose path is rooted at that parent passes; anything outside it fails to compile.',
          focus: ['parent == "example.com/app"'],
          state: [{ k: 'output', v: 'allowed: true' }],
        },
      ],
    },
    {
      id: 'go-pkg-tooling',
      title: 'Tooling: go build/run, go test, go vet, gofmt',
      difficulty: 'Easy',
      tags: ['tooling', 'go-test', 'go-vet', 'gofmt'],
      summary:
        'The go command bundles build, run, test, vet, and fmt into one toolchain with fixed conventions.',
      pattern: 'go toolchain',
      visual:
        'build compiles, run compiles+executes, test runs *_test.go, vet flags suspicious code, gofmt canonicalizes with tabs.',
      memorize:
        'build=compile, run=compile+exec, test=_test.go with Test*, vet=heuristic bugs, gofmt=canonical (tabs).',
      scene:
        'One Swiss-army go command: build forges the binary, run forges-and-fires it, test drills the _test.go files, vet sniffs for bugs, and gofmt irons every file to the same shape.',
      time: '—',
      space: '—',
      code: 'package main\n\nimport "fmt"\n\nfunc Sum(xs []int) int {\n\ttotal := 0\n\tfor _, x := range xs {\n\t\ttotal += x\n\t}\n\treturn total\n}\n\nfunc main() {\n\tfmt.Println(Sum([]int{1, 2, 3}))\n}\n',
      keyPoints: [
        'go build compiles to a binary; go run compiles and immediately executes; neither needs an external build config.',
        'go test discovers files ending in _test.go and runs functions named TestXxx(t *testing.T); go test ./... walks all subpackages.',
        'go vet runs heuristic checks (e.g. bad Printf format strings) that compile fine but are likely bugs; it is not a full linter.',
        'gofmt rewrites source into the canonical style using TAB indentation — formatting is not negotiable, which is why diffs stay clean.',
      ],
      walkthrough: [
        {
          title: 'A testable function',
          caption:
            'Sum is exported and pure, so a _test.go file could assert its output with go test.',
          focus: ['func Sum(xs []int) int {'],
          state: [{ k: 'target', v: 'go test' }],
        },
        {
          title: 'Deterministic accumulation',
          caption: 'Ranging and adding gives a fixed result, exactly what a test would assert.',
          focus: ['\t\ttotal += x'],
          state: [{ k: 'total', v: '6' }],
        },
        {
          title: 'go run executes main',
          caption: 'go run compiles this file and runs main, which prints the computed sum.',
          focus: ['fmt.Println(Sum([]int{1, 2, 3}))'],
          state: [{ k: 'output', v: '6' }],
        },
        {
          title: 'vet and gofmt clean',
          caption:
            'The Println call has no format directives to misuse, and the tab-indented source is already gofmt-canonical.',
          focus: ['func main() {'],
          state: [{ k: 'gofmt', v: 'clean' }],
        },
      ],
    },
  ],
};
