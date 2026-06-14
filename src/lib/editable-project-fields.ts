import type { Project } from "@/types/project";

export type EditableFieldType = "date" | "number" | "select" | "text" | "textarea";

export type EditableProjectField = {
  dbColumn: string;
  label: string;
  type: EditableFieldType;
  options?: readonly string[];
  required?: boolean;
  step?: string;
};

export const editableProjectFields = {
  projectName: { dbColumn: "project_name", label: "Project", type: "text", required: true },
  jobNumber: { dbColumn: "job_number", label: "Job Number", type: "text" },
  groupName: {
    dbColumn: "group_name",
    label: "Group",
    type: "select",
    options: [
      "Pre Production",
      "Ready for Production",
      "In Production",
      "At Finishers",
      "Ready for Delivery",
      "On SIte",
      "Payment Application Made",
      "Completed",
    ],
  },
  installationDate: { dbColumn: "installation_date", label: "Install", type: "date" },
  fixedDate: { dbColumn: "fixed_date", label: "Fixed", type: "date" },
  drawingsRequiredDate: { dbColumn: "drawings_required_date", label: "Drawings", type: "date" },
  mondayStatus: {
    dbColumn: "monday_status",
    label: "Monday",
    type: "select",
    options: ["Working on it", "Started", "Stuck", "Done"],
  },
  stage: {
    dbColumn: "stage",
    label: "Stage",
    type: "select",
    options: [
      "Confirmed",
      "Initial Detailing",
      "Final Detailing",
      "Waiting for Approval",
      "Waiting on Survey",
      "Waiting on Survey to verify Drawings",
      "Ready for Production",
      "In Production",
      "Ready for Delivery",
      "Installation",
      "Snagging o/s",
      "Post Installation",
      "Specification",
      "Payment Application Made",
      "Payment application made",
      "Completed",
    ],
  },
  calcStatus: {
    dbColumn: "calc_status",
    label: "Calc",
    type: "select",
    options: [
      "Draft - Torcal",
      "Full - Torcal",
      "Requested - Torcal",
      "Not Require / Non CE Marked",
      "Draft - Considine",
      "Full - Considine",
      "Requested - Considine",
    ],
  },
  detailingStart: { dbColumn: "detailing_start", label: "Detailing Start", type: "text" },
  detailingDaysRemaining: { dbColumn: "detailing_days_remaining", label: "Detailing Days", type: "number", step: "1" },
  status: { dbColumn: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  rep: { dbColumn: "rep", label: "Rep", type: "select" },
  ownerDynamics: { dbColumn: "owner_dynamics", label: "Owner", type: "select" },
  detailer: { dbColumn: "detailer", label: "Detailer", type: "select" },
  orderValue: { dbColumn: "order_value", label: "Order Value", type: "number", step: "0.01" },
  userFolderPath: { dbColumn: "user_folder_path", label: "User Folder", type: "text" },
  driveFolderPath: { dbColumn: "drive_folder_path", label: "O: Drive Folder", type: "text" },
  comments: { dbColumn: "comments", label: "Comments", type: "textarea" },
  deliveryComments: { dbColumn: "delivery_comments", label: "Delivery", type: "textarea" },
  useCase: { dbColumn: "use_case", label: "Use", type: "select" },
  exClass: { dbColumn: "ex_class", label: "EX class", type: "select" },
  windSite: { dbColumn: "wind_site", label: "Wind Site", type: "text" },
  windStructure: { dbColumn: "wind_structure", label: "Wind Structure", type: "text" },
  snow: { dbColumn: "snow", label: "Snow", type: "text" },
  altitude: { dbColumn: "altitude", label: "Altitude", type: "text" },
  windSnowLoads: { dbColumn: "wind_snow_loads", label: "Wind/Snow Loads", type: "text" },
  structureType: { dbColumn: "structure_type", label: "Type", type: "select" },
  style: { dbColumn: "style", label: "Style", type: "select" },
  roofShape: { dbColumn: "roof_shape", label: "Roof", type: "select" },
  supportType: { dbColumn: "support_type", label: "Support", type: "select" },
  structureSize: { dbColumn: "structure_size", label: "Size", type: "text" },
  claddingType: { dbColumn: "cladding_type", label: "Cladding", type: "select" },
  gableEnds: { dbColumn: "gable_ends", label: "Gable Ends", type: "select" },
  sidewalls: { dbColumn: "sidewalls", label: "Sidewalls", type: "select" },
  distToSeaK: { dbColumn: "dist_to_sea_k", label: "Dist to Sea", type: "number", step: "0.01" },
  frameworkFinish: { dbColumn: "framework_finish", label: "Finish", type: "select" },
  colour: { dbColumn: "colour", label: "Colour", type: "select" },
  galvHolesAdded: { dbColumn: "galv_holes_added", label: "Galv Holes", type: "select" },
  boltCapColour: { dbColumn: "bolt_cap_colour", label: "Bolt Caps", type: "select" },
  foundationsBy: { dbColumn: "foundations_by", label: "Foundations", type: "select" },
  concreteType: { dbColumn: "concrete_type", label: "Concrete", type: "select" },
  padFinish: { dbColumn: "pad_finish", label: "Pad Finish", type: "select" },
  createdOn: { dbColumn: "created_on", label: "Created", type: "date" },
  siteAccount: { dbColumn: "site_account", label: "Account", type: "text" },
  siteAccountIndustry: { dbColumn: "site_account_industry", label: "Industry", type: "text" },
  sitePostCode: { dbColumn: "site_post_code", label: "Post Code", type: "text" },
  location: { dbColumn: "location", label: "Location", type: "text" },
  accAddToLocation: { dbColumn: "acc_add_to_location", label: "Acc Add to Location", type: "text" },
  nearestAe: { dbColumn: "nearest_ae", label: "Nearest A&E", type: "text" },
  billingAccount: { dbColumn: "billing_account", label: "Billing", type: "text" },
  approvalContact: { dbColumn: "approval_contact", label: "Approval", type: "text" },
  siteLiaisonContact: { dbColumn: "site_liaison_contact", label: "Site Liaison", type: "text" },
  endClientContact: { dbColumn: "end_client_contact", label: "End Client", type: "text" },
  frameworkInstaller: { dbColumn: "framework_installer", label: "Installer", type: "select" },
  groundworker: { dbColumn: "groundworker", label: "Groundworker", type: "select" },
  padFinisher: { dbColumn: "pad_finisher", label: "Pad Finisher", type: "select" },
  inactiveReason: { dbColumn: "inactive_reason", label: "Inactive Reason", type: "text" },
  invoicedValue: { dbColumn: "invoiced_value", label: "Invoiced", type: "number", step: "0.01" },
  jobCost: { dbColumn: "job_cost", label: "Job Cost", type: "number", step: "0.01" },
  jobProfit: { dbColumn: "job_profit", label: "Profit", type: "number", step: "0.01" },
  lowMarginReasonDescription: { dbColumn: "low_margin_reason_description", label: "Low Margin Reason", type: "textarea" },
  lowMarginReasonType: { dbColumn: "low_margin_reason_type", label: "Low Margin Type", type: "select" },
  opportunity: { dbColumn: "opportunity", label: "Opportunity", type: "text" },
  orderConfirmed: { dbColumn: "order_confirmed", label: "Confirmed", type: "date" },
  mfgZone: { dbColumn: "mfg_zone", label: "MFG Zone", type: "select" },
  mfgCantColumn: { dbColumn: "mfg_cant_column", label: "MFG Column", type: "select" },
  gwkSupplierConnect: { dbColumn: "gwk_supplier_connect", label: "GWK Supplier", type: "text" },
  padFinishQuotes: { dbColumn: "pad_finish_quotes", label: "Pad Quotes", type: "text" },
  newWordDoc: { dbColumn: "new_word_doc", label: "Word Doc", type: "text" },
  files: { dbColumn: "files", label: "Files", type: "text" },
  timeTracking: { dbColumn: "time_tracking", label: "Time Tracking", type: "text" },
  pmSelectionList: { dbColumn: "pm_selection_list", label: "P&M List", type: "text" },
  mfgOrOther: { dbColumn: "mfg_or_other", label: "MFG/Other", type: "select", options: ["MFG", "Other"] },
  pmRequiredItems: { dbColumn: "pm_required_items", label: "P&M Required", type: "text" },
  email: { dbColumn: "email", label: "Email", type: "text" },
  ramsSignOff: { dbColumn: "rams_sign_off", label: "RAMs Sign Off", type: "select" },
  mobilePhone: { dbColumn: "mobile_phone", label: "Mobile", type: "text" },
  rams: { dbColumn: "rams", label: "RAMs", type: "text" },
} as const satisfies Record<string, EditableProjectField>;

export type EditableProjectFieldKey = keyof typeof editableProjectFields;
export type ProjectOptionSets = Partial<Record<EditableProjectFieldKey, string[]>>;

const groupLikeValues = new Set<string>(editableProjectFields.groupName.options);

export function buildProjectOptionSets(projects: Project[]): ProjectOptionSets {
  const optionSets: ProjectOptionSets = {};

  for (const key of Object.keys(editableProjectFields) as EditableProjectFieldKey[]) {
    const definition = editableProjectFields[key];

    if (definition.type !== "select") {
      continue;
    }

    const fixedOptions = "options" in definition ? [...definition.options] : [];
    const dataOptions = projects
      .map((project) => project[key])
      .filter((value): value is string => typeof value === "string" && isUsableOption(key, value));

    optionSets[key] = uniqueOptions([...fixedOptions, ...dataOptions]);
  }

  return optionSets;
}

export function getProjectFieldValue(project: Project, key: EditableProjectFieldKey) {
  return project[key];
}

export function toProjectFieldValue(key: EditableProjectFieldKey, value: string): Project[EditableProjectFieldKey] {
  const definition = editableProjectFields[key];
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (definition.type === "number") {
    const parsed = Number(trimmed);
    return (Number.isFinite(parsed) ? parsed : null) as Project[EditableProjectFieldKey];
  }

  return trimmed as Project[EditableProjectFieldKey];
}

export function toDbFieldValue(key: EditableProjectFieldKey, value: string) {
  const projectValue = toProjectFieldValue(key, value);
  const definition = editableProjectFields[key];

  if ("required" in definition && definition.required && projectValue === null) {
    throw new Error(`${definition.label} is required.`);
  }

  return projectValue;
}

function isUsableOption(key: EditableProjectFieldKey, value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "[]" || /^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return false;
  }

  if (key !== "groupName" && groupLikeValues.has(trimmed)) {
    return false;
  }

  return true;
}

function uniqueOptions(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "en-GB", { numeric: true }));
}
