import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useGlobalFundStore } from '../../stores/useGlobalFundStore';
import { useDataSlice } from '../../stores/useDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAccess } from '../../core/access/useAccess';
import { Button, EmptyState, PageShell } from '../../design-system/primitives';
import {
  buildAllCustodyProfiles,
  emptyCustodyProfile,
  findCustodyProfile,
  summarizeCustodyProfiles,
  type CustodyBatch,
} from '../../core/finance/custodyProfile';
import { PersonOff } from '../../design-system/icons';
import { CustodyFormSheet, type CustodyFormValues } from './fund/CustodyFormSheet';
import { DeleteCustodyModal } from './fund/DeleteCustodyModal';
import { FundOverview } from './fund/FundOverview';
import { OverviewSkeleton, ProfileSkeleton } from './fund/FundSkeletons';
import { UserProfile } from './fund/UserProfile';
import type { FundUser } from './fund/types';

type SystemUserDoc = { id: string; uid?: string; displayName?: string; email?: string; role?: string };

/**
 * صندوق العهد.
 * - من يملك `custody.manage`: قائمة المستخدمين، ثم ملف عهدة كل مستخدم عبر `?u=<userId>` (زر الرجوع يعيده للقائمة).
 *   وحده من يضيف العهد ويعدّلها ويحذفها.
 * - من يملك `custody.view.own` فقط: يدخل مباشرة إلى عهدته هو، ولا يحمّل غيرها ولا قائمة المستخدمين.
 * الحسابات كلها من src/core/finance (custodyFifo + custodyProfile).
 */
