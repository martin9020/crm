import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

type WorkbookRow = Record<string, unknown>;
type DbProject = Record<string, unknown>;

const workbookPath = path.resolve(process.cwd(), "..", "monday_graphql_export.xlsx");
const localDataPath = path.resolve(process.cwd(), "src", "data", "projects-local.generated.json");

loadEnvFile(".env.local");
loadEnvFile(".env");

const fieldMap = {
  group_name: "Group",
  project_name: "Project",
  job_number: "Job Number",
  installation_date: "Installation Date",
  fixed_date: "Fixed Date",
  drawings_required_date: "Drawings Required Date",
  monday_status: "Monday Status",
  stage: "Stage",
  calc_status: "Calc Status",
  detailing_start: "Detailing Start",
  detailing_days_remaining: "Detailing Days Remaining",
  status: "Status",
  rep: "Rep",
  owner_dynamics: "Owner (Dynamics)",
  detailer: "Detailer",
  order_value: "Order Value",
  user_folder_path: "User Folder Path",
  drive_folder_path: "O: Drive Folder Path",
  comments: "Comments",
  delivery_comments: "Dely Comments",
  use_case: "Use",
  ex_class: "1090 Ex Class",
  wind_site: "Wind Site",
  wind_structure: "Wind Structure",
  snow: "Snow",
  altitude: "Altitude",
  wind_snow_loads: "Wind/Snow Loads",
  structure_type: "Structure Type (Dynamics)",
  style: "Style",
  roof_shape: "Roof Shape",
  support_type: "Support Type",
  structure_size: "Structure Size",
  cladding_type: "Cladding Type",
  gable_ends: "Gable Ends",
  sidewalls: "Sidewalls",
  dist_to_sea_k: "Dist to Sea (k)",
  framework_finish: "Framework Finish",
  colour: "Colour",
  galv_holes_added: "Galv Holes Added",
  bolt_cap_colour: "Bolt Cap Colour",
  foundations_by: "Foundations By",
  concrete_type: "Concrete Type",
  pad_finish: "Pad Finish",
  created_on: "Created On",
  site_account: "Site Acc",
  site_account_industry: "Site Acc Industry",
  site_post_code: "Site Post Code",
  location: "Location",
  acc_add_to_location: "Acc Add to Location",
  nearest_ae: "Nearest A&E",
  billing_account: "Billing Acc",
  approval_contact: "Approval Contact",
  site_liaison_contact: "Site Liaison Contact",
  end_client_contact: "End Client Contact",
  framework_installer: "Framework Installer",
  groundworker: "Groundworker",
  pad_finisher: "Pad Finisher",
  inactive_reason: "Inactive Reason",
  invoiced_value: "Invoiced Value",
  job_cost: "Job Cost",
  job_profit: "Job Profit",
  job_margin: "Job Margin",
  low_margin_reason_description: "Low Margin Reason Description",
  low_margin_reason_type: "Low Margin Reason Type",
  opportunity: "Opportunity",
  order_confirmed: "Order Confirmed",
  mfg_zone: "MFG Zone",
  mfg_cant_column: "MFG Cant Column",
  item_id: "Item ID",
  gwk_supplier_connect: "*Gwk Supplier Connect",
  pad_finish_quotes: "Pad Finish Quotes",
  new_word_doc: "New Word Doc",
  files: "Files",
  time_tracking: "Time tracking",
  pm_selection_list: "Link P&M Selection List",
  mfg_or_other: "MFG or Other",
  pm_required_items: "P&M Required Items",
  email: "Email",
  rams_sign_off: "RAMs sign off",
  mobile_phone: "Mobile Phone",
  rams: "RAMs",
} as const;

const dateFields = new Set([
  "installation_date",
  "fixed_date",
  "drawings_required_date",
  "created_on",
  "order_confirmed",
]);

const numberFields = new Set([
  "detailing_days_remaining",
  "order_value",
  "dist_to_sea_k",
  "invoiced_value",
  "job_cost",
  "job_profit",
  "job_margin",
]);

function loadEnvFile(fileName: string) {
  const filePath = path.resolve(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function readWorkbookRows() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet("Monday Board");

  if (!worksheet) {
    throw new Error("The workbook does not contain a readable 'Monday Board' sheet.");
  }

  const headers = worksheet
    .getRow(1)
    .values as Array<ExcelJS.CellValue | undefined>;
  const rows: WorkbookRow[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: WorkbookRow = {};

    headers.forEach((header, index) => {
      const headerText = text(cellValue(header));

      if (index > 0 && headerText) {
        record[headerText] = cellValue(row.getCell(index).value);
      }
    });

    rows.push(record);
  });

  return rows;
}

function cellValue(value: ExcelJS.CellValue | undefined): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((item) => item.text).join("");
  }

  if ("text" in value && typeof value.text === "string") {
    return value.text;
  }

  if ("result" in value) {
    return cellValue(value.result as ExcelJS.CellValue);
  }

  return null;
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim();
}

