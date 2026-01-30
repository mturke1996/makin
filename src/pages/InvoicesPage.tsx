import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Stack,
  useTheme,
  Divider,
} from "@mui/material";
import {
  Add,
  Search,
  ArrowBack,
  PictureAsPdf,
  Receipt,
  Visibility,
  Delete,
} from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import type { Invoice, InvoiceItem, Client } from "@/types";
import { formatCurrency } from "@/utils/calculations";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import dayjs from "dayjs";
import "dayjs/locale/ar";

dayjs.locale("ar");

export const InvoicesPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const { clients, invoices, addInvoice, deleteInvoice } = useDataStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempClients, setTempClients] = useState<Client[]>([]);

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      clientId: "",
      items: [{ description: "", quantity: "", unitPrice: "" }],
      notes: "",
      dueDate: dayjs().add(30, "days").format("YYYY-MM-DD"),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchItems = watch("items");

  const calculatedTotal = useMemo(() => {
    const subtotal = watchItems.reduce((sum: number, item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
    return { subtotal, total: subtotal };
  }, [watchItems]);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => {
        const client = clients.find((c) => c.id === invoice.clientId);
        const matchesSearch =
          invoice.invoiceNumber
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          client?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));
  }, [invoices, clients, searchQuery, statusFilter]);

  const handleOpenDialog = () => {
    reset({
      clientId: "",
      items: [{ description: "", quantity: "", unitPrice: "" }],
      notes: "",
      dueDate: dayjs().add(30, "days").format("YYYY-MM-DD"),
    });
    setNewClientName("");
    setNewClientPhone("");
    setTempClients([]); // Clear temporary clients when opening dialog
    setDialogOpen(true);
  };

  const handleAddNewClient = () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      return;
    }
    // Create temporary client (NOT saved to database - only for this invoice)
    const tempClient: Client = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      email: "",
      address: "",
      type: "individual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to temporary clients list (only for current session)
    setTempClients((prev) => [...prev, tempClient]);

    // Set the new client as selected
    reset({
      ...watch(),
      clientId: tempClient.id,
    });
    setNewClientDialogOpen(false);
    setNewClientName("");
    setNewClientPhone("");
  };

  const generateInvoiceNumber = () => {
    // Get the highest invoice number
    const invoiceNumbers = invoices
      .map((inv) => {
        const match = inv.invoiceNumber.match(/^INV(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => num > 0);

    const nextNumber =
      invoiceNumbers.length > 0 ? Math.max(...invoiceNumbers) + 1 : 1;

    // Format as 3 digits with leading zeros
    return `INV${String(nextNumber).padStart(3, "0")}`;
  };

  const onSubmit = async (data: any) => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Filter out items with empty description or invalid quantities/prices
      const validItems = data.items.filter(
        (item: any) =>
          item.description?.trim() &&
          item.quantity &&
          item.unitPrice &&
          !isNaN(parseFloat(item.quantity)) &&
          !isNaN(parseFloat(item.unitPrice))
      );

      if (validItems.length === 0) {
        alert("يرجى إضافة عنصر واحد على الأقل مع وصف وكمية وسعر صحيحة");
        setIsSubmitting(false);
        return;
      }

      const items: InvoiceItem[] = validItems.map((item: any) => {
        const quantity = parseFloat(item.quantity);
        const unitPrice = parseFloat(item.unitPrice);
        return {
          id: crypto.randomUUID(),
          description: item.description.trim(),
          quantity: quantity,
          unitPrice: unitPrice,
          total: quantity * unitPrice,
        };
      });

      const subtotal = items.reduce(
        (sum: number, item: InvoiceItem) => sum + item.total,
        0
      );

      // Check if client is temporary (NOT saved to database)
      const isTempClient = data.clientId.startsWith("temp-");
      let finalClientId = data.clientId;
      let invoiceNotes = data.notes || "";

      // If temporary client, save client info separately (NOT in user's notes)
      // We'll store it in a special format that can be extracted later for display
      if (isTempClient) {
        const tempClient = tempClients.find((c) => c.id === data.clientId);
        if (tempClient) {
          // Store temp client info separately, not mixed with user notes
          // Format: __TEMP_CLIENT__name:xxx__phone:yyy__
          const tempClientInfo = `__TEMP_CLIENT__name:${tempClient.name}__phone:${tempClient.phone}__`;
          // Only add temp client info if there are no user notes, or append it separately
          if (!invoiceNotes.trim()) {
            // If no notes, we can add it in a way that's extractable but not visible as regular notes
            invoiceNotes = tempClientInfo;
          } else {
            // If user has notes, append temp client info separately (will be extracted and not shown in notes)
            invoiceNotes = `${invoiceNotes}${tempClientInfo}`;
          }
          // Keep the temp ID - this client is NOT saved to clients list
          finalClientId = data.clientId;
        } else {
          alert("خطأ: لم يتم العثور على معلومات العميل المؤقت");
          setIsSubmitting(false);
          return;
        }
      }

      // IMPORTANT: We NEVER call addClient() for temporary clients
      // They are only stored in the invoice notes in special format, not in the clients database

      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: generateInvoiceNumber(),
        clientId: finalClientId,
        items,
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal,
        status: "draft",
        issueDate: new Date().toISOString(),
        dueDate: data.dueDate,
        notes: invoiceNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addInvoice(newInvoice);
      setDialogOpen(false);
      setTempClients([]); // Clear temporary clients after invoice creation
      reset({
        clientId: "",
        items: [{ description: "", quantity: "", unitPrice: "" }],
        notes: "",
        dueDate: dayjs().add(30, "days").format("YYYY-MM-DD"),
      });
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.background.default,
        pb: 8,
        position: 'relative'
      }}
    >
      {/* Background Ambience */}
      <Box sx={{
         position: 'absolute', top: 0, left: 0, right: 0, height: 400,
         background: theme.palette.mode === 'dark' 
           ? 'linear-gradient(180deg, #1e293b 0%, transparent 100%)' 
           : 'linear-gradient(180deg, #dbeafe 0%, transparent 100%)',
         zIndex: 0,
         opacity: 0.5
      }} />

      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 1, pt: 4, pb: 4, px: 2 }}>
        <Container maxWidth="md">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
             <IconButton onClick={() => navigate('/')} sx={{ 
                 bgcolor: theme.palette.background.paper,
                 boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                 '&:hover': { bgcolor: theme.palette.background.default } 
             }}>
               <ArrowBack />
             </IconButton>
             
             <Box flexGrow={1}>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}> الفواتير</Typography>
                <Typography variant="body2" color="text.secondary">إدارة ومتابعة فواتير العملاء</Typography>
             </Box>

             <Button
               variant="contained"
               onClick={handleOpenDialog}
               sx={{
                 background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                 boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.5)',
                 fontWeight: 700,
                 px: 3, py: 1.5,
                 borderRadius: 3,
                 '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px -4px rgba(37, 99, 235, 0.6)' }
               }}
               startIcon={<Add />}
             >
               فاتورة جديدة
             </Button>
          </Stack>

          {/* Search & Filter */}
          <Card sx={{ 
             borderRadius: 4, 
             p: 1, 
             display: 'flex', 
             alignItems: 'center', 
             gap: 2,
             mb: 4,
             bgcolor: 'rgba(255,255,255,0.6)', 
             backdropFilter: 'blur(20px)',
             border: '1px solid rgba(255,255,255,0.3)',
             boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)'
          }}>
            <TextField
              fullWidth
              placeholder="ابحث عن فاتورة أو عميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                    <Search sx={{ color: "text.secondary", mr: 1.5, ml: 1 }} />
                ),
              }}
              sx={{ px: 1 }}
            />
            <Divider orientation="vertical" flexItem sx={{ height: 30, my: 'auto' }} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                variant="standard"
                disableUnderline
                displayEmpty
                sx={{ fontWeight: 600, color: 'text.primary', '& .MuiSelect-select': { py: 1.5 } }}
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="draft">مسودة</MenuItem>
                <MenuItem value="sent">مرسلة</MenuItem>
                <MenuItem value="paid">مدفوعة</MenuItem>
                <MenuItem value="overdue">متأخرة</MenuItem>
              </Select>
            </FormControl>
          </Card>
        </Container>
      </Box>

      {/* Invoices List */}
      <Container maxWidth="md" sx={{ mt: -2, position: 'relative', zIndex: 1 }}>
        <Stack spacing={2}>
          {filteredInvoices.length === 0 ? (
            <Card sx={{ borderRadius: 4, textAlign: "center", py: 8, bgcolor: 'background.paper', boxShadow: 'none', border: '1px dashed', borderColor: 'divider' }}>
              <Box sx={{ 
                 width: 80, height: 80, borderRadius: '50%', 
                 bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 mx: 'auto', mb: 3
              }}>
                 <Receipt sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>لا توجد فواتير</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                 قم بإنشاء فاتورة جديدة لبدء تتبع المدفوعات
              </Typography>
               <Button
                 variant="outlined"
                 startIcon={<Add />}
                 onClick={handleOpenDialog}
                 sx={{ borderRadius: 3, px: 4 }}
               >
                 إنشاء أول فاتورة
               </Button>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => {
              const client = clients.find((c) => c.id === invoice.clientId);
              return (
                <Card
                  key={invoice.id}
                  sx={{
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease-in-out',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      sx={{ mb: 2.5 }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                         <Box sx={{ 
                            width: 48, height: 48, borderRadius: 3, 
                            bgcolor: invoice.status === 'paid' ? 'success.lighter' : 'primary.lighter',
                            color: invoice.status === 'paid' ? 'success.main' : 'primary.main',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                         }}>
                            <Receipt />
                         </Box>
                         <Box>
                             <Typography variant="subtitle1" fontWeight={800}>
                               {invoice.invoiceNumber}<Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{dayjs(invoice.issueDate).format("DD/MM/YYYY")}</Typography>
                             </Typography>
                             <Typography variant="body2" color="text.secondary">
                               {client?.name || 'عميل غير معروف'}
                             </Typography>
                             {invoice.addedBy && (
                               <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.8, fontSize: '0.7rem' }}>
                                 بواسطة: {invoice.addedBy}
                               </Typography>
                             )}
                         </Box>
                      </Stack>

                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          sx={{ color: theme.palette.mode === 'dark' ? 'white' : 'black' }}
                        >
                          {formatCurrency(invoice.total)}
                        </Typography>
                        <Chip
                          label={
                            invoice.status === "paid"
                              ? "مدفوعة"
                              : invoice.status === "overdue"
                              ? "متأخرة"
                              : invoice.status === "partially_paid"
                              ? "جزئية"
                              : "مسودة"
                          }
                          size="small"
                          sx={{ 
                             height: 24, fontSize: "0.75rem", fontWeight: 700, borderRadius: 1.5,
                             bgcolor: invoice.status === 'paid' ? '#dcfce7' : invoice.status === 'overdue' ? '#fee2e2' : '#f1f5f9',
                             color: invoice.status === 'paid' ? '#166534' : invoice.status === 'overdue' ? '#991b1b' : '#334155'
                          }}
                        />
                      </Stack>
                    </Stack>

                    <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                       <Typography variant="body2" color="text.secondary">
                          {invoice.items.length} عناصر
                       </Typography>
                       
                        {/* Action Buttons */}
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(invoice);
                              setPreviewDialogOpen(true);
                            }}
                            sx={{ bgcolor: 'action.hover', borderRadius: 2 }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                             size="small"
                             onClick={(e) => {
                              e.stopPropagation();
                              if (client) {
                                generateInvoicePDF(invoice, client);
                              }
                            }}
                             sx={{ bgcolor: 'action.hover', borderRadius: 2, color: 'primary.main' }}
                          >
                             <PictureAsPdf fontSize="small" />
                          </IconButton>
                           <IconButton
                             size="small"
                             onClick={(e) => {
                               e.stopPropagation();
                               if (window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
                                 deleteInvoice(invoice.id);
                               }
                             }}
                             sx={{ bgcolor: 'fee2e2', borderRadius: 2, color: 'error.main', '&:hover': { bgcolor: '#fecaca' } }}
                           >
                             <Delete fontSize="small" />
                           </IconButton>
                        </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      </Container>

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullScreen>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)(e);
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
              color: "white",
              p: 3,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => setDialogOpen(false)}
                sx={{ color: "white", bgcolor: 'rgba(255,255,255,0.1)' }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                إنشاء فاتورة جديدة
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3.5 }}>
            <Stack spacing={3.5}>
              {/* Client Selection */}
              <Stack spacing={2}>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>العميل</InputLabel>
                      <Select
                        {...field}
                        label="العميل"
                        sx={{ borderRadius: 2 }}
                      >
                        {clients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            {client.name}
                          </MenuItem>
                        ))}
                        {tempClients.map((client) => (
                          <MenuItem key={client.id} value={client.id}>
                            {client.name}{" "}
                            {client.phone ? `(${client.phone})` : ""} - [مؤقت -
                            للفاتورة فقط]
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => setNewClientDialogOpen(true)}
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  إضافة عميل جديد (للفاتورة فقط)
                </Button>
              </Stack>

              {/* Items */}
              <Typography variant="subtitle1" fontWeight={700}>
                العناصر
              </Typography>

              {fields.map((field, index) => (
                <Card
                  key={field.id}
                  sx={{ borderRadius: 2.5, bgcolor: "action.hover" }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={2.5}>
                      <Controller
                        name={`items.${index}.description`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="الوصف"
                            placeholder="مثال: أعمال بناء"
                            size="small"
                          />
                        )}
                      />
                      <Grid container spacing={2.5}>
                        <Grid size={{ xs: 6 }}>
                          <Controller
                            name={`items.${index}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="الكمية"
                                type="number"
                                size="small"
                                placeholder=""
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? "" : value);
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "background.paper",
                                  },
                                }}
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Controller
                            name={`items.${index}.unitPrice`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="السعر"
                                type="number"
                                size="small"
                                placeholder=""
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? "" : value);
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "background.paper",
                                  },
                                }}
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Box
                            sx={{
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? "rgba(99, 102, 241, 0.1)"
                                  : "rgba(99, 102, 241, 0.05)",
                              borderRadius: 2,
                              p: 1.5,
                              border: "1px solid",
                              borderColor:
                                theme.palette.mode === "dark"
                                  ? "rgba(99, 102, 241, 0.3)"
                                  : "rgba(99, 102, 241, 0.2)",
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="text.secondary"
                              >
                                المجموع:
                              </Typography>
                              <Typography
                                variant="h6"
                                fontWeight={800}
                                color="primary.main"
                              >
                                {formatCurrency(
                                  (parseFloat(watchItems[index]?.quantity) ||
                                    0) *
                                    (parseFloat(watchItems[index]?.unitPrice) ||
                                      0)
                                )}
                              </Typography>
                            </Stack>
                          </Box>
                        </Grid>
                      </Grid>
                      {fields.length > 1 && (
                        <Button
                          color="error"
                          size="small"
                          onClick={() => remove(index)}
                        >
                          حذف
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              <Button
                startIcon={<Add />}
                onClick={() =>
                  append({ description: "", quantity: "", unitPrice: "" })
                }
                fullWidth
                variant="outlined"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                إضافة عنصر جديد
              </Button>

              {/* Due Date */}
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تاريخ الاستحقاق"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              {/* Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={2}
                  />
                )}
              />

              {/* Total Summary */}
              <Card
                sx={{
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "white",
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
                  border: "none",
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        sx={{ opacity: 0.95 }}
                      >
                        عدد العناصر:
                      </Typography>
                      <Typography variant="body1" fontWeight={800}>
                        {watchItems.length}
                      </Typography>
                    </Stack>
                    <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="h6" fontWeight={800}>
                        الإجمالي:
                      </Typography>
                      <Typography variant="h4" fontWeight={900}>
                        {formatCurrency(calculatedTotal.total)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Buttons */}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  onClick={() => setDialogOpen(false)}
                  fullWidth
                  size="large"
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Add New Client Dialog */}
      <Dialog
        open={newClientDialogOpen}
        onClose={() => setNewClientDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            إضافة عميل جديد (للفاتورة فقط)
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="اسم العميل"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="أدخل اسم العميل"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              label="رقم الهاتف"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="أدخل رقم الهاتف"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button
            onClick={() => {
              setNewClientDialogOpen(false);
              setNewClientName("");
              setNewClientPhone("");
            }}
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleAddNewClient}
            variant="contained"
            disabled={!newClientName.trim() || !newClientPhone.trim()}
            sx={{ borderRadius: 2 }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
          },
        }}
      >
        {selectedInvoice &&
          (() => {
            const isTempClient = selectedInvoice.clientId.startsWith("temp-");
            let previewClient = clients.find(
              (c) => c.id === selectedInvoice.clientId
            );

            // If temp client, extract info from notes (stored in special format)
            if (isTempClient && !previewClient && selectedInvoice.notes) {
              // Extract temp client info from special format: __TEMP_CLIENT__name:xxx__phone:yyy__
              const tempClientMatch = selectedInvoice.notes.match(
                /__TEMP_CLIENT__name:(.+?)__phone:(.+?)__/
              );
              if (tempClientMatch) {
                previewClient = {
                  id: selectedInvoice.clientId,
                  name: tempClientMatch[1].trim(),
                  phone: tempClientMatch[2].trim(),
                  email: "",
                  address: "",
                  type: "individual",
                  createdAt: "",
                  updatedAt: "",
                } as Client;
              }
            }

            if (!previewClient) return null;

            return (
              <>
                <Box
                  sx={{
                    background:
                      theme.palette.mode === "light"
                        ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                        : "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
                    color: "white",
                    p: 2,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <IconButton
                      onClick={() => setPreviewDialogOpen(false)}
                      sx={{ color: "white" }}
                    >
                      <ArrowBack />
                    </IconButton>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      sx={{ flexGrow: 1 }}
                    >
                      معاينة الفاتورة
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PictureAsPdf />}
                      onClick={() =>
                        generateInvoicePDF(selectedInvoice, previewClient)
                      }
                      sx={{
                        bgcolor: "white",
                        color: "primary.main",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                      }}
                    >
                      PDF
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ p: 3, overflow: "auto" }}>
                  <Card sx={{ borderRadius: 3, mb: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={3}>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            gutterBottom
                          >
                            رقم الفاتورة
                          </Typography>
                          <Typography variant="h6" fontWeight={800}>
                            {selectedInvoice.invoiceNumber}
                          </Typography>
                        </Box>

                        <Grid container spacing={2.5}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              العميل
                            </Typography>
                            <Typography variant="body1" fontWeight={700}>
                              {previewClient.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {previewClient.phone}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              تاريخ الإصدار
                            </Typography>
                            <Typography variant="body1">
                              {dayjs(selectedInvoice.issueDate).format(
                                "DD/MM/YYYY"
                              )}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              تاريخ الاستحقاق
                            </Typography>
                            <Typography variant="body1">
                              {dayjs(selectedInvoice.dueDate).format(
                                "DD/MM/YYYY"
                              )}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              gutterBottom
                            >
                              الحالة
                            </Typography>
                            <Chip
                              label={
                                selectedInvoice.status === "paid"
                                  ? "مدفوعة"
                                  : selectedInvoice.status === "overdue"
                                  ? "متأخرة"
                                  : selectedInvoice.status === "partially_paid"
                                  ? "جزئية"
                                  : "نشطة"
                              }
                              color={
                                selectedInvoice.status === "paid"
                                  ? "success"
                                  : selectedInvoice.status === "overdue"
                                  ? "error"
                                  : "default"
                              }
                              size="small"
                            />
                          </Grid>
                        </Grid>

                        <Divider />

                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            gutterBottom
                          >
                            البنود ({selectedInvoice.items.length})
                          </Typography>
                          <Stack spacing={1}>
                            {selectedInvoice.items.map((item, idx) => (
                              <Card
                                key={`${selectedInvoice.id}-preview-item-${idx}-${item.id}`}
                                variant="outlined"
                                sx={{ borderRadius: 1.5 }}
                              >
                                <CardContent
                                  sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}
                                >
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                  >
                                    <Box sx={{ flexGrow: 1 }}>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                      >
                                        {item.description}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        الكمية: {item.quantity} ×{" "}
                                        {formatCurrency(item.unitPrice)}
                                      </Typography>
                                    </Box>
                                    <Typography
                                      variant="body1"
                                      fontWeight={800}
                                      color="primary.main"
                                    >
                                      {formatCurrency(item.total)}
                                    </Typography>
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        </Box>

                        <Divider />

                        <Box>
                          <Stack spacing={1}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                المجموع الفرعي:
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                {formatCurrency(selectedInvoice.subtotal)}
                              </Typography>
                            </Stack>
                            {selectedInvoice.taxAmount > 0 && (
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  الضريبة ({selectedInvoice.taxRate}%):
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatCurrency(selectedInvoice.taxAmount)}
                                </Typography>
                              </Stack>
                            )}
                            <Divider />
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                            >
                              <Typography variant="h6" fontWeight={800}>
                                الإجمالي:
                              </Typography>
                              <Typography
                                variant="h6"
                                fontWeight={900}
                                color="primary.main"
                              >
                                {formatCurrency(selectedInvoice.total)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>

                        {selectedInvoice.notes &&
                          (() => {
                            // Remove temp client info from displayed notes
                            const displayNotes = selectedInvoice.notes
                              .replace(
                                /__TEMP_CLIENT__name:.+?__phone:.+?__/g,
                                ""
                              )
                              .trim();
                            return displayNotes ? (
                              <>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    ملاحظات
                                  </Typography>
                                  <Typography variant="body2">
                                    {displayNotes}
                                  </Typography>
                                </Box>
                              </>
                            ) : null;
                          })()}
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </>
            );
          })()}
      </Dialog>
    </Box>
  );
};
