export const LEVEL1_DASHBOARDS = [
  {
    code: "MB_DISTRICT_BLOCK",
    examType: "MB",
    view: "district",
    label: "MB · District-Block",
    title: "Mission Buniyaad · District-Block Dashboard",
    path: "/dashboards-level-1/MB",
  },
  {
    code: "MB_BLOCK_SCHOOL",
    examType: "MB",
    view: "block-school",
    label: "MB · Block-School",
    title: "Mission Buniyaad · Block-School Dashboard",
    path: "/dashboards-level-1/MB/block-school",
  },
  {
    code: "MB_SCHOOL",
    examType: "MB",
    view: "school",
    label: "MB · School Level",
    title: "Mission Buniyaad · School Level Dashboard",
    path: "/dashboards-level-1/MB/school",
  },
  {
    code: "HS100_DISTRICT_BLOCK",
    examType: "HS100",
    view: "district",
    label: "S100 · District-Block",
    title: "Haryana Super 100 · District-Block Dashboard",
    path: "/dashboards-level-1/HS100",
  },
  {
    code: "HS100_BLOCK_SCHOOL",
    examType: "HS100",
    view: "block-school",
    label: "S100 · Block-School",
    title: "Haryana Super 100 · Block-School Dashboard",
    path: "/dashboards-level-1/HS100/block-school",
  },
  {
    code: "HS100_SCHOOL",
    examType: "HS100",
    view: "school",
    label: "S100 · School Level",
    title: "Haryana Super 100 · School Level Dashboard",
    path: "/dashboards-level-1/HS100/school",
  },
];



export const dashboardCodeFor = (examType, view) => {
  const normalizedExam = String(examType || "").toUpperCase();
  const normalizedView = view === "block-school" ? "block-school" : view === "school" ? "school" : "district";
  return LEVEL1_DASHBOARDS.find(
    (item) => item.examType === normalizedExam && item.view === normalizedView
  )?.code || null;
};


export const ALL_REGISTRATION_DASHBOARDS = [
  {
    code: "MB_ALL_REGISTRATIONS",
    examType: "MB",
    label: "Mission Buniyaad Registered Students",
    title: "Mission Buniyaad · All Level 1 Registrations",
    path: "/official/registrations/MB",
  },
  {
    code: "HS100_ALL_REGISTRATIONS",
    examType: "HS100",
    label: "Haryana Super 100 Registered Students",
    title: "Haryana Super 100 · All Level 1 Registrations",
    path: "/official/registrations/HS100",
  },
];

export const ALL_REGISTRATION_ACCESS_CODES = ALL_REGISTRATION_DASHBOARDS.map((item) => item.code);

export const REPORT_DASHBOARDS = [
  { code: "REGISTRATIONS_BY_USERS", label: "Registrations By Users", title: "Registrations By Users Dashboard", path: "/official/dashboards/registrations-by-users" },
  { code: "VERIFICATION_BY_USERS", label: "Verification By Users", title: "Verification By Users Dashboard", path: "/official/dashboards/verification-by-users" },
  { code: "SCHOOL_VISIT_DASHBOARD", label: "School Visit Dashboard", title: "School Visit Dashboard", path: "/official/dashboards/school-visits" },
];

export const DASHBOARD_ACCESS_CODES = [...LEVEL1_DASHBOARDS.map((item) => item.code), ...ALL_REGISTRATION_DASHBOARDS.map((item) => item.code), ...REPORT_DASHBOARDS.map((item) => item.code)];


export const allRegistrationCodeFor = (examType) => {
  const normalizedExam = String(examType || "").toUpperCase();
  return ALL_REGISTRATION_DASHBOARDS.find((item) => item.examType === normalizedExam)?.code || null;
};
