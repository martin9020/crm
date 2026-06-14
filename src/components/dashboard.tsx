"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import {
  buildProjectOptionSets,
  editableProjectFields,
  getProjectFieldValue,
  toDbFieldValue,
  toProjectFieldValue,
  type EditableProjectFieldKey,
  type ProjectOptionSets,
} from "@/lib/editable-project-fields";
import { mapDbNote, mapDbProject } from "@/lib/project-map";
import { statusClass, statusStyle } from "@/lib/status";
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
type ProjectSaveHandler = (project: Project, fieldKey: EditableProjectFieldKey, value: string) => Promise<void>;
type DisplayRow =
  | { type: "group"; groupName: string; count: number; value: number }
  | { type: "project"; project: Project; index: number };
type ProjectEditorProps = {
  project: Project;
  optionSets: ProjectOptionSets;
  canEdit: boolean;
  savingCell: string | null;
  onSave: ProjectSaveHandler;
};

const empty = "-";
const groupOrder = [
  "Pre Production",
  "Ready for Production",
  "In Production",
  "At Finishers",
  "Ready for Delivery",
  "On SIte",
  "Payment Application Made",
  "Completed",
];
const groupColors: Record<string, string> = {
  "Pre Production": "#3b82f6",
  "Ready for Production": "#10b981",
  "In Production": "#f59e0b",
  "At Finishers": "#ef4444",
  "Ready for Delivery": "#8b5cf6",
  "On SIte": "#ec4899",
  "Payment Application Made": "#06b6d4",
  Completed: "#84cc16",
};
const groupTextColors: Record<string, string> = {
  "In Production": "#332c00",
  Completed: "#1a2e05",
};

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
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"idle" | "saved" | "error">("idle");
  const [editMessage, setEditMessage] = useState("");

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
  const optionSets = useMemo(() => buildProjectOptionSets(projects), [projects]);
  const canEditProjects = Boolean(authEmail && supabase);

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

  const displayRows = useMemo<DisplayRow[]>(() => {
    const grouped = new Map<string, Project[]>();

    for (const project of filteredProjects) {
      const groupName = project.groupName || "Unassigned";
      grouped.set(groupName, [...(grouped.get(groupName) ?? []), project]);
    }

    const sortedGroups = Array.from(grouped.keys()).sort((a, b) => {
      const left = groupOrder.indexOf(a);
      const right = groupOrder.indexOf(b);

      if (left !== -1 || right !== -1) {
        return (left === -1 ? Number.MAX_SAFE_INTEGER : left) - (right === -1 ? Number.MAX_SAFE_INTEGER : right);
      }

      return a.localeCompare(b);
    });

    return sortedGroups.flatMap((groupName) => {
      const groupProjects = grouped.get(groupName) ?? [];
      const value = groupProjects.reduce((total, project) => total + (project.orderValue ?? 0), 0);

      return [
        { type: "group" as const, groupName, count: groupProjects.length, value },
        ...groupProjects.map((project, index) => ({ type: "project" as const, project, index })),
      ];
    });
  }, [filteredProjects]);

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

  async function saveProjectField(project: Project, fieldKey: EditableProjectFieldKey, value: string) {
    const definition = editableProjectFields[fieldKey];
    const currentValue = getProjectFieldValue(project, fieldKey);
    const nextProjectValue = toProjectFieldValue(fieldKey, value);

    if ((currentValue ?? null) === nextProjectValue) {
      return;
    }

    if (!supabase || !authEmail || !project.id) {
      setEditStatus("error");
      setEditMessage("Sign in required.");
      return;
    }

    let dbValue: unknown;

    try {
      dbValue = toDbFieldValue(fieldKey, value);
    } catch (saveError) {
      setEditStatus("error");
      setEditMessage(saveError instanceof Error ? saveError.message : "Could not save project.");
      return;
    }

    const previousProjects = projects;
    const cellKey = `${project.sourceKey}:${fieldKey}`;

    setSavingCell(cellKey);
    setEditStatus("idle");
    setEditMessage("");
    setProjects((current) =>
      current.map((item) =>
        item.sourceKey === project.sourceKey
          ? {
              ...item,
              [fieldKey]: nextProjectValue,
            }
          : item,
      ),
    );

    const { data, error: updateError } = await supabase
      .from("crm_projects")
      .update({ [definition.dbColumn]: dbValue })
      .eq("id", project.id)
      .select("*")
      .single();

    setSavingCell(null);

    if (updateError || !data) {
      setProjects(previousProjects);
      setEditStatus("error");
      setEditMessage(updateError?.message ?? "Could not save project.");
      return;
    }

    const updatedProject = mapDbProject(data);

    setProjects((current) =>
      current.map((item) => (item.sourceKey === updatedProject.sourceKey ? updatedProject : item)),
    );
    setEditStatus("saved");
    setEditMessage("Saved");
    window.setTimeout(() => {
      setEditStatus("idle");
      setEditMessage("");
    }, 1400);
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <header className="border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1800px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-white shadow-lg shadow-blue-950/40">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-lg font-bold tracking-normal text-transparent">
                Steelit CRM
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Database size={13} aria-hidden="true" />
                  {dataSource === "supabase" ? "Supabase" : "Local workbook"}
                </span>
                {loadError ? <span className="text-red-300">{loadError}</span> : null}
                {editMessage ? (
                  <span className={editStatus === "error" ? "text-red-300" : "text-emerald-300"}>
                    {editMessage}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <a
              href="https://www.steelit.site"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded border border-[#334155] bg-[#1e293b] px-3 text-sm font-medium text-slate-200 hover:border-[#2563eb] hover:text-white"
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
                className="inline-flex h-9 items-center gap-2 rounded bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-3 text-sm font-semibold text-white shadow-md shadow-blue-950/30"
              >
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-2 rounded bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-3 text-sm font-semibold text-white shadow-md shadow-blue-950/30"
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
        <div className="min-w-0 border border-[#334155] bg-[#0f172a] shadow-xl shadow-black/20">
          <div className="border-b border-[#334155] p-3">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects"
                    className="h-10 w-full rounded border border-[#334155] bg-[#020617] pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#3b82f6]"
                  />
                </label>
                <SegmentedPipeline value={pipeline} onChange={setPipeline} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect icon={ListFilter} label="Group" value={group} onChange={setGroup} values={groups} />
                <FilterSelect icon={SlidersHorizontal} label="Stage" value={stage} onChange={setStage} values={stages} />
                <FilterSelect label="Monday" value={mondayStatus} onChange={setMondayStatus} values={mondayStatuses} />
                <FilterSelect label="Calc" value={calcStatus} onChange={setCalcStatus} values={calcStatuses} />
                <label className="inline-flex h-10 items-center gap-2 rounded border border-[#334155] bg-[#020617] px-2 text-sm text-slate-200">
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

          <div className="max-h-[calc(100vh-260px)] min-h-[520px] overflow-auto bg-white">
            <table className="min-w-[1320px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#1e293b] text-xs font-semibold uppercase text-slate-100">
                <tr>
                  <Th className="sticky left-0 z-20 w-[360px] bg-[#1e293b]">Project</Th>
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
                {displayRows.length ? displayRows.map((row) => {
                  if (row.type === "group") {
                    const color = groupColors[row.groupName] ?? "#64748b";

                    return (
                      <tr key={`group-${row.groupName}`}>
                        <td colSpan={11} className="border-y border-white/40 p-0">
                          <div
                            className="flex h-10 items-center justify-between px-3 text-sm font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            <span>{row.groupName}</span>
                            <span className="text-xs font-medium">
                              {row.count.toLocaleString("en-GB")} items · {formatCurrency(row.value)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const project = row.project;
                  const selected = selectedProject?.sourceKey === project.sourceKey;
                  const rowFill = row.index % 2 === 0 ? "bg-[#f3f4f6]" : "bg-white";

                  return (
                    <tr
                      key={project.sourceKey}
                      onClick={() => {
                        setSelectedKey(project.sourceKey);
                        setActiveTab("overview");
                      }}
                      className={clsx(
                        "cursor-pointer border-b border-[#d1d5db] hover:bg-[#dbeafe]",
                        selected ? "bg-[#bfdbfe]" : rowFill,
                      )}
                    >
                      <Td className={clsx("sticky left-0 z-[5] w-[360px] border-r border-[#d1d5db]", selected ? "bg-[#bfdbfe]" : rowFill)}>
                        <div className="max-w-[330px] truncate font-medium text-slate-950">{project.projectName}</div>
                        <div className="mt-1 truncate text-xs text-slate-600">{clean(project.sitePostCode)} · {clean(project.useCase)}</div>
                      </Td>
                      <Td>{clean(project.jobNumber)}</Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="groupName"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="mondayStatus"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="stage"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="calcStatus"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="rep"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="detailer"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td>
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="installationDate"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                        />
                      </Td>
                      <Td className="text-right tabular-nums">
                        <ProjectFieldEditor
                          project={project}
                          fieldKey="orderValue"
                          optionSets={optionSets}
                          canEdit={canEditProjects}
                          savingCell={savingCell}
                          onSave={saveProjectField}
                          compact
                          align="right"
                        />
                      </Td>
                      <Td className="text-right tabular-nums">{formatPercent(project.jobMargin)}</Td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={11} className="h-48 border-b border-[#d1d5db] bg-white px-4 text-center text-sm text-slate-600">
                      {authEmail ? "No projects match the current filters." : "Sign in to load CRM projects from Supabase."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#334155] px-3 py-2 text-xs text-slate-400">
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
              className="inline-flex h-8 items-center gap-1 rounded border border-[#334155] px-2 font-medium text-slate-200 hover:border-[#2563eb] hover:bg-[#1e293b]"
            >
              <X size={14} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>

        <aside className="min-w-0 border border-[#334155] bg-[#0f172a] shadow-xl shadow-black/20">
          {selectedProject ? (
            <>
              <div className="border-b border-[#334155] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase text-[#3b82f6]">{clean(selectedProject.groupName)}</div>
                    <h2 className="mt-1 text-lg font-semibold leading-6 text-slate-100">{selectedProject.projectName}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded border border-[#334155] text-slate-300 hover:border-[#2563eb] hover:bg-[#1e293b]"
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

              <div className="flex border-b border-[#334155] bg-[#020617]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "h-10 flex-1 border-r border-[#334155] px-2 text-sm font-medium last:border-r-0",
                      activeTab === tab.id ? "bg-[#1e293b] text-white" : "text-slate-400 hover:bg-[#1e293b]/70 hover:text-slate-100",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[calc(100vh-236px)] overflow-auto p-4">
                {activeTab === "overview" ? (
                  <Overview
                    project={selectedProject}
                    optionSets={optionSets}
                    canEdit={canEditProjects}
                    savingCell={savingCell}
                    onSave={saveProjectField}
                  />
                ) : null}
                {activeTab === "site" ? (
                  <Site
                    project={selectedProject}
                    optionSets={optionSets}
                    canEdit={canEditProjects}
                    savingCell={savingCell}
                    onSave={saveProjectField}
                  />
                ) : null}
                {activeTab === "spec" ? (
                  <Spec
                    project={selectedProject}
                    optionSets={optionSets}
                    canEdit={canEditProjects}
                    savingCell={savingCell}
                    onSave={saveProjectField}
                  />
                ) : null}
                {activeTab === "finance" ? (
                  <Finance
                    project={selectedProject}
                    optionSets={optionSets}
                    canEdit={canEditProjects}
                    savingCell={savingCell}
                    onSave={saveProjectField}
                  />
                ) : null}
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
            <div className="p-6 text-sm text-slate-400">No project selected.</div>
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
    <div className="border border-[#334155] bg-[#1e293b] p-4 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <Icon className={tone === "risk" ? "text-red-300" : "text-[#3b82f6]"} size={18} aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-slate-100">{value}</div>
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
    <div className="inline-grid h-10 grid-cols-3 rounded border border-[#334155] bg-[#020617] p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "min-w-24 rounded-sm px-3 text-sm font-medium",
            value === option.value
              ? "bg-gradient-to-r from-[#2563eb] to-[#06b6d4] text-white shadow-sm"
              : "text-slate-400 hover:text-slate-100",
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
    <label className="inline-flex h-10 items-center gap-2 rounded border border-[#334155] bg-[#020617] px-2 text-sm text-slate-200">
      {Icon ? <Icon size={15} aria-hidden="true" /> : null}
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
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
  return <th className={clsx("border-b border-[#334155] px-3 py-3", className)}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("border-b border-[#d1d5db] px-3 py-2 align-middle text-slate-800", className)}>{children}</td>;
}

function ProjectFieldEditor({
  project,
  fieldKey,
  optionSets,
  canEdit,
  savingCell,
  onSave,
  compact = false,
  align = "left",
}: ProjectEditorProps & {
  fieldKey: EditableProjectFieldKey;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const definition = editableProjectFields[fieldKey];
  const rawValue = getProjectFieldValue(project, fieldKey);
  const value = rawValue === null || rawValue === undefined ? "" : String(rawValue);
  const cellKey = `${project.sourceKey}:${fieldKey}`;
  const isSaving = savingCell === cellKey;
  const disabled = !canEdit || isSaving;
  const colorStyle = getFieldColorStyle(fieldKey, value);
  const baseClass = clsx(
    "rounded border outline-none transition focus:border-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-60",
    colorStyle
      ? "font-semibold"
      : compact
        ? "border-[#d1d5db] bg-white text-slate-950"
        : "border-[#334155] bg-[#020617] text-slate-100",
    compact ? "h-8 min-w-28 max-w-44 px-2 text-xs" : "min-h-9 w-full px-2 py-1.5 text-sm",
    align === "right" && "text-right tabular-nums",
  );

  if (!canEdit) {
    if (colorStyle) {
      return (
        <span
          className={clsx(
            "inline-flex min-h-7 max-w-full items-center rounded border px-2 py-1 text-xs font-semibold leading-tight",
            align === "right" && "justify-end tabular-nums",
          )}
          style={colorStyle}
        >
          {formatEditorDisplayValue(fieldKey, rawValue)}
        </span>
      );
    }

    return (
      <span className={clsx("block truncate", compact ? "text-slate-800" : "text-slate-300", align === "right" && "text-right tabular-nums")}>
        {formatEditorDisplayValue(fieldKey, rawValue)}
      </span>
    );
  }

  if (definition.type === "select") {
    const options = optionSets[fieldKey] ?? [];

    return (
      <select
        value={value}
        disabled={disabled}
        aria-label={definition.label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          void onSave(project, fieldKey, event.target.value);
        }}
        className={baseClass}
        style={colorStyle}
      >
        <option value="">-</option>
        {options.map((option) => (
          <option key={option} value={option} style={getFieldColorStyle(fieldKey, option)}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (definition.type === "textarea") {
    return (
      <textarea
        key={`${cellKey}:${value}`}
        defaultValue={value}
        disabled={disabled}
        rows={4}
        aria-label={definition.label}
        onClick={(event) => event.stopPropagation()}
        onBlur={(event) => {
          void onSave(project, fieldKey, event.target.value);
        }}
        style={colorStyle}
        className={clsx(baseClass, "min-h-24 resize-y leading-6")}
      />
    );
  }

  return (
    <input
      key={`${cellKey}:${value}`}
      defaultValue={value}
      disabled={disabled}
      type={definition.type === "date" ? "date" : definition.type === "number" ? "number" : "text"}
      step={"step" in definition ? definition.step : undefined}
      aria-label={definition.label}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        void onSave(project, fieldKey, event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }

        if (event.key === "Escape") {
          event.currentTarget.value = value;
          event.currentTarget.blur();
        }
      }}
      style={colorStyle}
      className={baseClass}
    />
  );
}

function getFieldColorStyle(fieldKey: EditableProjectFieldKey, value: string): CSSProperties | undefined {
  if (!value) {
    return undefined;
  }

  if (fieldKey === "groupName") {
    const backgroundColor = groupColors[value];

    if (!backgroundColor) {
      return undefined;
    }

    return {
      backgroundColor,
      borderColor: backgroundColor,
      color: groupTextColors[value] ?? "#ffffff",
    };
  }

  if (fieldKey === "mondayStatus") {
    return statusStyle(value, "monday");
  }

  if (fieldKey === "stage") {
    return statusStyle(value, "stage");
  }

  if (fieldKey === "calcStatus") {
    return statusStyle(value, "calc");
  }

  if (fieldKey === "status") {
    if (value === "Active") {
      return { backgroundColor: "#d1fae5", borderColor: "#10b981", color: "#064e3b" };
    }

    if (value === "Inactive") {
      return { backgroundColor: "#e5e7eb", borderColor: "#9ca3af", color: "#374151" };
    }
  }

  return undefined;
}

function EditableDetailRow({
  project,
  fieldKey,
  optionSets,
  canEdit,
  savingCell,
  onSave,
  label,
}: ProjectEditorProps & {
  fieldKey: EditableProjectFieldKey;
  label?: string;
}) {
  return (
    <DetailRow
      label={label ?? editableProjectFields[fieldKey].label}
      value={
        <ProjectFieldEditor
          project={project}
          fieldKey={fieldKey}
          optionSets={optionSets}
          canEdit={canEdit}
          savingCell={savingCell}
          onSave={onSave}
        />
      }
    />
  );
}

function formatEditorDisplayValue(fieldKey: EditableProjectFieldKey, value: Project[EditableProjectFieldKey]) {
  if (value === null || value === undefined || value === "") {
    return empty;
  }

  if (editableProjectFields[fieldKey].type === "date") {
    return formatDate(String(value));
  }

  if (["orderValue", "invoicedValue", "jobCost", "jobProfit"].includes(fieldKey)) {
    return formatCurrency(typeof value === "number" ? value : Number(value));
  }

  return String(value);
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-[#334155]/70 py-2 last:border-b-0">
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-200">{value || empty}</dd>
    </div>
  );
}

function Overview(props: ProjectEditorProps) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Board</h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="projectName" label="Project" />
          <EditableDetailRow {...props} fieldKey="jobNumber" label="Job Number" />
          <EditableDetailRow {...props} fieldKey="groupName" label="Group" />
          <EditableDetailRow {...props} fieldKey="mondayStatus" label="Monday" />
          <EditableDetailRow {...props} fieldKey="stage" label="Stage" />
          <EditableDetailRow {...props} fieldKey="calcStatus" label="Calc" />
          <EditableDetailRow {...props} fieldKey="status" label="Status" />
          <EditableDetailRow {...props} fieldKey="userFolderPath" label="User Folder" />
          <EditableDetailRow {...props} fieldKey="driveFolderPath" label="O: Drive Folder" />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Schedule</h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="installationDate" label="Install" />
          <EditableDetailRow {...props} fieldKey="fixedDate" label="Fixed" />
          <EditableDetailRow {...props} fieldKey="drawingsRequiredDate" label="Drawings" />
          <EditableDetailRow {...props} fieldKey="createdOn" label="Created" />
          <EditableDetailRow {...props} fieldKey="orderConfirmed" label="Confirmed" />
          <EditableDetailRow {...props} fieldKey="detailingStart" label="Detailing Start" />
          <EditableDetailRow {...props} fieldKey="detailingDaysRemaining" label="Detailing Days" />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">People</h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="rep" label="Rep" />
          <EditableDetailRow {...props} fieldKey="ownerDynamics" label="Owner" />
          <EditableDetailRow {...props} fieldKey="detailer" label="Detailer" />
          <EditableDetailRow {...props} fieldKey="approvalContact" label="Approval" />
          <EditableDetailRow {...props} fieldKey="siteLiaisonContact" label="Site liaison" />
          <EditableDetailRow {...props} fieldKey="endClientContact" label="End client" />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Comments</h3>
        <ProjectFieldEditor {...props} fieldKey="comments" />
      </section>
    </div>
  );
}

function Site(props: ProjectEditorProps) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <MapPin size={16} aria-hidden="true" />
          Site
        </h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="siteAccount" label="Account" />
          <EditableDetailRow {...props} fieldKey="siteAccountIndustry" label="Industry" />
          <EditableDetailRow {...props} fieldKey="sitePostCode" label="Post code" />
          <EditableDetailRow {...props} fieldKey="location" label="Location" />
          <EditableDetailRow {...props} fieldKey="accAddToLocation" label="Acc Add" />
          <EditableDetailRow {...props} fieldKey="nearestAe" label="Nearest A&E" />
          <EditableDetailRow {...props} fieldKey="billingAccount" label="Billing" />
          <EditableDetailRow {...props} fieldKey="email" label="Email" />
          <EditableDetailRow {...props} fieldKey="mobilePhone" label="Mobile" />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Delivery</h3>
        <ProjectFieldEditor {...props} fieldKey="deliveryComments" />
      </section>
    </div>
  );
}

function Spec(props: ProjectEditorProps) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Structure</h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="useCase" label="Use" />
          <EditableDetailRow {...props} fieldKey="structureType" label="Type" />
          <EditableDetailRow {...props} fieldKey="style" label="Style" />
          <EditableDetailRow {...props} fieldKey="roofShape" label="Roof" />
          <EditableDetailRow {...props} fieldKey="supportType" label="Support" />
          <EditableDetailRow {...props} fieldKey="structureSize" label="Size" />
          <EditableDetailRow {...props} fieldKey="claddingType" label="Cladding" />
          <EditableDetailRow {...props} fieldKey="gableEnds" label="Gable Ends" />
          <EditableDetailRow {...props} fieldKey="sidewalls" label="Sidewalls" />
          <EditableDetailRow {...props} fieldKey="frameworkFinish" label="Finish" />
          <EditableDetailRow {...props} fieldKey="colour" label="Colour" />
          <EditableDetailRow {...props} fieldKey="galvHolesAdded" label="Galv Holes" />
          <EditableDetailRow {...props} fieldKey="boltCapColour" label="Bolt Caps" />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Loads & Groundwork</h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="exClass" label="EX class" />
          <EditableDetailRow {...props} fieldKey="windSite" label="Wind site" />
          <EditableDetailRow {...props} fieldKey="windStructure" label="Wind structure" />
          <EditableDetailRow {...props} fieldKey="snow" label="Snow" />
          <EditableDetailRow {...props} fieldKey="altitude" label="Altitude" />
          <EditableDetailRow {...props} fieldKey="windSnowLoads" label="Wind/Snow" />
          <EditableDetailRow {...props} fieldKey="distToSeaK" label="Dist to sea" />
          <EditableDetailRow {...props} fieldKey="foundationsBy" label="Foundations" />
          <EditableDetailRow {...props} fieldKey="concreteType" label="Concrete" />
          <EditableDetailRow {...props} fieldKey="padFinish" label="Pad finish" />
        </dl>
      </section>
    </div>
  );
}

function Finance(props: ProjectEditorProps) {
  const { project } = props;

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <CircleDollarSign size={16} aria-hidden="true" />
          Commercials
        </h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="orderValue" label="Order value" />
          <EditableDetailRow {...props} fieldKey="invoicedValue" label="Invoiced" />
          <EditableDetailRow {...props} fieldKey="jobCost" label="Job cost" />
          <EditableDetailRow {...props} fieldKey="jobProfit" label="Profit" />
          <DetailRow label="Margin" value={formatPercent(project.jobMargin)} />
          <EditableDetailRow {...props} fieldKey="lowMarginReasonType" label="Low margin" />
          <EditableDetailRow {...props} fieldKey="lowMarginReasonDescription" label="Margin note" />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Operations</h3>
        <dl>
          <EditableDetailRow {...props} fieldKey="frameworkInstaller" label="Installer" />
          <EditableDetailRow {...props} fieldKey="groundworker" label="Groundworker" />
          <EditableDetailRow {...props} fieldKey="padFinisher" label="Pad finisher" />
          <EditableDetailRow {...props} fieldKey="mfgZone" label="MFG zone" />
          <EditableDetailRow {...props} fieldKey="mfgCantColumn" label="MFG column" />
          <EditableDetailRow {...props} fieldKey="mfgOrOther" label="MFG/Other" />
          <EditableDetailRow {...props} fieldKey="gwkSupplierConnect" label="GWK Supplier" />
          <EditableDetailRow {...props} fieldKey="padFinishQuotes" label="Pad quotes" />
          <EditableDetailRow {...props} fieldKey="ramsSignOff" label="RAMs sign off" />
          <EditableDetailRow {...props} fieldKey="rams" label="RAMs" />
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
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <StickyNote size={16} aria-hidden="true" />
          Notes
        </h3>
        <textarea
          value={draftNote}
          onChange={(event) => setDraftNote(event.target.value)}
          rows={5}
          placeholder={`Add note for ${project.jobNumber ?? project.projectName}`}
          className="w-full resize-none rounded border border-[#334155] bg-[#020617] p-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#3b82f6]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={clsx("text-xs", noteStatus === "error" ? "text-red-300" : "text-slate-400")}>
            {noteStatus === "saving" ? "Saving" : noteStatus === "saved" ? "Saved" : noteStatus === "error" ? "Sign in required" : ""}
          </span>
          <button
            type="button"
            onClick={addNote}
            disabled={!draftNote.trim() || noteStatus === "saving"}
            className="inline-flex h-9 items-center gap-2 rounded bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-3 text-sm font-medium text-white hover:from-[#1d4ed8] hover:to-[#0891b2] disabled:cursor-not-allowed disabled:from-[#334155] disabled:to-[#334155] disabled:text-slate-400"
          >
            <StickyNote size={15} aria-hidden="true" />
            Add
          </button>
        </div>
      </section>
      <section className="space-y-2">
        {notes.length ? (
          notes.map((note) => (
            <article key={note.id} className="border border-[#334155] bg-[#020617] p-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{note.body}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <UserRound size={13} aria-hidden="true" />
                {formatDate(note.createdAt)}
              </div>
            </article>
          ))
        ) : (
          <div className="border border-dashed border-[#334155] p-4 text-sm text-slate-400">No notes yet.</div>
        )}
      </section>
    </div>
  );
}
