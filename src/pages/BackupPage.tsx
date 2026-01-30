import { Box, Container, Typography, Card, Stack, Button, useTheme, Grid } from "@mui/material";
import { Download, CloudUpload, Storage, TableChart, Save } from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

export const BackupPage = () => {
  const theme = useTheme();
  const data = useDataStore();

  const exportToJson = () => {
    const backupData = {
      clients: data.clients,
      invoices: data.invoices,
      payments: data.payments,
      debts: data.debts,
      projects: data.projects,
      expenses: data.expenses,
      standaloneDebts: data.standaloneDebts,
      expenseInvoices: data.expenseInvoices,
      debtParties: data.debtParties,
      users: data.users,
      version: "1.0.0",
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    saveAs(blob, `debtflow_backup_${new Date().toISOString().split("T")[0]}.json`);
    toast.success("تم تصدير النسخة الاحتياطية بنجاح (JSON)");
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Clients
    const clientsWS = XLSX.utils.json_to_sheet(data.clients);
    XLSX.utils.book_append_sheet(workbook, clientsWS, "العملاء");

    // Invoices
    const invoicesWS = XLSX.utils.json_to_sheet(data.invoices.map(inv => ({
        ...inv,
        items: JSON.stringify(inv.items)
    })));
    XLSX.utils.book_append_sheet(workbook, invoicesWS, "الفواتير");

    // Payments
    const paymentsWS = XLSX.utils.json_to_sheet(data.payments);
    XLSX.utils.book_append_sheet(workbook, paymentsWS, "المدفوعات");

    // Expenses
    const expensesWS = XLSX.utils.json_to_sheet(data.expenses);
    XLSX.utils.book_append_sheet(workbook, expensesWS, "المصروفات");

    XLSX.writeFile(workbook, `debtflow_backup_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير النسخة الاحتياطية بنجاح (Excel)");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4, px: 2 }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={900} sx={{ mb: 4, textAlign: 'center' }}>النسخ الاحتياطي</Typography>

        <Grid container spacing={3}>
           <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRadius: 5 }}>
                  <Box sx={{ p: 2, borderRadius: 5, bgcolor: 'primary.main', color: 'white', mb: 2 }}>
                    <Storage sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>نسخة JSON شاملة</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    تحتوي هذه النسخة على كل بيانات النظام بالتفصيل، وهي الأنسب لاستعادة البيانات لاحقاً.
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Download />} 
                    fullWidth 
                    onClick={exportToJson}
                    sx={{ borderRadius: 3, py: 1.5 }}
                  >
                    تصدير JSON
                  </Button>
              </Card>
           </Grid>

           <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRadius: 5 }}>
                  <Box sx={{ p: 2, borderRadius: 5, bgcolor: 'success.main', color: 'white', mb: 2 }}>
                    <TableChart sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>نسخة Excel</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    نسخة قابلة للقراءة والتحليل الخارجي، سهلة الفتح في برامج الجداول الحسابية.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="success"
                    startIcon={<Download />} 
                    fullWidth 
                    onClick={exportToExcel}
                    sx={{ borderRadius: 3, py: 1.5 }}
                  >
                    تصدير Excel
                  </Button>
              </Card>
           </Grid>
           
           <Grid size={{ xs: 12 }}>
              <Card sx={{ p: 3, borderRadius: 4, border: '1px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
                 <Stack direction="row" spacing={2} alignItems="center">
                    <CloudUpload color="action" />
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>استعادة البيانات</Typography>
                        <Typography variant="caption" color="text.secondary">يمكنك رفع ملف JSON لاستعادة بياناتك في أي وقت. (قريباً)</Typography>
                    </Box>
                 </Stack>
              </Card>
           </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