function date(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const candidate = String(value).trim();
  const parsed = new Date(candidate);

  if (!Number.isNaN(parsed.getTime()) && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(candidate)) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function number(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(String(value).replace(/[£,%\s,]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

function jsonSafeRow(row: WorkbookRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

function toDbProject(row: WorkbookRow, index: number): DbProject | null {
  const projectName = text(row.Project);
  const itemId = text(row["Item ID"]);
  const jobNumber = text(row["Job Number"]);

  if (!projectName || !itemId || !/^\d+$/.test(itemId)) {
    return null;
  }

  const sourceKey = itemId ?? jobNumber ?? `row-${index + 2}`;
  const project: DbProject = {
    source_key: sourceKey,
    source_row: index + 2,
    raw_data: jsonSafeRow(row),
  };

  for (const [dbField, workbookField] of Object.entries(fieldMap)) {
    const value = row[workbookField];

    if (dateFields.has(dbField)) {
      project[dbField] = date(value);
    } else if (numberFields.has(dbField)) {
      project[dbField] = number(value);
    } else {
      project[dbField] = text(value);
    }
  }

  project.project_name = projectName;

  return project;
}

const camelKeys: Record<string, string> = {
  source_key: "sourceKey",
  source_row: "sourceRow",
  group_name: "groupName",
  project_name: "projectName",
  job_number: "jobNumber",
  installation_date: "installationDate",
  fixed_date: "fixedDate",
  drawings_required_date: "drawingsRequiredDate",
  monday_status: "mondayStatus",
  calc_status: "calcStatus",
  detailing_start: "detailingStart",
  detailing_days_remaining: "detailingDaysRemaining",
  owner_dynamics: "ownerDynamics",
  order_value: "orderValue",
  user_folder_path: "userFolderPath",
  drive_folder_path: "driveFolderPath",
  delivery_comments: "deliveryComments",
  use_case: "useCase",
  ex_class: "exClass",
  wind_site: "windSite",
  wind_structure: "windStructure",
  wind_snow_loads: "windSnowLoads",
  structure_type: "structureType",
  roof_shape: "roofShape",
  support_type: "supportType",
  structure_size: "structureSize",
  cladding_type: "claddingType",
  gable_ends: "gableEnds",
  dist_to_sea_k: "distToSeaK",
  framework_finish: "frameworkFinish",
  galv_holes_added: "galvHolesAdded",
  bolt_cap_colour: "boltCapColour",
  foundations_by: "foundationsBy",
  concrete_type: "concreteType",
  pad_finish: "padFinish",
  created_on: "createdOn",
  site_account: "siteAccount",
  site_account_industry: "siteAccountIndustry",
  site_post_code: "sitePostCode",
  acc_add_to_location: "accAddToLocation",
  nearest_ae: "nearestAe",
  billing_account: "billingAccount",
  approval_contact: "approvalContact",
  site_liaison_contact: "siteLiaisonContact",
  end_client_contact: "endClientContact",
  framework_installer: "frameworkInstaller",
  pad_finisher: "padFinisher",
  inactive_reason: "inactiveReason",
  invoiced_value: "invoicedValue",
  job_cost: "jobCost",
  job_profit: "jobProfit",
  job_margin: "jobMargin",
  low_margin_reason_description: "lowMarginReasonDescription",
  low_margin_reason_type: "lowMarginReasonType",
  order_confirmed: "orderConfirmed",
  mfg_zone: "mfgZone",
  mfg_cant_column: "mfgCantColumn",
  item_id: "itemId",
  gwk_supplier_connect: "gwkSupplierConnect",
  pad_finish_quotes: "padFinishQuotes",
  new_word_doc: "newWordDoc",
  time_tracking: "timeTracking",
  pm_selection_list: "pmSelectionList",
  mfg_or_other: "mfgOrOther",
  pm_required_items: "pmRequiredItems",
  rams_sign_off: "ramsSignOff",
  mobile_phone: "mobilePhone",
};

function toLocalProject(dbProject: DbProject) {
  const local: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(dbProject)) {
    if (key === "raw_data") {
      continue;
    }

    local[camelKeys[key] ?? key] = value;
  }

  return local;
}

async function loadProjects() {
  const rows = await readWorkbookRows();

  return rows
    .map(toDbProject)
    .filter((project): project is DbProject => project !== null);
}

async function importProjects(projects: DbProject[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const chunkSize = 100;
  let imported = 0;

  for (let index = 0; index < projects.length; index += chunkSize) {
    const chunk = projects.slice(index, index + chunkSize);
    const { error } = await supabase.from("crm_projects").upsert(chunk, {
      onConflict: "source_key",
    });

    if (error) {
      throw error;
    }

    imported += chunk.length;
  }

  return imported;
}

async function main() {
  const mode = process.argv.find((arg) => arg.startsWith("--")) ?? "--dry-run";
  const projects = await loadProjects();

  if (mode === "--generate-local") {
    fs.writeFileSync(localDataPath, `${JSON.stringify(projects.map(toLocalProject), null, 2)}\n`);
    console.log(`Generated ${projects.length} local projects at ${localDataPath}`);
    return;
  }

  if (mode === "--import") {
    const imported = await importProjects(projects);
    console.log(`Imported ${imported} projects into Supabase.`);
    return;
  }

  const groups = new Map<string, number>();
  const stages = new Map<string, number>();

  for (const project of projects) {
    const group = String(project.group_name ?? "Unassigned");
    const stage = String(project.stage ?? "Unassigned");
    groups.set(group, (groups.get(group) ?? 0) + 1);
    stages.set(stage, (stages.get(stage) ?? 0) + 1);
  }

  console.log(`Read ${projects.length} project rows from ${workbookPath}`);
  console.log("Groups:", Object.fromEntries(groups));
  console.log("Stages:", Object.fromEntries(stages));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
