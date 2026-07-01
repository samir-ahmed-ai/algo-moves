import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Employee {
  id: number;
  name: string;
  salary: number;
  departmentId: number;
}

interface Department {
  id: number;
  name: string;
}

interface ResultRow {
  department: string;
  employee: string;
  salary: number;
}

interface SalaryRank {
  salary: number;
  denseRank: number;
  inTop3: boolean;
}

interface DeptTopThreeInput {
  employees: Employee[];
  departments: Department[];
}

interface DeptTopThreeState {
  employees: Employee[];
  departments: Department[];
  phase: 'init' | 'group' | 'rank' | 'top3' | 'collect' | 'done';
  deptId: number | null;
  deptName: string | null;
  deptEmployees: Employee[];
  grouped: [number, string, number][]; // [deptId, deptName, employeeCount]
  uniqueSalaries: SalaryRank[];
  topSalarySet: number[];
  empIdx: number | null;
  results: ResultRow[];
  done: boolean;
}

function denseRankSalaries(salaries: number[]): SalaryRank[] {
  const unique = [...new Set(salaries)].sort((a, b) => b - a);
  return unique.map((salary, i) => ({
    salary,
    denseRank: i + 1,
    inTop3: i < 3,
  }));
}

function record({ employees, departments }: DeptTopThreeInput): Frame<DeptTopThreeState>[] {  const results: ResultRow[] = [];

  const { emit, frames } = createRecorder<DeptTopThreeState>(() => ({
        employees,
        departments,
        phase: 'init',
        deptId: null,
        deptName: null,
        deptEmployees: [],
        grouped: [],
        uniqueSalaries: [],
        topSalarySet: [],
        empIdx: null,
        results: [...results],
        done: false
      }));

  emit(
    'INIT',
    `${employees.length} employees, ${departments.length} depts`,
    `Department Top Three Salaries: for each department, find employees whose salary is among the top three distinct salary tiers (DENSE_RANK ≤ 3). Equivalent to \`DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) <= 3\`.`,
    { phase: 'init' },
  );

  if (employees.length === 0 || departments.length === 0) {
    emit(
      'DONE',
      'empty input',
      'No employees or departments — return an empty result set.',
      { phase: 'done', done: true },
      'good',
    );
    return frames;
  }

  const deptNames = new Map<number, string>();
  for (const dept of departments) {
    deptNames.set(dept.id, dept.name);
  }

  const groupedEmployees = new Map<number, Employee[]>();
  for (const emp of employees) {
    if (!deptNames.has(emp.departmentId)) continue;
    const list = groupedEmployees.get(emp.departmentId) ?? [];
    list.push(emp);
    groupedEmployees.set(emp.departmentId, list);
  }

  const sortedDeptIDs = [...groupedEmployees.keys()].sort((a, b) => a - b);
  const grouped: [number, string, number][] = sortedDeptIDs.map((id) => [
    id,
    deptNames.get(id)!,
    groupedEmployees.get(id)!.length,
  ]);

  emit(
    'GROUP',
    `${grouped.length} dept(s)`,
    `GROUP BY departmentId: partition employees into ${grouped.length} department bucket(s) — ${grouped.map(([id, name, n]) => `${name} (id=${id}, ${n} emp${n === 1 ? '' : 's'})`).join('; ')}.`,
    { phase: 'group', grouped },
  );

  for (const deptID of sortedDeptIDs) {
    const deptEmployees = groupedEmployees.get(deptID)!;
    const deptName = deptNames.get(deptID)!;

    emit(
      'DEPT',
      deptName,
      `Processing department "${deptName}" (id=${deptID}) with ${deptEmployees.length} employee(s). Next: rank distinct salaries within this partition.`,
      {
        phase: 'rank',
        deptId: deptID,
        deptName,
        deptEmployees,
        grouped,
      },
    );

    const salaries = deptEmployees.map((e) => e.salary);
    const ranked = denseRankSalaries(salaries);

    emit(
      'RANK',
      ranked.map((r) => `${r.salary}→${r.denseRank}`).join(', '),
      `DENSE_RANK within "${deptName}": sort distinct salaries descending — ${ranked.map((r) => `${r.salary} (rank ${r.denseRank})`).join(', ')}. Tied salaries share the same rank with no gaps.`,
      {
        phase: 'rank',
        deptId: deptID,
        deptName,
        deptEmployees,
        grouped,
        uniqueSalaries: ranked.map((r) => ({ ...r, inTop3: false })),
      },
    );

    const limit = Math.min(3, ranked.length);
    const topSalariesSet = ranked.slice(0, limit).map((r) => r.salary);
    const rankedWithTop = ranked.map((r) => ({
      ...r,
      inTop3: topSalariesSet.includes(r.salary),
    }));

    emit(
      'TOP3',
      topSalariesSet.join(', '),
      `Filter WHERE dense_rank ≤ 3: keep salary tier${limit === 1 ? '' : 's'} {${topSalariesSet.join(', ')}} (${limit} distinct tier${limit === 1 ? '' : 's'} in this department).`,
      {
        phase: 'top3',
        deptId: deptID,
        deptName,
        deptEmployees,
        grouped,
        uniqueSalaries: rankedWithTop,
        topSalarySet: topSalariesSet,
      },
      'good',
    );

    const deptHighEarners: ResultRow[] = [];
    for (let i = 0; i < deptEmployees.length; i++) {
      const emp = deptEmployees[i];
      const hit = topSalariesSet.includes(emp.salary);
      if (hit) {
        deptHighEarners.push({
          department: deptName,
          employee: emp.name,
          salary: emp.salary,
        });
      }
      emit(
        hit ? 'INCLUDE' : 'SKIP',
        hit ? `${emp.name} ${emp.salary}` : `skip ${emp.name}`,
        hit
          ? `Employee ${emp.name} earns ${emp.salary} — one of the top-${limit} salary tiers in "${deptName}". Include in the result.`
          : `Employee ${emp.name} earns ${emp.salary}, which is not in the top-${limit} distinct tiers for "${deptName}". Skip.`,
        {
          phase: 'collect',
          deptId: deptID,
          deptName,
          deptEmployees,
          grouped,
          uniqueSalaries: rankedWithTop,
          topSalarySet: topSalariesSet,
          empIdx: i,
        },
        hit ? 'good' : undefined,
      );
    }

    deptHighEarners.sort((a, b) => {
      if (a.salary !== b.salary) return b.salary - a.salary;
      return a.employee.localeCompare(b.employee);
    });
    results.push(...deptHighEarners);

    emit(
      'DEPT_DONE',
      `${deptHighEarners.length} row(s)`,
      `Finished "${deptName}": ${deptHighEarners.length} employee(s) qualify — ${deptHighEarners.map((r) => `${r.employee} (${r.salary})`).join(', ') || 'none'}.`,
      {
        phase: 'collect',
        deptId: deptID,
        deptName,
        deptEmployees,
        grouped,
        uniqueSalaries: rankedWithTop,
        topSalarySet: topSalariesSet,
        empIdx: null,
        results: [...results],
      },
      'good',
    );
  }

  emit(
    'DONE',
    `${results.length} row(s)`,
    `Query complete. ${results.length} row(s) returned across all departments.`,
    { phase: 'done', done: true, results: [...results] },
    'good',
  );

  return frames;
}

