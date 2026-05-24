import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_KEY = '@expense_reports';
export interface ExpenseItem {
  id: string;
  date: string;
  amount: string;
  category: string;
  note?: string;
  receiptUri?: string;
}
  receiptUri?: string;
}

export interface ExpenseReport {
  id: string;
  title: string;
  createdAt: string;
  items: ExpenseItem[];
  approverEmail?: string;
}

export const getReports = async (): Promise<ExpenseReport[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(REPORTS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error fetching reports', e);
    return [];
  }
};

export const saveReports = async (reports: ExpenseReport[]) => {
  try {
    const jsonValue = JSON.stringify(reports);
    await AsyncStorage.setItem(REPORTS_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving reports', e);
  }
};

export const getReportById = async (id: string): Promise<ExpenseReport | undefined> => {
  const reports = await getReports();
  return reports.find(r => r.id === id);
};

export const updateReport = async (updatedReport: ExpenseReport) => {
  const reports = await getReports();
  const index = reports.findIndex(r => r.id === updatedReport.id);
  if (index !== -1) {
    reports[index] = updatedReport;
    await saveReports(reports);
  }
};
