import { useEffect, useState } from 'react';
import { Add, PersonAddAlt1, Search } from '../../design-system/icons';
import { collection, query, orderBy, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { db, auth, firebaseConfig } from '../../config/firebase';
import { DEFAULT_EMPLOYEE_PERMISSIONS, normalizePermissions, normalizeRole, type Role } from '../../core/access';
import {
  Avatar, Badge, Button, EmptyState, Input, ListGroup, ListRow, Modal, PageHeader, PageShell, Skeleton,
} from '../../design-system/primitives';
import { clearField } from '../../services/firebaseService';
import { useAuthStore } from '../../stores/useAuthStore';
import { describeAccess } from './users/accessSummaryModel';
import { UserFormSheet, type UserFormData, type UserFormErrors } from './users/UserFormSheet';
import { collectUserRecords, commitInChunks } from './users/userRecords';

/** A profile document in `users`. `role` is absent on the oldest accounts. */
interface UserDoc {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  permissions?: unknown;
  createdAt?: string;
}

/** A new user starts as a field employee: the narrowest template, widened by the admin if needed. */
const emptyForm = (): UserFormData => ({
  name: '',
  email: '',
  password: '',
  newPassword: '',
  role: 'employee',
  permissions: normalizePermissions(DEFAULT_EMPLOYEE_PERMISSIONS),
});

function UsersSkeleton() {
  return (
    <ListGroup aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3.5">
          <Skeleton circle width={44} height={44} />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} width="45%" />
            <Skeleton height={11} width="60%" />
          </div>
        </div>
      ))}
    </ListGroup>
  );
}

