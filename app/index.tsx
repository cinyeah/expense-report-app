import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { getReports, saveReports, ExpenseReport } from '../utils/storage';
import { Plus, ChevronRight } from 'lucide-react-native';

export default function ReportListScreen() {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const data = await getReports();
    setReports(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const createReport = async () => {
    let name = '';
    if (Platform.OS === 'web') {
      name = window.prompt('Enter your name for the report:') || 'Employee';
    } else {
      // For native, we'd use an Alert with input, but simplifying for now
      name = 'Employee';
    }
    
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const title = `${name} - ${monthYear}`;
    
    const newReport: ExpenseReport = {
      id: Math.random().toString(36).substring(7),
      title: title,
      createdAt: new Date().toISOString(),
      items: [],
    };
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    await saveReports(updatedReports);
    router.push(`/report/${newReport.id}`);
  };

  const renderItem = ({ item }: { item: ExpenseReport }) => (
    <TouchableOpacity 
      style={styles.reportItem} 
      onPress={() => router.push(`/report/${item.id}`)}
    >
      <View>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.itemCount}>{item.items.length} items</Text>
      </View>
      <ChevronRight color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Expense Reports</Text>
        <TouchableOpacity style={styles.createButton} onPress={createReport}>
          <Plus color="#fff" size={20} />
          <Text style={styles.createButtonText}>New Report</Text>
        </TouchableOpacity>
      </View>
      
      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No reports yet. Create your first one!</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  createButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
  listContent: {
    padding: 15,
  },
  reportItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    color: '#666',
  },
  itemCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