export const FundPage = () => {
  const user = useAuthStore((s) => s.user);
  const access = useAccess();
  const canManage = access.can('custody.manage');
  /** قائمة المستخدمين تُقرأ فقط لمن يرى عهد الجميع (وهو من يحتاجها) وتسمح له قواعد الخادم بقراءتها. */
  const canListUsers = canManage && access.canViewDirectory;
  const { transactions, addTransaction, updateTransaction, deleteTransaction, isLoading: fundLoading } = useGlobalFundStore();
  const { expenses, clients, isLoading: dataLoading } = useDataSlice('expenses', 'clients', 'isLoading');

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [systemUsers, setSystemUsers] = useState<SystemUserDoc[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustodyBatch | null>(null);
  const [formUserId, setFormUserId] = useState('');
  const [deleting, setDeleting] = useState<CustodyBatch | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!canListUsers) {
      setUsersLoaded(true);
      return undefined;
    }
    setUsersLoaded(false);
    setUsersError(false);
    return onSnapshot(
      query(collection(db, 'users')),
      (snap) => {
        setSystemUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SystemUserDoc, 'id'>) })));
        setUsersLoaded(true);
      },
      () => {
        setUsersError(true);
        setUsersLoaded(true);
      }
    );
  }, [canListUsers]);

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients]);

  const users = useMemo<FundUser[]>(
    () =>
      systemUsers.map((u) => ({
        id: u.uid || u.id,
        name: u.displayName || u.email || 'مستخدم',
        email: u.email,
        role: u.role,
      })),
    [systemUsers]
  );

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);

  // رصيد العهدة = المودَع - المصروف، فيلزم أن تكون مصروفات صاحبها كلها عندنا. يضمن ذلك النموذج:
  // custody.manage يشترط expenses.view.all (فالمدير يحمّل مصروفات الجميع)، وcustody.view.own يشترط expenses.create (فصاحب العهدة يحمّل مصروفاته).
  const profiles = useMemo(
    () => buildAllCustodyProfiles(transactions, access.listableExpenses(expenses), { userMap, clientMap }),
    [transactions, expenses, userMap, clientMap, access]
  );
  const totals = useMemo(() => summarizeCustodyProfiles(profiles), [profiles]);

  /** كل من يمكن منحه عهدة: المسجلون + من لديهم عهدة ولم يعودوا في القائمة. */
  const selectableUsers = useMemo<FundUser[]>(() => {
    const extra = profiles
      .filter((p) => !users.some((u) => u.id === p.userId || u.name === p.userName))
      .map((p) => ({ id: p.userId, name: p.userName || 'مستخدم' }));
    return [...users, ...extra];
  }, [users, profiles]);

  const deficitOf = useCallback(
    (userId: string) => {
      const name = users.find((u) => u.id === userId)?.name;
      return findCustodyProfile(profiles, userId, name)?.totals.deficit ?? 0;
    },
    [profiles, users]
  );

  // من لا يدير العهد يرى عهدته فقط مهما كان الرابط.
  const selectedId = canManage ? searchParams.get('u') : user?.id ?? null;

  const selectedProfile = useMemo(() => {
    if (!selectedId) return null;
    const registered = users.find((u) => u.id === selectedId);
    const nameHint = canManage ? registered?.name : user?.displayName;
    const found = findCustodyProfile(profiles, selectedId, nameHint);
    if (found) return nameHint && nameHint !== found.userName && !canManage ? { ...found, userName: nameHint } : found;
    if (registered || !canManage) return emptyCustodyProfile(selectedId, nameHint || '');
    return null;
  }, [selectedId, users, profiles, canManage, user?.displayName]);

  const selectedRole = canManage ? users.find((u) => u.id === selectedId)?.role : user?.role;

  // عند التنقل بين القائمة والملف نعود لأعلى الصفحة (النافذة على الهاتف، وحاوية المحتوى على الحاسوب).
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector('.app-shell-main')?.scrollTo({ top: 0 });
  }, [selectedId]);

  const openUser = (id: string) => setSearchParams({ u: id }, { state: { fromList: true } });
  const backToList = () => {
    if ((location.state as { fromList?: boolean } | null)?.fromList) navigate(-1);
    else setSearchParams({}, { replace: true });
  };

  const openAdd = (userId = '') => {
    setEditing(null);
    setFormUserId(userId);
    setFormOpen(true);
  };
  const openEdit = (batch: CustodyBatch) => {
    setEditing(batch);
    setFormUserId(selectedId ?? '');
    setFormOpen(true);
  };

  const handleSubmit = async (v: CustodyFormValues) => {
    const now = new Date().toISOString();
    if (editing) {
      await updateTransaction(editing.id, {
        amount: v.amount,
        userId: v.userId,
        userName: v.userName,
        description: v.description,
        date: v.date,
        notes: v.notes,
        updatedAt: now,
      });
    } else {
      await addTransaction({
        id: crypto.randomUUID(),
        type: 'deposit',
        amount: v.amount,
        userId: v.userId,
        userName: v.userName,
        description: v.description,
        date: v.date,
        notes: v.notes,
        createdAt: now,
        updatedAt: now,
        createdBy: user?.displayName || '',
      });
    }
    setFormOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteTransaction(deleting.id);
      setDeleting(null);
    } catch {
      // المتجر يعرض رسالة الخطأ؛ تبقى نافذة التأكيد مفتوحة لإعادة المحاولة.
    } finally {
      setDeleteBusy(false);
    }
  };

  const loading = fundLoading || dataLoading || !usersLoaded;

  let content;
  if (loading) {
    content = canManage && !selectedId ? <OverviewSkeleton /> : <ProfileSkeleton />;
  } else if (!user) {
    content = null;
  } else if (selectedId && selectedProfile) {
    content = (
      <UserProfile
        key={selectedProfile.userId}
        profile={selectedProfile}
        role={selectedRole}
        own={!canManage}
        canManage={canManage}
        onBack={canManage ? backToList : undefined}
        onAdd={() => openAdd(selectedId)}
        onEdit={openEdit}
      />
    );
  } else if (selectedId) {
    content = (
      <EmptyState
        Icon={PersonOff}
        title="المستخدم غير موجود"
        description="ربما حُذف هذا المستخدم أو الرابط غير صحيح."
        action={
          <Button variant="outline" onClick={backToList}>
            العودة إلى العهد
          </Button>
        }
      />
    );
  } else {
    content = (
      <FundOverview
        profiles={profiles}
        totals={totals}
        users={users}
        usersError={usersError}
        canManage={canManage}
        onOpenUser={openUser}
        onAdd={() => openAdd()}
      />
    );
  }

  return (
    // عمود واحد لكل الشاشات: الهيرو ثم الموظفون، أو الهيرو ثم عهد الموظف وسجل كل عهدة.
    <PageShell width="4xl">
      {content}

      {canManage && (
        <>
          <CustodyFormSheet
            open={formOpen}
            onClose={() => setFormOpen(false)}
            editing={editing}
            initialUserId={formUserId}
            users={selectableUsers}
            deficitOf={deficitOf}
            onSubmit={handleSubmit}
            onDelete={(batch) => {
              setFormOpen(false);
              setDeleting(batch);
            }}
          />
          <DeleteCustodyModal
            batch={deleting}
            userName={selectedProfile?.userName ?? ''}
            busy={deleteBusy}
            onCancel={() => setDeleting(null)}
            onConfirm={confirmDelete}
          />
        </>
      )}
    </PageShell>
  );
};