function deptNameFor(
  departments: Department[],
  deptId: number | null,
  fallback: string | null,
): string {
  if (fallback) return fallback;
  if (deptId === null) return '—';
  return departments.find((d) => d.id === deptId)?.name ?? String(deptId);
}

function EmployeeTable({
  employees,
  departments,
  deptId,
  deptEmployees,
  empIdx,
  phase,
  topSalarySet,
}: {
  employees: Employee[];
  departments: Department[];
  deptId: number | null;
  deptEmployees: Employee[];
  empIdx: number | null;
  phase: DeptTopThreeState['phase'];
  topSalarySet: number[];
}) {
  const deptNames = new Map(departments.map((d) => [d.id, d.name]));
  const activeEmp = empIdx !== null ? deptEmployees[empIdx] : null;

  const rowTone = (emp: Employee) => {
    if (phase === 'collect' && activeEmp?.id === emp.id) return 'bg-accentbg text-accent';
    if (phase === 'collect' || phase === 'done') {
      if (deptId === emp.departmentId && topSalarySet.includes(emp.salary)) {
        return 'text-good';
      }
      if (deptId === emp.departmentId && activeEmp && empIdx !== null) {
        const cur = deptEmployees[empIdx];
        if (emp.id === cur.id) return 'bg-accentbg text-accent';
      }
    }
    if (deptId !== null && emp.departmentId === deptId) return 'text-ink';
    return 'text-ink3';
  };

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse', vizText.sm)}>
        <thead>
          <tr className="border-b border-edge text-ink3">
            <th className="px-2 py-1 text-left font-normal">Name</th>
            <th className="px-2 py-1 text-right font-normal">Salary</th>
            <th className="px-2 py-1 text-left font-normal">Department</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className={cn('border-b border-edge/50 font-mono', rowTone(emp))}>
              <td className="px-2 py-1">{emp.name}</td>
              <td className="px-2 py-1 text-right">{emp.salary.toLocaleString()}</td>
              <td className="px-2 py-1">{deptNames.get(emp.departmentId) ?? emp.departmentId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultTable({ rows }: { rows: ResultRow[] }) {
  if (!rows.length) {
    return (
      <div className={cn(vizText.sm, 'text-ink3')}>result: (empty)</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div className={cn('mb-1', vizText.sm, 'text-ink3')}>result rows:</div>
      <table className={cn('w-full border-collapse', vizText.sm)}>
        <thead>
          <tr className="border-b border-edge text-ink3">
            <th className="px-2 py-1 text-left font-normal">Department</th>
            <th className="px-2 py-1 text-left font-normal">Employee</th>
            <th className="px-2 py-1 text-right font-normal">Salary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.department}-${r.employee}-${i}`} className="border-b border-edge/50 font-mono text-good">
              <td className="px-2 py-1">{r.department}</td>
              <td className="px-2 py-1">{r.employee}</td>
              <td className="px-2 py-1 text-right">{r.salary.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function View({ frame }: PluginViewProps<DeptTopThreeState>) {
  const s = frame.state;
  const deptLabel = deptNameFor(s.departments, s.deptId, s.deptName);

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase = <span className="font-mono text-ink">{s.phase}</span>
        {s.deptName && (
          <>
            {' · '}dept = <span className="font-mono text-ink">{deptLabel}</span>
          </>
        )}
      </div>

      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>Employee (input):</div>
      <EmployeeTable
        employees={s.employees}
        departments={s.departments}
        deptId={s.deptId}
        deptEmployees={s.deptEmployees}
        empIdx={s.empIdx}
        phase={s.phase}
        topSalarySet={s.topSalarySet}
      />

      {s.grouped.length > 0 && s.phase === 'group' && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
          partitions:{' '}
          {s.grouped.map(([, name, n]) => `${name}(${n})`).join(' · ')}
        </div>
      )}

      {s.uniqueSalaries.length > 0 && (
        <div className={cn('mt-2', vizText.sm)}>
          <div className="text-ink3">distinct salaries in {deptLabel} (dense rank):</div>
          <div className="mt-1 flex flex-wrap gap-2 font-mono">
            {s.uniqueSalaries.map((r) => (
              <span
                key={r.salary}
                className={cn(
                  'rounded border px-2 py-0.5',
                  r.inTop3 ? 'border-good bg-good/10 text-good' : 'border-edge text-ink3',
                )}
              >
                {r.salary.toLocaleString()} (r={r.denseRank})
              </span>
            ))}
          </div>
        </div>
      )}

      {s.results.length > 0 && (
        <div className="mt-3">
          <ResultTable rows={s.results} />
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DeptTopThreeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeEmp = s.empIdx !== null ? s.deptEmployees[s.empIdx] : null;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="department" v={s.deptName ?? '—'} />
      <InspectorRow k="dept employees" v={s.deptEmployees.length || '—'} />
      <InspectorRow k="distinct tiers" v={s.uniqueSalaries.length || '—'} />
      <InspectorRow k="top-3 tiers" v={s.topSalarySet.length ? s.topSalarySet.join(', ') : '—'} />
      <InspectorRow k="emp @ i" v={activeEmp ? activeEmp.name : '—'} />
      <InspectorRow k="salary @ i" v={activeEmp ? activeEmp.salary : '—'} />
      <InspectorRow k="result rows" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-database-department-top-three-salaries';
export const title = 'Department Top Three Salaries';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'dts1',
      label: 'IT + Sales (LeetCode)',
      value: {
        employees: [
          { id: 1, name: 'Joe', salary: 85000, departmentId: 1 },
          { id: 2, name: 'Henry', salary: 80000, departmentId: 2 },
          { id: 3, name: 'Sam', salary: 60000, departmentId: 2 },
          { id: 4, name: 'Max', salary: 90000, departmentId: 1 },
          { id: 5, name: 'Janet', salary: 69000, departmentId: 1 },
          { id: 6, name: 'Randy', salary: 85000, departmentId: 1 },
          { id: 7, name: 'Will', salary: 70000, departmentId: 1 },
        ],
        departments: [
          { id: 1, name: 'IT' },
          { id: 2, name: 'Sales' },
        ],
      },
    },
    {
      id: 'dts2',
      label: '2 depts, ties & <3 tiers',
      value: {
        employees: [
          { id: 1, name: 'Ann', salary: 100, departmentId: 10 },
          { id: 2, name: 'Bob', salary: 100, departmentId: 10 },
          { id: 3, name: 'Cal', salary: 90, departmentId: 10 },
          { id: 4, name: 'Dan', salary: 50, departmentId: 20 },
          { id: 5, name: 'Eve', salary: 50, departmentId: 20 },
        ],
        departments: [
          { id: 10, name: 'Eng' },
          { id: 20, name: 'Ops' },
        ],
      },
    },
  ] satisfies SampleInput<DeptTopThreeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DeptTopThreeState | undefined;
    const n = s?.results.length ?? 0;
    if (!s?.done) return { ok: false, label: 'incomplete' };
    return {
      ok: true,
      label: n ? `${n} row${n === 1 ? '' : 's'}` : 'empty',
    };
  },
};
