import "server-only";

import fallbackProjects from "@/data/projects-sample.json";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Project, ProjectsPayload } from "@/types/project";

type DbProject = Record<string, unknown>;

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function mapDbProject(row: DbProject): Project {
  return {
    id: asString(row.id) ?? undefined,
    sourceKey: asString(row.source_key) ?? "",
    sourceRow: asNumber(row.source_row),
    groupName: asString(row.group_name),
    projectName: asString(row.project_name) ?? "Untitled project",
    jobNumber: asString(row.job_number),
    installationDate: asString(row.installation_date),
    fixedDate: asString(row.fixed_date),
    drawingsRequiredDate: asString(row.drawings_required_date),
    mondayStatus: asString(row.monday_status),
    stage: asString(row.stage),
    calcStatus: asString(row.calc_status),
    detailingStart: asString(row.detailing_start),
    detailingDaysRemaining: asNumber(row.detailing_days_remaining),
    status: asString(row.status),
    rep: asString(row.rep),
    ownerDynamics: asString(row.owner_dynamics),
    detailer: asString(row.detailer),
    orderValue: asNumber(row.order_value),
    userFolderPath: asString(row.user_folder_path),
    driveFolderPath: asString(row.drive_folder_path),
    comments: asString(row.comments),
    deliveryComments: asString(row.delivery_comments),
    useCase: asString(row.use_case),
    exClass: asString(row.ex_class),
    windSite: asString(row.wind_site),
    windStructure: asString(row.wind_structure),
    snow: asString(row.snow),
    altitude: asString(row.altitude),
    windSnowLoads: asString(row.wind_snow_loads),
    structureType: asString(row.structure_type),
    style: asString(row.style),
    roofShape: asString(row.roof_shape),
    supportType: asString(row.support_type),
    structureSize: asString(row.structure_size),
    claddingType: asString(row.cladding_type),
    gableEnds: asString(row.gable_ends),
    sidewalls: asString(row.sidewalls),
    distToSeaK: asNumber(row.dist_to_sea_k),
    frameworkFinish: asString(row.framework_finish),
    colour: asString(row.colour),
    galvHolesAdded: asString(row.galv_holes_added),
    boltCapColour: asString(row.bolt_cap_colour),
    foundationsBy: asString(row.foundations_by),
    concreteType: asString(row.concrete_type),
    padFinish: asString(row.pad_finish),
    createdOn: asString(row.created_on),
    siteAccount: asString(row.site_account),
    siteAccountIndustry: asString(row.site_account_industry),
    sitePostCode: asString(row.site_post_code),
    location: asString(row.location),
    accAddToLocation: asString(row.acc_add_to_location),
    nearestAe: asString(row.nearest_ae),
    billingAccount: asString(row.billing_account),
    approvalContact: asString(row.approval_contact),
    siteLiaisonContact: asString(row.site_liaison_contact),
    endClientContact: asString(row.end_client_contact),
    frameworkInstaller: asString(row.framework_installer),
    groundworker: asString(row.groundworker),
    padFinisher: asString(row.pad_finisher),
    inactiveReason: asString(row.inactive_reason),
    invoicedValue: asNumber(row.invoiced_value),
    jobCost: asNumber(row.job_cost),
    jobProfit: asNumber(row.job_profit),
    jobMargin: asNumber(row.job_margin),
    lowMarginReasonDescription: asString(row.low_margin_reason_description),
    lowMarginReasonType: asString(row.low_margin_reason_type),
    opportunity: asString(row.opportunity),
    orderConfirmed: asString(row.order_confirmed),
    mfgZone: asString(row.mfg_zone),
    mfgCantColumn: asString(row.mfg_cant_column),
    itemId: asString(row.item_id),
    gwkSupplierConnect: asString(row.gwk_supplier_connect),
    padFinishQuotes: asString(row.pad_finish_quotes),
    newWordDoc: asString(row.new_word_doc),
    files: asString(row.files),
    timeTracking: asString(row.time_tracking),
    pmSelectionList: asString(row.pm_selection_list),
    mfgOrOther: asString(row.mfg_or_other),
    pmRequiredItems: asString(row.pm_required_items),
    email: asString(row.email),
    ramsSignOff: asString(row.rams_sign_off),
    mobilePhone: asString(row.mobile_phone),
    rams: asString(row.rams),
  };
}

export async function getProjects(): Promise<ProjectsPayload> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      projects: fallbackProjects as Project[],
      source: "local",
    };
  }

  const { data, error } = await supabase
    .from("crm_projects")
    .select("*")
    .order("installation_date", { ascending: true, nullsFirst: false })
    .order("project_name", { ascending: true });

  if (error) {
    return {
      projects: fallbackProjects as Project[],
      source: "local",
      error: error.message,
    };
  }

  return {
    projects: (data ?? []).map(mapDbProject),
    source: "supabase",
  };
}
