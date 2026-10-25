import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Add, DescriptionOutlined, Search } from '../../design-system/icons';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { useAccess } from '../../core/access/useAccess';
import { downloadPdf, sharePdf } from '../../features/pdf/pdfService';
import { LetterPDF } from '../../features/pdf/LetterPDF';
import {
  Button, EmptyState, ListGroup, Modal, PageHeader, PageShell, Segmented, Skeleton,
} from '../../design-system/primitives';
import type { Letter, LetterType } from '../../types';
import { LetterRow } from './letters/LetterRow';
import { LetterFormSheet } from './letters/LetterFormSheet';
import { TYPE_LABEL } from './letters/letterPresets';

type TypeFilter = 'all' | LetterType;

function LettersSkeleton() {
  return (
    <ListGroup aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3.5">
          <Skeleton width={44} height={44} className="rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton height={15} width="60%" />
            <Skeleton height={11} width="40%" />
            <Skeleton height={24} width={80} pill />
          </div>
        </div>
      ))}
    </ListGroup>
  );
}

export const LettersPage = () => {
  const { user } = useAuthStore();
  const { clients, letters, addLetter, updateLetter, deleteLetter, isLoading } = useDataStore();
  const access = useAccess();
  // Writing, editing and deleting letters all sit under `letters.manage`; the clients list needs `clients.view`.
  const canManage = access.can('letters.manage');
  const canPickClient = access.can('clients.view');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Letter | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [toDelete, setToDelete] = useState<Letter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newForClient, setNewForClient] = useState<string | undefined>(undefined);

  // Deep links from a client's profile: `?open=<letterId>` shows that letter, `?new=1&clientId=<id>` starts one for them.
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');
  const newParam = searchParams.get('new');
  const clientParam = searchParams.get('clientId') || undefined;
  useEffect(() => {
    if (!openParam && !newParam) return;
    if (newParam) {
      if (canManage) {
        setEditing(null);
        setNewForClient(clientParam);
        setSheetOpen(true);
      }
    } else if (!isLoading) {
      const found = letters.find((l) => l.id === openParam);
      if (!found) return; // the letters may still be arriving; the next snapshot runs this again
      setFilter('all');
      setExpandedId(found.id);
      requestAnimationFrame(() =>
        document.querySelector(`[data-letter-id="${CSS.escape(found.id)}"]`)?.scrollIntoView({ block: 'center' })
      );
    }
    setSearchParams({}, { replace: true });
  }, [openParam, newParam, clientParam, canManage, isLoading, letters, setSearchParams]);

  const counts = useMemo(
    () => ({
      all: letters.length,
      official: letters.filter((l) => l.type === 'official').length,
      offer: letters.filter((l) => l.type === 'offer').length,
      entitlement: letters.filter((l) => l.type === 'entitlement').length,
    }),
    [letters]
  );

  const visible = useMemo(
    () =>
      letters
        .filter((l) => filter === 'all' || l.type === filter)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [letters, filter]
  );

  const openAdd = () => {
    setEditing(null);
    setNewForClient(undefined);
    setSheetOpen(true);
  };
  const openEdit = (letter: Letter) => {
    setEditing(letter);
    setSheetOpen(true);
  };

  const handleSave = async (data: Letter, editingId: string | null) => {
    if (editingId) await updateLetter(editingId, data);
    else await addLetter(data);
    toast.success(editingId ? 'تم تحديث الرسالة' : 'تم إنشاء الرسالة');
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteLetter(toDelete.id);
      setExpandedId(null);
      setToDelete(null);
      toast.success('تم حذف الرسالة');
    } catch {
      /* the store showed the error */
    } finally {
      setDeleting(false);
    }
  };

  const withPdf = async (fn: () => Promise<void>) => {
    setPdfLoading(true);
    try {
      await fn();
    } finally {
      setPdfLoading(false);
    }
  };
  const handleDownload = (l: Letter) =>
    withPdf(() => downloadPdf(React.createElement(LetterPDF, { letter: l }), `${TYPE_LABEL[l.type]}-${l.refNumber}`));
  const handleShare = (l: Letter) =>
    withPdf(() =>
      sharePdf(React.createElement(LetterPDF, { letter: l }), `${TYPE_LABEL[l.type]}-${l.refNumber}`, {
        title: `${TYPE_LABEL[l.type]} - ${l.subject}`,
        text: `مرفق: ${TYPE_LABEL[l.type]} - ${l.subject}`,
      })
    );

  const showSkeleton = isLoading && letters.length === 0;

  return (
    <PageShell width="5xl">
      <PageHeader
        title="الرسائل"
        subtitle="خطابات وعروض ومستخلصات بصيغة PDF"
        actions={
          canManage ? (
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
              رسالة جديدة
            </Button>
          ) : undefined
        }
      />

      {letters.length > 0 && (
        <Segmented<TypeFilter>
          layout="scroll"
          aria-label="تصفية الرسائل حسب النوع"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'الكل', count: counts.all },
            { value: 'official', label: 'رسمي', count: counts.official },
            { value: 'offer', label: 'عروض', count: counts.offer },
            { value: 'entitlement', label: 'مستخلصات', count: counts.entitlement },
          ]}
        />
      )}

      {showSkeleton ? (
        <LettersSkeleton />
      ) : letters.length === 0 ? (
        <EmptyState
          Icon={DescriptionOutlined}
          title="لا توجد رسائل بعد"
          description={
            canManage
              ? 'اكتب خطاباً رسمياً أو عرض سعر أو مستخلصاً، وصدّره PDF بترويسة شركتك.'
              : 'الخطابات والعروض والمستخلصات تظهر هنا عند كتابتها.'
          }
          action={
            canManage ? (
              <Button variant="secondary" leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                أنشئ أول رسالة
              </Button>
            ) : undefined
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          Icon={Search}
          title="لا توجد رسائل من هذا النوع"
          action={
            <Button variant="outline" onClick={() => setFilter('all')}>
              عرض الكل
            </Button>
          }
        />
      ) : (
        <ListGroup>
          {visible.map((letter) => (
            <div key={letter.id} data-letter-id={letter.id}>
              <LetterRow
                letter={letter}
                expanded={expandedId === letter.id}
                busy={pdfLoading}
                onToggle={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                onEdit={canManage ? () => openEdit(letter) : undefined}
                onDelete={canManage ? () => setToDelete(letter) : undefined}
                onDownload={() => handleDownload(letter)}
                onShare={() => handleShare(letter)}
              />
            </div>
          ))}
        </ListGroup>
      )}

      {canManage && (
        <LetterFormSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          letter={editing}
          clients={clients}
          canPickClient={canPickClient}
          defaultSigner={user?.displayName || ''}
          initialClientId={newForClient}
          onSave={handleSave}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        maxWidth="sm"
        title={`حذف «${toDelete?.subject ?? ''}»؟`}
        description="ستُحذف الرسالة نهائياً. لا يمكن التراجع."
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            حذف نهائياً
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
};
