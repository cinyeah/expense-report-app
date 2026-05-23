import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Image, Platform, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import { getReportById, updateReport, ExpenseReport, ExpenseItem } from '../../utils/storage';
import { ArrowLeft, Plus, Trash2, Camera, Send } from 'lucide-react-native';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [approverEmail, setApproverEmail] = useState('');

  useEffect(() => {
    if (id) {
      loadReport(id as string);
    }
  }, [id]);

  const loadReport = async (reportId: string) => {
    const data = await getReportById(reportId);
    if (data) {
      setReport(data);
      setApproverEmail(data.approverEmail || '');
    }
  };

  const addItem = () => {
    if (!report) return;
    const newItem: ExpenseItem = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
    };
    const updated = { ...report, items: [...report.items, newItem] };
    setReport(updated);
    updateReport(updated);
  };

  const updateItem = (itemId: string, field: keyof ExpenseItem, value: string) => {
    if (!report) return;
    const updatedItems = report.items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    const updated = { ...report, items: updatedItems };
    setReport(updated);
    updateReport(updated);
  };

  const deleteItem = (itemId: string) => {
    if (!report) return;
    const updatedItems = report.items.filter(item => item.id !== itemId);
    const updated = { ...report, items: updatedItems };
    setReport(updated);
    updateReport(updated);
  };

  const pickImage = async (itemId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      updateItem(itemId, 'receiptUri', result.assets[0].uri);
    }
  };

  const handleApproverEmailChange = (email: string) => {
    setApproverEmail(email);
    if (report) {
      updateReport({ ...report, approverEmail: email });
    }
  };

  const submitForApproval = async () => {
    if (!report || !approverEmail) {
      Alert.alert('Error', 'Please provide an approver email.');
      return;
    }

    const reportContent = report.items.map(item => (
      `Date: ${item.date}\nCategory: ${item.category}\nAmount: $${item.amount}\n-------------------`
    )).join('\n');

    const body = `Hi,\n\nPlease find the expense report details for ${report.title} below:\n\n${reportContent}\n\nTotal Items: ${report.items.length}\n\nSubmitted via Expense Report App.`;

    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: [approverEmail],
        subject: `Expense Report Approval Request: ${report.title}`,
        body: body,
      });
    } else {
      // Fallback for web if MailComposer is not fully supported or restricted
      const mailtoUrl = `mailto:${approverEmail}?subject=${encodeURIComponent(`Expense Report Approval Request: ${report.title}`)}&body=${encodeURIComponent(body)}`;
      if (Platform.OS === 'web') {
        window.location.href = mailtoUrl;
      } else {
        Alert.alert('Error', 'Mail services are not available.');
      }
    }
  };

  if (!report) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoSection}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDate}>Created on {new Date(report.createdAt).toLocaleDateString()}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expense Items</Text>
          <TouchableOpacity style={styles.addButton} onPress={addItem}>
            <Plus color="#007bff" size={20} />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {report.items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    value={item.date}
                    onChangeText={(text) => updateItem(item.id, 'date', text)}
                    placeholder="YYYY-MM-DD"
                  />
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 0.5, marginLeft: 10 }]}>
                <Text style={styles.label}>Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={item.amount}
                  onChangeText={(text) => updateItem(item.id, 'amount', text)}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={item.category}
                onChangeText={(text) => updateItem(item.id, 'category', text)}
                placeholder="e.g. Meals, Travel"
              />
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(item.id)}>
                <Camera size={18} color="#666" />
                <Text style={styles.imageButtonText}>
                  {item.receiptUri ? 'Change Receipt' : 'Add Receipt'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteItem(item.id)}>
                <Trash2 size={18} color="#dc3545" />
              </TouchableOpacity>
            </View>

            {item.receiptUri && (
              <Image source={{ uri: item.receiptUri }} style={styles.receiptPreview} />
            )}
          </View>
        ))}

        <View style={styles.approvalSection}>
          <Text style={styles.sectionTitle}>Approval</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Approver's Email</Text>
            <TextInput
              style={styles.input}
              value={approverEmail}
              onChangeText={handleApproverEmailChange}
              placeholder="manager@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={submitForApproval}>
            <Send color="#fff" size={20} />
            <Text style={styles.submitButtonText}>Submit for Approval</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  reportDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#007bff',
    fontWeight: '600',
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageButtonText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    resizeMode: 'cover',
  },
  approvalSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
