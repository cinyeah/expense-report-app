import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Image, Platform, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Picker } from '@react-native-picker/picker';
import { getReportById, updateReport, ExpenseReport, ExpenseItem } from '../../utils/storage';
import { ArrowLeft, Plus, Trash2, Camera, Send, FileText, Download } from 'lucide-react-native';

const CATEGORIES = [
  'Travel - Airfare',
  'Travel - Taxi',
  'Travel - Meals',
  'Entertainment',
  'Prepaid',
  'Subscription',
  'Office Supplies',
  'Other'
];

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

  const totalAmount = useMemo(() => {
    if (!report) return 0;
    return report.items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  }, [report]);

  const addItem = () => {
    if (!report) return;
    const newItem: ExpenseItem = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: CATEGORIES[0],
      note: '',
    };
    const updated = { ...report, items: [newItem, ...report.items] };
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

  const exportToPDF = async () => {
    if (!report) return;

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #007bff; margin: 0; font-size: 28px; }
            .report-info { margin-top: 10px; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f8f9fa; color: #333; font-weight: bold; border-bottom: 2px solid #dee2e6; }
            th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
            .amount { text-align: right; font-family: 'Courier New', monospace; }
            .total-row { background-color: #f8f9fa; font-weight: bold; font-size: 18px; }
            .total-label { text-align: right; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expense Report</h1>
            <div class="report-info">
              <strong>Title:</strong> ${report.title}<br>
              <strong>Date:</strong> ${new Date(report.createdAt).toLocaleDateString()}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Date</th>
                <th style="width: 25%">Category</th>
                <th style="width: 40%">Note</th>
                <th style="width: 20%" class="amount">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${report.items.map(item => `
                <tr>
                  <td>${item.date}</td>
                  <td>${item.category}</td>
                  <td>${item.note || '-'}</td>
                  <td class="amount">$${parseFloat(item.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" class="total-label">TOTAL</td>
                <td class="amount">$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Generated via Expense Report App | ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const { base64 } = await Print.printToFileAsync({ html, base64: true });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = `${report.title.replace(/\s+/g, '_')}.pdf`;
        link.click();
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const exportToExcel = async () => {
    if (!report) return;

    const data = report.items.map(item => ({
      'Date': item.date,
      'Category': item.category,
      'Note': item.note || '',
      'Amount (USD)': parseFloat(item.amount || '0')
    }));

    // Add total row
    data.push({
      'Date': 'TOTAL',
      'Category': '',
      'Note': '',
      'Amount (USD)': totalAmount as any
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    
    const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
    const uri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;

    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri;
      link.download = `${report.title.replace(/\s+/g, '_')}.xlsx`;
      link.click();
    } else {
      Alert.alert('Note', 'Excel export is best supported on Web.');
    }
  };

  const submitForApproval = async () => {
    if (!report || !approverEmail) {
      Alert.alert('Error', 'Please provide an approver email.');
      return;
    }

    const reportContent = report.items.map(item => (
      `Date: ${item.date}\nCategory: ${item.category}\nAmount: $${parseFloat(item.amount || '0').toFixed(2)}\nNote: ${item.note || 'N/A'}\n-------------------`
    )).join('\n');

    const body = `Hi,\n\nPlease find the expense report details for ${report.title} below:\n\n${reportContent}\n\nTotal Amount: $${totalAmount.toFixed(2)}\n\nSubmitted via Expense Report App.`;

    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: [approverEmail],
        subject: `Expense Report Approval Request: ${report.title}`,
        body: body,
      });
    } else {
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
          
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#e9ecef' }]} onPress={exportToPDF}>
              <FileText size={18} color="#495057" />
              <Text style={styles.exportButtonText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#e9ecef' }]} onPress={exportToExcel}>
              <Download size={18} color="#495057" />
              <Text style={styles.exportButtonText}>Download Excel</Text>
            </TouchableOpacity>
          </View>
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
                <Text style={styles.label}>Amount (USD)</Text>
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
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={item.category}
                  onValueChange={(value) => updateItem(item.id, 'category', value)}
                  style={styles.picker}
                >
                  {CATEGORIES.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note</Text>
              <TextInput
                style={styles.input}
                value={item.note}
                onChangeText={(text) => updateItem(item.id, 'note', text)}
                placeholder="e.g. Lunch with client"
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

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
        </View>

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
    marginBottom: 15,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  exportButtonText: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#495057',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
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
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  approvalSection: {
    marginTop: 10,
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
