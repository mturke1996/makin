import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Client,
  Invoice,
  Payment,
  Debt,
  Project,
  Expense,
  StandaloneDebt,
  ExpenseInvoice,
  DebtParty,
  User,
} from "../types";
import { useAuthStore } from "./useAuthStore";
import {
  clientsService,
  invoicesService,
  paymentsService,
  debtsService,
  projectsService,
  expensesService,
  standaloneDebtsService,
  expenseInvoicesService,
  debtPartiesService,
  usersService,
  closeExpensesAndCreateInvoice as closeExpensesAndCreateInvoiceService,
} from "../services/firebaseService";

interface DataState {
  // Data
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  debts: Debt[];
  projects: Project[];
  expenses: Expense[];
  standaloneDebts: StandaloneDebt[];
  expenseInvoices: ExpenseInvoice[];
  debtParties: DebtParty[];
  users: User[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Initialization
  initialized: boolean;
  unsubscribeFunctions: (() => void) | null;
  initializeData: () => Promise<void>;
  subscribeToRealtimeUpdates: () => void;

  // Client operations
  addClient: (client: Client) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setClients: (clients: Client[]) => void;

  // Invoice operations
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  setInvoices: (invoices: Invoice[]) => void;

  // Payment operations
  addPayment: (payment: Payment) => Promise<void>;
  updatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  setPayments: (payments: Payment[]) => void;

  // Debt operations
  addDebt: (debt: Debt) => Promise<void>;
  updateDebt: (id: string, data: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  setDebts: (debts: Debt[]) => void;

  // Project operations
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setProjects: (projects: Project[]) => void;

  // Expense operations
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setExpenses: (expenses: Expense[]) => void;

  // Standalone Debt operations
  addStandaloneDebt: (debt: StandaloneDebt) => Promise<void>;
  updateStandaloneDebt: (
    id: string,
    data: Partial<StandaloneDebt>
  ) => Promise<void>;
  deleteStandaloneDebt: (id: string) => Promise<void>;
  setStandaloneDebts: (debts: StandaloneDebt[]) => void;

  // Debt Party operations
  addDebtParty: (party: DebtParty) => Promise<void>;
  updateDebtParty: (id: string, data: Partial<DebtParty>) => Promise<void>;
  deleteDebtParty: (id: string) => Promise<void>;
  setDebtParties: (parties: DebtParty[]) => void;
  
  // User operations
  addUser: (user: User) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setUsers: (users: User[]) => void;

  // Expense Invoice operations
  closeExpensesAndCreateInvoice: (
    expenseIds: string[],
    clientId: string,
    startDate: string,
    endDate: string,
    notes?: string
  ) => Promise<string>;
  getExpenseInvoices: (clientId?: string) => ExpenseInvoice[];
  setExpenseInvoices: (invoices: ExpenseInvoice[]) => void;

  // Utility
  clearError: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      // Initial state
      clients: [],
      invoices: [],
      payments: [],
      debts: [],
      projects: [],
      expenses: [],
      standaloneDebts: [],
      expenseInvoices: [],
      debtParties: [],
      users: [],
      isLoading: false,
      error: null,
      initialized: false,
      unsubscribeFunctions: null,

      // Initialize data from Firebase
      initializeData: async () => {
        try {
          set({ isLoading: true, error: null });

          const [
            clients,
            invoices,
            payments,
            debts,
            projects,
            expenses,
            standaloneDebts,
            expenseInvoices,
            debtParties,
            users,
          ] = await Promise.all([
            clientsService.getAll(),
            invoicesService.getAll(),
            paymentsService.getAll(),
            debtsService.getAll(),
            projectsService.getAll(),
            expensesService.getAll(),
            standaloneDebtsService.getAll(),
            expenseInvoicesService.getAll(),
            debtPartiesService.getAll(),
            usersService.getAll(),
          ]);

          set({
            clients,
            invoices,
            payments,
            debts,
            projects,
            expenses,
            standaloneDebts,
            expenseInvoices,
            debtParties,
            users,
            isLoading: false,
            initialized: true,
          });
        } catch (error: any) {
          console.error("Error initializing data:", error);
          set({
            error: "حدث خطأ أثناء تحميل البيانات",
            isLoading: false,
          });
        }
      },

      // Subscribe to real-time updates
      subscribeToRealtimeUpdates: () => {
        // Clean up existing subscriptions first
        const { unsubscribeFunctions } = get();
        if (unsubscribeFunctions) {
          unsubscribeFunctions();
        }

        const unsubscribeClients = clientsService.subscribe((clients) => {
          set({ clients });
        });

        const unsubscribeInvoices = invoicesService.subscribe((invoices) => {
          set({ invoices });
        });

        const unsubscribePayments = paymentsService.subscribe((payments) => {
          console.log(
            "Payments subscription updated:",
            payments.length,
            "payments"
          );
          set({ payments });
        });

        const unsubscribeDebts = debtsService.subscribe((debts) => {
          set({ debts });
        });

        const unsubscribeProjects = projectsService.subscribe((projects) => {
          set({ projects });
        });

        const unsubscribeExpenses = expensesService.subscribe((expenses) => {
          console.log(
            "Expenses subscription updated:",
            expenses.length,
            "expenses"
          );
          set({ expenses });
        });

        const unsubscribeStandaloneDebts = standaloneDebtsService.subscribe(
          (standaloneDebts) => {
            set({ standaloneDebts });
          }
        );

        const unsubscribeExpenseInvoices = expenseInvoicesService.subscribe(
          (expenseInvoices) => {
            set({ expenseInvoices });
          }
        );

        const unsubscribeDebtParties = debtPartiesService.subscribe(
          (debtParties) => {
            set({ debtParties });
          }
        );

        const unsubscribeUsers = usersService.subscribe((users) => {
          set({ users });
        });

        // Store cleanup function
        const cleanup = () => {
          unsubscribeClients();
          unsubscribeInvoices();
          unsubscribePayments();
          unsubscribeDebts();
          unsubscribeProjects();
          unsubscribeExpenses();
          unsubscribeStandaloneDebts();
          unsubscribeExpenseInvoices();
          unsubscribeDebtParties();
          unsubscribeUsers();
        };

        set({ unsubscribeFunctions: cleanup });
      },

      // Client operations
      addClient: async (client: Client) => {
        try {
          set({ isLoading: true });
          await clientsService.add(client);
          // لا نضيف للـ state محلياً - سيأتي من Firebase تلقائياً
          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding client:", error);
          set({ error: "حدث خطأ أثناء إضافة العميل", isLoading: false });
          throw error;
        }
      },

      updateClient: async (id: string, data: Partial<Client>) => {
        try {
          set({ isLoading: true });
          await clientsService.update(id, data);
          set((state) => ({
            clients: state.clients.map((c) =>
              c.id === id ? { ...c, ...data } : c
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error updating client:", error);
          set({ error: "حدث خطأ أثناء تحديث العميل", isLoading: false });
          throw error;
        }
      },

      deleteClient: async (id: string) => {
        try {
          set({ isLoading: true });
          await clientsService.delete(id);
          set((state) => ({
            clients: state.clients.filter((c) => c.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error deleting client:", error);
          set({ error: "حدث خطأ أثناء حذف العميل", isLoading: false });
          throw error;
        }
      },

      setClients: (clients: Client[]) => set({ clients }),

      // Invoice operations
      addInvoice: async (invoice: Invoice) => {
        try {
          set({ isLoading: true });
          const currentUser = useAuthStore.getState().user;
          const invoiceData = {
            ...invoice,
            addedBy: currentUser?.displayName || currentUser?.email || "غير معروف",
            addedById: currentUser?.id,
          };
          const id = await invoicesService.add(invoiceData);
          set((state) => ({
            invoices: [...state.invoices, { ...invoiceData, id }],
            isLoading: false,
          }));

          // Auto-create debt for invoice
          const debt: Debt = {
            id: crypto.randomUUID(),
            clientId: invoice.clientId,
            invoiceId: id,
            totalAmount: invoice.total,
            paidAmount: 0,
            remainingAmount: invoice.total,
            status: "unpaid",
            dueDate: invoice.dueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await get().addDebt(debt);
        } catch (error) {
          console.error("Error adding invoice:", error);
          set({ error: "حدث خطأ أثناء إضافة الفاتورة", isLoading: false });
          throw error;
        }
      },

      updateInvoice: async (id: string, data: Partial<Invoice>) => {
        try {
          set({ isLoading: true });
          await invoicesService.update(id, data);
          set((state) => ({
            invoices: state.invoices.map((i) =>
              i.id === id ? { ...i, ...data } : i
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error updating invoice:", error);
          set({ error: "حدث خطأ أثناء تحديث الفاتورة", isLoading: false });
          throw error;
        }
      },

      deleteInvoice: async (id: string) => {
        try {
          set({ isLoading: true });
          await invoicesService.delete(id);
          set((state) => ({
            invoices: state.invoices.filter((i) => i.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error deleting invoice:", error);
          set({ error: "حدث خطأ أثناء حذف الفاتورة", isLoading: false });
          throw error;
        }
      },

      setInvoices: (invoices: Invoice[]) => set({ invoices }),

      // Payment operations
      addPayment: async (payment: Payment) => {
        try {
          set({ isLoading: true });
          const currentUser = useAuthStore.getState().user;
          await paymentsService.add({
            ...payment,
            addedBy: currentUser?.displayName || currentUser?.email || "غير معروف",
            addedById: currentUser?.id,
          });
          // لا نضيف للـ state محلياً - سيأتي من Firebase تلقائياً
          set({ isLoading: false });

          // Update associated debt
          const debt = get().debts.find(
            (d) => d.invoiceId === payment.invoiceId
          );
          if (debt) {
            const newPaidAmount = debt.paidAmount + payment.amount;
            const newRemainingAmount = debt.totalAmount - newPaidAmount;
            const newStatus =
              newRemainingAmount <= 0
                ? "paid"
                : newRemainingAmount < debt.totalAmount
                ? "partially_paid"
                : "unpaid";

            await get().updateDebt(debt.id, {
              paidAmount: newPaidAmount,
              remainingAmount: newRemainingAmount,
              status: newStatus,
            });
          }

          // Update invoice status
          const invoice = get().invoices.find(
            (i) => i.id === payment.invoiceId
          );
          if (invoice) {
            const totalPaid =
              get()
                .payments.filter((p) => p.invoiceId === payment.invoiceId)
                .reduce((sum, p) => sum + p.amount, 0) + payment.amount;

            const newStatus =
              totalPaid >= invoice.total
                ? "paid"
                : totalPaid > 0
                ? "partially_paid"
                : invoice.status;

            await get().updateInvoice(invoice.id, { status: newStatus });
          }
        } catch (error) {
          console.error("Error adding payment:", error);
          set({ error: "حدث خطأ أثناء إضافة الدفعة", isLoading: false });
          throw error;
        }
      },

      updatePayment: async (id: string, data: Partial<Payment>) => {
        try {
          set({ isLoading: true });
          await paymentsService.update(id, data);
          // لا نحدث الـ state محلياً - سيأتي من Firebase تلقائياً عبر real-time subscription
          set({ isLoading: false });
        } catch (error) {
          console.error("Error updating payment:", error);
          set({ error: "حدث خطأ أثناء تحديث الدفعة", isLoading: false });
          throw error;
        }
      },

      deletePayment: async (id: string) => {
        try {
          console.log("deletePayment called with id:", id);
          set({ isLoading: true });
          await paymentsService.delete(id);
          console.log(
            "Payment deleted from Firebase, waiting for subscription update..."
          );
          // لا نحدث الـ state محلياً - سيأتي من Firebase تلقائياً عبر real-time subscription
          set({ isLoading: false });
        } catch (error) {
          console.error("Error deleting payment:", error);
          set({ error: "حدث خطأ أثناء حذف الدفعة", isLoading: false });
          throw error;
        }
      },

      setPayments: (payments: Payment[]) => set({ payments }),

      // Debt operations
      addDebt: async (debt: Debt) => {
        try {
          set({ isLoading: true });
          const currentUser = useAuthStore.getState().user;
          const debtData = {
            ...debt,
            addedBy: currentUser?.displayName || currentUser?.email || "غير معروف",
            addedById: currentUser?.id,
          };
          const id = await debtsService.add(debtData);
          set((state) => ({
            debts: [...state.debts, { ...debtData, id }],
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error adding debt:", error);
          set({ error: "حدث خطأ أثناء إضافة الدين", isLoading: false });
          throw error;
        }
      },

      updateDebt: async (id: string, data: Partial<Debt>) => {
        try {
          set({ isLoading: true });
          await debtsService.update(id, data);
          set((state) => ({
            debts: state.debts.map((d) =>
              d.id === id ? { ...d, ...data } : d
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error updating debt:", error);
          set({ error: "حدث خطأ أثناء تحديث الدين", isLoading: false });
          throw error;
        }
      },

      deleteDebt: async (id: string) => {
        try {
          set({ isLoading: true });
          await debtsService.delete(id);
          set((state) => ({
            debts: state.debts.filter((d) => d.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error deleting debt:", error);
          set({ error: "حدث خطأ أثناء حذف الدين", isLoading: false });
          throw error;
        }
      },

      setDebts: (debts: Debt[]) => set({ debts }),

      // Project operations
      addProject: async (project: Project) => {
        try {
          set({ isLoading: true });
          const id = await projectsService.add(project);
          set((state) => ({
            projects: [...state.projects, { ...project, id }],
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error adding project:", error);
          set({ error: "حدث خطأ أثناء إضافة المشروع", isLoading: false });
          throw error;
        }
      },

      updateProject: async (id: string, data: Partial<Project>) => {
        try {
          set({ isLoading: true });
          await projectsService.update(id, data);
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id ? { ...p, ...data } : p
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error updating project:", error);
          set({ error: "حدث خطأ أثناء تحديث المشروع", isLoading: false });
          throw error;
        }
      },

      deleteProject: async (id: string) => {
        try {
          set({ isLoading: true });
          await projectsService.delete(id);
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error deleting project:", error);
          set({ error: "حدث خطأ أثناء حذف المشروع", isLoading: false });
          throw error;
        }
      },

      setProjects: (projects: Project[]) => set({ projects }),

      // Expense operations
      addExpense: async (expense: Expense) => {
        try {
          set({ isLoading: true });
          const currentUser = useAuthStore.getState().user;
          // Ensure isClosed is false for new expenses
          await expensesService.add({
            ...expense,
            isClosed: false,
            addedBy: currentUser?.displayName || currentUser?.email || "غير معروف",
            addedById: currentUser?.id,
          });
          // لا نضيف للـ state محلياً - سيأتي من Firebase تلقائياً
          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding expense:", error);
          set({ error: "حدث خطأ أثناء إضافة المصروف", isLoading: false });
          throw error;
        }
      },

      updateExpense: async (id: string, data: Partial<Expense>) => {
        try {
          set({ isLoading: true });
          await expensesService.update(id, data);
          // لا نحدث الـ state محلياً - سيأتي من Firebase تلقائياً عبر real-time subscription
          set({ isLoading: false });
        } catch (error) {
          console.error("Error updating expense:", error);
          set({ error: "حدث خطأ أثناء تحديث المصروف", isLoading: false });
          throw error;
        }
      },

      deleteExpense: async (id: string) => {
        try {
          console.log("deleteExpense called with id:", id);
          set({ isLoading: true });
          await expensesService.delete(id);
          console.log(
            "Expense deleted from Firebase, waiting for subscription update..."
          );
          // لا نحدث الـ state محلياً - سيأتي من Firebase تلقائياً عبر real-time subscription
          set({ isLoading: false });
        } catch (error) {
          console.error("Error deleting expense:", error);
          set({ error: "حدث خطأ أثناء حذف المصروف", isLoading: false });
          throw error;
        }
      },

      setExpenses: (expenses: Expense[]) => set({ expenses }),

      // Standalone Debt operations
      addStandaloneDebt: async (debt: StandaloneDebt) => {
        try {
          set({ isLoading: true });
          await standaloneDebtsService.add(debt);
          // لا نضيف للـ state محلياً - سيأتي من Firebase تلقائياً
          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding debt:", error);
          set({ error: "حدث خطأ أثناء إضافة الدين", isLoading: false });
          throw error;
        }
      },

      updateStandaloneDebt: async (
        id: string,
        data: Partial<StandaloneDebt>
      ) => {
        try {
          set({ isLoading: true });
          await standaloneDebtsService.update(id, data);
          set((state) => ({
            standaloneDebts: state.standaloneDebts.map((d) =>
              d.id === id ? { ...d, ...data } : d
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error updating debt:", error);
          set({ error: "حدث خطأ أثناء تحديث الدين", isLoading: false });
          throw error;
        }
      },

      deleteStandaloneDebt: async (id: string) => {
        try {
          set({ isLoading: true });
          await standaloneDebtsService.delete(id);
          set((state) => ({
            standaloneDebts: state.standaloneDebts.filter((d) => d.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error deleting debt:", error);
          set({ error: "حدث خطأ أثناء حذف الدين", isLoading: false });
          throw error;
        }
      },

      setStandaloneDebts: (standaloneDebts: StandaloneDebt[]) =>
        set({ standaloneDebts }),

      // Debt Party operations
      addDebtParty: async (party: DebtParty) => {
        try {
          set({ isLoading: true });
          await debtPartiesService.add(party);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding debt party:", error);
          set({ error: "حدث خطأ أثناء إضافة البروفايل", isLoading: false });
          throw error;
        }
      },

      updateDebtParty: async (id: string, data: Partial<DebtParty>) => {
        try {
          set({ isLoading: true });
          await debtPartiesService.update(id, data);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error updating debt party:", error);
          set({ error: "حدث خطأ أثناء تحديث البروفايل", isLoading: false });
          throw error;
        }
      },

      deleteDebtParty: async (id: string) => {
        try {
          set({ isLoading: true });
          await debtPartiesService.delete(id);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error deleting debt party:", error);
          set({ error: "حدث خطأ أثناء حذف البروفايل", isLoading: false });
          throw error;
        }
      },

      setDebtParties: (parties: DebtParty[]) => set({ debtParties: parties }),

      // User operations
      addUser: async (user: User) => {
        try {
          set({ isLoading: true });
          await usersService.add(user);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding user:", error);
          set({ error: "حدث خطأ أثناء إضافة المستخدم", isLoading: false });
          throw error;
        }
      },

      updateUser: async (id: string, data: Partial<User>) => {
        try {
          set({ isLoading: true });
          await usersService.update(id, data);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error updating user:", error);
          set({ error: "حدث خطأ أثناء تحديث المستخدم", isLoading: false });
          throw error;
        }
      },

      deleteUser: async (id: string) => {
        try {
          set({ isLoading: true });
          await usersService.delete(id);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error deleting user:", error);
          set({ error: "حدث خطأ أثناء حذف المستخدم", isLoading: false });
          throw error;
        }
      },

      setUsers: (users: User[]) => set({ users }),

      // Expense Invoice operations
      closeExpensesAndCreateInvoice: async (
        expenseIds: string[],
        clientId: string,
        startDate: string,
        endDate: string,
        notes?: string
      ) => {
        try {
          set({ isLoading: true });
          const invoiceId = await closeExpensesAndCreateInvoiceService(
            expenseIds,
            clientId,
            startDate,
            endDate,
            notes
          );
          set({ isLoading: false });
          return invoiceId;
        } catch (error) {
          console.error("Error closing expenses and creating invoice:", error);
          set({
            error: "حدث خطأ أثناء إغلاق المصروفات وإنشاء الفاتورة",
            isLoading: false,
          });
          throw error;
        }
      },

      getExpenseInvoices: (clientId?: string) => {
        const invoices = get().expenseInvoices;
        if (clientId) {
          return invoices.filter((inv) => inv.clientId === clientId);
        }
        return invoices;
      },

      setExpenseInvoices: (expenseInvoices: ExpenseInvoice[]) =>
        set({ expenseInvoices }),

      // Utility
      clearError: () => set({ error: null }),
    }),
    {
      name: "makin-data-storage",
      partialize: (state) => ({
        // Only persist data, not loading states
        clients: state.clients,
        invoices: state.invoices,
        payments: state.payments,
        debts: state.debts,
        projects: state.projects,
        expenses: state.expenses,
        standaloneDebts: state.standaloneDebts,
      }),
    }
  )
);
