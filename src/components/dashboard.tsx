"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownAZ,
  CalendarClock,
  CircleDollarSign,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  ListFilter,
  Lock,
  LogOut,
  MapPin,
  PanelRightOpen,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  Table2,
  UserRound,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { compactNumber, formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { mapDbNote, mapDbProject } from "@/lib/project-map";
import { statusClass } from "@/lib/status";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DataSourceMode, Project, ProjectNote } from "@/types/project";

type DashboardProps = {
  projects: Project[];
  source: DataSourceMode;
  error?: string;
};

type Tab = "overview" | "site" | "spec" | "finance" | "notes";
type PipelineFilter = "live" | "completed" | "all";
type SortField = "installationDate" | "projectName" | "orderValue" | "stage";

const empty = "-";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "site", label: "Site" },
  { id: "spec", label: "Spec" },
  { id: "finance", label: "Finance" },
  { id: "notes", label: "Notes" },
];

function clean(value?: string | null) {
  return value?.trim() || empty;
}

function getUnique(projects: Project[], key: keyof Project) {
  return Array.from(
    new Set(
      projects
        .map((project) => project[key])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function projectSearchText(project: Project) {
  return [
    project.projectName,
    project.jobNumber,
    project.groupName,
    project.stage,
    project.mondayStatus,
    project.calcStatus,
    project.rep,
    project.detailer,
    project.siteAccount,
    project.sitePostCode,
    project.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isLiveProject(project: Project) {
  return project.groupName !== "Completed";
}

function compareProjects(field: SortField) {
  return (a: Project, b: Project) => {
    if (field === "orderValue") {
      return (b.orderValue ?? 0) - (a.orderValue ?? 0);
    }

    if (field === "installationDate") {
      const left = a.installationDate ? new Date(a.installationDate).getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.installationDate ? new Date(b.installationDate).getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    }

    return clean(a[field]).localeCompare(clean(b[field]));
  };
}

function dueWithin(project: Project, days: number) {
  if (!project.installationDate) {
    return false;
  }

  const date = new Date(project.installationDate);
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(now.getDate() + days);

  return date >= now && date <= limit;
}

export function Dashboard({ projects: initialProjects, source, error }: DashboardProps) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [projects, setProjects] = useState(initialProjects);
  const [dataSource, setDataSource] = useState<DataSourceMode>(source);
  const [loadError, setLoadError] = useState(error);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [stage, setStage] = useState("all");
  const [mondayStatus, setMondayStatus] = useState("all");
  const [calcStatus, setCalcStatus] = useState("all");
  const [pipeline, setPipeline] = useState<PipelineFilter>("live");
  const [sortField, setSortField] = useState<SortField>("installationDate");
  const [selectedKey, setSelectedKey] = useState(projects[0]?.sourceKey ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [draftNote, setDraftNote] = useState("");
  const [notesByProject, setNotesByProject] = useState<Record<string, ProjectNote[]>>({});
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let active = true;

    async function loadSupabaseProjects() {
      const { data, error: projectsError } = await client
        .from("crm_projects")
        .select("*")
        .order("installation_date", { ascending: true, nullsFirst: false })
        .order("project_name", { ascending: true });

      if (!active) {
        return;
      }

      if (projectsError) {
        setLoadError(projectsError.message);
        return;
      }

      if (data?.length) {
        setProjects(data.map(mapDbProject));
        setDataSource("supabase");
        setLoadError(undefined);
      }
    }

    client.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setAuthEmail(data.session?.user.email ?? null);

      if (data.session) {
        void loadSupabaseProjects();
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user.email ?? null);

      if (session) {
        void loadSupabaseProjects();
      } else {
        setProjects(initialProjects);
        setDataSource(source);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialProjects, source, supabase]);

  const groups = useMemo(() => getUnique(projects, "groupName"), [projects]);
  const stages = useMemo(() => getUnique(projects, "stage"), [projects]);
  const mondayStatuses = useMemo(() => getUnique(projects, "mondayStatus"), [projects]);
  const calcStatuses = useMemo(() => getUnique(projects, "calcStatus"), [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects
      .filter((project) => {
        if (pipeline === "live" && !isLiveProject(project)) {
          return false;
        }

        if (pipeline === "completed" && project.groupName !== "Completed") {
          return false;
        }

        if (group !== "all" && project.groupName !== group) {
          return false;
        }

        if (stage !== "all" && project.stage !== stage) {
          return false;
        }

        if (mondayStatus !== "all" && project.mondayStatus !== mondayStatus) {
          return false;
        }

        if (calcStatus !== "all" && project.calcStatus !== calcStatus) {
          return false;
        }

        if (normalizedQuery && !projectSearchText(project).includes(normalizedQuery)) {
          return false;
        }

        return true;
      })
      .sort(compareProjects(sortField));
  }, [calcStatus, group, mondayStatus, pipeline, projects, query, sortField, stage]);

  const selectedProject = useMemo(() => {
    return (
      filteredProjects.find((project) => project.sourceKey === selectedKey) ??
      filteredProjects[0] ??
      projects[0]
    );
  }, [filteredProjects, projects, selectedKey]);

  const stats = useMemo(() => {
    const live = projects.filter(isLiveProject);
    const activeValue = live.reduce((total, project) => total + (project.orderValue ?? 0), 0);
    const production = live.filter((project) => project.stage === "In Production").length;
    const dueSoon = live.filter((project) => dueWithin(project, 30)).length;
    const stuck = live.filter((project) => project.mondayStatus === "Stuck").length;

    return { live: live.length, activeValue, production, dueSoon, stuck };
  }, [projects]);

  useEffect(() => {
    if (!supabase || !authEmail || !selectedProject?.id || notesByProject[selectedProject.id]) {
      return;
    }

    let cancelled = false;

    supabase
      .from("crm_project_notes")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setNotesByProject((current) => ({
            ...current,
            [selectedProject.id as string]: (data ?? []).map(mapDbNote),
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authEmail, notesByProject, selectedProject?.id, supabase]);

  const selectedNotes = selectedProject?.id
    ? notesByProject[selectedProject.id] ?? []
    : notesByProject[selectedProject?.sourceKey ?? ""] ?? [];

  async function addNote() {
    const body = draftNote.trim();

    if (!body || !selectedProject) {
      return;
    }

    setNoteStatus("saving");

    if (selectedProject.id && supabase && authEmail) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNoteStatus("error");
        return;
      }

      const { data, error } = await supabase
        .from("crm_project_notes")
        .insert({
          project_id: selectedProject.id,
          body,
          created_by: user.id,
        })
        .select("*")
        .single();

      if (error || !data) {
        setNoteStatus("error");
        return;
      }

      setNotesByProject((current) => ({
        ...current,
        [selectedProject.id as string]: [mapDbNote(data), ...(current[selectedProject.id as string] ?? [])],
      }));
    } else {
      const note: ProjectNote = {
        id: crypto.randomUUID(),
        projectId: selectedProject.sourceKey,
        body,
        createdAt: new Date().toISOString(),
      };
      setNotesByProject((current) => ({
        ...current,
        [selectedProject.sourceKey]: [note, ...(current[selectedProject.sourceKey] ?? [])],
      }));
    }

    setDraftNote("");
    setNoteStatus("saved");
    window.setTimeout(() => setNoteStatus("idle"), 1500);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1800px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-slate-950 text-white">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal text-slate-950">Steelit CRM</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Database size={13} aria-hidden="true" />
                  {dataSource === "supabase" ? "Supabase" : "Local workbook"}
                </span>
                {loadError ? <span className="text-red-700">{loadError}</span> : null}
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <a
              href="https://steelit.site"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              steelit.site
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            {authEmail ? (
              <button
                type="button"
                onClick={async () => {
                  await supabase?.auth.signOut();
                  setAuthEmail(null);
                  setProjects(initialProjects);
                  setDataSource(source);
                }}
                className="inline-flex h-9 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Lock size={15} aria-hidden="true" />
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={Table2} label="Live projects" value={stats.live.toLocaleString("en-GB")} />
          <Metric icon={CircleDollarSign} label="Live value" value={compactNumber(stats.activeValue)} />
          <Metric icon={PanelRightOpen} label="In production" value={stats.production.toLocaleString("en-GB")} />
          <Metric icon={CalendarClock} label="Due 30 days" value={stats.dueSoon.toLocaleString("en-GB")} />
          <Metric icon={ShieldCheck} label="Stuck" value={stats.stuck.toLocaleString("en-GB")} tone="risk" />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1800px] gap-4 px-4 pb-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects"
                    className="h-10 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-950"
                  />
                </label>
                <SegmentedPipeline value={pipeline} onChange={setPipeline} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect icon={ListFilter} label="Group" value={group} onChange={setGroup} values={groups} />
                <FilterSelect icon={SlidersHorizontal} label="Stage" value={stage} onChange={setStage} values={stages} />
                <FilterSelect label="Monday" value={mondayStatus} onChange={setMondayStatus} values={mondayStatuses} />
                <FilterSelect label="Calc" value={calcStatus} onChange={setCalcStatus} values={calcStatuses} />
                <label className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700">
                  <ArrowDownAZ size={15} aria-hidden="true" />
                  <select
                    value={sortField}
                    onChange={(event) => setSortField(event.target.value as SortField)}
                    className="h-full bg-transparent text-sm outline-none"
                    aria-label="Sort"
                  >
                    <option value="installationDate">Install date</option>
                    <option value="projectName">Project</option>
                    <option value="orderValue">Order value</option>
                    <option value="stage">Stage</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] min-h-[520px] overflow-auto">
            <table className="min-w-[1320px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <Th className="sticky left-0 z-20 w-[360px] bg-slate-100">Project</Th>
                  <Th>Job</Th>
                  <Th>Group</Th>
                  <Th>Monday</Th>
                  <Th>Stage</Th>
                  <Th>Calc</Th>
                  <Th>Rep</Th>
                  <Th>Detailer</Th>
                  <Th>Install</Th>
                  <Th className="text-right">Value</Th>
                  <Th className="text-right">Margin</Th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const selected = selectedProject?.sourceKey === project.sourceKey;

                  return (
                    <tr
                      key={project.sourceKey}
                      onClick={() => {
                        setSelectedKey(project.sourceKey);
                        setActiveTab("overview");
                      }}
                      className={clsx(
                        "cursor-pointer border-b border-slate-200 hover:bg-amber-50/60",
                        selected ? "bg-orange-50" : "bg-white",
                      )}
                    >
                      <Td className={clsx("sticky left-0 z-[5] w-[360px] border-r border-slate-200", selected ? "bg-orange-50" : "bg-white")}>
                        <div className="max-w-[330px] truncate font-medium text-slate-950">{project.projectName}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{clean(project.sitePostCode)} · {clean(project.useCase)}</div>
                      </Td>
                      <Td>{clean(project.jobNumber)}</Td>
                      <Td>{clean(project.groupName)}</Td>
                      <Td><span className={statusClass(project.mondayStatus, "monday")}>{clean(project.mondayStatus)}</span></Td>
                      <Td><span className={statusClass(project.stage, "stage")}>{clean(project.stage)}</span></Td>
                      <Td><span className={statusClass(project.calcStatus, "calc")}>{clean(project.calcStatus)}</span></Td>
                      <Td>{clean(project.rep)}</Td>
                      <Td>{clean(project.detailer)}</Td>
                      <Td>{formatDate(project.installationDate)}</Td>
                      <Td className="text-right tabular-nums">{formatCurrency(project.orderValue)}</Td>
                      <Td className="text-right tabular-nums">{formatPercent(project.jobMargin)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
            <span>{filteredProjects.length.toLocaleString("en-GB")} of {projects.length.toLocaleString("en-GB")}</span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setGroup("all");
                setStage("all");
                setMondayStatus("all");
                setCalcStatus("all");
                setPipeline("live");
              }}
              className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              <X size={14} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>

        <aside className="min-w-0 border border-slate-200 bg-white">
          {selectedProject ? (
            <>
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase text-slate-500">{clean(selectedProject.groupName)}</div>
                    <h2 className="mt-1 text-lg font-semibold leading-6 text-slate-950">{selectedProject.projectName}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{clean(selectedProject.jobNumber)}</span>
                      <span>{clean(selectedProject.itemId)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const folderPath = selectedProject.driveFolderPath ?? selectedProject.userFolderPath;
                      if (folderPath) {
                        void navigator.clipboard.writeText(folderPath);
                      }
                    }}
                    disabled={!selectedProject.driveFolderPath && !selectedProject.userFolderPath}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                    title="Copy folder path"
                  >
                    <FolderOpen size={17} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={statusClass(selectedProject.mondayStatus, "monday")}>{clean(selectedProject.mondayStatus)}</span>
                  <span className={statusClass(selectedProject.stage, "stage")}>{clean(selectedProject.stage)}</span>
                  <span className={statusClass(selectedProject.calcStatus, "calc")}>{clean(selectedProject.calcStatus)}</span>
                </div>
              </div>

              <div className="flex border-b border-slate-200 bg-slate-50">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "h-10 flex-1 border-r border-slate-200 px-2 text-sm font-medium last:border-r-0",
                      activeTab === tab.id ? "bg-white text-slate-950" : "text-slate-500 hover:bg-white/70",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[calc(100vh-236px)] overflow-auto p-4">
                {activeTab === "overview" ? <Overview project={selectedProject} /> : null}
                {activeTab === "site" ? <Site project={selectedProject} /> : null}
                {activeTab === "spec" ? <Spec project={selectedProject} /> : null}
                {activeTab === "finance" ? <Finance project={selectedProject} /> : null}
                {activeTab === "notes" ? (
                  <Notes
                    project={selectedProject}
                    notes={selectedNotes}
                    draftNote={draftNote}
                    setDraftNote={setDraftNote}
                    addNote={addNote}
                    noteStatus={noteStatus}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="p-6 text-sm text-slate-500">No project selected.</div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Table2;
  label: string;
  value: string;
  tone?: "default" | "risk";
}) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon className={tone === "risk" ? "text-red-600" : "text-slate-500"} size={18} aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</div>
    </div>
  );
}

function SegmentedPipeline({
  value,
  onChange,
}: {
  value: PipelineFilter;
  onChange: (value: PipelineFilter) => void;
}) {
  const options: Array<{ value: PipelineFilter; label: string }> = [
    { value: "live", label: "Live" },
    { value: "completed", label: "Completed" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="inline-grid h-10 grid-cols-3 rounded border border-slate-300 bg-slate-100 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "min-w-24 rounded-sm px-3 text-sm font-medium",
            value === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FilterSelect({
  icon: Icon,
  label,
  value,
  onChange,
  values,
}: {
  icon?: typeof ListFilter;
  label: string;
  value: string;
  onChange: (value: string) => void;
  values: string[];
}) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700">
      {Icon ? <Icon size={15} aria-hidden="true" /> : null}
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full max-w-44 bg-transparent text-sm outline-none"
      >
        <option value="all">All</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx("border-b border-slate-200 px-3 py-3", className)}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("border-b border-slate-200 px-3 py-2 align-middle text-slate-700", className)}>{children}</td>;
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-800">{value || empty}</dd>
    </div>
  );
}

function Overview({ project }: { project: Project }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">Schedule</h3>
        <dl>
          <DetailRow label="Install" value={formatDate(project.installationDate)} />
          <DetailRow label="Fixed" value={formatDate(project.fixedDate)} />
          <DetailRow label="Drawings" value={formatDate(project.drawingsRequiredDate)} />
          <DetailRow label="Created" value={formatDate(project.createdOn)} />
          <DetailRow label="Confirmed" value={formatDate(project.orderConfirmed)} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">People</h3>
        <dl>
          <DetailRow label="Rep" value={clean(project.rep)} />
          <DetailRow label="Owner" value={clean(project.ownerDynamics)} />
          <DetailRow label="Detailer" value={clean(project.detailer)} />
          <DetailRow label="Approval" value={clean(project.approvalContact)} />
          <DetailRow label="Site liaison" value={clean(project.siteLiaisonContact)} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">Comments</h3>
        <p className="whitespace-pre-wrap border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {clean(project.comments)}
        </p>
      </section>
    </div>
  );
}

function Site({ project }: { project: Project }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
          <MapPin size={16} aria-hidden="true" />
          Site
        </h3>
        <dl>
          <DetailRow label="Account" value={clean(project.siteAccount)} />
          <DetailRow label="Industry" value={clean(project.siteAccountIndustry)} />
          <DetailRow label="Post code" value={clean(project.sitePostCode)} />
          <DetailRow label="Location" value={clean(project.location)} />
          <DetailRow label="Nearest A&E" value={clean(project.nearestAe)} />
          <DetailRow label="Billing" value={clean(project.billingAccount)} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">Delivery</h3>
        <p className="whitespace-pre-wrap border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {clean(project.deliveryComments)}
        </p>
      </section>
    </div>
  );
}

function Spec({ project }: { project: Project }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">Structure</h3>
        <dl>
          <DetailRow label="Use" value={clean(project.useCase)} />
          <DetailRow label="Type" value={clean(project.structureType)} />
          <DetailRow label="Style" value={clean(project.style)} />
          <DetailRow label="Roof" value={clean(project.roofShape)} />
          <DetailRow label="Support" value={clean(project.supportType)} />
          <DetailRow label="Size" value={clean(project.structureSize)} />
          <DetailRow label="Cladding" value={clean(project.claddingType)} />
          <DetailRow label="Finish" value={clean(project.frameworkFinish)} />
          <DetailRow label="Colour" value={clean(project.colour)} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">Loads & Groundwork</h3>
        <dl>
          <DetailRow label="EX class" value={clean(project.exClass)} />
          <DetailRow label="Wind site" value={clean(project.windSite)} />
          <DetailRow label="Wind structure" value={clean(project.windStructure)} />
          <DetailRow label="Snow" value={clean(project.snow)} />
          <DetailRow label="Altitude" value={clean(project.altitude)} />
          <DetailRow label="Foundations" value={clean(project.foundationsBy)} />
          <DetailRow label="Concrete" value={clean(project.concreteType)} />
          <DetailRow label="Pad finish" value={clean(project.padFinish)} />
        </dl>
      </section>
    </div>
  );
}

function Finance({ project }: { project: Project }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
          <CircleDollarSign size={16} aria-hidden="true" />
          Commercials
        </h3>
        <dl>
          <DetailRow label="Order value" value={formatCurrency(project.orderValue)} />
          <DetailRow label="Invoiced" value={formatCurrency(project.invoicedValue)} />
          <DetailRow label="Job cost" value={formatCurrency(project.jobCost)} />
          <DetailRow label="Profit" value={formatCurrency(project.jobProfit)} />
          <DetailRow label="Margin" value={formatPercent(project.jobMargin)} />
          <DetailRow label="Low margin" value={clean(project.lowMarginReasonType)} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-950">Operations</h3>
        <dl>
          <DetailRow label="Installer" value={clean(project.frameworkInstaller)} />
          <DetailRow label="Groundworker" value={clean(project.groundworker)} />
          <DetailRow label="Pad finisher" value={clean(project.padFinisher)} />
          <DetailRow label="MFG zone" value={clean(project.mfgZone)} />
          <DetailRow label="MFG column" value={clean(project.mfgCantColumn)} />
        </dl>
      </section>
    </div>
  );
}

function Notes({
  project,
  notes,
  draftNote,
  setDraftNote,
  addNote,
  noteStatus,
}: {
  project: Project;
  notes: ProjectNote[];
  draftNote: string;
  setDraftNote: (value: string) => void;
  addNote: () => void;
  noteStatus: "idle" | "saving" | "saved" | "error";
}) {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
          <StickyNote size={16} aria-hidden="true" />
          Notes
        </h3>
        <textarea
          value={draftNote}
          onChange={(event) => setDraftNote(event.target.value)}
          rows={5}
          placeholder={`Add note for ${project.jobNumber ?? project.projectName}`}
          className="w-full resize-none rounded border border-slate-300 bg-white p-3 text-sm leading-6 outline-none focus:border-slate-950"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={clsx("text-xs", noteStatus === "error" ? "text-red-700" : "text-slate-500")}>
            {noteStatus === "saving" ? "Saving" : noteStatus === "saved" ? "Saved" : noteStatus === "error" ? "Sign in required" : ""}
          </span>
          <button
            type="button"
            onClick={addNote}
            disabled={!draftNote.trim() || noteStatus === "saving"}
            className="inline-flex h-9 items-center gap-2 rounded bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <StickyNote size={15} aria-hidden="true" />
            Add
          </button>
        </div>
      </section>
      <section className="space-y-2">
        {notes.length ? (
          notes.map((note) => (
            <article key={note.id} className="border border-slate-200 bg-slate-50 p-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{note.body}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <UserRound size={13} aria-hidden="true" />
                {formatDate(note.createdAt)}
              </div>
            </article>
          ))
        ) : (
          <div className="border border-dashed border-slate-300 p-4 text-sm text-slate-500">No notes yet.</div>
        )}
      </section>
    </div>
  );
}
