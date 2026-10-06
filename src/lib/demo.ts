/**
 * Demo login payloads used by the Auth page (development/presentation mode).
 * Selecting a demo role signs in anonymously and claims the matching profile
 * so all three dashboards can be shown instantly during a demo.
 */

export interface DemoAccount {
  key: "student" | "teacher" | "admin";
  title: string;
  subtitle: string;
  name: string;
  claim: {
    role: "student" | "teacher" | "admin";
    name: string;
    profileId: string;
    department: string;
    year?: string;
    hostel?: string;
    room?: string;
    phone?: string;
    designation?: string;
    adminCode?: string;
    demo: boolean;
  };
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "student",
    title: "Student Demo",
    subtitle: "HR2 hostel · report, track, feedback & badges",
    name: "Aarav Mehta",
    claim: {
      role: "student",
      name: "Aarav Mehta",
      profileId: "NMU2023CS1042",
      department: "Computer Science",
      year: "3rd Year",
      hostel: "Boys Hostel · HR2",
      room: "C-312",
      phone: "+91 98100 11223",
      demo: true,
    },
  },
  {
    key: "teacher",
    title: "Teacher / Staff Demo",
    subtitle: "Electrical Maintenance · assigned tasks & proofs",
    name: "Prof. Sneha Rajan",
    claim: {
      role: "teacher",
      name: "Prof. Sneha Rajan",
      profileId: "NMU-ST-2245",
      department: "Electrical Maintenance",
      designation: "Electrical Supervisor",
      phone: "+91 98200 44556",
      demo: true,
    },
  },
  {
    key: "admin",
    title: "Admin Demo",
    subtitle: "Full control · analytics, assignments & safety",
    name: "Dr. Priya Sharma",
    claim: {
      role: "admin",
      name: "Dr. Priya Sharma",
      profileId: "NMU-AD-0001",
      department: "Administration",
      designation: "Campus Administrator",
      adminCode: "CG-ADMIN-2026",
      demo: true,
    },
  },
];

/** Mock admin setup code shown in dev mode (role claim screen). */
export const ADMIN_SETUP_CODE = "CG-ADMIN-2026";