export const UsersPage = () => {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [tried, setTried] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map((d) => ({ ...(d.data() as Omit<UserDoc, 'id'>), id: d.id })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async () => {
    if (!formData.name || (!editingUserId && (!formData.email || !formData.password))) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }
    setSubmitting(true);

    if (editingUserId) {
      if (formData.newPassword && formData.newPassword.length < 6) {
        toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        setSubmitting(false);
        return;
      }
      try {
        const currentUserData = users.find((u) => u.id === editingUserId);
        const oldName = currentUserData?.displayName;
        const newName = formData.name;

        // Nobody changes their own role from here, and the system is never left without an admin.
        const wasAdmin = normalizeRole(currentUserData?.role) === 'admin';
        const nextRole: Role = editingUserId === currentUserId ? normalizeRole(currentUserData?.role) : formData.role;
        const adminCount = users.filter((u) => normalizeRole(u.role) === 'admin').length;
        if (wasAdmin && nextRole !== 'admin' && adminCount <= 1) {
          toast.error('لا يمكن تحويل آخر مدير إلى موظف. عيّن مديراً آخر أولاً.');
          setSubmitting(false);
          return;
        }

        // Records first, profile last: if the cascade fails the old name still matches everywhere
        // and the edit can simply be retried.
        if (oldName && oldName !== newName) {
          const { balances, expenses, closedExpenses } = await collectUserRecords(editingUserId, oldName);
          await commitInChunks(balances, (batch, ref) => batch.update(ref, { userName: newName }));
          await commitInChunks([...expenses, ...closedExpenses], (batch, ref) => batch.update(ref, { createdBy: newName }));
        }

        // An explicit role always (this is what upgrades a legacy profile). Only employees carry a
        // permission list; an admin's is removed so it can never be mistaken for a limit.
        await updateDoc(doc(db, 'users', editingUserId), {
          displayName: newName,
          role: nextRole,
          permissions: nextRole === 'employee' ? normalizePermissions(formData.permissions) : clearField(),
        });

        // Try to update password if requested and it's the current user
        if (formData.newPassword) {
          if (auth.currentUser && auth.currentUser.email === formData.email) {
            const { updatePassword } = await import('firebase/auth');
            await updatePassword(auth.currentUser, formData.newPassword);
            toast.success('تم تحديث بياناتك وكلمة مرورك وارتباطاتك المالية بنجاح');
          } else {
            toast.error('لم يتم تغيير كلمة المرور: أنظمة الحماية (Firebase) تمنع تغيير رمز حساب شخص آخر مباشرة. أرسل له رابط التعيين.');
          }
        } else {
          toast.success('تم تحديث بيانات المستخدم وارتباطاته المالية بنجاح !');
        }

        setDialogOpen(false);
        setEditingUserId(null);
        setFormData(emptyForm());
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          toast.error('لتغيير كلمة مرورك، يرجى تسجيل الخروج والدخول مجدداً لتأكيد هويتك.');
        } else {
          toast.error('حدث خطأ أثناء التحديث');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    let secondaryApp: any = null;
    try {
      secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      try {
        await updateProfile(userCred.user, { displayName: formData.name });
        // Document ID must equal Auth UID — firestore.rules uses exists(.../users/$(request.auth.uid))
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          displayName: formData.name,
          email: formData.email,
          role: formData.role,
          ...(formData.role === 'employee' ? { permissions: normalizePermissions(formData.permissions) } : {}),
          createdAt: new Date().toISOString(),
        });
      } catch (profileError) {
        // Never leave a sign-in account without a profile: it could not be used and the same
        // e-mail could not be registered again. The secondary session is still that new user.
        await userCred.user.delete().catch(() => undefined);
        throw profileError;
      } finally {
        await signOut(secondaryAuth).catch(() => undefined);
      }

      toast.success('تم إضافة المستخدم بنجاح');
      setDialogOpen(false);
      setFormData(emptyForm());
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مسجل بالفعل');
      } else {
        toast.error('حدث خطأ أثناء إضافة المستخدم');
      }
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {
          /* ignore */
        }
      }
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const target = users.find((u) => u.id === id);
      if (id === currentUserId) {
        toast.error('لا يمكنك حذف حسابك الحالي.');
        return;
      }
      if (normalizeRole(target?.role) === 'admin' && users.filter((u) => normalizeRole(u.role) === 'admin').length <= 1) {
        toast.error('لا يمكن حذف آخر مدير.');
        return;
      }

      // Records first, profile last, so a failure part-way leaves a user you can retry on.
      // Expenses already inside an expense invoice stay: they belong to that financial document.
      const { balances, expenses, closedExpenses } = await collectUserRecords(id, target?.displayName);
      await commitInChunks(balances, (batch, ref) => batch.delete(ref));
      await commitInChunks(expenses, (batch, ref) => batch.delete(ref));
      await commitInChunks([doc(db, 'users', id)], (batch, ref) => batch.delete(ref));
      toast.success(
        closedExpenses.length > 0
          ? `تم حذف المستخدم وأرصدته ومصروفاته المفتوحة. بقي ${closedExpenses.length} مصروف ضمن فواتير المصروفات لأنها جزء من مستند مالي.`
          : 'تم حذف المستخدم وكافة أرصدته ومصروفاته بنجاح',
      );
    } catch (error: any) {
      toast.error('حدث خطأ أثناء الحذف: ' + error.message);
    }
  };

  const handleResetPasswordEmail = async () => {
    if (!formData.email) return;
    try {
      await sendPasswordResetEmail(auth, formData.email);
      toast.success('تم إرسال رابط التغيير إلى إيميله بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء إرسال الرابط.');
    }
  };

  // ── Presentation helpers ──────────────────────────────────────────────
  const openAdd = () => {
    setEditingUserId(null);
    setFormData(emptyForm());
    setTried(false);
    setDialogOpen(true);
  };

  const handleEditClick = (user: UserDoc) => {
    const role = normalizeRole(user.role);
    setEditingUserId(user.id);
    setFormData({
      name: user.displayName || '',
      email: user.email || '',
      password: '',
      newPassword: '',
      role,
      // What the account really gets today (the default set when no list is stored), so saving never narrows it by accident.
      permissions: role === 'employee' ? describeAccess('employee', user.permissions).permissions : emptyForm().permissions,
    });
    setTried(false);
    setDialogOpen(true);
  };

  const validate = (): UserFormErrors => {
    const e: UserFormErrors = {};
    if (!formData.name.trim()) e.name = 'اكتب اسم المستخدم';
    if (!editingUserId) {
      if (!formData.email.trim()) e.email = 'اكتب البريد الإلكتروني';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) e.email = 'البريد الإلكتروني غير صحيح';
      if (!formData.password) e.password = 'اكتب كلمة المرور';
      else if (formData.password.length < 6) e.password = 'كلمة المرور 6 أحرف على الأقل';
    } else if (formData.newPassword && formData.newPassword.length < 6) {
      e.newPassword = 'كلمة المرور 6 أحرف على الأقل';
    }
    return e;
  };
  const errors = validate();
  const hasErrors = Object.keys(errors).length > 0;

  const submit = () => {
    setTried(true);
    if (hasErrors) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    void handleCreateUser();
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    await handleDeleteUser(userToDelete.id);
    setDeleting(false);
    setUserToDelete(null);
    setDialogOpen(false);
  };

  const needle = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter(
    (u) => !needle || u.displayName?.toLowerCase().includes(needle) || u.email?.toLowerCase().includes(needle)
  );
  const editingUser = users.find((u) => u.id === editingUserId);
  const editingSelf = !!editingUserId && editingUserId === currentUserId;
  const canSetPassword = !!auth.currentUser && auth.currentUser.email === formData.email;
  const editingRole = editingUser ? normalizeRole(editingUser.role) : null;
  const isLastAdmin = editingRole === 'admin' && users.filter((u) => normalizeRole(u.role) === 'admin').length <= 1;
  const roleLock = editingSelf ? 'لا يمكنك تغيير دورك بنفسك.' : isLastAdmin ? 'آخر مدير في النظام. عيّن مديراً آخر أولاً.' : undefined;

  return (
    <PageShell width="4xl">
      <PageHeader
        title="المستخدمون"
        subtitle="حدد دور كل شخص وما يستطيع فعله"
        actions={
          <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
            مستخدم جديد
          </Button>
        }
      />

      {users.length > 0 && (
        <Input
          aria-label="بحث في المستخدمين"
          leftIcon={<Search sx={{ fontSize: 20 }} />}
          placeholder="ابحث بالاسم أو البريد"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />
      )}

      {loading ? (
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <EmptyState
          Icon={PersonAddAlt1}
          title="لا يوجد مستخدمون بعد"
          description="أنشئ حساباً لكل موظف ليسجل مصروفاته من هاتفه، وحدد ما يستطيع فعله."
          action={
            <Button variant="secondary" leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
              أضف أول مستخدم
            </Button>
          }
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          Icon={Search}
          title="لا نتائج مطابقة"
          description={`لا يوجد مستخدم يطابق «${searchQuery.trim()}».`}
          action={
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              مسح البحث
            </Button>
          }
        />
      ) : (
        <ListGroup>
          {filteredUsers.map((user) => {
            const role = normalizeRole(user.role);
            const legacy = !user.role;
            const access = role === 'employee' ? describeAccess('employee', user.permissions) : null;
            return (
              <ListRow
                key={user.id}
                chevron
                onClick={() => handleEditClick(user)}
                leading={<Avatar name={user.displayName || user.email || '?'} />}
                title={user.displayName || 'بدون اسم'}
                subtitle={<bdi dir="ltr">{user.email}</bdi>}
                meta={
                  <>
                    <Badge tone={role === 'admin' ? 'brand' : 'neutral'} dot>
                      {role === 'admin' ? 'مدير' : 'موظف'}
                    </Badge>
                    {user.id === currentUserId && <Badge tone="info">أنت</Badge>}
                    {legacy && <Badge tone="warning">حساب قديم: يُعامل كمدير</Badge>}
                    {access && <span className="text-xs text-fg-subtle">{access.label}</span>}
                  </>
                }
              />
            );
          })}
        </ListGroup>
      )}

      <UserFormSheet
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={!!editingUserId}
        formData={formData}
        onChange={setFormData}
        errors={tried ? errors : {}}
        submitting={submitting}
        onSubmit={submit}
        canSetPassword={canSetPassword}
        onSendResetEmail={handleResetPasswordEmail}
        onDelete={editingUserId && !editingSelf ? () => setUserToDelete(editingUser ?? null) : undefined}
        editingSelf={editingSelf}
        roleLock={roleLock}
        legacyRole={!!editingUser && !editingUser.role}
        usesDefaultPermissions={!!editingUser && editingRole === 'employee' && !Array.isArray(editingUser.permissions)}
      />

      <Modal
        open={!!userToDelete}
        onClose={() => !deleting && setUserToDelete(null)}
        maxWidth="sm"
        title={`حذف «${userToDelete?.displayName || userToDelete?.email || ''}»؟`}
        description="سيُحذف المستخدم مع كل سجلات عهده ومصروفاته المفتوحة. المصروفات الداخلة في فواتير المصروفات تبقى لأنها جزء من مستند مالي. لا يمكن التراجع."
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={deleting}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>
            حذف نهائياً
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
};
